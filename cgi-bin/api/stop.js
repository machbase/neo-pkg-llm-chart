'use strict';

const process = require('process');
const os = require('os');
const service = require('service');

const SERVICE_NAME = 'neo-pkg-llm';
const IS_WIN = os.platform() === 'windows';
const BINARY_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';

function reply(data) {
  const body = JSON.stringify(data);
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body);
}

// HTTP 호출은 POST만 허용. CLI 실행(env 없음)은 통과.
const method = (process.env.get('REQUEST_METHOD') || '').toUpperCase();
if (method !== '' && method !== 'POST') {
  reply({ ok: false, reason: 'method not allowed' });
} else {
  if (IS_WIN) {
    process.exec('@taskkill', '/F', '/IM', BINARY_NAME);
  } else {
    process.exec('@pkill', '-f', BINARY_NAME);
  }
  reply({ ok: true, data: { name: SERVICE_NAME } });
}
