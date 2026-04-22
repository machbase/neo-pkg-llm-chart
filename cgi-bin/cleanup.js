'use strict';

// pkg run uninstall: 서비스 중지 + 바이너리 프로세스 강제 종료 + 서비스 등록 제거.

const process = require('process');
const os = require('os');

const SERVICE_NAME = 'neo-pkg-llm';
const IS_WIN = os.platform() === 'windows';
const BIN_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';

// 1. 서비스 중지 (servicectl — 실패해도 계속)
console.println('══ stop service ══');
try { process.exec('servicectl', 'stop', SERVICE_NAME); } catch (e) {}

// 2. 바이너리 프로세스 강제 종료
//    Windows: launcher 죽여도 손자 neo-pkg-llm.exe가 orphan으로 남음 → taskkill로 확실히 제거
//    Linux/macOS: 이미 process group kill로 트리 제거되지만 안전장치로 pkill
console.println('');
console.println('══ kill binary process ══');
try {
  if (IS_WIN) {
    process.exec('@taskkill', '/F', '/IM', BIN_NAME);
  } else {
    process.exec('@pkill', '-f', BIN_NAME);
  }
} catch (e) {
  console.println('kill skipped:', e.message || String(e));
}

// 3. 서비스 등록 제거
console.println('');
console.println('══ uninstall service ══');
const uninstCode = process.exec('servicectl', 'uninstall', SERVICE_NAME);
if (uninstCode !== 0) {
  console.println('FAILED: uninstall returned ' + uninstCode);
  process.exit(uninstCode);
}

console.println('');
console.println('✓ service removed');
console.println('service: ' + SERVICE_NAME);
