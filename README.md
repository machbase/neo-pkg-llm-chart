# neo-pkg-llm-chat

Machbase Neo용 LLM 서비스 패키지.  
`neo-pkg-llm` 바이너리를 다운로드하고 서비스로 관리하는 CGI 패키지입니다.

## 설치

```bash
# 1) 패키지 복사 (JSH에서 실행)
pkg copy github.com/machbase/neo-pkg-llm-chat public/neo-pkg-llm-chat

# 2) 바이너리 다운로드 (neo-pkg-llm 최신 릴리스)
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/setup

# 3) 설치 확인
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/setup-check

# 4) 서비스 등록
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/install

# 5) 서비스 시작 (LLM 백엔드 실행)
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/start
```

## CGI API

모든 API는 JSON 응답을 반환합니다.

**응답 포맷:**
- `configs` 만 `{ success, reason, elapse, data }` (프론트/바이너리 호환)
- 그 외 전부 `{ ok, data, reason }`


### POST /public/neo-pkg-llm-chat/cgi-bin/api/setup

`neo-pkg-llm` 바이너리를 GitHub 최신 릴리스에서 다운로드하고 `llm/` 디렉토리에 압축 해제한 뒤, 기본 `llm/configs/sys.json`을 생성합니다. (이미 있으면 덮어쓰지 않음)

```bash
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/setup
```

```json
{
  "ok": true,
  "data": {
    "path": "/work/public/neo-pkg-llm-chat/cgi-bin/api/llm",
    "config": "/work/public/neo-pkg-llm-chat/cgi-bin/api/llm/configs/sys.json",
    "log": [
      "platform: linux-amd64",
      "downloading: https://github.com/machbase/neo-pkg-llm/releases/latest/download/neo-pkg-llm-linux-amd64.tar.gz",
      "extracting to: /work/public/neo-pkg-llm-chat/cgi-bin/api/llm",
      "done. llm installed at /work/public/neo-pkg-llm-chat/cgi-bin/api/llm",
      "created default config: /work/public/neo-pkg-llm-chat/cgi-bin/api/llm/configs/sys.json"
    ]
  }
}
```

### GET /public/neo-pkg-llm-chat/cgi-bin/api/setup-check

`setup.js`가 정상적으로 실행되어 바이너리가 설치되었는지 확인합니다.

```bash
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/setup-check
```

```json
{
  "ok": true,
  "data": {
    "installed": true,
    "binary": "/work/public/neo-pkg-llm-chat/cgi-bin/api/llm/neo-pkg-llm",
    "llm_dir": "/work/public/neo-pkg-llm-chat/cgi-bin/api/llm"
  }
}
```

### POST /public/neo-pkg-llm-chat/cgi-bin/api/install

서비스 등록.

```bash
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/install
```

```json
{"ok":true,"data":{"name":"neo-pkg-llm"}}
```

### POST /public/neo-pkg-llm-chat/cgi-bin/api/start

서비스 시작.

```bash
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/start
```

```json
{"ok":true,"data":{"name":"neo-pkg-llm"}}
```

### GET /public/neo-pkg-llm-chat/cgi-bin/api/status

서비스 상태 확인.

```bash
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/status
```

```json
{
  "ok": true,
  "data": {
    "config": {
      "name": "neo-pkg-llm",
      "enable": false,
      "working_dir": "/work/public/neo-pkg-llm-chat/cgi-bin/api/llm",
      "executable": "/work/public/neo-pkg-llm-chat/cgi-bin/api/llm-launcher.js"
    },
    "status": "running",
    "exit_code": 0,
    "pid": 12345
  }
}
```

### POST /public/neo-pkg-llm-chat/cgi-bin/api/stop

서비스 중지.

```bash
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/stop
```

```json
{"ok":true,"data":{"name":"neo-pkg-llm"}}
```

### POST /public/neo-pkg-llm-chat/cgi-bin/api/uninstall

서비스 제거.

```bash
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/uninstall
```

```json
{"ok":true,"data":{"name":"neo-pkg-llm"}}
```

### /public/neo-pkg-llm-chat/cgi-bin/api/configs (목록)

`llm/configs/` 디렉토리의 config 파일 목록 또는 신규 저장. 바이너리의 `/api/configs`와 shape 동일. **LLM 바이너리 꺼져있어도 동작**. 응답 포맷 `{success, reason, elapse, data}`.

| 메서드 | 동작 |
|---|---|
| GET | 파일명 목록: `{configs: [{name}]}` |
| POST | 신규 저장 (파일명 = `machbase.user`) |

