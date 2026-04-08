const logger = require('./logger');

class Config {
    constructor() {
        this.tgBotToken = process.env.TG_BOT_TOKEN;
        this.ownerTgId = process.env.OWNER_TG_ID;
        this.ownerWaJid = process.env.OWNER_WA_JID;
        
        this.redis = {
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD
        };
        
        this.mongoUri = process.env.MONGO_URI;
        this.openRouterKey = process.env.OPENROUTER_API_KEY;
        
        this.maxRetries = parseInt(process.env.MAX_RETRIES || '3');
        this.reconnectDelay = parseInt(process.env.RECONNECT_DELAY || '5000');
        this.prefix = '.';
    }

    async validate() {
        const required = [
            { key: 'TG_BOT_TOKEN', value: this.tgBotToken },
            { key: 'OWNER_TG_ID', value: this.ownerTgId },
            { key: 'REDIS_HOST', value: this.redis.host },
            { key: 'MONGO_URI', value: this.mongoUri },
            { key: 'OPENROUTER_API_KEY', value: this.openRouterKey }
        ];

        const missing = required.filter(item => !item.value);
        
        if (missing.length > 0) {
            const keys = missing.map(item => item.key).join(', ');
            throw new Error(`Missing required environment variables: ${keys}`);
        }

        logger.info('Configuration validated successfully');
        return true;
    }
}

module.exports = new Config();
