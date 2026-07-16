/**
 * Test script to verify MongoDB, Resend, and JWT integrations
 * Run with: ts-node src/scripts/testIntegrations.ts
 */

import mongoose from 'mongoose';
import { env } from '../config/env';
import { sendEmail } from '../services/email.service';
import { signToken, verifyToken } from '../services/jwt.service';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`)
};

const testMongoDB = async (): Promise<boolean> => {
  log.info('Testing MongoDB connection...');
  try {
    await mongoose.connect(env.mongoUri);
    const adminDb = mongoose.connection.getClient().db('admin');
    await adminDb.admin().ping();
    log.success('MongoDB connected and responsive');
    await mongoose.disconnect();
    return true;
  } catch (error) {
    log.error(`MongoDB failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

const testResend = async (): Promise<boolean> => {
  log.info('Testing Resend email service...');

  if (!env.resendApiKey) {
    log.warning('RESEND_API_KEY not configured - email will use SMTP fallback or simulation');
    return false;
  }

  try {
    // Send a test email
    await sendEmail(
      env.nadineEmail,
      'Test Email - Mr. Rouben Integration Check',
      `
        <h2>Prueba de integración</h2>
        <p>Este es un email de prueba desde Mr. Rouben.</p>
        <p>Si recibiste esto, Resend está funcionando correctamente.</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      `
    );
    log.success('Resend test email sent to ' + env.nadineEmail);
    return true;
  } catch (error) {
    log.error(`Resend failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

const testJWT = (): boolean => {
  log.info('Testing JWT signing and verification...');

  try {
    const payload = {
      id: '507f1f77bcf86cd799439011',
      username: 'testuser',
      email: 'test@example.com',
      role: 'user' as const
    };

    const token = signToken(payload);
    log.success(`JWT token signed: ${token.substring(0, 20)}...`);

    const verified = verifyToken(token);
    if (
      verified.id === payload.id &&
      verified.username === payload.username &&
      verified.email === payload.email &&
      verified.role === payload.role
    ) {
      log.success('JWT verified successfully');
      return true;
    } else {
      log.error('JWT payload mismatch after verification');
      return false;
    }
  } catch (error) {
    log.error(`JWT test failed: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
};

const printEnvStatus = (): void => {
  console.log('\n' + colors.blue + '═══ ENVIRONMENT STATUS ═══' + colors.reset);
  console.log(`NODE_ENV: ${env.nodeEnv}`);
  console.log(`APP_BASE_URL: ${env.appBaseUrl}`);
  console.log(`JWT_ISSUER: ${env.jwtIssuer}`);
  console.log(`JWT_AUDIENCE: ${env.jwtAudience}`);
  console.log(`RESEND_API_KEY: ${env.resendApiKey ? '✓ Configured' : '✗ Missing'}`);
  console.log(`MONGO_URI: ${env.mongoUri ? '✓ Configured' : '✗ Missing'}`);
  console.log(`EMAIL_FROM: ${env.emailFrom}\n`);
};

const main = async (): Promise<void> => {
  console.log('\n' + colors.blue + '╔════════════════════════════════════════╗' + colors.reset);
  console.log(colors.blue + '║  MR. ROUBEN - Integration Test Suite  ║' + colors.reset);
  console.log(colors.blue + '╚════════════════════════════════════════╝\n' + colors.reset);

  printEnvStatus();

  const results = {
    mongodb: await testMongoDB(),
    resend: await testResend(),
    jwt: testJWT()
  };

  console.log('\n' + colors.blue + '═══ TEST RESULTS ═══' + colors.reset);
  console.log(`MongoDB:  ${results.mongodb ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);
  console.log(`Resend:   ${results.resend ? colors.green + '✓ PASS' : colors.yellow + '⚠ UNCONFIGURED'}${colors.reset}`);
  console.log(`JWT:      ${results.jwt ? colors.green + '✓ PASS' : colors.red + '✗ FAIL'}${colors.reset}`);

  const allPassed = results.mongodb && results.jwt;
  const criticalPassed = results.mongodb && results.jwt;

  console.log('\n' + colors.blue + '═══ SUMMARY ═══' + colors.reset);
  if (criticalPassed) {
    log.success('Core services are configured and working!');
    console.log('\nYou can now:');
    console.log('  1. Register new user accounts');
    console.log('  2. Receive verification emails (if Resend is configured)');
    console.log('  3. Login and receive JWT tokens');
  } else {
    log.error('Some critical services failed. Check configuration above.');
  }

  process.exit(allPassed ? 0 : 1);
};

main().catch((error) => {
  log.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
