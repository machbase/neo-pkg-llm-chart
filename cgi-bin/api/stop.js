'use strict';

const process = require('process');
const os = require('os');
const service = require('service');

const SERVICE_NAME = 'neo-llm';
const IS_WIN = os.platform() === 'windows';
const BINARY_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';

function reply(data) {
  const body = JSON.stringify(data);
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body);
}

const method = (process.env.get('REQUEST_METHOD') || 'GET').toUpperCase();
if (method !== 'POST') {
  reply({ ok: false, reason: 'method not allowed' });
} else {
  if (IS_WIN) {
    process.exec('@taskkill', '/F', '/IM', BINARY_NAME);
  } else {
    process.exec('@pkill', '-f', BINARY_NAME);
  }
  reply({ ok: true, data: { name: SERVICE_NAME } });
}
