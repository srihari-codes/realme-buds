import { BluetoothSerialTransport } from './transport';
import { MockTransport } from './mock-transport';
import { DeviceDiscovery } from './device-discovery';
import { ProtocolController } from '../protocol/commands';
import {
  BatteryLevel,
  GestureRow,
  DecodedFrame
} from '../protocol/types';
import {
  CMD_BATTERY_PUSH,
  CMD_HEARTBEAT,
  CMD_ANC_STATUS,
  ANC_MODES
} from '../protocol/constants';
import { parseBattery, parseAncMode } from '../protocol/parser';
import { diagnostics } from './diagnostics';

export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

export interface BudsState {
  connectionState: ConnectionState;
  isSimulated: boolean;
  deviceName: string;
  ancMode: number | null;
  ancModeName: string;
  battery: {
    left?: BatteryLevel;
    right?: BatteryLevel;
    case?: BatteryLevel;
    raw: BatteryLevel[];
    lastUpdated?: Date;
  };
  firmware: {
    versions: string[];
    raw: string;
    lastUpdated?: Date;
  };
  gestures: {
    rows: GestureRow[];
    lastUpdated?: Date;
  };
  deviceInfo: {
    model: string;
    lastUpdated?: Date;
  };
  lastError: string | null;
  lastCommunication: Date | null;
}

export type StateChangeListener = (state: BudsState) => void;

export class BudsConnection {
  private static instance: BudsConnection;
  private transport: BluetoothSerialTransport | MockTransport;
  private controller: ProtocolController;
  private isSimulated = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: Set<StateChangeListener> = new Set();

  private state: BudsState = {
    connectionState: 'disconnected',
    isSimulated: false,
    deviceName: 'Buds T200',
    ancMode: null,
    ancModeName: 'Unknown',
    battery: {
      raw: []
    },
    firmware: {
      versions: [],
      raw: ''
    },
    gestures: {
      rows: []
    },
    deviceInfo: {
      model: ''
    },
    lastError: null,
    lastCommunication: null
  };

  private constructor() {
    this.transport = new BluetoothSerialTransport();
    this.controller = new ProtocolController(this.transport);
    this.setupTransportHandlers();
  }

  public static getInstance(): BudsConnection {
    if (!BudsConnection.instance) {
      BudsConnection.instance = new BudsConnection();
    }
    return BudsConnection.instance;
  }

  private setupTransportHandlers() {
    this.transport.onDisconnect(() => {
      diagnostics.log('bluetooth', 'warn', 'Device transport disconnected');
      this.updateState({
        connectionState: 'disconnected',
        lastCommunication: new Date()
      });
      this.stopPolling();
    });

    this.transport.onError((err) => {
      diagnostics.log('bluetooth', 'error', `Transport error: ${err.message}`);
      this.updateState({
        connectionState: 'error',
        lastError: err.message,
        lastCommunication: new Date()
      });
    });

    // Handle unsolicited push notifications
    this.controller.onPush((frame: DecodedFrame) => {
      this.handleDevicePush(frame);
    });
  }

  private handleDevicePush(frame: DecodedFrame) {
    this.updateState({ lastCommunication: new Date() });

    if (frame.baseCmd === CMD_BATTERY_PUSH) {
      const levels = parseBattery(frame.data);
      diagnostics.log('protocol', 'success', 'Received unsolicited battery push', levels);
      this.updateBatteryLevels(levels);
    } else if (frame.baseCmd === CMD_HEARTBEAT) {
      diagnostics.log('protocol', 'info', 'Received heartbeat ping');
    } else if (frame.baseCmd === CMD_ANC_STATUS) {
      const mode = parseAncMode(frame.data);
      if (mode !== null) {
        diagnostics.log('protocol', 'info', `ANC push update: mode=0x${mode.toString(16)}`);
        this.updateState({
          ancMode: mode,
          ancModeName: ANC_MODES[mode] || `0x${mode.toString(16)}`
        });
      }
    }
  }

  public getState(): BudsState {
    return { ...this.state };
  }

