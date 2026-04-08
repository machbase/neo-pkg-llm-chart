'use strict';

const process = require('process');
const path = require('path');

// JSH 가상 경로 기준
const SCRIPT_DIR = path.resolve(path.dirname(process.argv[1]));
const LLM_DIR = path.join(SCRIPT_DIR, 'llm');
const BIN_NAME = 'neo-pkg-llm';
const CONFIG_NAME = 'config.json';

// 호스트 경로: execPath의 디렉토리가 /work 마운트 포인트
const hostWorkDir = path.dirname(process.execPath);
const relPath = LLM_DIR.replace(/^\/work\//, '');
const hostLlmDir = path.join(hostWorkDir, relPath);

const executable = path.join(hostLlmDir, BIN_NAME);
const configFile = path.join(hostLlmDir, CONFIG_NAME);

console.println('launching:', executable);
console.println('config:', configFile);

const exitCode = process.exec('@' + executable, '-config', configFile);
process.exit(exitCode);
