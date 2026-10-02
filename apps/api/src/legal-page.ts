/** Public contact is supplied by the operator, never committed. */
export function renderPrivacy(contactEmail: string | undefined): string | null {
  const contact = contactEmail?.trim();
  if (!contact || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return null;
  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>개인정보처리방침</title>
<style>
 body{max-width:44rem;margin:2rem auto;padding:0 1.2rem;line-height:1.7;
      font-family:system-ui,-apple-system,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#1a1a1a}
 h1{font-size:1.6rem} h2{font-size:1.1rem;margin-top:2rem}
 table{border-collapse:collapse;width:100%} th,td{border:1px solid #ddd;padding:.5rem;text-align:left;font-size:.95rem}
 code{background:#f4f4f4;padding:.1rem .3rem;border-radius:3px} footer{margin-top:3rem;color:#666;font-size:.9rem}
</style></head><body>
<h1>개인정보처리방침</h1>
<p>이 서비스는 Instagram 게시물에 달린 댓글에 자동으로 다이렉트 메시지를 보내는 도구입니다.
아래는 이 서비스가 수집·저장하는 주요 정보와 처리 방식입니다.</p>

<h2>1. 수집·저장하는 정보</h2>
<table>
<tr><th>항목</th><th>용도</th></tr>
<tr><td>Instagram 사용자 식별자(IGSID)</td><td>같은 사람과의 대화 상태 추적</td></tr>
<tr><td>Instagram 사용자명</td><td>운영자 화면의 활동 내역 표시 (공개 정보)</td></tr>
<tr><td>댓글·메시지 이벤트의 메타데이터<br>(발생 시각, 게시물 ID, 처리 결과)</td><td>발송 여부 통계, "왜 DM 이 안 갔는지" 확인</td></tr>
<tr><td>연동 계정의 액세스 토큰 및 앱 시크릿</td><td>Instagram API 호출. <strong>AES-256-GCM 으로 암호화</strong>해 저장</td></tr>
<tr><td>운영자 이메일, 비밀번호 해시, Instagram 연결 요청의 사용자명·상태와 OAuth 상태</td><td>로그인, 연결 요청 및 인증 진행. OAuth 인증값은 해시로 저장하며 만료 여부를 검사합니다.</td></tr>
<tr><td>운영자가 설정한 발송 문구, 키워드와 게시물 정보</td><td>자동 DM 설정과 게시물 표시. 발송 문구는 수신한 댓글·DM 본문과 별개의 운영 설정입니다.</td></tr>
</table>

<h2>2. 저장하지 않는 정보</h2>
<ul>
<li><strong>댓글 본문과 다이렉트 메시지 본문을 저장하지 않습니다.</strong> 키워드 일치 여부만 메모리에서 판단하고 본문은 버립니다.</li>
<li>로그에도 본문을 기록하지 않습니다.</li>
<li>액세스 토큰·시크릿을 평문으로 저장하거나 로그에 남기지 않습니다.</li>
<li>댓글·DM을 남긴 이용자의 이메일, 전화번호, 결제 정보, 위치 정보를 수집하지 않습니다.</li>
</ul>

<h2>3. 제3자 제공</h2>
<p>수집한 정보를 판매하거나 제3자에게 제공하지 않습니다. 광고에 사용하지 않습니다.
서비스 운영에 필요한 범위에서 Amazon Web Services(큐·로그·서버 인프라), Neon(PostgreSQL 데이터베이스), Meta Platforms(Instagram API)를 이용합니다.</p>

<h2>4. 보관 기간</h2>
<ul>
<li>계정·이벤트·연결 요청 기록: 현재 자동 삭제 기간이나 연동 해제에 따른 전체 자동 삭제 기능은 구현되어 있지 않습니다. 삭제 요청은 운영자가 범위를 확인하여 수동으로 처리합니다.</li>
<li>큐·실패 큐: 수신 본문 없이 이벤트 메타데이터만 임시 보관합니다. 인프라 설정의 최대 보관 기간은 4일이며, 정상 처리 시 더 일찍 삭제됩니다.</li>
<li>서버 로그: <strong>7일 후 자동 삭제</strong>됩니다.</li>
</ul>

<h2>5. 데이터 삭제 요청</h2>
<p>아래 주소로 삭제를 요청할 수 있습니다. 운영자는 요청자 확인 후 계정·이벤트·연결 요청 및 OAuth 상태 등 관련 기록의 삭제 범위를 확인하여 수동으로 처리합니다. 큐·실패 큐와 로그의 잔여 기록은 각각의 보관 기간에 따라 만료됩니다. 백업에 남는 정보의 삭제·만료는 운영자의 별도 확인이 필요합니다. 이 페이지는 자동 삭제 API가 아닙니다.</p>
<p><code>${escapeHtml(contact)}</code></p>

<h2>6. 문의</h2>
<p><code>${escapeHtml(contact)}</code></p>

<footer>최종 수정일: 2026-10-02</footer>
</body></html>`;

  return html;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
}
