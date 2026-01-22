import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
}));
