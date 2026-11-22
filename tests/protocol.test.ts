import { describe, it, expect } from 'vitest';
import * as p from '../src/protocol';

// Exact real captures from repo/tests/test_protocol.py
const ANC_SET = "aa0a00000404010300010108";
const ANC_ACK = "aa080000048401010000";
const ANC_QUERY = "aa0900000c011002000101";
const ANC_STATUS = "aa0b00000c8110040000010101";
const BATTERY_QUERY = "aa0700000601110000";
const BATTERY_REPLY = "aa0f000006811108000003026401640300";
const BATTERY_PUSH = "aa0f080004021b08000103015002500300";
const FIRMWARE_QUERY = "aa0700000501100000";
const FIRMWARE_REPLY =
  "aa2200000581101b000002312c322c312e312e302e34372c" +
  "322c322c312e312e302e3437";
const GESTURE_QUERY = "aa0700000801100000";
const GESTURE_REPLY =
  "aa2100000881101a000006010102010101030601010408" +
  "020102010201030602010408";
const DEVICE_INFO = "aa0b0000048105040000313134";

describe('Encode Tests', () => {
  it('encodes anc set frame correctly', () => {
    expect(p.toHex(p.ancFrame("anc", 0x01))).toBe(ANC_SET);
    expect(p.toHex(p.ancFrame(0x08, 0x01))).toBe(ANC_SET);
  });

  it('encodes battery query frame correctly', () => {
    expect(p.toHex(p.batteryFrame(0x11))).toBe(BATTERY_QUERY);
  });

  it('encodes firmware query frame correctly', () => {
    expect(p.toHex(p.firmwareFrame(0x10))).toBe(FIRMWARE_QUERY);
  });

  it('encodes gesture query frame correctly', () => {
    expect(p.toHex(p.gesturesFrame(0x10))).toBe(GESTURE_QUERY);
  });

  it('encodes ANC status query correctly', () => {
    expect(p.toHex(p.ancStatusFrame(0x10))).toBe(ANC_QUERY);
  });

  it('large payload uses two-byte varint', () => {
    // 256 bytes + 14 bytes = 270 bytes payload
    const payload = new Uint8Array(270);
    for (let i = 0; i < 256; i++) payload[i] = i;
    for (let i = 256; i < 270; i++) payload[i] = 0;

    const frame = p.encode(p.CMD_SETTINGS, payload, 0x10);
    expect(p.toHex(frame.slice(0, 4))).toBe("aa950200");
    expect(frame.length).toBe(280);

    const decoded = p.decode(frame);
    expect(p.toHex(decoded.data)).toBe(p.toHex(payload));
  });
});

describe('Decode Tests', () => {
  it('decodes ANC ack', () => {
    const frame = p.decode(p.fromHex(ANC_ACK));
    expect(frame.isResponse).toBe(true);
    expect(frame.isPush).toBe(false);
    expect(frame.baseCmd).toBe(p.CMD_ANC_SET);
    expect(frame.data).toEqual(new Uint8Array([0x00]));
    expect(frame.seq).toBe(0x01);
  });

  it('decodes battery reply', () => {
    const frame = p.decode(p.fromHex(BATTERY_REPLY));
    expect(frame.baseCmd).toBe(p.CMD_BATTERY);
    const levels = p.parseBattery(frame.data);
    expect(levels.map(x => ({ index: x.index, percent: x.percent, charging: x.charging }))).toEqual([
      { index: 2, percent: 100, charging: false },
      { index: 1, percent: 100, charging: false },
      { index: 3, percent: 0, charging: false },
    ]);
  });

  it('decodes battery push', () => {
    const frame = p.decode(p.fromHex(BATTERY_PUSH));
    expect(frame.isPush).toBe(true);
    expect(frame.baseCmd).toBe(p.CMD_BATTERY_PUSH);
    const levels = p.parseBattery(frame.data);
    expect(levels.map(x => ({ index: x.index, percent: x.percent, charging: x.charging }))).toEqual([
      { index: 1, percent: 80, charging: false },
      { index: 2, percent: 80, charging: false },
      { index: 3, percent: 0, charging: false },
    ]);
  });

  it('decodes firmware reply', () => {
    const frame = p.decode(p.fromHex(FIRMWARE_REPLY));
    expect(frame.baseCmd).toBe(p.CMD_FIRMWARE);
    expect(p.parseFirmware(frame.data)).toEqual([
      "1", "2", "1.1.0.47", "2", "2", "1.1.0.47"
    ]);
  });

  it('decodes gesture reply', () => {
    const frame = p.decode(p.fromHex(GESTURE_REPLY));
    expect(frame.baseCmd).toBe(p.CMD_GESTURES);
    const rows = p.parseGestures(frame.data);
    expect(rows.length).toBe(6);
    expect(rows[0]).toEqual({
      side: 1,
      sideName: 'left',
      gestureType: 0x0201,
      typeName: 'double',
      action: 1,
      actionName: 'Play / Pause'
    });
    expect(rows[rows.length - 1]).toEqual({
      side: 2,
      sideName: 'right',
      gestureType: 0x0401,
      typeName: 'hold',
      action: 8,
      actionName: 'ANC / Transparency Toggle'
    });
  });

  it('decodes ANC status', () => {
    const frame = p.decode(p.fromHex(ANC_STATUS));
    expect(frame.baseCmd).toBe(p.CMD_ANC_STATUS);
    expect(p.parseAncMode(frame.data)).toBe(0x01);
  });

  it('decodes device info', () => {
    const frame = p.decode(p.fromHex(DEVICE_INFO));
    expect(frame.baseCmd).toBe(p.CMD_DEVICE_INFO);
    expect(p.parseAscii(frame.data, 1)).toBe("114");
  });

  it('handles partial stream and reassembly', () => {
    const first = p.fromHex(ANC_QUERY);
    const second = p.batteryFrame(0x11);

    // Feed first + partial 5 bytes of second
    const combined1 = new Uint8Array(first.length + 5);
    combined1.set(first);
    combined1.set(second.slice(0, 5), first.length);

    const { frames: frames1, remainder: rem1 } = p.decodeStream(combined1);
    expect(frames1.length).toBe(1);
    expect(frames1[0].baseCmd).toBe(p.CMD_ANC_STATUS);
    expect(p.toHex(rem1)).toBe(p.toHex(second.slice(0, 5)));

    // Feed remaining bytes of second
    const combined2 = new Uint8Array(rem1.length + (second.length - 5));
    combined2.set(rem1);
    combined2.set(second.slice(5), rem1.length);

    const { frames: frames2, remainder: rem2 } = p.decodeStream(combined2);
    expect(frames2.length).toBe(1);
    expect(frames2[0].baseCmd).toBe(p.CMD_BATTERY);
    expect(rem2.length).toBe(0);
  });

  it('skips garbage before SOF', () => {
    const garbage = new Uint8Array([0x00, 0xFF, 0x12, 0x34]);
    const frameBytes = p.fromHex(ANC_ACK);
    const stream = new Uint8Array(garbage.length + frameBytes.length);
    stream.set(garbage);
    stream.set(frameBytes, garbage.length);

    const { frames, remainder } = p.decodeStream(stream);
    expect(frames.length).toBe(1);
    expect(frames[0].baseCmd).toBe(p.CMD_ANC_SET);
    expect(remainder.length).toBe(0);
  });

  it('rejects frame with invalid length', () => {
    const bad = new Uint8Array(p.fromHex(ANC_ACK));
    bad[7] = 0x02; // payload length altered
    expect(() => p.decode(bad)).toThrow();
  });
});
