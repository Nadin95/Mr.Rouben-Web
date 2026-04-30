import app from './app';
import { connectDB } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { whatsappService } from './services/whatsapp.service';

const startServer = async (): Promise<void> => {
  try {
    await connectDB();
    whatsappService.initialize();

    app.listen(env.port, () => {
      logger.info(`Server running on http://localhost:${env.port} [${env.nodeEnv}]`);
    });
  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
};

void startServer();
