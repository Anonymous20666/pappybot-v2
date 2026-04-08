const Redis = require('ioredis');
const logger = require('../utils/logger');
const config = require('../utils/config');

let redisClient = null;

async function connectRedis() {
    redisClient = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        retryStrategy: (times) => {
            const delay = Math.min(times * 1000, 10000);
            logger.warn(`Redis reconnecting in ${delay}ms (attempt ${times})`);
            return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false
    });

    redisClient.on('error', (error) => {
        if (error.code !== 'ECONNRESET' && error.code !== 'EPIPE') {
            logger.error('Redis error:', error.message);
        }
    });

    redisClient.on('connect', () => {
        logger.info('Redis connected');
    });

    redisClient.on('ready', () => {
        logger.info('Redis ready');
    });

    redisClient.on('reconnecting', () => {
        logger.warn('Redis reconnecting...');
    });

    await redisClient.ping();
    return redisClient;
}

function getRedisClient() {
    return redisClient;
}

module.exports = { connectRedis, getRedisClient };
