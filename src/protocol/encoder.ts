import {
  SOF,
  FLAG_COMMAND,
  FLAG_PUSH,
  FIXED_HEADER,
  CMD_ANC_SET,
  CMD_ANC_STATUS,
  CMD_BATTERY,
  CMD_FIRMWARE,
  CMD_GESTURES,
  CMD_DEVICE_INFO,
  ANC_SET_VALUES
} from './constants';

/**
 * Write an unsigned integer as LEB128 varint bytes.
 */
export function writeVarint(value: number): Uint8Array {
  if (value < 0) {
    throw new Error("length cannot be negative");
  }
  const out: number[] = [];
  while (true) {
    const byte = value & 0x7F;
    value >>>= 7;
    if (value > 0) {
      out.push(byte | 0x80);
    } else {
      out.push(byte);
      return new Uint8Array(out);
    }
  }
}

/**
 * Build one aa frame.
 * Format: AA | LEN (LEB128) | FLAG | 00 | CAT | SUB | SEQ | DLEN (u16le) | DATA
 * 
 * @param cmd Canonical command number (e.g. 0x0404 for ANC set)
 * @param data Optional payload data
 * @param seq Sequence number (0..255)
 * @param flag Command (0x00) or push (0x08)
 */
export function encode(
  cmd: number,
  data: Uint8Array | number[] = new Uint8Array(0),
  seq: number = 0x01,
  flag: number = FLAG_COMMAND
): Uint8Array {
  if (cmd < 0 || cmd > 0xFFFF) {
    throw new Error(`command out of range: 0x${cmd.toString(16)}`);
  }
  if (seq < 0 || seq > 0xFF) {
    throw new Error("sequence byte must be 0..255");
  }
  if (flag !== FLAG_COMMAND && flag !== FLAG_PUSH) {
    throw new Error("flag must be 0x00 or 0x08");
  }

  const payload = data instanceof Uint8Array ? data : new Uint8Array(data);
  const length = FIXED_HEADER + payload.length;
  const category = cmd & 0xFF;
  const subcommand = (cmd >> 8) & 0xFF;
  const varintBytes = writeVarint(length);

  const frame = new Uint8Array(1 + varintBytes.length + length);
  let pos = 0;

  frame[pos++] = SOF;
  frame.set(varintBytes, pos);
  pos += varintBytes.length;

  frame[pos++] = flag;
  frame[pos++] = 0x00; // pad
  frame[pos++] = category;
  frame[pos++] = subcommand;
  frame[pos++] = seq & 0xFF;
  frame[pos++] = payload.length & 0xFF;
  frame[pos++] = (payload.length >> 8) & 0xFF;

  if (payload.length > 0) {
    frame.set(payload, pos);
  }

  return frame;
}

/**
 * ANC set frame builder.
 * Accepts mode number (0x01, 0x02, 0x08) or mode string ('off', 'transparent', 'anc', etc.)
 */
export function ancFrame(mode: number | string, seq: number = 0x01): Uint8Array {
  let modeByte: number;
  if (typeof mode === 'string') {
    const key = mode.toLowerCase();
    if (!(key in ANC_SET_VALUES)) {
      const choices = Object.keys(ANC_SET_VALUES).sort().join(', ');
      throw new Error(`unknown ANC mode ${JSON.stringify(mode)}; choose ${choices}`);
    }
    modeByte = ANC_SET_VALUES[key];
  } else {
    modeByte = mode & 0xFF;
  }

  return encode(CMD_ANC_SET, new Uint8Array([0x01, 0x01, modeByte]), seq);
}

/**
 * ANC status query frame.
 */
export function ancStatusFrame(seq: number = 0x01): Uint8Array {
  return encode(CMD_ANC_STATUS, new Uint8Array([0x01, 0x01]), seq);
}

/**
 * Battery query frame.
 */
export function batteryFrame(seq: number = 0x01): Uint8Array {
  return encode(CMD_BATTERY, new Uint8Array(0), seq);
}

/**
 * Firmware query frame.
 */
export function firmwareFrame(seq: number = 0x01): Uint8Array {
  return encode(CMD_FIRMWARE, new Uint8Array(0), seq);
}

/**
 * Gestures query frame.
 */
export function gesturesFrame(seq: number = 0x01): Uint8Array {
  return encode(CMD_GESTURES, new Uint8Array(0), seq);
}

/**
 * Device info query frame.
 */
export function deviceInfoFrame(seq: number = 0x01): Uint8Array {
  return encode(CMD_DEVICE_INFO, new Uint8Array(0), seq);
}
