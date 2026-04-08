const mongoose = require('mongoose');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { retry } = require('../utils/retry');

async function connectDatabase() {
    await retry(
        async () => {
            await mongoose.connect(config.mongoUri, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            });
        },
        {
            maxRetries: 5,
            delay: 2000,
            onRetry: (error, attempt) => {
                logger.warn(`MongoDB connection attempt ${attempt} failed:`, error.message);
            }
        }
    );

    mongoose.connection.on('error', (error) => {
        logger.error('MongoDB error:', error);
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected, attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
    });

    return mongoose.connection;
}

module.exports = { connectDatabase };
