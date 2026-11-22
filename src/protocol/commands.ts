import {
  ancFrame,
  ancStatusFrame,
  batteryFrame,
  firmwareFrame,
  gesturesFrame,
  deviceInfoFrame,
  encode
} from './encoder';
import {
  CMD_ANC_SET,
  CMD_ANC_STATUS,
  CMD_BATTERY,
  CMD_BATTERY_PUSH,
  CMD_FIRMWARE,
  CMD_GESTURES,
  CMD_DEVICE_INFO,
  CMD_HEARTBEAT,
  ANC_MODES
} from './constants';
import {
  parseBattery,
  parseFirmware,
  parseGestures,
  parseAncMode,
  parseAscii
} from './parser';
import { DecodedFrame, BatteryLevel, GestureRow, ProtocolError } from './types';

export interface TransportSender {
  send(data: Uint8Array): Promise<void>;
  onFrame(listener: (frame: DecodedFrame) => void): () => void;
}

export interface DeviceStatus {
  ancMode: number | null;
  ancModeName: string;
  battery: BatteryLevel[];
  firmware: string[];
  gestures: GestureRow[];
  deviceInfo: string;
  lastUpdated: Date;
}

/**
 * ProtocolController manages sequencing, request-response matching,
 * timeout handling, command queueing (mutex), and unsolicited push notifications.
 */
export class ProtocolController {
  private seq = 0x10;
  private pushListeners: Set<(frame: DecodedFrame) => void> = new Set();
  private pendingQueue: Promise<unknown> = Promise.resolve();

  constructor(private transport: TransportSender) {
    this.transport.onFrame((frame) => {
      if (frame.isPush) {
        this.notifyPush(frame);
      }
    });
  }

  public nextSeq(): number {
    this.seq = (this.seq + 1) & 0xFF;
    return this.seq;
  }

  public onPush(listener: (frame: DecodedFrame) => void): () => void {
    this.pushListeners.add(listener);
    return () => this.pushListeners.delete(listener);
  }

  private notifyPush(frame: DecodedFrame) {
    for (const listener of this.pushListeners) {
      try {
        listener(frame);
      } catch (err) {
        console.error("Error in push listener:", err);
      }
    }
  }

  /**
   * Execute a command with serialized queueing to prevent overlapping
   * writes from corrupting the SPP stream.
   */
  public async executeCommand(
    frameBytes: Uint8Array,
    expectedBaseCmd: number,
    timeoutMs: number = 2500
  ): Promise<DecodedFrame> {
    // Serialize execution
    const run = () =>
      new Promise<DecodedFrame>((resolve, reject) => {
        let timer: ReturnType<typeof setTimeout>;
        let unsubscribe: (() => void) | null = null;

        const cleanup = () => {
          if (timer) clearTimeout(timer);
          if (unsubscribe) unsubscribe();
        };

        timer = setTimeout(() => {
          cleanup();
          reject(new ProtocolError(`Timeout waiting for response to 0x${expectedBaseCmd.toString(16)} after ${timeoutMs}ms`));
        }, timeoutMs);

        unsubscribe = this.transport.onFrame((frame) => {
          // Check if this frame is a response to our expected command
          if (frame.isResponse && frame.baseCmd === expectedBaseCmd) {
            cleanup();
            resolve(frame);
          }
        });

        this.transport.send(frameBytes).catch((err) => {
          cleanup();
          reject(err);
        });
      });

    const nextPromise = this.pendingQueue.then(run, run);
    this.pendingQueue = nextPromise.catch(() => {});
    return nextPromise;
  }

  /**
   * Set ANC mode and verify the acknowledgment from the device.
   */
  public async setAnc(mode: number | string): Promise<{ success: boolean; status: number }> {
    const seq = this.nextSeq();
    const frame = ancFrame(mode, seq);
    const resp = await this.executeCommand(frame, CMD_ANC_SET);
    const status = resp.data.length > 0 ? resp.data[0] : -1;
    return {
      success: status === 0,
      status
    };
  }

  /**
   * Query the current ANC state.
   */
  public async queryAncStatus(): Promise<{ mode: number | null; modeName: string }> {
    const seq = this.nextSeq();
    const frame = ancStatusFrame(seq);
    const resp = await this.executeCommand(frame, CMD_ANC_STATUS);
    const mode = parseAncMode(resp.data);
    const modeName = mode !== null ? (ANC_MODES[mode] || `0x${mode.toString(16)}`) : 'unknown';
    return { mode, modeName };
  }

  /**
   * Query the battery levels of left earbud, right earbud, and case.
   */
  public async queryBattery(): Promise<BatteryLevel[]> {
    const seq = this.nextSeq();
    const frame = batteryFrame(seq);
    const resp = await this.executeCommand(frame, CMD_BATTERY);
    return parseBattery(resp.data);
  }

  /**
   * Query firmware version tokens.
   */
  public async queryFirmware(): Promise<string[]> {
    const seq = this.nextSeq();
    const frame = firmwareFrame(seq);
    const resp = await this.executeCommand(frame, CMD_FIRMWARE);
    return parseFirmware(resp.data);
  }

  /**
   * Query touch gesture mappings.
   */
  public async queryGestures(): Promise<GestureRow[]> {
    const seq = this.nextSeq();
    const frame = gesturesFrame(seq);
    const resp = await this.executeCommand(frame, CMD_GESTURES);
    return parseGestures(resp.data);
  }

  /**
   * Query device information string (model number).
   */
  public async queryDeviceInfo(): Promise<string> {
    const seq = this.nextSeq();
    const frame = deviceInfoFrame(seq);
    const resp = await this.executeCommand(frame, CMD_DEVICE_INFO);
    return parseAscii(resp.data, 1);
  }

  /**
   * Send a raw custom command.
   */
  public async sendRaw(cmd: number, payload: Uint8Array = new Uint8Array(0)): Promise<DecodedFrame> {
    const seq = this.nextSeq();
    const frame = encode(cmd, payload, seq);
    return this.executeCommand(frame, cmd);
  }
}
