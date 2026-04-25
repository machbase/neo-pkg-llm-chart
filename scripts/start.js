'use strict';

// pkg run start — 패키지 관리 서비스 시작 (현재: neo-pkg-llm 1개).

var process = require('process');
var service = require('service');

var SERVICE_NAME = 'neo-pkg-llm';

console.println('starting service:', SERVICE_NAME);
service.start(SERVICE_NAME, function(err) {
  if (err) {
    console.println('ERROR:', err.message);
    process.exit(1);
    return;
  }
  console.println('service started.');
});
