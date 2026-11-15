import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../../../config/environment.js';
import type { EmailVerificationPurpose } from './email-verification.entity.js';

const BREVO_EMAIL_API_URL = 'https://api.brevo.com/v3/smtp/email';
const PUBLIC_EMAIL_ERROR =
  "Impossible d'envoyer l'e-mail pour le moment. Réessaie plus tard.";

@Injectable()
export class BrevoEmailService {
  private readonly logger = new Logger(BrevoEmailService.name);

  constructor(private readonly config: ConfigService<Environment, true>) {}

  async sendVerificationCode(
    email: string,
    code: string,
    purpose: EmailVerificationPurpose = 'registration',
  ): Promise<void> {
    const apiKey = this.config.get('BREVO_API_KEY');
    const fromEmail = this.config.get('BREVO_FROM_EMAIL');
    if (!apiKey || !fromEmail) {
      this.logger.error('Brevo email API is not configured.');
      throw new ServiceUnavailableException({
        code: 'EMAIL_PROVIDER_NOT_CONFIGURED',
        message: PUBLIC_EMAIL_ERROR,
      });
    }

    const purposeLabel =
      purpose === 'login'
        ? 'connexion à ton compte'
        : purpose === 'password-reset'
          ? 'réinitialisation de ton mot de passe'
          : 'confirmation de ton inscription';
    const subject =
      purpose === 'login'
        ? 'Ton code de connexion Hello World'
        : purpose === 'password-reset'
          ? 'Ton code de réinitialisation Hello World'
          : 'Confirme ton adresse e-mail · Hello World';
    const title =
      purpose === 'login'
        ? 'Ton code de connexion'
        : purpose === 'password-reset'
          ? 'Réinitialise ton mot de passe'
          : 'Bienvenue ! Voici ton code';
    const expiryMinutes = purpose === 'password-reset' ? 2 : 4;
    const textContent = `Ton code pour la ${purposeLabel} Hello World : ${code}. Il expire dans ${expiryMinutes} minutes. Si tu n'es pas à l'origine de cette demande, ignore ce message.`;
    const htmlContent = renderCodeEmail({ title, purposeLabel, code, expiryMinutes, purpose });
    let response: Response;
    try {
      response = await fetch(BREVO_EMAIL_API_URL, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: this.config.get('BREVO_FROM_NAME') ?? 'Hello World',
            email: fromEmail,
          },
          to: [{ email }],
          subject,
          textContent,
          htmlContent,
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      this.logger.error(
        `Brevo API request failed for ${purpose} (${error instanceof Error ? error.message : 'unknown error'}).`,
      );
      throw new ServiceUnavailableException(
        {
          code: 'EMAIL_PROVIDER_UNAVAILABLE',
          message: PUBLIC_EMAIL_ERROR,
        },
        { cause: error },
      );
    }

    if (!response.ok) {
      this.logger.error(
        `Brevo API rejected ${purpose} email with HTTP ${response.status}.`,
      );
      throw new ServiceUnavailableException({
        code:
          response.status === 401 || response.status === 403
            ? 'EMAIL_PROVIDER_AUTH_FAILED'
            : 'EMAIL_PROVIDER_UNAVAILABLE',
        message: PUBLIC_EMAIL_ERROR,
      });
    }
  }
}

// Gabarit e-mail : tableaux et styles en ligne uniquement, pour Gmail, Outlook et Apple Mail.
// Thème sombre de l'app, chiffres du code dans des cases séparées, rappel « terminal » de la marque.
function renderCodeEmail({
  title,
  purposeLabel,
  code,
  expiryMinutes,
  purpose,
}: {
  title: string;
  purposeLabel: string;
  code: string;
  expiryMinutes: number;
  purpose: EmailVerificationPurpose;
}): string {
  const mono = "'Geist Mono','SFMono-Regular',Consolas,'Courier New',monospace";
  const sans = "Inter,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const command =
    purpose === 'login'
      ? 'hello-world login'
      : purpose === 'password-reset'
        ? 'hello-world password --reset'
        : 'hello-world signup --verify';
  const digits = code
    .split('')
    .map(
      (digit) =>
        `<td style="padding:0 5px;"><div style="width:52px;height:64px;line-height:64px;background-color:#141414;border:1px solid #4a3c7a;border-radius:12px;color:#ffffff;font-family:${mono};font-size:30px;font-weight:700;text-align:center;">${digit}</div></td>`,
    )
    .join('');
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <meta name="supported-color-schemes" content="dark" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#0e0e0e;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Ton code Hello World : ${code} · valable ${expiryMinutes} minutes.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0e0e0e;">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;">
            <tr>
              <td style="padding:0 4px 20px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:36px;height:36px;background-color:#f5f5f5;border-radius:9px;color:#141414;font-family:${mono};font-size:15px;font-weight:700;text-align:center;line-height:36px;">&gt;_</td>
                    <td style="padding-left:10px;color:#fafafa;font-family:${mono};font-size:17px;font-weight:600;">Hello World</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background-color:#1a1a1a;border:1px solid #2e2e2e;border-radius:18px;overflow:hidden;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="height:4px;background-color:#b79aff;background-image:linear-gradient(90deg,#b79aff,#7ee787);font-size:0;line-height:0;">&nbsp;</td>
                  </tr>
                  <tr>
                    <td style="padding:32px 28px 8px;">
                      <p style="margin:0 0 18px;font-family:${mono};font-size:13px;line-height:1.6;color:#7ee787;">$ <span style="color:#d4d4d8;">${command}</span></p>
                      <h1 style="margin:0 0 10px;color:#ffffff;font-family:${sans};font-size:24px;line-height:1.3;font-weight:700;">${title}</h1>
                      <p style="margin:0;color:#b0b0b3;font-family:${sans};font-size:15px;line-height:1.6;">Saisis ce code dans l’application pour la ${purposeLabel}.</p>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding:28px 16px;">
                      <table role="presentation" cellspacing="0" cellpadding="0"><tr>${digits}</tr></table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:0 28px 28px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#241e3a;border-radius:10px;">
                        <tr>
                          <td style="padding:12px 16px;color:#d9ccff;font-family:${sans};font-size:13px;line-height:1.5;">⏱ Ce code expire dans <strong style="color:#ffffff;">${expiryMinutes} minutes</strong>. Ne le partage avec personne : l’équipe Hello World ne te le demandera jamais.</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:18px 28px;border-top:1px solid #2a2a2a;color:#8b8b8c;font-family:${sans};font-size:12px;line-height:1.6;">Tu n’es pas à l’origine de cette demande ? Ignore simplement ce message, ton compte reste protégé.</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:24px 8px 0;color:#6b6b70;font-family:${sans};font-size:12px;line-height:1.6;">
                <span style="font-family:${mono};color:#a0a0b0;">Hello World&gt;_</span><br />Le réseau social des bâtisseurs · en Afrique d’abord 🌍
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
