---
title: LLM Chat 기술 문서
weight: 10
---

# LLM Chat 기술 문서

**한국어** | [English](./index.en.md)

Machbase Neo LLM Chat 패키지는 Machbase Neo 시계열 데이터베이스와 자연어로 상호작용할 수 있는 LLM 채팅 인터페이스입니다.
대화를 통해 데이터 조회, 대시보드 생성, 분석 리포트 작성, 메뉴얼 문서 탐색이 가능합니다.

패키지는 내부적으로 에이전틱 루프를 실행하여 사용자 질문을 LLM에 전달하고, 도구 호출을 Machbase Neo에서 실행한 뒤, 결과를 다시 LLM에 피드백하는 과정을 최종 응답이 생성될 때까지 반복합니다.

## 설치

Machbase Neo 좌측 사이드 패널에는 사용 가능한 패키지 목록이 표시됩니다.  
여기서 LLM Chat 패키지를 선택하고 `Install` 버튼을 누르면 설치할 수 있습니다.

설치에는 약간의 시간이 걸릴 수 있으므로, 완료될 때까지 잠시 기다립니다.

![패키지 설치 화면](./images/package-install.png)

### 제거

좌측 패널에서 `neo-pkg-llm-chat`을 선택하고 **Uninstall**을 누르면 패키지와 관련 서비스가 제거됩니다.

## LLM 프로바이더

4가지 LLM 프로바이더를 지원합니다. 모든 프로바이더는 동기 및 스트리밍 채팅을 지원합니다.

| 프로바이더 | API | 스트리밍 | 로컬 |
| :--- | :--- | :---: | :---: |
| Claude | Anthropic API | 지원 | 아니오 |
| ChatGPT | OpenAI API | 지원 | 아니오 |
| Gemini | Google Gemini API | 지원 | 아니오 |
| Ollama | Ollama REST API | 지원 | 예 |

프로바이더와 연결 설정은 웹 기반 Settings 화면에서 구성합니다. API Key, 모델 목록, Machbase Neo 연결 정보는 브라우저에서 직접 저장할 수 있습니다.

## 에이전틱 루프

에이전틱 루프는 이 패키지의 핵심 실행 엔진입니다. 사용자가 질문을 보내면 시스템이 먼저 질문 유형을 감지하고, 이후 LLM이 도구를 선택하고 실행하는 자율 루프에 진입합니다.

### 질문 유형 감지

- "리포트", "보고서", "report"가 포함된 질문
  - 리포트 모드로 분류되어 HTML 분석 리포트 생성 흐름을 사용합니다.
- "심층", "다각도", "FFT", "RMS"가 포함된 질문
  - 고급 모드로 분류되어 사전 정의 TQL 차트 템플릿을 우선 사용합니다.
- 그 외 분석/대시보드 요청
  - 기본 모드로 분류되어 테이블 기반 차트 생성 흐름을 사용합니다.

### 가드 시스템

가드 시스템은 실행 중 LLM의 일반적인 실수를 자동으로 보정합니다.

| 가드 | 설명 |
| :--- | :--- |
| `fixToolCalls` | 도구 호출의 잘못된 파라미터명을 자동 수정 |
| `guardDashboardEarlyCall` | TQL 차트 파일 저장 전 대시보드 생성을 방지 |
| `guardChartOmission` | 필요한 차트 템플릿 저장 없이 종료하려 할 때 재촉 |
| `guardReportOmission` | 리포트 모드에서 `save_html_report` 호출 없이 종료하려 할 때 재촉 |
| `guardConsecutiveFailure` | 연속 실패 시 무한 재시도 대신 건너뛰기 |
| `validateTagInArgs` | TQL 스크립트에 사용된 태그명이 실제 테이블에 존재하는지 검증 |
| 시간 범위 보정 | `time_start` / `time_end`를 실제 데이터 범위에 맞게 자동 조정 |

## 이 문서에서 다루는 내용

- 패키지 설치
- 초기 설정과 모델 등록
- Chat 화면 사용과 질문 패턴
- 내장 도구와 자동화 기능
- HTTP API와 WebSocket 프로토콜
- 연결 문제와 자주 보는 오류 점검

## 기본 작업 순서

1. Neo에서 LLM Chat 패키지를 설치합니다.
2. 처음 열면 Settings 화면에서 연결 정보를 입력합니다.
3. 사용할 Provider의 API Key 또는 Endpoint를 입력합니다.
4. 사용할 Model을 한 개 이상 등록합니다.
5. Save 후 Chat 화면으로 이동합니다.
6. Chat 화면에서 모델을 선택하고 질문을 보냅니다.

## 화면 구성

- Settings 화면
  - Machbase Connection
  - API Keys & Endpoints
  - Models
- Chat 화면
  - 대화 영역
  - 모델 선택 버튼
  - 연결 상태 표시
  - 메시지 입력창

![LLM Chat 메인 화면](./images/llm-chat-main.png)

## 문서 목록

- [첫 설정](./first-setup.kr.md)
- [Chat 사용 방법](./chat-usage.kr.md)
- [기술 참고](./technical-reference.kr.md)
- [HTTP API와 WebSocket](./http-api-and-websocket.kr.md)
- [문제 해결](./troubleshooting.kr.md)

## 문서 이동

- [다음: 첫 설정](./first-setup.kr.md)
