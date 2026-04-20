'use strict';

const path = require('path');
const process = require('process');
const fs = require('fs');
const service = require('service');

const os = require('os');

const ROOT = path.resolve(path.dirname(process.argv[1]));
const LLM_DIR = path.join(ROOT, 'llm');
const SERVICE_NAME = 'neo-llm';
const IS_WIN = os.platform() === 'windows';
const EXECUTABLE = path.join(LLM_DIR, IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm');

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
  service.start(SERVICE_NAME, (err) => {
    if (err) {
      reply({ ok: false, reason: err.message || String(err) });
    } else {
      reply({ ok: true, data: { name: SERVICE_NAME } });
    }
  });
}
