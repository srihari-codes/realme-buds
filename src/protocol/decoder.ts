import {
  SOF,
  FLAG_COMMAND,
  FLAG_PUSH,
  FIXED_HEADER,
  MAX_VARINT_BYTES
} from './constants';
import { ProtocolError, DecodedFrame, createDecodedFrame } from './types';

/**
 * Read a LEB128 varint from buffer at offset.
 * Returns { value: null, nextOffset: offset } when the buffer ends inside the varint,
 * allowing caller to keep the partial frame for the next read.
 */
export function readVarint(
  buf: Uint8Array,
  offset: number
): { value: number | null; nextOffset: number } {
  let value = 0;
  let shift = 0;
  const start = offset;

  while (offset < buf.length) {
    const byte = buf[offset++];
    value |= (byte & 0x7F) << shift;
    if ((byte & 0x80) === 0) {
      return { value, nextOffset: offset };
    }
    shift += 7;
    if (shift > 7 * (MAX_VARINT_BYTES - 1)) {
      throw new ProtocolError("length varint is too long");
    }
  }

  return { value: null, nextOffset: start };
}

/**
 * Decode every complete frame in buf.
 * Returns { frames, remainder }.
 * Any garbage between frames is skipped and trailing partial frames are preserved.
 */
export function decodeStream(buf: Uint8Array): {
  frames: DecodedFrame[];
  remainder: Uint8Array;
} {
  const data = buf;
  const frames: DecodedFrame[] = [];
  let i = 0;

  while (i < data.length) {
    if (data[i] !== SOF) {
      // Find next SOF
      let nxt = -1;
      for (let j = i + 1; j < data.length; j++) {
        if (data[j] === SOF) {
          nxt = j;
          break;
        }
      }
      if (nxt < 0) {
        return { frames, remainder: new Uint8Array(0) };
      }
      i = nxt;
      continue;
    }

    let length: number | null;
    let afterLen: number;

    try {
      const res = readVarint(data, i + 1);
      length = res.value;
      afterLen = res.nextOffset;
    } catch {
      i += 1;
      continue;
    }

    if (length === null) {
      // Need more bytes for the length varint
      break;
    }

    const varintLen = afterLen - (i + 1);
    const total = 1 + varintLen + length;

    if (length < FIXED_HEADER) {
      i += 1;
      continue;
    }

    if (i + total > data.length) {
      // Incomplete frame; keep it in remainder
      break;
    }

    if (afterLen + FIXED_HEADER > i + total) {
      i += 1;
      continue;
    }

    const flag = data[afterLen];
    const pad = data[afterLen + 1];
    const category = data[afterLen + 2];
    const subcommand = data[afterLen + 3];
    const seq = data[afterLen + 4];
    const dlen = data[afterLen + 5] | (data[afterLen + 6] << 8);

    const valid =
      pad === 0x00 &&
      (flag === FLAG_COMMAND || flag === FLAG_PUSH) &&
      length === FIXED_HEADER + dlen &&
      afterLen + FIXED_HEADER + dlen === i + total;

    if (!valid) {
      i += 1;
      continue;
    }

    const payloadStart = afterLen + FIXED_HEADER;
    const raw = data.slice(i, i + total);
    const payload = data.slice(payloadStart, payloadStart + dlen);
    const cmd = category | (subcommand << 8);

    frames.push(createDecodedFrame(flag, cmd, seq, payload, raw));
    i += total;
  }

  return {
    frames,
    remainder: data.slice(i)
  };
}

/**
 * Decode exactly one frame, raising ProtocolError otherwise.
 */
export function decode(data: Uint8Array): DecodedFrame {
  const { frames, remainder } = decodeStream(data);
  if (frames.length !== 1 || remainder.length > 0) {
    throw new ProtocolError("buffer is not exactly one complete frame");
  }
  return frames[0];
}
