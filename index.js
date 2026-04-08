require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { startWhatsApp, activeSockets, botState, saveState } = require('./src/services/whatsapp');
const { startTelegram } = require('./src/services/telegram');
const logger = require('./src/services/logger');
const { ownerTelegramId } = require('./config');
const { connectDB } = require('./src/services/database');

process.on('uncaughtException', (e) => {
    if (e.code !== 'EPIPE' && e.code !== 'ECONNRESET') {
        logger.error(`[CRASH PREVENTED] Uncaught Exception: ${e.message}`);
    }
});

process.on('unhandledRejection', (r) => {
    if (r?.code !== 'EPIPE' && r?.code !== 'ECONNRESET') {
        logger.error(`[CRASH PREVENTED] Unhandled Rejection: ${r}`);
    }
});

process.on('SIGINT', () => {
    logger.warn('Shutting down...');
    process.exit(0);
});

async function boot() {
    console.clear();
    logger.system('⚡ OMEGA BEAST BOOTING...');

    await connectDB();

    try {
        await startTelegram();
        logger.success('Telegram Dashboard Online');
    } catch (e) {
        logger.error(`Telegram failed: ${e.message}`);
    }

    const sessionDir = path.join(__dirname, 'data/session');
    if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

    const credsPath = path.join(sessionDir, 'creds.json');
    const hasSession = fs.existsSync(credsPath) && (() => {
        try {
            const d = fs.readFileSync(credsPath, 'utf-8');
            JSON.parse(d);
            return !!d.trim();
        } catch {
            return false;
        }
    })();

    if (!hasSession) {
        logger.warn('No session found. Use /pair in Telegram to link your WhatsApp number.');
        // Don't try to connect without session
    } else {
        logger.info('Session found. Connecting...');
        const keyFile = path.join(__dirname, 'data/session-meta.json');
        let chatId = ownerTelegramId;
        let phone = '0';
        if (fs.existsSync(keyFile)) {
            try {
                const m = JSON.parse(fs.readFileSync(keyFile, 'utf-8'));
                chatId = m.chatId;
                phone = m.phone;
            } catch {}
        }
        await startWhatsApp(chatId, phone, '1', true);
    }

    logger.system('✅ OMEGA BEAST FULLY ONLINE');
}

boot();
