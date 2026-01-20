import nodemailer from 'nodemailer';
import TelegramBot from 'node-telegram-bot-api';
import prisma from '../config/database';
import { NotificationPayload } from '../types';
import { env } from '../config/env';

class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  private telegramBot: TelegramBot | null = null;

  constructor() {
    this.initializeEmail();
    this.initializeTelegram();
  }

  private initializeEmail() {
    if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
      this.emailTransporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: parseInt(env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
    }
  }

  private initializeTelegram() {
    if (env.TELEGRAM_BOT_TOKEN) {
      this.telegramBot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, { polling: false });
    }
  }

  async sendNotifications(payload: NotificationPayload): Promise<void> {
    const monitor = await prisma.monitor.findUnique({
      where: { id: payload.monitorId },
      include: {
        user: {
          include: {
            notifications: true,
          },
        },
      },
    });

    if (!monitor || !monitor.user.notifications) {
      return;
    }

    const settings = monitor.user.notifications;
    const statusEmoji = payload.status === 'DOWN' ? '🔴' : '🟢';
    const message = this.formatMessage(payload, statusEmoji);

    // Send email notification
    if (settings.email && this.emailTransporter) {
      await this.sendEmail(monitor.user.email, payload, message);
    }

    // Send Telegram notification
    if (settings.telegram && settings.telegramChatId && this.telegramBot) {
      await this.sendTelegram(settings.telegramChatId, message);
    }

    // Send Webhook notification
    if (settings.webhook && settings.webhookUrl) {
      await this.sendWebhook(settings.webhookUrl, payload);
    }
  }

  private formatMessage(payload: NotificationPayload, emoji: string): string {
    if (payload.status === 'DOWN') {
      return `${emoji} Alert: ${payload.monitorName} is DOWN\n\n` +
             `URL: ${payload.url}\n` +
             `Time: ${new Date().toISOString()}\n` +
             (payload.error ? `Error: ${payload.error}\n` : '') +
             (payload.incidentId ? `Incident ID: ${payload.incidentId}` : '');
    } else {
      return `${emoji} Recovery: ${payload.monitorName} is back UP\n\n` +
             `URL: ${payload.url}\n` +
             `Time: ${new Date().toISOString()}\n` +
             (payload.incidentId ? `Incident ID: ${payload.incidentId}` : '');
    }
  }

  private async sendEmail(email: string, payload: NotificationPayload, message: string): Promise<void> {
    if (!this.emailTransporter) return;

    try {
      await this.emailTransporter.sendMail({
        from: env.SMTP_FROM || 'UptimeGuard <noreply@uptimeguard.com>',
        to: email,
        subject: `${payload.status === 'DOWN' ? '🔴' : '🟢'} ${payload.monitorName} - ${payload.status}`,
        text: message,
        html: `<pre>${message}</pre>`,
      });
    } catch (error) {
      console.error('Failed to send email notification:', error);
    }
  }

  private async sendTelegram(chatId: string, message: string): Promise<void> {
    if (!this.telegramBot) return;

    try {
      await this.telegramBot.sendMessage(chatId, message);
    } catch (error) {
      console.error('Failed to send Telegram notification:', error);
    }
  }

  private async sendWebhook(url: string, payload: NotificationPayload): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: payload.status === 'DOWN' ? 'monitor.down' : 'monitor.up',
          monitor: {
            id: payload.monitorId,
            name: payload.monitorName,
            url: payload.url,
          },
          incidentId: payload.incidentId,
          error: payload.error,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        console.error(`Webhook notification failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
