'use strict';

const path = require('path');
const process = require('process');
const fs = require('fs');
const service = require('service');

const os = require('os');

const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const LLM_DIR = path.join(APP_DIR, 'llm');
const SERVICE_NAME = 'neo-pkg-llm';
const IS_WIN = os.platform() === 'windows';
const EXECUTABLE = path.join(LLM_DIR, IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm');

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
  service.start(SERVICE_NAME, (err) => {
    if (err) {
      reply({ ok: false, reason: err.message || String(err) });
    } else {
      reply({ ok: true, data: { name: SERVICE_NAME } });
    }
  });
}
