// import { Injectable, Logger } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import * as nodemailer from 'nodemailer';
// import { Transporter } from 'nodemailer';

// @Injectable()
// export class MailService {
//   private readonly transporter: Transporter;
//   private readonly logger = new Logger(MailService.name);

//   constructor(private readonly configService: ConfigService) {
//     const host = this.configService.get<string>('SMTP_HOST', 'smtp.mail.ru');
//     const port = Number(this.configService.get<number>('SMTP_PORT', 465));
//     const user = this.configService.get<string>('SMTP_USER');
//     const pass = this.configService.get<string>('SMTP_PASSWORD');

//     this.transporter = nodemailer.createTransport({
//       host,
//       port,
//       secure: port === 465, // SSL для порта 465, STARTTLS для остальных
//       auth: user && pass ? { user, pass } : undefined,
//     });
//   }

//   async sendPasswordResetEmail(to: string, token: string): Promise<void> {
//     const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
//     const from = this.configService.get<string>('SMTP_FROM', 'noreply@recipeblog.dev');
//     const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

//     const html = `
//       <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
//         <h2 style="color: #2c3e50;">Сброс пароля</h2>
//         <p>Вы получили это письмо, потому что запросили сброс пароля для вашей учетной записи.</p>
//         <p>Для создания нового пароля перейдите по ссылке ниже (ссылка действительна 15 минут):</p>
//         <div style="margin: 25px 0;">
//           <a href="${resetUrl}" style="background-color: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
//             Сбросить пароль
//           </a>
//         </div>
//         <p style="color: #7f8c8d; font-size: 13px;">Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p>
//       </div>
//     `;

//     try {
//       await this.transporter.sendMail({
//         from,
//         to,
//         subject: 'Инструкция по сбросу пароля',
//         html,
//       });
//       this.logger.log(`Password reset email sent to ${to}`);
//     } catch (error) {
//       this.logger.error(`Failed to send password reset email to ${to}`, error);
//       // Не прерываем ответ клиенту, чтобы не раскрывать статус отправки
//     }
//   }
// }

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly transporter: Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly templateCache = new Map<string, handlebars.TemplateDelegate>();

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'localhost');
    const port = Number(this.configService.get<number>('SMTP_PORT', 465));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async onModuleInit() {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
    } catch (error) {
      this.logger.warn('SMTP connection failed:', error);
    }
  }

  private getTemplate(templateName: string): handlebars.TemplateDelegate {
    if (this.templateCache.has(templateName)) {
      return this.templateCache.get(templateName)!;
    }

    // 1. Проверяем путь относительно скомпилированного файла / dist
    let templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);

    // 2. Fallback: если файла нет в dist, ищем в исходниках src/
    if (!fs.existsSync(templatePath)) {
      templatePath = path.join(process.cwd(), 'src', 'mail', 'templates', `${templateName}.hbs`);
    }

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Email template not found at paths: ${templatePath}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const compiled = handlebars.compile(templateSource);
    this.templateCache.set(templateName, compiled);

    return compiled;
  }

  async sendPasswordResetEmail(
    to: string,
    token: string,
    username?: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const from = this.configService.get<string>('SMTP_FROM') || this.configService.get<string>('SMTP_USER');
    const resetUrl = `${frontendUrl}/auth/reset-password?token=${token}`;

    const template = this.getTemplate('reset-password');
    const html = template({
      username,
      resetUrl,
      expiresInMinutes: 15,
    });

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Сброс пароля — Recipe Blog',
        html,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}:`, error);
    }
  }
}