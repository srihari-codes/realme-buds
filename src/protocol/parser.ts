import { BatteryLevel, GestureRow } from './types';
import { BATTERY_NAMES, SIDE_NAMES, GESTURE_TYPES, GESTURE_ACTIONS } from './constants';

/**
 * Parse a 0x8106 reply or a 0x0204 push.
 * Layout: status/type (1B), count (1B), (index, value) * count
 * Bit 7 of value is charging flag; low 7 bits are percentage.
 */
export function parseBattery(data: Uint8Array): BatteryLevel[] {
  if (data.length < 2) {
    return [];
  }
  const count = Math.min(data[1], Math.floor((data.length - 2) / 2));
  const levels: BatteryLevel[] = [];

  for (let n = 0; n < count; n++) {
    const index = data[2 + 2 * n];
    const raw = data[3 + 2 * n];
    levels.push({
      index,
      name: BATTERY_NAMES[index] || `id${index}`,
      percent: raw & 0x7F,
      charging: Boolean(raw & 0x80)
    });
  }

  return levels;
}

/**
 * Parse comma-separated version tokens from a 0x8105 reply.
 * Format: 00 02 <ascii string>
 */
export function parseFirmware(data: Uint8Array): string[] {
  if (data.length < 3) {
    return [];
  }
  // Data starts with 00 02, then ascii version string
  const rawBytes = data.slice(2);
  let nullPos = rawBytes.indexOf(0x00);
  const textBytes = nullPos >= 0 ? rawBytes.slice(0, nullPos) : rawBytes;
  const text = new TextDecoder('ascii', { fatal: false }).decode(textBytes);
  return text.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * Parse gesture configuration rows from a 0x8108 reply.
 * Layout: 00, count, (side 1B, type 2B le, action 1B) * count
 */
export function parseGestures(data: Uint8Array): GestureRow[] {
  if (data.length < 2) {
    return [];
  }
  const count = Math.min(data[1], Math.floor((data.length - 2) / 4));
  const rows: GestureRow[] = [];

  for (let n = 0; n < count; n++) {
    const off = 2 + 4 * n;
    const side = data[off];
    const gestureType = data[off + 1] | (data[off + 2] << 8);
    const action = data[off + 3];

    rows.push({
      side,
      sideName: SIDE_NAMES[side] || `side${side}`,
      gestureType,
      typeName: GESTURE_TYPES[gestureType] || `0x${gestureType.toString(16).padStart(4, '0')}`,
      action,
      actionName: GESTURE_ACTIONS[action] || `Action ${action}`
    });
  }

  return rows;
}

/**
 * Parse the mode byte from a 0x810C reply (or the last byte of a push).
 */
export function parseAncMode(data: Uint8Array): number | null {
  if (!data || data.length === 0) {
    return null;
  }
  if (data.length >= 4 && data[1] === 0x01 && data[2] === 0x01) {
    return data[3];
  }
  return data[data.length - 1];
}

/**
 * Decode a NUL-terminated ASCII field (device info and similar).
 */
export function parseAscii(data: Uint8Array, skip: number = 1): string {
  if (data.length <= skip) {
    return '';
  }
  const rawBytes = data.slice(skip);
  const nullPos = rawBytes.indexOf(0x00);
  const textBytes = nullPos >= 0 ? rawBytes.slice(0, nullPos) : rawBytes;
  return new TextDecoder('ascii', { fatal: false }).decode(textBytes).trim();
}

/**
 * Format battery levels for human-readable display.
 */
export function formatBattery(levels: BatteryLevel[]): string {
  return levels
    .map(level => `${level.name} ${level.percent}%${level.charging ? '+' : ''}`)
    .join('  ');
}

/**
 * Helper to convert Uint8Array to hex string.
 */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Helper to convert hex string to Uint8Array.
 */
export function fromHex(hex: string): Uint8Array {
  const clean = hex.replace(/[\s-]|0x/gi, '');
  if (clean.length % 2 !== 0) {
    throw new Error('Hex string must have an even number of digits');
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    bytes[i / 2] = parseInt(clean.substring(i, i + 2), 16);
  }
  return bytes;
}
