import { constants, publicEncrypt } from 'node:crypto';

const TA_PASSWORD_PUBLIC_KEY = [
  '-----BEGIN PUBLIC KEY-----',
  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCT+JeQB4oij4007Kslmma0sfFo',
  'dahq1olOpWJoZR+aimyNuYUSTmbK1/bArGkIb0CxIPUGQIrARpY6apQNncORutdmB',
  'HonFkn7r7XpktL7bxZhDUKeLjIdjaEB1lh1tFxLl3cP0siHwuc1aAaEOWAjuCu2f',
  '9+FgY7WCEJla9Qa/QIDAQAB',
  '-----END PUBLIC KEY-----',
].join('\n');

export function encryptTaPassword(plaintext: string): string {
  return publicEncrypt(
    {
      key: TA_PASSWORD_PUBLIC_KEY,
      padding: constants.RSA_PKCS1_PADDING,
    },
    Buffer.from(plaintext, 'utf8'),
  ).toString('base64');
}
