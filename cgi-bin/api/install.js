'use strict';

const path = require('path');
const process = require('process');
const fs = require('fs');
const service = require('service');

// JSH 가상 경로 그대로 사용 — 서비스 프레임워크가 내부적으로 번역
// APP_DIR = /work/public/<pkg>/cgi-bin  (argv[1] 에서 cgi-bin 까지 추출)
const ARGV1 = process.argv[1];
const APP_DIR = ARGV1.slice(0, ARGV1.lastIndexOf('/cgi-bin/') + '/cgi-bin'.length);
const LLM_DIR = path.join(APP_DIR, 'llm');
const LAUNCHER = path.join(APP_DIR, 'llm-launcher.js');
const SERVICE_NAME = 'neo-pkg-llm';

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
} else if (!fs.existsSync(LAUNCHER)) {
  reply({ ok: false, reason: 'launcher not found: ' + LAUNCHER });
} else {
  service.install({
    name: SERVICE_NAME,
    enable: false,
    working_dir: LLM_DIR,
    executable: LAUNCHER,
  }, (err) => {
    if (err) {
      reply({ ok: false, reason: err.message || String(err) });
    } else {
      reply({ ok: true, data: { name: SERVICE_NAME } });
    }
  });
}
