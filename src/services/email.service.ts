import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: any = null;
let loggedTransportMode = false;

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
    console.warn('SMTP not configured. Emails are simulated (jsonTransport) and will not be delivered.');
    loggedTransportMode = true;
  }

  transporter = nodemailer.createTransport({
    jsonTransport: true
  });

  return transporter;
};

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  const tx = await getTransporter();

  const info = await tx.sendMail({
    from: env.emailFrom,
    to,
    subject,
    html
  });

  if (info?.message) {
    console.log('Email payload (json transport):', String(info.message));
  }
};
