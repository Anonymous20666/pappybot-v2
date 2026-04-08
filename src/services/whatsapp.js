// core/whatsapp.js — SINGLE SESSION BEAST MODE
const {
    default: makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    DisconnectReason,
    Browsers,
    delay,
} = require('gifted-baileys');
const pino   = require('pino');
const fs     = require('fs');
const path   = require('path');
const logger = require('./logger');
const engine = require('./engine');
const watchdog = require('./watchdog');

const SESSION_DIR = path.join(__dirname, '../data/session');
const STATE_FILE  = path.join(__dirname, '../data/botState.json');

if (!fs.existsSync(SESSION_DIR)) fs.mkdirSync(SESSION_DIR, { recursive: true });
if (!fs.existsSync(path.join(__dirname, '../data'))) fs.mkdirSync(path.join(__dirname, '../data'));

// Single socket reference
let activeSock = null;
let isConnecting = false;
let retryCount = 0;

// Group meta cache — 5 min TTL
const groupMetaCache = new Map();
const GROUP_TTL = 5 * 60 * 1000;
async function getCachedGroupMeta(sock, jid) {
    const c = groupMetaCache.get(jid);
    if (c && Date.now() - c.ts < GROUP_TTL) return c.meta;
    const meta = await sock.groupMetadata(jid);
    groupMetaCache.set(jid, { meta, ts: Date.now() });
    return meta;
}

let botState = { isSleeping: false, autoJoinEnabled: false };
if (fs.existsSync(STATE_FILE)) {
    try { botState = { ...botState, ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) }; } catch {}
}
const saveState = () => { try { fs.writeFileSync(STATE_FILE, JSON.stringify(botState)); } catch {} };

if (botState.autoJoinEnabled) global.autoJoinEnabled = true;

// Expose activeSockets as a Map for Telegram dashboard compatibility
const activeSockets = new Map();

