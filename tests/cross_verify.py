#!/usr/bin/env python3
"""Cross-verify protocol wire frame generation against verified hardware vectors."""

import sys
import subprocess
import json

def test_cross_equivalence():
    # Full wire frames (SOF + LEB128 len + flags + cmd + seq + dlen + payload)
    expected_frames = [
        ("anc_on", "aa0a00000404010300010108"),
        ("anc_off", "aa0a00000404020300010101"),
        ("anc_trans", "aa0a00000404030300010102"),
        ("anc_status", "aa0900000c011002000101"),
        ("battery_query", "aa0700000601110000"),
        ("firmware_query", "aa0700000501100000"),
        ("gestures_query", "aa0700000801100000"),
    ]
    
    # Run bun one-liner to get TypeScript/JS outputs
    js_code = """
    import * as p from './src/protocol/index.ts';
    const results = {
      anc_on: p.toHex(p.ancFrame('anc', 0x01)),
      anc_off: p.toHex(p.ancFrame('off', 0x02)),
      anc_trans: p.toHex(p.ancFrame('transparent', 0x03)),
      anc_status: p.toHex(p.ancStatusFrame(0x10)),
      battery_query: p.toHex(p.batteryFrame(0x11)),
      firmware_query: p.toHex(p.firmwareFrame(0x10)),
      gestures_query: p.toHex(p.gesturesFrame(0x10)),
    };
    console.log(JSON.stringify(results));
    """
    
    proc = subprocess.run(
        ["bun", "-e", js_code],
        capture_output=True,
        text=True,
        check=True
    )
    
    ts_results = json.loads(proc.stdout)
    
    all_matched = True
    print("[*] Protocol Wire Frame Cross-Verification:")
    for name, expected_hex in expected_frames:
        ts_hex = ts_results[name]
        match = (expected_hex.lower() == ts_hex.lower())
        mark = "✓ PASS" if match else "✗ FAIL"
        print(f"  {mark:8} {name:<16}: {ts_hex}")
        if not match:
            print(f"      EXPECTED: {expected_hex}")
            print(f"      RECEIVED: {ts_hex}")
            all_matched = False
            
    if all_matched:
        print("\nAll 7 wire frames verified byte-for-byte!")
    else:
        sys.exit(1)

if __name__ == "__main__":
    test_cross_equivalence()
