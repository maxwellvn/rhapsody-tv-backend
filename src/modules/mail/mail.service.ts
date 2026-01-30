import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly apiUrl = 'https://api.zeptomail.com/v1.1/email';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('ZEPTOMAIL_API_KEY') || '';
    this.fromAddress =
      this.configService.get<string>('ZEPTOMAIL_FROM_ADDRESS') || '';

    if (!this.apiKey) {
      this.logger.error('ZEPTOMAIL_API_KEY is not defined');
    }
    if (!this.fromAddress) {
      this.logger.error('ZEPTOMAIL_FROM_ADDRESS is not defined');
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
    name?: string,
  ): Promise<void> {
    try {
      const response = await axios.post(
        this.apiUrl,
        {
          from: { address: this.fromAddress, name: 'Rhapsody TV' },
          to: [
            {
              email_address: {
                address: to,
                name: name || '',
              },
            },
          ],
          subject: subject,
          htmlbody: htmlBody,
        },
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Zoho-enczapikey ${this.apiKey}`,
          },
        },
      );

      this.logger.log(
        `Email sent successfully to ${to}. ID: ${response.data?.data?.[0]?.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}`,
        error.response?.data || error.message,
      );
      // Depending on requirement, we might not want to throw to avoid breaking the registration flow
      // But for OTP, it is critical.
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}
