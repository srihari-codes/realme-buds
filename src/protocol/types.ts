import { COMMAND_NAMES, BATTERY_NAMES, SIDE_NAMES, GESTURE_TYPES } from './constants';

export class ProtocolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProtocolError';
  }
}

export interface DecodedFrame {
  flag: number;
  cmd: number;
  seq: number;
  data: Uint8Array;
  raw: Uint8Array;
  isPush: boolean;
  isResponse: boolean;
  baseCmd: number;
  category: number;
  subcommand: number;
  name: string;
  summary(): string;
}

export interface BatteryLevel {
  index: number;
  name: string;
  percent: number;
  charging: boolean;
}

export interface GestureRow {
  side: number;
  sideName: string;
  gestureType: number;
  typeName: string;
  action: number;
  actionName?: string;
}

export type AncModeKey = 'off' | 'transparent' | 'anc';

export interface AncState {
  mode: number | null;
  modeName: string;
  lastUpdated?: Date;
}

export interface DeviceInfo {
  modelNumber?: string;
  firmwareVersions?: string[];
  rawFirmware?: string;
  name?: string;
  macAddress?: string;
}

export function createDecodedFrame(
  flag: number,
  cmd: number,
  seq: number,
  data: Uint8Array,
  raw: Uint8Array
): DecodedFrame {
  const isPush = flag === 0x08;
  const isResponse = Boolean(cmd & 0x8000);
  const baseCmd = cmd & 0x7FFF;
  const category = cmd & 0xFF;
  const subcommand = (cmd >> 8) & 0xFF;
  const name = COMMAND_NAMES[baseCmd] || `0x${baseCmd.toString(16).padStart(4, '0')}`;

  return {
    flag,
    cmd,
    seq,
    data,
    raw,
    isPush,
    isResponse,
    baseCmd,
    category,
    subcommand,
    name,
    summary(): string {
      const kind = isPush ? "PUSH" : isResponse ? "RESP" : "CMD ";
      return `${kind} ${name.padEnd(13)} seq=0x${seq.toString(16).padStart(2, '0')} len=${data.length}`;
    }
  };
}
