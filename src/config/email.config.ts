import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  smtp: {
    host: process.env.EMAIL_SMTP_HOST || 'smtp.hostinger.com',
    port: parseInt(process.env.EMAIL_SMTP_PORT || '465'),
    secure: process.env.EMAIL_SMTP_SECURE === 'true', // true for 465, false for 587
    user: process.env.EMAIL_SMTP_USER || 'test@apis.movortech.com',
    pass: process.env.EMAIL_SMTP_PASS || '',
  },
  from: process.env.EMAIL_FROM || 'test@apis.movortech.com',
}));
