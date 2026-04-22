'use strict';

// pkg run setup 체인 러너. pkg run이 && 체이닝 미지원이라 별도 스크립트로 순차 실행.
// install/start는 servicectl 직접 호출 (service 모듈은 CGI env 필요).

const process = require('process');
const path = require('path');

const SERVICE_NAME = 'neo-pkg-llm';
const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const LAUNCHER = path.join(APP_DIR, 'llm-launcher.js');
const LLM_DIR = path.join(APP_DIR, 'llm');

function step(name, fn) {
  console.println('');
  console.println('══ ' + name + ' ══');
  const code = fn();
  if (code !== 0) {
    console.println('FAILED at ' + name + ' (exit ' + code + ')');
    process.exit(code);
  }
}

// 1. 바이너리 다운로드
step('setup', () => process.exec(path.join(APP_DIR, 'api', 'setup.js')));

// 2. 서비스 등록 (servicectl 직접 호출 — SERVICE_CONTROLLER 셸 env 사용)
step('install', () => process.exec(
  'servicectl', 'install',
  '--name', SERVICE_NAME,
  '--executable', LAUNCHER,
  '--working-dir', LLM_DIR,
));

// 3. 서비스 시작
step('start', () => process.exec('servicectl', 'start', SERVICE_NAME));

console.println('');
console.println('✓ all steps completed');
console.println('service: ' + SERVICE_NAME);
console.println('launcher: ' + LAUNCHER);
