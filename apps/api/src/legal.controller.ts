import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import './env.ts';
import { renderPrivacy } from './legal-page.ts';

/** Both routes require an operator contact before serving the privacy notice. */
@Controller()
export class LegalController {
  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  privacy(): string {
    const html = renderPrivacy(process.env.PRIVACY_CONTACT_EMAIL);
    if (html === null) throw new ServiceUnavailableException('운영자 연락처가 설정되지 않았습니다.');
    return html;
  }

  @Get('data-deletion')
  @Header('Content-Type', 'text/html; charset=utf-8')
  dataDeletion(): string {
    return this.privacy();
  }
}
