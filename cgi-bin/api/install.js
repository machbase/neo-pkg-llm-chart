'use strict';

const path = require('path');
const process = require('process');
const fs = require('fs');
const os = require('os');
const service = require('service');

const ROOT = path.resolve(path.dirname(process.argv[1]));
const LLM_DIR = path.join(ROOT, 'llm');
const SERVICE_NAME = 'neo-pkg-llm';
const LAUNCHER = path.join(ROOT, 'llm-launcher.js');

// JSH 가상 경로(/work/...) → 호스트 실제 경로 변환
// 서비스 프레임워크가 native OS chdir을 하려면 호스트 경로가 필요함
const IS_WIN = os.platform() === 'windows';
const hostWorkDir = path.dirname(process.execPath);
const workPrefix = IS_WIN ? /^[/\\]work[/\\]/ : /^\/work\//;
const hostLlmDir = path.join(hostWorkDir, LLM_DIR.replace(workPrefix, ''));
const hostLauncher = path.join(hostWorkDir, LAUNCHER.replace(workPrefix, ''));

function reply(data) {
  const body = JSON.stringify(data);
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body);
}

const method = (process.env.get('REQUEST_METHOD') || 'GET').toUpperCase();
if (method !== 'POST') {
  reply({ ok: false, reason: 'method not allowed' });
} else if (!fs.existsSync(LAUNCHER)) {
  reply({ ok: false, reason: 'launcher not found: ' + LAUNCHER });
} else {
  service.install({
    name: SERVICE_NAME,
    enable: false,
    working_dir: hostLlmDir,
    executable: hostLauncher,
  }, (err) => {
    if (err) {
      reply({ ok: false, reason: err.message || String(err) });
    } else {
      reply({ ok: true, data: { name: SERVICE_NAME } });
    }
  });
}
