'use strict';

// pkg run setup 용 체인 러너. pkg run이 && 미지원이라 별도 스크립트로 순차 실행.
// Linux / macOS / Windows 공통.

const process = require('process');
const path = require('path');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);

const steps = [
  ['setup',   path.join(APP_DIR, 'api', 'setup.js')],
  ['install', path.join(APP_DIR, 'api', 'install.js')],
  ['start',   path.join(APP_DIR, 'api', 'start.js')],
];

for (const [name, script] of steps) {
  console.println('');
  console.println('══ ' + name + ' ══');
  const exitCode = process.exec(script);
  if (exitCode !== 0) {
    console.println('FAILED at ' + name + ' (exit ' + exitCode + ')');
    process.exit(exitCode);
  }
}

console.println('');
console.println('✓ all steps completed');
