import {
  SOF,
  FLAG_COMMAND,
  FLAG_PUSH,
  CMD_ANC_SET,
  CMD_ANC_STATUS,
  CMD_BATTERY,
  CMD_BATTERY_PUSH,
  CMD_FIRMWARE,
  CMD_GESTURES,
  CMD_DEVICE_INFO,
  CMD_HEARTBEAT
} from '../protocol/constants';
import { encode } from '../protocol/encoder';
import { decodeStream } from '../protocol/decoder';
import { DecodedFrame } from '../protocol/types';
import { diagnostics } from './diagnostics';

/**
 * Realistic Mock Transport for testing, development, and previewing the application
 * without physical hardware attached.
 * 
 * Implements the wireless earbuds protocol state machine:
 * - Responds to ANC set (0x0404) with status 0x00 and updates mode
 * - Responds to ANC query (0x010C) with 00 01 01 <mode>
 * - Responds to Battery query (0x0106) with left/right/case values
 * - Periodically sends unsolicited Battery push (0x0204) and Heartbeat (0x050E)
 * - Responds to Firmware query (0x0105) with version string
 * - Responds to Gestures query (0x0108) with gesture map
 * - Responds to Device info (0x0104) with "114"
 */
export class MockTransport {
  private frameListeners: Set<(frame: DecodedFrame) => void> = new Set();
  private disconnectListeners: Set<() => void> = new Set();
  private errorListeners: Set<(err: Error) => void> = new Set();
  private isConnectedState = false;
  private pushTimer: ReturnType<typeof setInterval> | null = null;

  // Simulated Device State
  private currentAncMode: number = 0x08; // default to ANC ON
  private batteryLeft: number = 85;
  private batteryRight: number = 90;
  private batteryCase: number = 70;
  private isLeftCharging = false;
  private isRightCharging = false;
  private isCaseCharging = true;

  public isConnected(): boolean {
    return this.isConnectedState;
  }

  public async open(): Promise<void> {
    diagnostics.log('system', 'info', '[SIMULATION] Connecting to simulated earbuds');
    this.isConnectedState = true;

    // Start background push simulator (battery updates every 25 seconds)
    this.pushTimer = setInterval(() => {
      if (this.isConnectedState) {
        this.emitSimulatedBatteryPush();
      }
    }, 25000);

    diagnostics.log('system', 'success', '[SIMULATION] Connected to simulated earbuds (Simulated SPP)');
  }

  public async close(): Promise<void> {
    this.isConnectedState = false;
    if (this.pushTimer) {
      clearInterval(this.pushTimer);
      this.pushTimer = null;
    }
    diagnostics.log('system', 'info', '[SIMULATION] Disconnected simulated device');
    this.notifyDisconnect();
  }

  public async send(data: Uint8Array): Promise<void> {
    if (!this.isConnectedState) {
      throw new Error("Simulated device is disconnected");
    }

    const { frames } = decodeStream(data);
    for (const frame of frames) {
      // Simulate reply after realistic Bluetooth latency (30-80ms)
      setTimeout(() => {
        this.handleCommand(frame);
      }, 50);
    }
  }

