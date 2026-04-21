'use strict';

const process = require('process');
const path = require('path');
const os = require('os');

// JSH 가상 경로 기준
const SCRIPT_DIR = path.resolve(path.dirname(process.argv[1]));
const LLM_DIR = path.join(SCRIPT_DIR, 'llm');
const IS_WIN = os.platform() === 'windows';
const BIN_NAME = IS_WIN ? 'neo-pkg-llm.exe' : 'neo-pkg-llm';
const CONFIG_NAME = path.join('configs', 'sys.json');

// 호스트 경로: execPath의 디렉토리가 /work 마운트 포인트
const hostWorkDir = path.dirname(process.execPath);
const workPrefix = IS_WIN ? /^[/\\]work[/\\]/ : /^\/work\//;
const relPath = LLM_DIR.replace(workPrefix, '');
const hostLlmDir = path.join(hostWorkDir, relPath);

const executable = path.join(hostLlmDir, BIN_NAME);
const configFile = path.join(hostLlmDir, CONFIG_NAME);

console.println('launching:', executable);
console.println('config:', configFile);
console.println('cwd:', hostLlmDir);

// process.chdir은 JSH 가상 PWD만 바꾸고 native 바이너리 cwd엔 효과 없음.
// process.exec도 Dir 옵션 미지원 → shell 래퍼로 cd 후 exec.
// (바이너리는 "configs/" relative 스캔하므로 cwd가 LLM_DIR이어야 함)
const shell = IS_WIN ? '@cmd.exe' : '@/bin/sh';
const flag = IS_WIN ? '/C' : '-c';
const script = IS_WIN
  ? `cd /d "${hostLlmDir}" && "${executable}" -config "${configFile}"`
  : `cd "${hostLlmDir}" && exec "${executable}" -config "${configFile}"`;

const exitCode = process.exec(shell, flag, script);
process.exit(exitCode);
