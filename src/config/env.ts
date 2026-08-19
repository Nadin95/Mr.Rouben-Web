import dotenv from 'dotenv';

dotenv.config();

const requiredVars = ['MONGO_URI', 'JWT_SECRET'] as const;

requiredVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
});

export const env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtIssuer: process.env.JWT_ISSUER || 'mr-rouben-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'mr-rouben-clients',
  nadineEmail: process.env.NADINE_EMAIL || 'nadine@mrrouben.com',
  adminUsername: process.env.ADMIN_USERNAME || 'mrrouben_admin',
  adminEmail: process.env.ADMIN_EMAIL || 'nadine@mrrouben.com',
  appBaseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
  emailFrom: process.env.EMAIL_FROM || 'no-reply@mrrouben.com',
  resendApiKey: (process.env.RESEND_API_KEY || '').trim(),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT) || 587,
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  bankTransferAlias: process.env.BANK_TRANSFER_ALIAS || 'mrrouben.vapers',
  whatsappEnabled: process.env.WHATSAPP_ENABLED === 'true',
  whatsappAdminPhone: process.env.WHATSAPP_ADMIN_PHONE || '',

  // WhatsApp API oficial (Meta Cloud API)
  whatsappProvider: process.env.WHATSAPP_PROVIDER || 'legacy',
  metaWaToken: process.env.META_WA_TOKEN || '',
  metaWaPhoneNumberId: process.env.META_WA_PHONE_NUMBER_ID || '',
  metaWaVerifyToken: process.env.META_WA_VERIFY_TOKEN || '',
  metaWaAppSecret: process.env.META_WA_APP_SECRET || '',

  // OCR (Google Cloud Vision)
  googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
  googleApplicationCredentialsJson: process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON || '',

  // Storage externo
  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  // Directory where uploaded files are stored (absolute or relative to process.cwd())
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',

  // Cloudflare R2 (S3-compatible)
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  r2Bucket: process.env.R2_BUCKET || '',
  r2AccountId: process.env.R2_ACCOUNT_ID || '',
  r2Endpoint: process.env.R2_ENDPOINT || '',
  // Email transaccional y monitoreo
  brevoApiKey: process.env.BREVO_API_KEY || '',
  uptimerobotApiKey: process.env.UPTIMEROBOT_API_KEY || ''
};

// Non-sensitive startup debug (prints presence, not values)
try {
  // avoid referencing `env` before it's declared in some environments
  // so access process.env directly for presence checks
  console.debug('[env] storageProvider=', process.env.STORAGE_PROVIDER || '');
  console.debug('[env] uploadsDir=', process.env.UPLOADS_DIR || 'uploads');
  console.debug('[env] r2Bucket=', Boolean(process.env.R2_BUCKET));
  console.debug('[env] r2CredsPresent=', Boolean(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY));
  console.debug('[env] r2EndpointOrAccount=', Boolean(process.env.R2_ENDPOINT || process.env.R2_ACCOUNT_ID));
} catch (e) {
  // ignore
}