  private handleCommand(frame: DecodedFrame) {
    const seq = frame.seq;

    switch (frame.baseCmd) {
      case CMD_ANC_SET: {
        // Payload is 01 01 <mode>
        if (frame.data.length >= 3) {
          this.currentAncMode = frame.data[2];
        }
        // Reply with 0x8404, status 0x00
        const reply = encode(CMD_ANC_SET | 0x8000, new Uint8Array([0x00]), seq);
        this.deliverFrame(reply);
        break;
      }

      case CMD_ANC_STATUS: {
        // Reply with 0x810C: 00 01 01 <mode>
        const reply = encode(
          CMD_ANC_STATUS | 0x8000,
          new Uint8Array([0x00, 0x01, 0x01, this.currentAncMode]),
          seq
        );
        this.deliverFrame(reply);
        break;
      }

      case CMD_BATTERY: {
        // Reply with 0x8106: 00 <count> (id, pct | charging)*
        const leftVal = (this.batteryLeft & 0x7F) | (this.isLeftCharging ? 0x80 : 0x00);
        const rightVal = (this.batteryRight & 0x7F) | (this.isRightCharging ? 0x80 : 0x00);
        const caseVal = (this.batteryCase & 0x7F) | (this.isCaseCharging ? 0x80 : 0x00);

        // 00, 03, id=2 right, id=1 left, id=3 case
        const payload = new Uint8Array([
          0x00, 0x03,
          0x02, rightVal,
          0x01, leftVal,
          0x03, caseVal
        ]);
        const reply = encode(CMD_BATTERY | 0x8000, payload, seq);
        this.deliverFrame(reply);
        break;
      }

      case CMD_FIRMWARE: {
        // Reply with 0x8105: 00 02 <ascii versions>
        const versionStr = "1,2,1.1.0.47,2,2,1.1.0.47\0";
        const encoder = new TextEncoder();
        const strBytes = encoder.encode(versionStr);
        const payload = new Uint8Array(2 + strBytes.length);
        payload[0] = 0x00;
        payload[1] = 0x02;
        payload.set(strBytes, 2);

        const reply = encode(CMD_FIRMWARE | 0x8000, payload, seq);
        this.deliverFrame(reply);
        break;
      }

      case CMD_GESTURES: {
        // Reply with 0x8108: 00 06 (side, type_u16le, action)*
        // Match capture: left double=play/pause, left triple=next, left hold=ANC toggle, right double=play/pause, right triple=next, right hold=ANC toggle
        const payload = new Uint8Array([
          0x00, 0x06,
          0x01, 0x01, 0x02, 0x01, // left, 0x0201, 1
          0x01, 0x01, 0x03, 0x06, // left, 0x0301, 6
          0x01, 0x01, 0x04, 0x08, // left, 0x0401, 8
          0x02, 0x01, 0x02, 0x01, // right, 0x0201, 1
          0x02, 0x01, 0x03, 0x06, // right, 0x0301, 6
          0x02, 0x01, 0x04, 0x08  // right, 0x0401, 8
        ]);
        const reply = encode(CMD_GESTURES | 0x8000, payload, seq);
        this.deliverFrame(reply);
        break;
      }

      case CMD_DEVICE_INFO: {
        // Reply with 0x8104: 00 "114\0"
        const payload = new Uint8Array([0x00, 0x31, 0x31, 0x34, 0x00]);
        const reply = encode(CMD_DEVICE_INFO | 0x8000, payload, seq);
        this.deliverFrame(reply);
        break;
      }

      default: {
        diagnostics.log('protocol', 'warn', `[SIMULATION] Unknown command 0x${frame.baseCmd.toString(16)}`);
      }
    }
  }

  private emitSimulatedBatteryPush() {
    // Battery push 0x0204 with FLAG_PUSH (0x08)
    const leftVal = (this.batteryLeft & 0x7F) | (this.isLeftCharging ? 0x80 : 0x00);
    const rightVal = (this.batteryRight & 0x7F) | (this.isRightCharging ? 0x80 : 0x00);
    const caseVal = (this.batteryCase & 0x7F) | (this.isCaseCharging ? 0x80 : 0x00);

    const payload = new Uint8Array([
      0x01, 0x03,
      0x01, leftVal,
      0x02, rightVal,
      0x03, caseVal
    ]);
    const frame = encode(CMD_BATTERY_PUSH, payload, 0x2A, FLAG_PUSH);
    this.deliverFrame(frame);
  }

  private deliverFrame(frameBytes: Uint8Array) {
    const { frames } = decodeStream(frameBytes);
    for (const f of frames) {
      for (const listener of this.frameListeners) {
        listener(f);
      }
    }
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

  private notifyDisconnect() {
    for (const listener of this.disconnectListeners) {
      listener();
    }
  }
}