  public subscribe(listener: StateChangeListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private updateState(partial: Partial<BudsState>) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      try {
        listener(this.getState());
      } catch (err) {
        console.error("Error in state subscriber:", err);
      }
    }
  }

  /**
   * Connect to wireless earbuds using Web Serial over Bluetooth Classic.
   */
  public async connect(mode: 'auto' | 'filtered' | 'unfiltered' = 'auto'): Promise<void> {
    if (this.state.connectionState === 'connecting' || this.state.connectionState === 'connected') {
      return;
    }

    this.updateState({
      connectionState: 'connecting',
      isSimulated: false,
      lastError: null
    });

    try {
      diagnostics.log('bluetooth', 'info', `Initiating device connection (mode: ${mode})...`);
      const port = await DeviceDiscovery.requestPort(mode);
      
      const realTransport = new BluetoothSerialTransport(port);
      this.transport = realTransport;
      this.controller = new ProtocolController(realTransport);
      this.setupTransportHandlers();
      this.isSimulated = false;

      await realTransport.open(115200);

      this.updateState({
        connectionState: 'connected',
        isSimulated: false,
        lastCommunication: new Date()
      });

      diagnostics.log('bluetooth', 'success', 'Connected to wireless earbuds');

      // Fetch initial device state
      await this.refreshAll();

      // Start periodic status poll (battery & ANC status every 30 seconds)
      this.startPolling();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      diagnostics.log('bluetooth', 'error', `Connection failed: ${errorMsg}`);
      this.updateState({
        connectionState: 'disconnected',
        lastError: errorMsg
      });
      throw err;
    }
  }

  /**
   * Connect in Simulation Mode for testing & UI evaluation without hardware.
   */
  public async connectSimulation(): Promise<void> {
    this.updateState({
      connectionState: 'connecting',
      isSimulated: true,
      lastError: null
    });

    const mock = new MockTransport();
    this.transport = mock;
    this.controller = new ProtocolController(mock);
    this.setupTransportHandlers();
    this.isSimulated = true;

    await mock.open();

    this.updateState({
      connectionState: 'connected',
      isSimulated: true,
      lastCommunication: new Date()
    });

    await this.refreshAll();
    this.startPolling();
  }

  public async disconnect(): Promise<void> {
    this.stopPolling();
    await this.transport.close();
    this.updateState({
      connectionState: 'disconnected',
      lastCommunication: new Date()
    });
  }

  /**
   * Set ANC mode.
   */
  public async setAnc(mode: 'off' | 'transparent' | 'anc' | number): Promise<{ success: boolean; status: number; message?: string }> {
    diagnostics.log('protocol', 'info', `Setting ANC mode to: ${mode}`);
    try {
      const res = await this.controller.setAnc(mode);
      if (res.success) {
        diagnostics.log('protocol', 'success', `ANC set acknowledged (status 0x00: OK)`);
        // Refresh ANC status to verify active mode
        await this.refreshAncStatus();
        return { success: true, status: 0 };
      } else {
        const errorMsg = res.status === 1
          ? "Device rejected ANC mode change (Status 1): Both earbuds must be taken out of the charging case and worn in your ears to activate Noise Cancellation or Transparency."
          : `Device rejected ANC mode change with status code: ${res.status}`;
        diagnostics.log('protocol', 'warn', errorMsg);
        return { success: false, status: res.status, message: errorMsg };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      diagnostics.log('protocol', 'error', 'Failed to set ANC mode', err);
      return { success: false, status: -1, message: msg };
    }
  }

  public async refreshAncStatus(): Promise<void> {
    try {
      const res = await this.controller.queryAncStatus();
      this.updateState({
        ancMode: res.mode,
        ancModeName: res.modeName,
        lastCommunication: new Date()
      });
    } catch (err) {
      diagnostics.log('protocol', 'warn', 'Failed to query ANC status', err);
    }
  }

  public async refreshBattery(): Promise<void> {
    try {
      const levels = await this.controller.queryBattery();
      this.updateBatteryLevels(levels);
    } catch (err) {
      diagnostics.log('protocol', 'warn', 'Failed to query battery levels', err);
    }
  }

  private updateBatteryLevels(levels: BatteryLevel[]) {
    let left: BatteryLevel | undefined;
    let right: BatteryLevel | undefined;
    let cse: BatteryLevel | undefined;

    for (const lvl of levels) {
      if (lvl.index === 1) left = lvl;
      else if (lvl.index === 2) right = lvl;
      else if (lvl.index === 3) cse = lvl;
    }

    this.updateState({
      battery: {
        left: left || this.state.battery.left,
        right: right || this.state.battery.right,
        case: cse || this.state.battery.case,
        raw: levels,
        lastUpdated: new Date()
      },
      lastCommunication: new Date()
    });
  }

  public async refreshFirmware(): Promise<void> {
    try {
      const tokens = await this.controller.queryFirmware();
      this.updateState({
        firmware: {
          versions: tokens,
          raw: tokens.join(', '),
          lastUpdated: new Date()
        },
        lastCommunication: new Date()
      });
    } catch (err) {
      diagnostics.log('protocol', 'warn', 'Failed to query firmware version', err);
    }
  }

  public async refreshGestures(): Promise<void> {
    try {
      const rows = await this.controller.queryGestures();
      this.updateState({
        gestures: {
          rows,
          lastUpdated: new Date()
        },
        lastCommunication: new Date()
      });
    } catch (err) {
      diagnostics.log('protocol', 'warn', 'Failed to query gestures', err);
    }
  }

  public async refreshDeviceInfo(): Promise<void> {
    try {
      const info = await this.controller.queryDeviceInfo();
      this.updateState({
        deviceInfo: {
          model: info,
          lastUpdated: new Date()
        },
        lastCommunication: new Date()
      });
    } catch (err) {
      diagnostics.log('protocol', 'warn', 'Failed to query device info', err);
    }
  }

  public async refreshAll(): Promise<void> {
    diagnostics.log('protocol', 'info', 'Refreshing all device attributes...');
    await this.refreshAncStatus();
    await this.refreshBattery();
    await this.refreshFirmware();
    await this.refreshGestures();
    await this.refreshDeviceInfo();
  }

  private startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      if (this.state.connectionState === 'connected') {
        try {
          await this.refreshAncStatus();
          await this.refreshBattery();
        } catch {
          // ignore background poll errors
        }
      }
    }, 30000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public getController(): ProtocolController {
    return this.controller;
  }
}

export const budsConnection = BudsConnection.getInstance();
