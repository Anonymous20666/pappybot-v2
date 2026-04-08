require('dotenv').config();
const logger = require('./utils/logger');
const config = require('./utils/config');
const { connectDatabase } = require('./storage/database');
const { connectRedis } = require('./storage/redis');
const WhatsAppHandler = require('./handlers/whatsapp');
const TelegramHandler = require('./handlers/telegram');
const QueueService = require('./services/queue');

class PappyBot {
    constructor() {
        this.whatsapp = null;
        this.telegram = null;
        this.queue = null;
        this.isShuttingDown = false;
    }

    async start() {
        try {
            logger.info('🚀 PappyBot V2 Starting...');

            await config.validate();
            logger.info('✅ Configuration validated');

            await connectDatabase();
            logger.info('✅ MongoDB connected');

            await connectRedis();
            logger.info('✅ Redis connected');

            this.queue = new QueueService();
            await this.queue.initialize();
            logger.info('✅ Queue service initialized');

            this.telegram = new TelegramHandler();
            await this.telegram.initialize();
            logger.info('✅ Telegram bot initialized');

            this.whatsapp = new WhatsAppHandler(this.telegram, this.queue);
            await this.whatsapp.initialize();
            logger.info('✅ WhatsApp bot initialized');

            this.setupGracefulShutdown();
            logger.info('🎉 PappyBot V2 is fully online!');

        } catch (error) {
            logger.error('❌ Failed to start bot:', error);
            logger.error('Error details:', { message: error.message, stack: error.stack });
            await this.shutdown();
            process.exit(1);
        }
    }

    setupGracefulShutdown() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
        
        signals.forEach(signal => {
            process.on(signal, async () => {
                if (this.isShuttingDown) return;
                this.isShuttingDown = true;
                
                logger.info(`\n🛑 Received ${signal}, shutting down gracefully...`);
                await this.shutdown();
                process.exit(0);
            });
        });

        process.on('uncaughtException', (error) => {
            if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
                logger.debug('Ignored network error:', error.code);
                return;
            }
            logger.error('💥 Uncaught Exception:', error);
        });

        process.on('unhandledRejection', (reason) => {
            if (reason?.code === 'EPIPE' || reason?.code === 'ECONNRESET') {
                logger.debug('Ignored network rejection:', reason.code);
                return;
            }
            logger.error('💥 Unhandled Rejection:', reason);
        });
    }

    async shutdown() {
        try {
            logger.info('Closing connections...');

            if (this.whatsapp) {
                await this.whatsapp.close();
                logger.info('✅ WhatsApp closed');
            }

            if (this.telegram) {
                await this.telegram.close();
                logger.info('✅ Telegram closed');
            }

            if (this.queue) {
                await this.queue.close();
                logger.info('✅ Queue closed');
            }

            const mongoose = require('mongoose');
            await mongoose.connection.close();
            logger.info('✅ MongoDB closed');

            const { getRedisClient } = require('./storage/redis');
            const redis = getRedisClient();
            if (redis) {
                await redis.quit();
                logger.info('✅ Redis closed');
            }

            logger.info('👋 Shutdown complete');
        } catch (error) {
            logger.error('Error during shutdown:', error);
        }
    }
}

const bot = new PappyBot();
bot.start().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
});
