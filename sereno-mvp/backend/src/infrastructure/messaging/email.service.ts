import { Resend } from 'resend';
import { env } from '@config/env';
import { logger } from '@shared/utils/logger';

// Lazy init — evita crash no boot quando RESEND_API_KEY não está configurada em dev
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!env.RESEND_API_KEY) {
      logger.warn('RESEND_API_KEY não configurada — e-mails serão ignorados em dev');
      // Retorna instância com chave dummy; erros de envio serão logados mas não travam o server
      _resend = new Resend('re_dev_placeholder');
    } else {
      _resend = new Resend(env.RESEND_API_KEY);
    }
  }
  return _resend;
}

const FROM = env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev';
const APP_NAME = 'Prontua';

export const emailService = {
  async sendVerificationCode(to: string, name: string, code: string): Promise<void> {
    const { error } = await getResend().emails.send({
      from: FROM,
      to,
      subject: `${code} é seu código de confirmação — ${APP_NAME}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F1E8;font-family:'DM Sans',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1E8;padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:40px;max-width:480px">
        <tr><td>
          <h1 style="margin:0 0 4px;font-size:24px;font-weight:600;color:#2D3B36;letter-spacing:-0.02em">
            ${APP_NAME}
          </h1>
          <p style="margin:0 0 32px;font-size:13px;color:#7A8B85">Confirmação de conta</p>

          <p style="margin:0 0 8px;font-size:15px;color:#2D3B36">Olá, <strong>${name.split(' ')[0]}</strong>!</p>
          <p style="margin:0 0 32px;font-size:14px;color:#7A8B85;line-height:1.6">
            Use o código abaixo para confirmar seu e-mail. Ele expira em <strong>15 minutos</strong>.
          </p>

          <div style="background:#F5F1E8;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px">
            <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#2D3B36;font-family:monospace">
              ${code}
            </span>
          </div>

          <p style="margin:0;font-size:12px;color:#7A8B85;line-height:1.6">
            Se você não criou uma conta no ${APP_NAME}, ignore este e-mail.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    if (error) {
      logger.error({ error, to }, 'email_send_failed');
      throw new Error('Falha ao enviar e-mail de verificação');
    }

    logger.info({ to }, 'verification_email_sent');
  },

  /** OTP de login (segundo fator obrigatório) */
  async sendLoginOtp(to: string, name: string, code: string): Promise<void> {
    const { error } = await getResend().emails.send({
      from: FROM,
      to,
      subject: `${code} é seu código de acesso — ${APP_NAME}`,
      html: `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F1E8;font-family:'DM Sans',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F1E8;padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;padding:40px;max-width:480px">
        <tr><td>
          <h1 style="margin:0 0 4px;font-size:24px;font-weight:600;color:#2D3B36;letter-spacing:-0.02em">${APP_NAME}</h1>
          <p style="margin:0 0 32px;font-size:13px;color:#7A8B85">Código de acesso</p>

          <p style="margin:0 0 8px;font-size:15px;color:#2D3B36">Olá, <strong>${name.split(' ')[0]}</strong>!</p>
          <p style="margin:0 0 32px;font-size:14px;color:#7A8B85;line-height:1.6">
            Use o código abaixo para acessar o ${APP_NAME}. Ele expira em <strong>10 minutos</strong>.<br>
            Se não foi você, ignore este e-mail — sua conta continua segura.
          </p>

          <div style="background:#F5F1E8;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px">
            <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#2D3B36;font-family:monospace">
              ${code}
            </span>
          </div>

          <p style="margin:0;font-size:12px;color:#7A8B85;line-height:1.6">
            Este código é válido por 10 minutos e só pode ser usado uma vez.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
    });

    if (error) {
      logger.error({ error, to }, 'login_otp_email_failed');
      throw new Error('Falha ao enviar e-mail de autenticação');
    }

    logger.info({ to }, 'login_otp_email_sent');
  },
};
