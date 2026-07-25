import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const user = this.config.get<string>('MAIL_USER') || '';
    const pass = this.config.get<string>('MAIL_PASS') || '';
    this.from =
      this.config.get<string>('MAIL_FROM') || user || 'no-reply@teamsync.local';

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('MAIL_HOST') || 'smtp.gmail.com',
        port: Number(this.config.get('MAIL_PORT') ?? 587),
        secure: this.config.get('MAIL_SECURE') === 'true',
        auth: { user, pass },
      });
    } else {
      this.transporter = null;
      this.logger.warn(
        'Mail is not configured (MAIL_USER/MAIL_PASS missing); emails will be skipped.',
      );
    }
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(
        `Skipped email to ${to} ("${subject}") — mailer not configured.`,
      );
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}: ${(error as Error).message}`,
      );
    }
  }
}
