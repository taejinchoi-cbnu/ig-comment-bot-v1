# 디자인 레퍼런스 해석

공개 문서에는 참고 화면에서 추출한 구성 원칙만 정리한다.

| 화면 구성 | 적용할 패턴 |
|---|---|
| 자동 DM 목록 | 카드, on/off, 메시지 preview, 성과 한 줄 |
| 게시글 선택 | 3열 grid, 선택 overlay, 고정 하단 행동 |
| 설정 단계 | 단계 progress, 큰 설정 card, 보조 안내 box |
| 문구 편집 | 제목+설명+textarea의 단순한 편집 계층 |
| 고급 설정 | keyword chip, 글자수, toggle, textarea |

## 시각 토큰 초안

```text
brand.500  #3478F6
brand.600  #2467E8
canvas     #F3F6FE
surface    #FFFFFF
text       #121826
muted      #667085
line       #E8ECF4
successBg  #EFFBF4
success    #16794A

radius.card    28px
radius.field   20px
radius.pill    999px
shadow.card    0 12px 36px rgba(35, 55, 90, .10)
content.mobile 480px
content.wide   1120px
```

## 제품에 맞춘 차이

- 레퍼런스의 4단계 자동화 편집을 그대로 쓰지 않는다. 기본 생성은 게시글과 보낼 DM 두 필드다.
- 키워드와 1차 확인 문구는 접힌 `고급 설정` 안에 둔다.
- 임의 지연 대댓글, 랜덤 문구, 링크 버튼, 변수 chip은 현재 제품 범위에서 제외한다.
- 성과 숫자는 Phase 3 전까지 자리만 두고 허위 숫자를 만들지 않는다.
- 모바일 앱처럼 보여도 브라우저의 뒤로가기, 키보드, safe-area와 데스크톱 반응형을 지원한다.
