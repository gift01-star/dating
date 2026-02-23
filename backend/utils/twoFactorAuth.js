import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export const generateSecret = (email) => {
  const secret = speakeasy.generateSecret({
    name: `EduLove (${email})`,
    issuer: 'EduLove',
    length: 32
  });
  
  return {
    secret: secret.base32,
    qrCode: secret.otpauth_url
  };
};

export const generateQRCode = async (otpauth_url) => {
  try {
    const qrCode = await QRCode.toDataURL(otpauth_url);
    return qrCode;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

export const verifyToken = (secret, token) => {
  try {
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2
    });
    return verified;
  } catch (error) {
    console.error('Error verifying token:', error);
    return false;
  }
};

export const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push(
      Math.random().toString(36).substring(2, 10).toUpperCase() +
      '-' +
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );
  }
  return codes;
};

export default {
  generateSecret,
  generateQRCode,
  verifyToken,
  generateBackupCodes
};
