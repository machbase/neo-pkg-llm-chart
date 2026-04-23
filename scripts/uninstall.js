'use strict';

// pkg run uninstall:
//   1) 바이너리 강제 종료 (port 우선 해방)
//   2) service.stop
//   3) service.uninstall

var process = require('process');
var service = require('service');
var os = require('os');

var SERVICE_NAME = 'neo-pkg-llm';
var IS_WIN = os.platform() === 'windows';
var BIN_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';

function killBinary() {
  try {
    if (IS_WIN) {
      process.exec('@taskkill', '/F', '/IM', BIN_NAME);
    } else {
      process.exec('@pkill', '-x', BIN_NAME);
    }
  } catch (e) {}
}

// ── 1. 바이너리 강제 종료 (선제적 — port 해방 보장) ──
console.println('killing binary:', BIN_NAME);
killBinary();

// ── 2. service.stop ──
console.println('stopping service:', SERVICE_NAME);
service.stop(SERVICE_NAME, function(stopErr) {
  if (stopErr) {
    console.println('WARN stop:', stopErr.message);
  } else {
    console.println('service stopped.');
  }

  // ── 3. service.uninstall ──
  console.println('uninstalling service:', SERVICE_NAME);
  service.uninstall(SERVICE_NAME, function(err) {
    if (err) {
      console.println('WARN uninstall:', err.message);
    } else {
      console.println('service uninstalled.');
    }
    console.println('✓ done');
  });
});