async function startWhatsApp(chatId, phoneNumber, slotId = '1', isRestart = false) {
    if (botState.isSleeping && !isRestart) return;
    if (isConnecting && !isRestart) return;
    isConnecting = true;

    try {
        const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
        let { version } = await fetchLatestBaileysVersion();
        if (!version) version = [2, 3000, 1017531287];

        const sock = makeWASocket({
            version,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
            },
            logger: pino({ level: 'fatal' }), // Only log critical errors
            printQRInTerminal: false,
            browser: Browsers.ubuntu('Chrome'),
            syncFullHistory: false,
            generateHighQualityLinkPreview: false,
            markOnlineOnConnect: false,
            keepAliveIntervalMs: 60000, // Increased from 30s
            connectTimeoutMs: 90000, // Increased from 60s
            retryRequestDelayMs: 5000, // Increased from 2s
            defaultQueryTimeoutMs: 90000, // Increased from 60s
            emitOwnEvents: false,
            getMessage: async () => undefined,
            patchMessageBeforeSending: (msg) => {
                if (msg.buttonsMessage || msg.templateMessage || msg.listMessage) {
                    msg = { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadataVersion: 2, deviceListMetadata: {} }, ...msg } } };
                }
                return msg;
            },
        });

        // Wrap all socket operations to prevent EPIPE
        const wrapSocketMethod = (method) => {
            const original = sock[method]?.bind(sock);
            if (!original) return;
            sock[method] = async (...args) => {
                if (!sock.ws || sock.ws.readyState !== 1) {
                    throw new Error('Socket disconnected');
                }
                try {
                    return await original(...args);
                } catch (e) {
                    if (e.code === 'EPIPE' || e.code === 'ECONNRESET') throw new Error('Socket closed');
                    throw e;
                }
            };
        };
        ['sendMessage', 'groupMetadata', 'groupFetchAllParticipating', 'sendPresenceUpdate'].forEach(wrapSocketMethod);

        // ── Pairing ───────────────────────────────────────────────────────────
        if (!sock.authState.creds.registered && phoneNumber && phoneNumber !== '0') {
            logger.system(`Initiating pairing for +${phoneNumber}...`);
            let pairRetry = 0;
            const doPair = async () => {
                try {
                    await delay(4000);
                    const code = await sock.requestPairingCode(String(phoneNumber).replace(/\D/g, ''));
                    const fmt  = code?.match(/.{1,4}/g)?.join('-') || code;
                    logger.system(`PAIRING CODE for +${phoneNumber}: ${fmt}`);
                    if (global.tgBot) {
                        global.tgBot.telegram.sendMessage(chatId,
                            `🔗 <b>PAIRING CODE FOR +${phoneNumber}</b>\n\n<code>${fmt}</code>\n\n<i>WhatsApp → Linked Devices → Link with phone number</i>`,
                            { parse_mode: 'HTML' }
                        ).catch(() => {});
                    }
                } catch (e) {
                    logger.error(`Pairing error: ${e.message}`);
                    if (++pairRetry < 2 && global.tgBot) {
                        global.tgBot.telegram.sendMessage(chatId,
                            `❌ <b>PAIRING FAILED</b>\n${e.message}\n\nEnsure the number is correct.`,
                            { parse_mode: 'HTML' }
                        ).catch(() => {});
                    }
                }
            };
            setTimeout(doPair, 3000);
        }

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
            if (connection === 'close') {
                const code      = lastDisconnect?.error?.output?.statusCode;
                const loggedOut = code === DisconnectReason.loggedOut;

                activeSock = null;
                activeSockets.clear();
                global.waSock  = null;
                global.waSocks = activeSockets;
                isConnecting   = false;
                watchdog.detach(phoneNumber);

                try { sock.ws?.close(); sock.ws?.terminate(); } catch {}
                try { sock.end(); } catch {}

                if (loggedOut) {
                    logger.warn(`🚨 LOGGED OUT — wiping session`);
                    try { fs.rmSync(SESSION_DIR, { recursive: true, force: true }); fs.mkdirSync(SESSION_DIR); } catch {}
                    if (global.tgBot) {
                        global.tgBot.telegram.sendMessage(chatId,
                            `🚨 <b>LOGGED OUT & SESSION WIPED</b>\n\nUse /pair to re-link.`,
                            { parse_mode: 'HTML' }
                        ).catch(() => {});
                    }
                    return;
                }

                // 440 = WA rate limit — back off VERY hard to avoid ban
                const is440   = code === 440;
                const backoff = is440
                    ? Math.min(300000 * Math.pow(2, Math.min(retryCount, 4)), 1800000) // 5min to 30min
                    : Math.min(10000 * Math.pow(2, Math.min(retryCount, 5)), 120000); // 10s to 2min

                retryCount++;
                
                // Don't reconnect if getting 440 repeatedly
                if (is440 && retryCount > 3) {
                    logger.error(`[WA] Too many 440 errors. Account may be rate limited. Waiting ${(backoff/60000).toFixed(1)} minutes...`);
                }
                
                logger.system(`[WA] Closed (${code}). Reconnecting in ${(backoff/1000).toFixed(0)}s... (attempt ${retryCount})`);
                setTimeout(() => startWhatsApp(chatId, phoneNumber, slotId, true), backoff);
            }

            if (connection === 'open') {
                retryCount   = 0;
                isConnecting = false;
                activeSock   = sock;
                activeSockets.set('main', sock);
                global.waSock  = sock;
                global.waSocks = activeSockets;
                logger.success(`🟢 WhatsApp Online → +${phoneNumber}`);
                engine.triggerBoot(sock);
                
                // Disable watchdog - it's causing unnecessary reconnects
                // watchdog.attach(phoneNumber, sock, async () => {
                //     logger.error(`[WATCHDOG] Zombie detected — restarting`);
                //     watchdog.detach(phoneNumber);
                //     activeSock = null;
                //     activeSockets.clear();
                //     global.waSock = null;
                //     try { sock.ws?.close(); sock.ws?.terminate(); } catch {}
                //     try { sock.end(); } catch {}
                //     await delay(3000);
                //     startWhatsApp(chatId, phoneNumber, slotId, true);
                // });
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (botState.isSleeping) return;
            if (type !== 'notify' && type !== 'append') return;
            const msg = messages[0];
            if (!msg?.message) return;
            if (msg.key.fromMe && !(
                msg.message.conversation?.startsWith('.') ||
                msg.message.extendedTextMessage?.text?.startsWith('.')
            )) return;

            const jid = msg.key.remoteJid;
            if (!jid) return;

            // Sticker bind
            if (!msg.message.conversation && msg.message.stickerMessage?.fileSha256) {
                try {
                    const bindDb = path.join(__dirname, '../data/stickerCmds.json');
                    if (fs.existsSync(bindDb)) {
                        const db  = JSON.parse(fs.readFileSync(bindDb, 'utf-8'));
                        const raw = msg.message.stickerMessage.fileSha256;
                        const id  = Buffer.isBuffer(raw) ? raw.toString('base64') : Buffer.from(Object.values(raw)).toString('base64');
                        if (db[id]) msg.message.conversation = db[id];
                    }
                } catch {}
            }

            const isGroup = jid.endsWith('@g.us');
            const botId   = sock.user?.id?.split(':')[0] || phoneNumber;
            let text = msg.message.conversation
                || msg.message.extendedTextMessage?.text
                || msg.message.imageMessage?.caption
                || msg.message.videoMessage?.caption || '';

            if (msg.message.ephemeralMessage) {
                const e = msg.message.ephemeralMessage.message;
                text = e?.conversation || e?.extendedTextMessage?.text || e?.imageMessage?.caption || e?.videoMessage?.caption || '';
            }

            const sender = msg.key.fromMe
                ? `${botId}@s.whatsapp.net`
                : (msg.key.participant || msg.key.remoteJid);

            let isGroupAdmin = false;
            if (isGroup) {
                try {
                    const meta = await getCachedGroupMeta(sock, jid);
                    isGroupAdmin = !!meta.participants.find(p => p.id === sender)?.admin;
                } catch {}
            }

            engine.triggerMessage({ sock, msg, text, isGroup, sender, botId, isGroupAdmin });
        });

        return sock;

    } catch (err) {
        isConnecting = false;
        logger.error(`startWhatsApp failed: ${err.message}`);
        const backoff = Math.min(5000 * Math.pow(2, retryCount), 60000);
        retryCount++;
        setTimeout(() => startWhatsApp(chatId, phoneNumber, slotId, true), backoff);
    }
}

module.exports = { startWhatsApp, activeSockets, botState, saveState };
