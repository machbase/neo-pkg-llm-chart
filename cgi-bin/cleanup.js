'use strict';

// pkg run uninstall: 서비스 중지 + 서비스 등록 제거.
// 패키지 디렉토리는 수동으로 rm -rf 해야 함 (의도적).

const process = require('process');

const SERVICE_NAME = 'neo-pkg-llm';

// 1. 서비스 중지 (실패해도 무시 — 이미 중지 상태일 수 있음)
console.println('══ stop service ══');
process.exec('servicectl', 'stop', SERVICE_NAME);

// 2. 서비스 등록 제거
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
