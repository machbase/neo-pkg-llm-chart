'use strict';

// JSH 런타임에서 실행됨. cgi-bin/config.json의 port를 읽어 -port 로 전달하고,
// -config는 configs/ 밖 경로(_boot.json)로 지정하여 Manager가 sys.json을
// 자동 생성하지 않도록 한다. Linux / macOS / Windows 공통 지원.

const process = require('process');
const pathLib = require('path');
const os = require('os');
const fs = require('fs');

const IS_WIN = os.platform() === 'windows';
const posix = pathLib;
const hostPath = IS_WIN ? pathLib.win32 : pathLib;

// ── JSH 가상경로 (POSIX 고정) ──
const SCRIPT_DIR = posix.resolve(posix.dirname(process.argv[1])); // /work/.../cgi-bin
const LLM_DIR = posix.join(SCRIPT_DIR, 'llm');                    // /work/.../cgi-bin/llm
const CONFIG_JSON = posix.join(SCRIPT_DIR, 'config.json');        // cgi-bin/config.json
const BIN_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';

// ── port 읽기 (없으면 기본 8884) ──
let port = '8884';
try {
  if (fs.existsSync(CONFIG_JSON)) {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_JSON, { encoding: 'utf8' }));
    if (cfg && cfg.server && cfg.server.port) port = String(cfg.server.port);
  }
} catch (e) {
  // 기본값 사용
}

// ── 호스트 경로 변환 ──
const hostWorkDir = hostPath.dirname(process.execPath);
const relFromWork = LLM_DIR.replace(/^\/work\//, '');
const hostLlmDir = hostPath.join(hostWorkDir, relFromWork);
const executable = hostPath.join(hostLlmDir, BIN_NAME);
// throwaway bootstrap — configs/ 밖이라 Manager.LoadAll 스캔 대상 아님
// → 사용자가 설정 저장하기 전까지 sys.json 자동 생성 안 됨 → 프론트는 settings 탭으로 분기
const bootConfig = hostPath.join(hostLlmDir, '_boot.json');

console.println('launching:', executable);
console.println('port:', port);
console.println('boot config:', bootConfig);
console.println('cwd:', hostLlmDir);

// 바이너리 Manager는 configs/ 를 cwd 기준 상대경로로 스캔하므로
// cwd = hostLlmDir (= cgi-bin/llm) 이어야 configs/sys.json이 올바른 위치에 생성됨.
var exitCode;
if (IS_WIN) {
  const script = `cd /d "${hostLlmDir}" && "${executable}" -port ${port} -config "${bootConfig}"`;
  exitCode = process.exec('@cmd.exe', '/C', script);
} else {
  const script = `cd "${hostLlmDir}" && exec "${executable}" -port "${port}" -config "${bootConfig}"`;
  exitCode = process.exec('@/bin/sh', '-c', script);
}
process.exit(exitCode);
