const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    Browsers,
    fetchLatestBaileysVersion
} = require('gifted-baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const config = require('../utils/config');
const { sleep } = require('../utils/retry');
const CommandRouter = require('../services/commandRouter');

class WhatsAppHandler {
    constructor(telegramHandler, queueService) {
        this.sock = null;
        this.telegram = telegramHandler;
        this.queue = queueService;
        this.commandRouter = null;
        this.isConnecting = false;
        this.retryCount = 0;
        this.sessionDir = path.join(__dirname, '../../data/session');
    }

    async initialize() {
        if (!fs.existsSync(this.sessionDir)) {
            fs.mkdirSync(this.sessionDir, { recursive: true });
        }

        this.commandRouter = new CommandRouter(this);
        await this.connect();
    }

    async connect() {
        if (this.isConnecting) {
            logger.warn('WhatsApp connection already in progress');
            return;
        }

        this.isConnecting = true;

        try {
            const { state, saveCreds } = await useMultiFileAuthState(this.sessionDir);
            const { version } = await fetchLatestBaileysVersion();

            this.sock = makeWASocket({
                version,
                auth: state,
                logger: pino({ level: 'fatal' }),
                printQRInTerminal: false,
                browser: Browsers.ubuntu('Chrome'),
                syncFullHistory: false,
                markOnlineOnConnect: false,
                keepAliveIntervalMs: 60000,
                connectTimeoutMs: 90000,
                defaultQueryTimeoutMs: 90000,
                getMessage: async () => undefined
            });

            this.sock.ev.on('creds.update', saveCreds);
            this.sock.ev.on('connection.update', (update) => this.handleConnectionUpdate(update));
            this.sock.ev.on('messages.upsert', (m) => this.handleMessages(m));

            if (!this.sock.authState.creds.registered) {
                logger.warn('No WhatsApp session found. Use /pair in Telegram to link a number.');
            }

        } catch (error) {
            logger.error('WhatsApp connection error:', error);
            this.isConnecting = false;
            await this.scheduleReconnect();
        }
    }

    async handleConnectionUpdate(update) {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            this.isConnecting = false;
            const statusCode = lastDisconnect?.error?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            logger.warn(`WhatsApp connection closed (code: ${statusCode})`);

            if (statusCode === DisconnectReason.loggedOut) {
                logger.error('Logged out from WhatsApp. Session cleared.');
                try {
                    fs.rmSync(this.sessionDir, { recursive: true, force: true });
                    fs.mkdirSync(this.sessionDir, { recursive: true });
                } catch (err) {
                    logger.error('Failed to clear session:', err);
                }
                return;
            }

            if (shouldReconnect) {
                await this.scheduleReconnect(statusCode);
            }
        }

        if (connection === 'open') {
            this.retryCount = 0;
            this.isConnecting = false;
            logger.info(`✅ WhatsApp connected: ${this.sock.user.id}`);
        }
    }

    async scheduleReconnect(statusCode) {
        const is440 = statusCode === 440;
        const baseDelay = is440 ? 300000 : 10000;
        const delay = Math.min(baseDelay * Math.pow(2, this.retryCount), is440 ? 1800000 : 120000);

        this.retryCount++;
        logger.info(`Reconnecting in ${(delay / 1000).toFixed(0)}s (attempt ${this.retryCount})`);

        await sleep(delay);
        await this.connect();
    }

    async handleMessages({ messages, type }) {
        if (type !== 'notify') return;

        for (const msg of messages) {
            try {
                if (!msg.message) continue;

                const text = msg.message.conversation ||
                    msg.message.extendedTextMessage?.text ||
                    msg.message.imageMessage?.caption ||
                    msg.message.videoMessage?.caption || '';

                if (!text.startsWith(config.prefix)) continue;

                const args = text.slice(config.prefix.length).trim().split(/ +/);
                const command = args.shift().toLowerCase();

                await this.commandRouter.execute(command, msg, args);

            } catch (error) {
                logger.error('Error handling message:', error);
            }
        }
    }

    async sendMessage(jid, content, options = {}) {
        if (!this.sock || !this.sock.user) {
            throw new Error('WhatsApp not connected');
        }

        try {
            return await this.sock.sendMessage(jid, content, options);
        } catch (error) {
            if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
                throw new Error('Socket disconnected');
            }
            throw error;
        }
    }

    async close() {
        if (this.sock) {
            try {
                await this.sock.logout();
            } catch (error) {
                logger.error('Error closing WhatsApp:', error);
            }
        }
    }
}

module.exports = WhatsAppHandler;
