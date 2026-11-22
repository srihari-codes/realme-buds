import { describe, it, expect } from 'vitest';
import { MockTransport } from '../src/bluetooth/mock-transport';
import { ProtocolController } from '../src/protocol/commands';
import { CMD_BATTERY_PUSH } from '../src/protocol/constants';
import { DecodedFrame } from '../src/protocol/types';

describe('Bluetooth Mock & ProtocolController Integration', () => {
  it('connects to mock transport and handles ANC commands', async () => {
    const mock = new MockTransport();
    const controller = new ProtocolController(mock);
    await mock.open();

    // Query ANC status - default simulated mode is ANC (0x08)
    const initialAnc = await controller.queryAncStatus();
    expect(initialAnc.mode).toBe(0x08);
    expect(initialAnc.modeName).toBe('ANC');

    // Change ANC to transparent (0x02)
    const setResult = await controller.setAnc('transparent');
    expect(setResult.success).toBe(true);

    // Verify changed state
    const updatedAnc = await controller.queryAncStatus();
    expect(updatedAnc.mode).toBe(0x02);
    expect(updatedAnc.modeName).toBe('transparent');

    // Change ANC to off (0x01)
    await controller.setAnc('off');
    const offAnc = await controller.queryAncStatus();
    expect(offAnc.mode).toBe(0x01);
    expect(offAnc.modeName).toBe('off');

    await mock.close();
  });

  it('queries battery levels accurately', async () => {
    const mock = new MockTransport();
    const controller = new ProtocolController(mock);
    await mock.open();

    const levels = await controller.queryBattery();
    expect(levels.length).toBe(3);

    const right = levels.find(l => l.index === 2);
    const left = levels.find(l => l.index === 1);
    const cse = levels.find(l => l.index === 3);

    expect(right?.name).toBe('right');
    expect(left?.name).toBe('left');
    expect(cse?.name).toBe('case');

    expect(right?.percent).toBe(90);
    expect(left?.percent).toBe(85);
    expect(cse?.percent).toBe(70);

    await mock.close();
  });

  it('queries firmware version and gesture rows', async () => {
    const mock = new MockTransport();
    const controller = new ProtocolController(mock);
    await mock.open();

    const fw = await controller.queryFirmware();
    expect(fw).toEqual(["1", "2", "1.1.0.47", "2", "2", "1.1.0.47"]);

    const gestures = await controller.queryGestures();
    expect(gestures.length).toBe(6);
    expect(gestures[0].sideName).toBe('left');
    expect(gestures[0].typeName).toBe('double');
    expect(gestures[0].action).toBe(1);

    const model = await controller.queryDeviceInfo();
    expect(model).toBe('114');

    await mock.close();
  });
});
