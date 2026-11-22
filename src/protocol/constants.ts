/**
 * Protocol constants for Bluetooth Classic SPP control of wireless earbuds.
 * Verified against live hardware and packet captures.
 */

export const SOF = 0xAA;
export const FLAG_COMMAND = 0x00;
export const FLAG_PUSH = 0x08;

export const FIXED_HEADER = 7;
export const MAX_VARINT_BYTES = 4;

export const SPP_UUID = "00001101-0000-1000-8000-00805f9b34fb";

// Core verified commands
export const CMD_DEVICE_INFO = 0x0104;
export const CMD_FIRMWARE = 0x0105;
export const CMD_BATTERY = 0x0106;
export const CMD_GESTURES = 0x0108;
export const CMD_ANC_STATUS = 0x010C;
export const CMD_BATTERY_PUSH = 0x0204;
export const CMD_SETTINGS = 0x0401;
export const CMD_ANC_SET = 0x0404;
export const CMD_HEARTBEAT = 0x050E;

export const COMMAND_NAMES: Record<number, string> = {
  [CMD_DEVICE_INFO]: "device info",
  [CMD_FIRMWARE]: "firmware",
  [CMD_BATTERY]: "battery",
  [CMD_GESTURES]: "gesture map",
  [CMD_ANC_STATUS]: "ANC status",
  [CMD_BATTERY_PUSH]: "battery push",
  [CMD_SETTINGS]: "settings table",
  [CMD_ANC_SET]: "ANC set",
  [CMD_HEARTBEAT]: "heartbeat",
};

/**
 * ANC mode byte values.
 * 0x01 (Off), 0x02 (Transparent), and 0x08 (ANC) are verified on the T200.
 */
export const ANC_MODES: Record<number, string> = {
  0x01: "off",
  0x02: "transparent",
  0x04: "ANC (mild)",
  0x08: "ANC",
  0x10: "ANC (moderate)",
  0x20: "adaptive",
};

export const ANC_SET_VALUES: Record<string, number> = {
  off: 0x01,
  normal: 0x01,
  transparent: 0x02,
  trans: 0x02,
  anc: 0x08,
  on: 0x08,
};

export const BATTERY_NAMES: Record<number, string> = {
  1: "left",
  2: "right",
  3: "case",
};

export const GESTURE_TYPES: Record<number, string> = {
  0x0201: "double",
  0x0301: "triple",
  0x0401: "hold",
};

export const SIDE_NAMES: Record<number, string> = {
  1: "left",
  2: "right",
};

export const GESTURE_ACTIONS: Record<number, string> = {
  1: "Play / Pause",
  6: "Next Track",
  8: "ANC / Transparency Toggle",
  11: "Previous Track",
  12: "Voice Assistant",
};
