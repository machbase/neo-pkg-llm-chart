# neo-pkg-llm-chat

Machbase Neo용 LLM 서비스 패키지.  
`neo-pkg-llm` 바이너리를 다운로드하고 서비스로 관리하는 CGI 패키지입니다.

## 설치

```bash
# 1) 패키지 복사 (JSH에서 실행)
pkg copy github.com/machbase/neo-pkg-llm-chat public/neo-pkg-llm-chat

# 2) 바이너리 다운로드 + 검증 (neo-pkg-llm 최신 릴리스)
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/setup

# 3) 서비스 등록
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/install

# 4) 서비스 시작 (LLM 백엔드 실행)
curl -X POST http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/start
```

## CGI API

모든 API는 JSON 응답을 반환합니다.

**응답 포맷:**
- `configs` 만 `{ success, reason, elapse, data }` (프론트/바이너리 호환)
- 그 외 전부 `{ ok, data, reason }`


### POST /public/neo-pkg-llm-chat/cgi-bin/api/setup

`neo-pkg-llm` 바이너리를 GitHub 최신 릴리스에서 다운로드하고 `llm/` 디렉토리에 압축 해제합니다.

> `sys.json`은 생성하지 않음. 프론트 첫 접속 시 settings 탭으로 유도되며, user가 입력 후 `POST /configs`하면 파일 생성됨.

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

### /public/neo-pkg-llm-chat/cgi-bin/api/configs (및 /configs/sys)

**LLM 바이너리의 `/api/configs` 엔드포인트로의 thin proxy**. CGI는 HTTP 포워딩만 담당, 저장/마스킹/Instance 관리는 전부 바이너리가 처리.

```
프론트 → cgi-bin/api/configs → (127.0.0.1:8884로 HTTP 포워딩) → 바이너리
                                                              ├─ 파일 저장
                                                              ├─ 마스킹 / 시크릿 복원
                                                              └─ stopInstance + startInstance (PUT/POST 시)
```

| URL | 메서드 | 동작 (바이너리) |
|---|---|---|
| `/cgi-bin/api/configs` | GET | 파일 목록 반환 `{configs:[{name,running}]}` |
| `/cgi-bin/api/configs` | POST | 신규 생성 + Instance 시작 |
| `/cgi-bin/api/configs/sys` | GET | sys 상세 (마스킹됨) |
| `/cgi-bin/api/configs/sys` | PUT | sys 업데이트 + Instance 자동 재시작 |

#### 장점

- ✅ **자동 Instance 리로드** — PUT 성공 시 바이너리가 stopInstance + startInstance 수행 (수동 restart 불필요)
- ✅ **단일 소유자** — 파일과 메모리 상태가 항상 일치
- ✅ **포맷 일관성** — 응답이 바이너리와 동일

#### 요구사항

- **바이너리가 running 상태여야 함** (port 8884로 HTTP 수신 중)
- 바이너리 down 시 CGI는 `503` 반환: `{"success":false, "reason":"binary not running (...)"}`

#### 예시

```bash
# 목록
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/configs

# sys 상세 (마스킹됨)
curl http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/configs/sys

# sys 업데이트 + 자동 재시작
curl -X PUT http://localhost:5654/public/neo-pkg-llm-chat/cgi-bin/api/configs/sys \
  -H "Content-Type: application/json" \
  -d '{"server":{"port":"8884"},"machbase":{"host":"127.0.0.1","port":"5654","user":"sys","password":"manager"},"claude":{"api_key":"sk-ant-...","models":[{"name":"sonnet","model_id":"claude-sonnet-4-20250514"}]},"chatgpt":{"api_key":"","models":[]},"gemini":{"api_key":"","models":[]},"ollama":{"base_url":"","models":[]}}'
```

#### 부트스트랩 흐름

`setup.js`가 `llm/configs/sys.json`을 기본값으로 생성하므로 **초기 `setup → install → start` 순서는 그대로**. 그 이후 모든 config 수정은 이 proxy가 바이너리에 위임.

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
        ├── install.js          ← 서비스 등록
        ├── start.js            ← 서비스 시작
        ├── status.js           ← 상태 확인
        ├── stop.js             ← 서비스 중지
        ├── uninstall.js        ← 서비스 제거
        ├── info.js             ← 백엔드 포트 조회
        └── configs.js          ← config 조회/저장 (GET/POST/PUT)
```
