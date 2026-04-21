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

// 바이너리는 cwd 기준 상대경로 "configs/"를 스캔하므로 chdir 필수
process.chdir(hostLlmDir);

const exitCode = process.exec('@' + executable, '-config', configFile);
process.exit(exitCode);
