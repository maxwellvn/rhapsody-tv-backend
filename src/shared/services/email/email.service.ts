import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('email.smtp.host');
    const port = this.configService.get<number>('email.smtp.port');
    const secure = this.configService.get<boolean>('email.smtp.secure');
    const user = this.configService.get<string>('email.smtp.user');
    const pass = this.configService.get<string>('email.smtp.pass');

    this.logger.log(`Email config - Host: ${host}, Port: ${port}, Secure: ${secure}, User: ${user}`);

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      this.logger.error('SMTP connection verification failed:', error);
    }
  }

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const mailOptions = {
      from: `"Rhapsody TV" <${this.configService.get<string>('email.from')}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0000FF; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 40px 30px; }
            .code { background: #0000FF; color: white; font-size: 32px; font-weight: bold; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; letter-spacing: 5px; }
            .footer { background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Rhapsody TV</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">Email Verification</p>
            </div>
            <div class="content">
              <h2 style="color: #0000FF;">Verify Your Email Address</h2>
              <p>Thank you for registering with Rhapsody TV! Please use the verification code below to verify your email address:</p>
              <div class="code">${code}</div>
              <p><strong>This code will expire in 10 minutes.</strong></p>
              <p>If you didn't create an account with Rhapsody TV, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Rhapsody TV. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    this.logger.log(`Sending verification email to ${email}`);
    try {
      const result = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${email}:`, error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
    const mailOptions = {
      from: `"Rhapsody TV" <${this.configService.get<string>('email.from')}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #0000FF; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 40px 30px; }
            .button { display: inline-block; background: #0000FF; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { background: #f0f0f0; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 0 0 10px 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">Rhapsody TV</h1>
              <p style="margin: 10px 0 0 0; font-size: 18px;">Password Reset</p>
            </div>
            <div class="content">
              <h2 style="color: #0000FF;">Reset Your Password</h2>
              <p>We received a request to reset your password. Click the button below to reset it:</p>
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Reset Password</a>
              </div>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 Rhapsody TV. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}
