import { SPP_UUID } from '../protocol/constants';

export interface DiagnosticResult {
  isSecureContext: boolean;
  hasSerial: boolean;
  platform: 'android' | 'linux' | 'windows' | 'mac' | 'ios' | 'unknown';
  browser: 'chrome' | 'edge' | 'firefox' | 'safari' | 'opera' | 'unknown';
  browserVersion: string;
  isSupportedBrowser: boolean;
  canUseBluetoothSerial: boolean;
  notes: string[];
  recommendations: string[];
}

export interface DiagnosticLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'system' | 'serial' | 'protocol' | 'bluetooth';
  message: string;
  data?: unknown;
}

export class DiagnosticsManager {
  private static instance: DiagnosticsManager;
  private logs: DiagnosticLogEntry[] = [];
  private listeners: Set<(entry: DiagnosticLogEntry) => void> = new Set();

  private constructor() {}

  public static getInstance(): DiagnosticsManager {
    if (!DiagnosticsManager.instance) {
      DiagnosticsManager.instance = new DiagnosticsManager();
    }
    return DiagnosticsManager.instance;
  }

  public log(
    category: DiagnosticLogEntry['category'],
    level: DiagnosticLogEntry['level'],
    message: string,
    data?: unknown
  ) {
    const entry: DiagnosticLogEntry = {
      timestamp: new Date(),
      category,
      level,
      message,
      data
    };
    this.logs.unshift(entry);
    if (this.logs.length > 500) {
      this.logs.pop();
    }
    for (const listener of this.listeners) {
      try {
        listener(entry);
      } catch (err) {
        console.error("Error in log listener:", err);
      }
    }
  }

  public getLogs(): DiagnosticLogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }

  public onLog(listener: (entry: DiagnosticLogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Run runtime capability detection.
   */
  public inspectEnvironment(): DiagnosticResult {
    const isSecureContext = typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false;
    const hasSerial = typeof navigator !== 'undefined' && 'serial' in navigator;

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    
    // Platform detection
    let platform: DiagnosticResult['platform'] = 'unknown';
    if (/android/.test(userAgent)) {
      platform = 'android';
    } else if (/linux/.test(userAgent)) {
      platform = 'linux';
    } else if (/win/.test(userAgent)) {
      platform = 'windows';
    } else if (/macintosh|mac os x/.test(userAgent)) {
      platform = 'mac';
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      platform = 'ios';
    }

    // Browser detection
    let browser: DiagnosticResult['browser'] = 'unknown';
    let browserVersion = '';
    const chromeMatch = userAgent.match(/chrome\/([0-9.]+)/);
    const edgMatch = userAgent.match(/edg\/([0-9.]+)/);
    const firefoxMatch = userAgent.match(/firefox\/([0-9.]+)/);
    const safariMatch = userAgent.match(/version\/([0-9.]+).*safari/);

    if (edgMatch) {
      browser = 'edge';
      browserVersion = edgMatch[1];
    } else if (chromeMatch) {
      browser = 'chrome';
      browserVersion = chromeMatch[1];
    } else if (firefoxMatch) {
      browser = 'firefox';
      browserVersion = firefoxMatch[1];
    } else if (safariMatch) {
      browser = 'safari';
      browserVersion = safariMatch[1];
    }

    const majorVersion = parseInt(browserVersion.split('.')[0] || '0', 10);
    const isChromeOrChromium = browser === 'chrome' || browser === 'edge';
    const isSupportedBrowser = isChromeOrChromium && hasSerial;

    const notes: string[] = [];
    const recommendations: string[] = [];

    if (!isSecureContext) {
      notes.push("Page is not served over HTTPS or localhost. Web Serial requires a Secure Context.");
      recommendations.push("Access this application via HTTPS or http://localhost.");
    }

    if (!hasSerial) {
      notes.push("navigator.serial is not supported in this browser.");
      if (platform === 'ios') {
        recommendations.push("iOS Safari does not support the Web Serial or Web Bluetooth SPP APIs.");
      } else if (browser === 'firefox' || browser === 'safari') {
        recommendations.push("Please open this app in Google Chrome or Microsoft Edge.");
      } else if (platform === 'android') {
        recommendations.push("On Android, Web Serial over Bluetooth Classic RFCOMM requires Chrome 138+ or desktop Chrome.");
      }
    } else {
      notes.push("navigator.serial is available.");
    }

    // Platform specific notes
    let canUseBluetoothSerial = isSupportedBrowser && isSecureContext;

    if (platform === 'android') {
      if (majorVersion >= 138) {
        notes.push(`Android Chrome v${majorVersion} supports Web Serial Bluetooth RFCOMM.`);
      } else {
        notes.push(`Android Chrome v${browserVersion} may have experimental or partial RFCOMM support.`);
        recommendations.push("Update Chrome to version 138+ or enable chrome://flags/#enable-web-serial-on-android if available.");
      }
      recommendations.push("1. Make sure your earbuds are paired and connected in Android Bluetooth settings first.");
      recommendations.push("2. When prompted, select your earbuds in the browser chooser.");
    } else if (platform === 'linux') {
      notes.push("Desktop Chrome on Linux supports Web Serial.");
      recommendations.push("If the buds don't appear in the Bluetooth list, bind RFCOMM via: sudo rfcomm bind 0 <MAC> 1, which provides /dev/rfcomm0.");
      recommendations.push("Ensure your user account has permissions for serial devices (sudo usermod -a -G dialout $USER).");
    } else if (platform === 'windows') {
      notes.push("Windows automatically binds paired SPP devices to virtual COM ports.");
      recommendations.push("Ensure buds are paired in Windows Settings. Select the Standard Serial over Bluetooth link port.");
    }

    return {
      isSecureContext,
      hasSerial,
      platform,
      browser,
      browserVersion,
      isSupportedBrowser,
      canUseBluetoothSerial,
      notes,
      recommendations
    };
  }

  public exportDiagnostics(): string {
    const env = this.inspectEnvironment();
    return JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        environment: env,
        targetUuid: SPP_UUID,
        recentLogs: this.logs.slice(0, 50)
      },
      null,
      2
    );
  }
}

export const diagnostics = DiagnosticsManager.getInstance();
