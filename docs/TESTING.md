# Verification

## Automated

`npm test` checks codec preservation across 200 arbitrary 128-byte blocks, targeted edits,
fresh-state merges, invalid values, interface selection, wired/wireless chunking, concurrent
transaction serialization, timeouts, disconnects, unsolicited receiver messages, truncated or
mismatched responses, durable pre-write backup callbacks, and write verification.

`npm run test:e2e` checks the demo flow, invalid DPI handling, save/discard, performance switches,
backup download, language switching, mobile navigation, the connection guide, and unsupported
browser handling. No test in the default suite accesses hardware.

## Actual hardware — 8 November 2026

- Mouse: AULA V9 Ultra+, model configId `5`.
- Link: AULA 8K 2.4 GHz receiver, `320f:22a0`.
- Host: CachyOS Linux, Chromium via its actual WebHID implementation.
- Browser-native device permission was selected by the user.
- Read actual configuration, including active 1600 DPI and 2000 Hz polling.
- Used the panel to change an inactive stage from 400 to 450 DPI on both axes.
- Verified write echo and hardware readback; only offsets 16 and 18 changed.
- Restored the initial configuration and verified all 128 bytes matched the original.

Other models, wired mode, Windows and macOS remain unverified on hardware. Other settings use the
documented protocol and simulated tests; their physical behavior has not been exhaustively tested.

## Repeat the interactive hardware check

Start the dev server. Close other configuration software for this mouse, then run:

```sh
HARDWARE_TEST=1 node scripts/hardware-check.mjs
```

An installed Playwright Chromium is required; alternatively set `PLAYWRIGHT_EXECUTABLE_PATH`.
Select the mouse in the browser's native permission dialog. The test writes an inactive DPI stage,
reads it back, then restores the original block in a `finally` path. It saves the initial bytes,
result and screenshot under ignored `.hardware-check/`. Keep the receiver connected during the test.
