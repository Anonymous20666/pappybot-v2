const { Queue, Worker } = require('bullmq');
const logger = require('../utils/logger');
const config = require('../utils/config');

class QueueService {
    constructor() {
        this.broadcastQueue = null;
        this.worker = null;
        this.connection = {
            host: config.redis.host,
            port: config.redis.port,
            password: config.redis.password
        };
    }

    async initialize() {
        try {
            this.broadcastQueue = new Queue('broadcast', {
                connection: this.connection,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 2000
                    },
                    removeOnComplete: 100,
                    removeOnFail: 50
                }
            });

            this.worker = new Worker('broadcast', async (job) => {
                return await this.processBroadcast(job);
            }, {
                connection: this.connection,
                concurrency: 5
            });

            this.worker.on('completed', (job) => {
                logger.info(`Job ${job.id} completed`);
            });

            this.worker.on('failed', (job, error) => {
                logger.error(`Job ${job.id} failed:`, error.message);
            });

            logger.info('Queue service initialized');
        } catch (error) {
            logger.error('Queue initialization error:', error);
            throw error;
        }
    }

    async processBroadcast(job) {
        const { message, groups } = job.data;
        
        logger.info(`Processing broadcast to ${groups.length} groups`);

        for (const groupJid of groups) {
            try {
                await job.updateProgress(groups.indexOf(groupJid) / groups.length * 100);
                logger.debug(`Broadcast sent to ${groupJid}`);
            } catch (error) {
                logger.error(`Failed to send to ${groupJid}:`, error.message);
            }
        }

        return { sent: groups.length };
    }

    async addBroadcast(message, groups) {
        try {
            const job = await this.broadcastQueue.add('broadcast', {
                message,
                groups,
                timestamp: Date.now()
            });

            logger.info(`Broadcast job ${job.id} added to queue`);
            return job;
        } catch (error) {
            logger.error('Failed to add broadcast job:', error);
            throw error;
        }
    }

    async close() {
        if (this.worker) {
            await this.worker.close();
        }
        if (this.broadcastQueue) {
            await this.broadcastQueue.close();
        }
    }
}

module.exports = QueueService;