```bash
# 목록
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/configs
# → {"success":true,..."data":{"configs":[{"name":"sys"}]}}

# 저장 (body의 machbase.user가 파일명)
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/configs \
  -H "Content-Type: application/json" \
  -d '{"server":{"port":"8884"},"machbase":{"host":"127.0.0.1","port":"5654","user":"sys","password":"manager"},"claude":{"api_key":"sk-...","models":[]},"chatgpt":{"api_key":"","models":[]},"gemini":{"api_key":"","models":[]},"ollama":{"base_url":"","models":[]}}'
# → {"success":true,..."data":{"name":"sys","path":"..."}}
```

### /public/neo-pkg-llm-chat/cgi-bin/api/configs/sys (개별)

특정 user(`sys`)의 config 조회/업데이트.

| 메서드 | 동작 |
|---|---|
| GET | 조회: `{config, running}` — 비밀번호/API 키 **마스킹** |
| PUT | 업데이트 — body에 마스킹된 시크릿 오면 **기존값 복원** |

```bash
# 조회 (마스킹됨)
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/configs/sys
```
```json
{
  "success": true,
  "reason": "success",
  "elapse": "2ms",
  "data": {
    "config": {
      "server": { "port": "8884" },
      "machbase": { "host": "127.0.0.1", "port": "5654", "user": "sys", "password": "********" },
      "claude":  { "api_key": "sk-a********z123", "models": [] }
    },
    "running": null
  }
}
```

```bash
# 업데이트
curl -X PUT http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/configs/sys \
  -H "Content-Type: application/json" \
  -d '{...}'
```

**주의:** 파일만 저장. 바이너리 running 시 **`stop → start` 해야 반영**.

### GET /public/neo-pkg-llm-chat/cgi-bin/api/info

LLM 백엔드 포트 조회 (`llm/configs/sys.json`의 `server.port`). 프론트엔드가 API 호출 대상 포트를 알아낼 때 사용합니다.

> `setup` 실행 시 기본 config가 생성되므로 `setup` 직후부터 동작합니다.

```bash
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/info
```

```json
{"ok":true,"data":{"port":"8884"}}
```

## config.json

`setup.js` 실행 시 기본 config가 `llm/configs/sys.json`에 생성됩니다. 파일명(`sys`)은 `machbase.user` 값과 일치하며, 이후 바이너리가 `start`되면 이 파일을 읽어 "sys" 인스턴스를 자동 생성합니다.

- **최초 생성**: `setup.js`가 기본값으로 생성
- **편집**: 프론트엔드 설정 페이지 또는 `PUT /api/configs/sys` (바이너리 port 8884)로 수정
- **보존 정책**: `setup`을 재실행해도 기존 파일은 덮어쓰지 않음 (API 키 보존)

```json
{
  "server":   { "port": "8884" },
  "machbase": { "host": "127.0.0.1", "port": "5654", "user": "sys", "password": "manager" },
  "claude":   { "api_key": "" },
  "chatgpt":  { "api_key": "" },
  "gemini":   { "api_key": "" },
  "ollama":   { "base_url": "" }
}
```

> 모델 목록(`models` 배열)은 초기에는 비어있고, 프론트 설정 페이지나 `POST /api/configs`로 추가됩니다.

## 구조

```
neo-pkg-llm-chat/
├── package.json
└── cgi-bin/
    ├── package.json
    ├── llm-launcher.js         ← 네이티브 바이너리 실행 래퍼
    ├── llm/                    ← 바이너리 디렉토리 (setup 후 생성)
    │   ├── neo-pkg-llm         ← LLM 백엔드 바이너리
    │   └── configs/
    │       └── sys.json        ← 기본 인스턴스 설정 (setup 시 생성)
    └── api/                    ← HTTP 엔드포인트만
        ├── setup.js            ← 바이너리 다운로드 (CGI, neo-pkg-llm 릴리스)
        ├── setup-check.js      ← 설치 여부 확인 (CGI)
        ├── install.js          ← 서비스 등록
        ├── start.js            ← 서비스 시작
        ├── status.js           ← 상태 확인
        ├── stop.js             ← 서비스 중지
        ├── uninstall.js        ← 서비스 제거
        ├── info.js             ← 백엔드 포트 조회
        ├── configs.js          ← 목록/신규 저장 (GET/POST)
        └── configs/
            └── sys.js          ← sys 개별 조회/업데이트 (GET/PUT)
```
