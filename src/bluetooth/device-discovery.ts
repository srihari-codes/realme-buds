import { SPP_UUID } from '../protocol/constants';
import { diagnostics } from './diagnostics';

export interface DiscoveredPortInfo {
  port: SerialPort;
  name: string;
  isBluetooth: boolean;
  serviceClassId?: string | number;
  usbVendorId?: number;
  usbProductId?: number;
}

export class DeviceDiscovery {
  /**
   * Check if Web Serial is supported in the current environment.
   */
  public static isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  /**
   * Retrieve all previously authorized ports from navigator.serial.getPorts().
   */
  public static async getAuthorizedPorts(): Promise<DiscoveredPortInfo[]> {
    if (!this.isSupported()) {
      return [];
    }

    try {
      const ports = await navigator.serial.getPorts();
      diagnostics.log('serial', 'info', `Found ${ports.length} previously authorized port(s)`);
      return ports.map(port => this.formatPortInfo(port));
    } catch (err) {
      diagnostics.log('serial', 'error', 'Failed to retrieve authorized ports', err);
      return [];
    }
  }

  /**
   * Request user to select a port.
   * mode:
   *  - 'auto': checks existing authorized ports first, tries SPP filter, then unfiltered fallback
   *  - 'filtered': uses explicit SPP filter
   *  - 'unfiltered': opens chooser with all paired Bluetooth & serial devices (best for Android)
   */
  public static async requestPort(mode: 'auto' | 'filtered' | 'unfiltered' = 'auto'): Promise<SerialPort> {
    if (!this.isSupported()) {
      throw new Error(
        "Web Serial API is not supported in this browser. Please use Google Chrome on Desktop or Android."
      );
    }

    // 1. If 'auto', check if port is already authorized in getPorts()
    if (mode === 'auto') {
      try {
        const authorized = await navigator.serial.getPorts();
        if (authorized.length > 0) {
          diagnostics.log('serial', 'info', `Found ${authorized.length} existing authorized port(s). Using most recent.`);
          return authorized[authorized.length - 1];
        }
      } catch (err) {
        console.warn("Could not check getPorts:", err);
      }
    }

    // 2. If 'unfiltered' (Android mode), request without strict filter
    if (mode === 'unfiltered') {
      diagnostics.log('serial', 'info', 'Requesting serial port in Android / Unfiltered mode');
      try {
        const port = await navigator.serial.requestPort({
          allowedBluetoothServiceClassIds: [SPP_UUID, "1101"]
        } as SerialPortRequestOptions);
        diagnostics.log('serial', 'success', 'User selected port in unfiltered mode');
        return port;
      } catch {
        // Fallback to bare requestPort()
        const rawPort = await navigator.serial.requestPort();
        diagnostics.log('serial', 'success', 'User selected port in raw mode');
        return rawPort;
      }
    }

    // 3. Otherwise try filtered first, then fallback
    diagnostics.log('serial', 'info', 'Requesting serial port with SPP filter', { uuid: SPP_UUID });

    try {
      const port = await navigator.serial.requestPort({
        allowedBluetoothServiceClassIds: [SPP_UUID, "1101"],
        filters: [
          { bluetoothServiceClassId: SPP_UUID }
        ]
      } as SerialPortRequestOptions);

      diagnostics.log('serial', 'success', 'User selected port with SPP filter');
      return port;
    } catch (firstErr: unknown) {
      const errMessage = firstErr instanceof Error ? firstErr.message : String(firstErr);
      diagnostics.log('serial', 'warn', `Filtered request prompt result: ${errMessage}. Trying unfiltered mode...`);

      // Try unfiltered mode before throwing
      try {
        const fallbackPort = await navigator.serial.requestPort({
          allowedBluetoothServiceClassIds: [SPP_UUID, "1101"]
        } as SerialPortRequestOptions);
        diagnostics.log('serial', 'success', 'User selected port via fallback chooser');
        return fallbackPort;
      } catch (fallbackErr) {
        try {
          const rawPort = await navigator.serial.requestPort();
          diagnostics.log('serial', 'success', 'User selected port via raw chooser');
          return rawPort;
        } catch {
          throw firstErr;
        }
      }
    }
  }

  public static formatPortInfo(port: SerialPort): DiscoveredPortInfo {
    const info = port.getInfo ? port.getInfo() : {} as SerialPortInfo;
    const isBluetooth = Boolean(info.bluetoothServiceClassId);
    let name = 'Serial Device';

    if (info.bluetoothServiceClassId) {
      const idStr = String(info.bluetoothServiceClassId);
      name = `Bluetooth SPP (${idStr.substring(0, 8)}...)`;
    } else if (info.usbVendorId) {
      name = `USB Device (0x${info.usbVendorId.toString(16)})`;
    }

    return {
      port,
      name,
      isBluetooth,
      serviceClassId: info.bluetoothServiceClassId,
      usbVendorId: info.usbVendorId,
      usbProductId: info.usbProductId
    };
  }
}
