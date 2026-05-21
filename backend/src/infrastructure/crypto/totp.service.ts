import { generateSecret, generateSync, verifySync, generateURI } from 'otplib';
import QRCode from 'qrcode';
import { env } from '@config/env';

const PERIOD = 30;  // 30 segundos (RFC 6238)
const WINDOW = 1;   // aceita 1 passo anterior/posterior (clock skew)

export class TotpService {
  generateSecret(): string {
    return generateSecret();
  }

  generateUri(secret: string, accountLabel: string): string {
    return generateURI({ secret, label: accountLabel, issuer: env.MFA_ISSUER });
  }

  async generateQrCode(otpauthUri: string): Promise<string> {
    return QRCode.toDataURL(otpauthUri);
  }

  verify(secret: string, token: string): boolean {
    try {
      const result = verifySync({ token, secret, period: PERIOD });
      return result.valid;
    } catch {
      return false;
    }
  }
}

export const totpService = new TotpService();
