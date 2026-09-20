import { Injectable, Logger } from '@nestjs/common';

export interface MailMessage {
  to: string;
  idempotencyKey?: string;
  subject: string;
  /** Plain-text body. Always sent, and used to build the HTML fallback. */
  text: string;
  html?: string;
  replyTo?: string;
}

const BRAND = {
  ink: '#0D123A',
  accent: '#F38432',
  muted: '#767AA0',
  line: '#E8E9F2',
};

/**
 * Wraps a plain-text message in the studio's letterhead. Every transactional
 * email shares one shell so an order confirmation and a password reset feel
 * like they came from the same business.
 */
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
function renderHtml(subject: string, text: string): string {
  subject=escapeHtml(subject);text=escapeHtml(text);
  const body = text
    .split('\n\n')
    .map((para) => `<p style="margin:0 0 16px;line-height:1.6;color:${BRAND.ink};font-size:15px">${para.replace(/\n/g, '<br>')}</p>`)
    .join('');

  return `<!doctype html><html><body style="margin:0;padding:24px;background:#F6F7FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border:1px solid ${BRAND.line};border-radius:16px;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid ${BRAND.line}">
      <span style="font-size:18px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink}">Vikipat</span>
      <span style="font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.accent};margin-left:8px">Print Studio</span>
    </td></tr>
    <tr><td style="padding:28px">
      <h1 style="margin:0 0 20px;font-size:20px;font-weight:800;letter-spacing:-0.02em;color:${BRAND.ink}">${subject}</h1>
      ${body}
    </td></tr>
    <tr><td style="padding:20px 28px;border-top:1px solid ${BRAND.line};font-size:12px;color:${BRAND.muted};line-height:1.6">
      Vikipat Media Solutions · Mallam-Gbawe Road, opposite Zen Filling Station, Accra<br>
      024 236 6523 · hello@vikipat.com
    </td></tr>
  </table></body></html>`;
}

/**
 * Transactional email via Resend. Chosen over SMTP because it needs no
 * long-lived connection or credentials on the box, which suits a container
 * that may be cold-started between sends.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  get configured(): boolean {
    return Boolean(process.env.RESEND_API_KEY);
  }

  async send(message: MailMessage): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');
    if (!message.to?.trim()) throw new Error('No recipient address');

    const response = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', ...(message.idempotencyKey?{'Idempotency-Key':message.idempotencyKey}:{}) },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || 'Vikipat <support@tappamart.com>',
        to: [message.to.trim()],
        subject: message.subject,
        text: message.text,
        html: message.html || renderHtml(message.subject, message.text),
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      // Resend returns a JSON error body; surface it so the outbox row records
      // why rather than just "failed".
      const detail = await response.text().catch(() => '');
      throw new Error(`Resend returned ${response.status}: ${detail.slice(0, 300)}`);
    }
  }

  /** Send without throwing — for paths where email is a nicety, not the job. */
  async trySend(message: MailMessage): Promise<boolean> {
    try {
      await this.send(message);
      return true;
    } catch (error) {
      this.logger.warn(`Email to ${message.to} failed: ${error instanceof Error ? error.message : error}`);
      return false;
    }
  }
}
