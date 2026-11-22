import { decodeStream } from '../protocol/decoder';
import { DecodedFrame } from '../protocol/types';
import { diagnostics } from './diagnostics';

export interface TransportEvents {
  onFrame(frame: DecodedFrame): void;
  onError(error: Error): void;
  onDisconnect(): void;
}

export class BluetoothSerialTransport {
  private port: SerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private isReading = false;
  private rxBuffer = new Uint8Array(0);
  private frameListeners: Set<(frame: DecodedFrame) => void> = new Set();
  private disconnectListeners: Set<() => void> = new Set();
  private errorListeners: Set<(err: Error) => void> = new Set();

  constructor(port?: SerialPort) {
    if (port) {
      this.port = port;
    }
  }

  public setPort(port: SerialPort) {
    this.port = port;
  }

  public getPort(): SerialPort | null {
    return this.port;
  }

  public isConnected(): boolean {
    return this.port !== null && this.isReading;
  }

  /**
   * Open serial port connection at 115200 baud.
   */
  public async open(baudRate: number = 115200): Promise<void> {
    if (!this.port) {
      throw new Error("No serial port specified for transport");
    }

    diagnostics.log('serial', 'info', `Opening serial port at baud rate ${baudRate}`);

    try {
      await this.port.open({
        baudRate,
        bufferSize: 8192
      });
      diagnostics.log('serial', 'success', 'Serial port opened successfully');
    } catch (err) {
      diagnostics.log('serial', 'error', 'Failed to open serial port', err);
      throw err;
    }

    // Start reading loop
    this.startReadLoop();
  }

  private async startReadLoop() {
    if (!this.port || !this.port.readable) {
      diagnostics.log('serial', 'error', 'Port has no readable stream');
      return;
    }

    this.isReading = true;
    this.rxBuffer = new Uint8Array(0);

    try {
      this.reader = this.port.readable.getReader();
      diagnostics.log('serial', 'info', 'Serial read loop started');

      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) {
          diagnostics.log('serial', 'warn', 'Serial readable stream reached EOF / done');
          break;
        }

        if (value && value.length > 0) {
          this.handleIncomingChunk(value);
        }
      }
    } catch (err: unknown) {
      if (this.isReading) {
        const error = err instanceof Error ? err : new Error(String(err));
        diagnostics.log('serial', 'error', 'Serial read error', error);
        this.notifyError(error);
      }
    } finally {
      if (this.reader) {
        try {
          this.reader.releaseLock();
        } catch {
          // ignore lock release error
        }
        this.reader = null;
      }
      this.isReading = false;
      this.notifyDisconnect();
    }
  }

  private handleIncomingChunk(chunk: Uint8Array) {
    // Append incoming chunk to rxBuffer
    const nextBuf = new Uint8Array(this.rxBuffer.length + chunk.length);
    nextBuf.set(this.rxBuffer);
    nextBuf.set(chunk, this.rxBuffer.length);
    this.rxBuffer = nextBuf;

    // Decode all complete frames
    const { frames, remainder } = decodeStream(this.rxBuffer);
    this.rxBuffer = new Uint8Array(remainder);

    for (const frame of frames) {
      const dataHex = Array.from(frame.data).map(b => b.toString(16).padStart(2, '0')).join('');
      let extra = '';
      if (frame.baseCmd === 0x010C) {
        // ANC status reply
        const mode = frame.data.length >= 4 && frame.data[1] === 0x01 && frame.data[2] === 0x01
          ? frame.data[3]
          : frame.data[frame.data.length - 1];
        const modeName = mode === 0x08 ? 'ANC' : mode === 0x02 ? 'Transparency' : mode === 0x01 ? 'Off' : `0x${mode?.toString(16)}`;
        extra = ` -> Current: ${modeName} (0x${mode?.toString(16).padStart(2, '0')})`;
      } else if (frame.baseCmd === 0x0404) {
        // ANC set reply
        const status = frame.data.length > 0 ? frame.data[0] : -1;
        extra = status === 0
          ? ' -> Status: 0x00 (OK: Mode accepted)'
          : ` -> Status: 0x${status.toString(16).padStart(2, '0')} (REJECTED: Both earbuds must be in your ears)`;
      } else if (frame.baseCmd === 0x0106 || frame.baseCmd === 0x0204) {
        // Battery reply / push
        if (frame.data.length >= 2) {
          const count = Math.min(frame.data[1], Math.floor((frame.data.length - 2) / 2));
          const parts: string[] = [];
          for (let n = 0; n < count; n++) {
            const idx = frame.data[2 + 2 * n];
            const raw = frame.data[3 + 2 * n];
            const name = idx === 1 ? 'Left' : idx === 2 ? 'Right' : idx === 3 ? 'Case' : `id${idx}`;
            parts.push(`${name}: ${raw & 0x7F}%${raw & 0x80 ? ' [Charging]' : ''}`);
          }
          extra = ` -> ${parts.join(', ')}`;
        }
      }

      diagnostics.log('protocol', 'info', `[<] ${frame.summary()} [${dataHex}]${extra}`, {
        raw: Array.from(frame.raw).map(b => b.toString(16).padStart(2, '0')).join('')
      });
      this.notifyFrame(frame);
    }
  }

  /**
   * Send binary frame to the device.
   */
  public async send(data: Uint8Array): Promise<void> {
    if (!this.port || !this.port.writable) {
      throw new Error("Port is not writable or not connected");
    }

    const hex = Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
    diagnostics.log('protocol', 'info', `[>] ${hex}`);

    try {
      this.writer = this.port.writable.getWriter();
      await this.writer.write(data);
    } catch (err) {
      diagnostics.log('serial', 'error', 'Serial write error', err);
      throw err;
    } finally {
      if (this.writer) {
        try {
          this.writer.releaseLock();
        } catch {
          // ignore
        }
        this.writer = null;
      }
    }
  }

  /**
   * Close the connection cleanly.
   */
  public async close(): Promise<void> {
    diagnostics.log('serial', 'info', 'Closing serial connection');
    this.isReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (err) {
        console.warn("Reader cancel error:", err);
      }
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (err) {
        console.warn("Port close error:", err);
      }
      this.port = null;
    }

    this.rxBuffer = new Uint8Array(0);
    diagnostics.log('serial', 'info', 'Serial connection closed');
  }

  public onFrame(listener: (frame: DecodedFrame) => void): () => void {
    this.frameListeners.add(listener);
    return () => this.frameListeners.delete(listener);
  }

  public onDisconnect(listener: () => void): () => void {
    this.disconnectListeners.add(listener);
    return () => this.disconnectListeners.delete(listener);
  }

  public onError(listener: (err: Error) => void): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private notifyFrame(frame: DecodedFrame) {
    for (const listener of this.frameListeners) {
      try {
        listener(frame);
      } catch (err) {
        console.error("Error in frame listener:", err);
      }
    }
  }

  private notifyDisconnect() {
    for (const listener of this.disconnectListeners) {
      try {
        listener();
      } catch (err) {
        console.error("Error in disconnect listener:", err);
      }
    }
  }

  private notifyError(err: Error) {
    for (const listener of this.errorListeners) {
      try {
        listener(err);
      } catch (e) {
        console.error("Error in error listener:", e);
      }
    }
  }
}
