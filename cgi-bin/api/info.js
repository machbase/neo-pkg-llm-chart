'use strict';

// LLM 바이너리 포트 반환 (하드코딩). 프론트가 API_BASE 구성 시 사용.
// sys.json 없어도 동작 → 첫 접속 시 settings 탭으로 분기 가능.

const process = require('process');

function reply(data) {
  const body = JSON.stringify(data);
  process.stdout.write('Content-Type: application/json\r\n');
  process.stdout.write('\r\n');
  process.stdout.write(body);
}

reply({ ok: true, data: { port: '8884' } });
