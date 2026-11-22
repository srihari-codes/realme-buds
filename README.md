# Buds Controller

A lightweight, zero-installation Progressive Web Application (PWA) designed to manage wireless earbuds over Bluetooth Classic Serial Port Profile (SPP / RFCOMM) using the modern browser Web Serial API.

---

## Highlights

- **Pure Web Implementation:** Operates entirely client-side using standard web APIs. No proprietary apps, accounts, or background drivers required.
- **VisionOS-Inspired Liquid Glass UI:** Single-view mobile-first experience with dynamic 3D glassmorphism, responsive viewport scaling, and subtle ambient lighting for each listening mode.
- **Active Noise Cancellation Control:** Instant switching between Noise Cancellation, Transparency Mode, and Off.
- **Live Battery Telemetry:** Real-time percentage levels and charging indicators for the left earbud, right earbud, and charging case.
- **Cross-Platform:** Runs in Chromium browsers across Android, Linux, macOS, and Windows.

---

## System Architecture

```
[ Browser (Chrome / Chromium) ]
              │
      (Web Serial API)
              │
  Bluetooth Classic RFCOMM (SPP)
   UUID: 00001101-0000-1000-8000-00805f9b34fb
              │
    [ Wireless Earbuds ]
```

### Connection Flow

1. **Android (Chrome 138+):**
   - Pair the earbuds in system Bluetooth settings.
   - Toggle system Location ON (required by Android for Bluetooth discovery).
   - In the app, tap the Connect orb and select **For Android**.
   - Pick the earbuds from the browser chooser.

2. **Desktop (Linux / Windows / macOS):**
   - Pair the earbuds in Bluetooth settings.
   - Tap **For PC** to initiate SPP communication over the standard serial link.

---

## Project Structure

```
├── src/
│   ├── bluetooth/       # Web Serial transport, connection manager, diagnostics
│   ├── components/      # MinimalConnect, MinimalDashboard, Toast
│   ├── hooks/           # Reactive React state hooks (useBuds)
│   ├── protocol/        # LEB128 varint framing, packet encoder/decoder/parser
│   ├── styles/          # Liquid glass and spatial styling (Tailwind CSS)
│   ├── App.tsx          # Single-page application orchestrator
│   └── main.tsx         # PWA entry point
├── tests/               # Protocol and Bluetooth integration test suites
├── public/              # Web app icons and manifest
├── index.html           # Viewport configuration
└── package.json         # Project scripts and dependencies
```

---

## Development

```bash
# Install dependencies
bun install

# Start local dev server
bun run dev

# Run unit and integration tests
bun test

# Build for production
bun run build
```

---

## License

This project is open source and available under the terms of the MIT License.
