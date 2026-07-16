import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: any = null;
let resendClient: Resend | null = null;
let loggedTransportMode = false;

const getResendClient = (): Resend | null => {
  if (!env.resendApiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
};

const getTransporter = async (): Promise<any> => {
  if (transporter) {
    return transporter;
  }

  if (env.smtpHost && env.smtpUser && env.smtpPass) {
    if (!loggedTransportMode) {
      console.log(`SMTP enabled. Sending real emails via ${env.smtpHost}:${env.smtpPort}.`);
      loggedTransportMode = true;
    }

    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    });

    return transporter;
  }

  if (!loggedTransportMode) {
    console.warn('Email provider not configured. Emails are simulated and will not be delivered.');
    loggedTransportMode = true;
  }

  transporter = nodemailer.createTransport({
    jsonTransport: true
  });

  return transporter;
};

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  // Try Resend first if configured
  const resend = getResendClient();
  if (resend) {
    try {
      const result = await resend.emails.send({
        from: env.emailFrom,
        to,
        subject,
        html
      });
      console.log(`[Resend] Email sent to ${to} with ID:`, result.data?.id);
      return;
    } catch (error) {
      console.error(`[Resend] Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  // Fallback to SMTP or simulation
  const tx = await getTransporter();
  const info = await tx.sendMail({
    from: env.emailFrom,
    to,
    subject,
    html
  });

  if (info?.message) {
    console.log('Email payload (json transport):', String(info.message));
  } else if (info?.id) {
    console.log(`Email sent via SMTP with ID: ${info.id}`);
  }
};
