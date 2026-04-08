// plugins/pappy-intel.js — OMEGA BEAST AUTO-JOIN ENGINE
const path = require('path');
const fs   = require('fs');
const { ownerTelegramId } = require('../config');
const logger = require('../core/logger');
const Intel  = require('../core/models/Intel');

const MAX_PER_DAY  = 500;
const MIN_DELAY_MS = 8000;
const MAX_DELAY_MS = 20000;

let dailyJoins   = 0;
let lastJoinDate = '';
let lastJoinTime = 0;
let isRunning    = false;
let _sock        = null; // keep reference for Telegram-triggered joins

function checkReset() {
    const today = new Date().toISOString().split('T')[0];
    if (lastJoinDate !== today) { lastJoinDate = today; dailyJoins = 0; }
}

// ── Extract & store links from any text ───────────────────────────────────────
async function extractAndStore(text) {
    const regex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/ig;
    let match, added = 0;
    while ((match = regex.exec(text)) !== null) {
        const code = match[1];
        try {
            const res = await Intel.updateOne(
                { linkCode: code },
                { $setOnInsert: { linkCode: code, status: 'pending' } },
                { upsert: true }
            );
            if (res.upsertedCount > 0) added++;
        } catch {}
    }
    return added;
}

// ── Core join function — used by both daemon and Telegram ─────────────────────
async function joinOne(sock, linkCode) {
    if (!sock?.user || !sock.ws || sock.ws.readyState !== 1) {
        throw new Error('Socket not ready');
    }
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));
    const groupJid = await sock.groupAcceptInvite(linkCode);
    return groupJid;
}

// ── Beast daemon — runs every 5s, drains queue one by one ────────────────────
async function runDaemon(sock) {
    if (isRunning) return;
    isRunning = true;

    try {
        // Restore autoJoinEnabled from botState on every tick
        if (!global.autoJoinEnabled) {
            const sf = path.join(__dirname, '../data/botState.json');
            if (fs.existsSync(sf)) {
                try {
                    const state = JSON.parse(fs.readFileSync(sf, 'utf-8'));
                    if (state.autoJoinEnabled) global.autoJoinEnabled = true;
                } catch {}
            }
        }

        if (!global.autoJoinEnabled) return;
        if (!sock?.user || !sock.ws || sock.ws.readyState !== 1) return;

        checkReset();
        if (dailyJoins >= MAX_PER_DAY) return;

        const now = Date.now();
        const cd  = MIN_DELAY_MS + Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS);
        if (now - lastJoinTime < cd) return;

        const next = await Intel.findOneAndUpdate(
            { status: 'pending' },
            { $set: { status: 'processing' } },
            { new: false, sort: { createdAt: 1 } }
        ).catch(() => null);

        if (!next) return;

        try {
            logger.info(`[INTEL] Joining: ${next.linkCode} (${dailyJoins + 1}/${MAX_PER_DAY})`);
            const groupJid = await joinOne(sock, next.linkCode);

            if (groupJid) {
                await Intel.updateOne({ _id: next._id }, { status: 'joined', joinedAt: new Date() });
                dailyJoins++;
                lastJoinTime = Date.now();
                logger.success(`[INTEL] ✅ Joined: ${groupJid} (${dailyJoins}/${MAX_PER_DAY})`);

                const pending = await Intel.countDocuments({ status: 'pending' }).catch(() => '?');
                if (global.tgBot) {
                    global.tgBot.telegram.sendMessage(ownerTelegramId,
                        `🚨 <b>NEW GROUP JOINED</b>\n\n🆔 <code>${groupJid}</code>\n📊 Daily: ${dailyJoins}/${MAX_PER_DAY}\n📋 Queue: ${pending} remaining`,
                        { parse_mode: 'HTML' }
                    ).catch(() => {});
                }
            } else {
                await Intel.updateOne({ _id: next._id }, { status: 'failed' });
            }
        } catch (err) {
            const msg = err.message?.toLowerCase() || '';
            if (msg.includes('bad') || msg.includes('invalid') || msg.includes('not-found') || msg.includes('gone') || msg.includes('revoked')) {
                await Intel.updateOne({ _id: next._id }, { status: 'failed' });
                logger.warn(`[INTEL] ❌ Revoked: ${next.linkCode}`);
            } else {
                await Intel.updateOne({ _id: next._id }, { status: 'pending' });
                logger.warn(`[INTEL] ⚠️ Temp fail: ${next.linkCode} — ${err.message}`);
                lastJoinTime = Date.now();
            }
        }
    } finally {
        isRunning = false;
    }
}

module.exports = {
    category: 'INTEL',
    commands: [
        { cmd: '.autojoin',  role: 'public' },
        { cmd: '.joinqueue', role: 'public' },
        { cmd: '.massdrop',  role: 'public' },
        { cmd: '.scrape',    role: 'public' },
    ],

    // Expose joinOne and extractAndStore for Telegram to call directly
    joinOne,
    extractAndStore,
    getSocket: () => _sock,

    init(sock) {
        _sock = sock;

        // Auto-join is ON by default — use .autojoin off to disable
        const sf = path.join(__dirname, '../data/botState.json');
        try {
            const state = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf-8')) : {};
            global.autoJoinEnabled = state.autoJoinEnabled !== false;
        } catch { global.autoJoinEnabled = true; }
        logger.success(`[INTEL] Auto-join: ${global.autoJoinEnabled ? 'ENGAGED 🟢' : 'OFFLINE 🔴'}`);


        // Daemon: check every 5s
        setInterval(() => runDaemon(sock), 5000);

        // Passive interceptor: grab links from every group message
        sock.ev.on('messages.upsert', async ({ messages }) => {
            for (const msg of messages) {
                const text = msg.message?.conversation
                    || msg.message?.extendedTextMessage?.text
                    || msg.message?.imageMessage?.caption || '';
                if (!text?.includes('chat.whatsapp.com')) continue;
                const added = await extractAndStore(text);
                if (added > 0) logger.info(`[INTEL] 🕵️ Intercepted ${added} new link(s)`);
            }
        });

        // Radar dump on boot
        sock.ev.on('connection.update', async ({ connection }) => {
            if (connection !== 'open') return;
            setTimeout(async () => {
                try {
                    const groups = await sock.groupFetchAllParticipating();
                    const jids   = Object.keys(groups);
                    if (!jids.length || !global.tgBot) return;
                    let msg = `📡 <b>RADAR BOOT DUMP</b>\n\n<b>${jids.length}</b> groups:\n\n`;
                    for (const jid of jids) msg += `📁 <b>${groups[jid].subject || 'Unknown'}</b>\n🆔 <code>${jid}</code>\n\n`;
                    const chunks = msg.match(/[\s\S]{1,4000}/g) || [];
                    for (const chunk of chunks) await global.tgBot.telegram.sendMessage(ownerTelegramId, chunk, { parse_mode: 'HTML' }).catch(() => {});
                } catch {}
            }, 8000);
        });

        // New group notification
        sock.ev.on('groups.upsert', async (newGroups) => {
            for (const g of newGroups) {
                if (global.tgBot) {
                    global.tgBot.telegram.sendMessage(ownerTelegramId,
                        `🚨 <b>NEW GROUP</b>\n📁 <b>${g.subject || 'Unknown'}</b>\n🆔 <code>${g.id}</code>`,
                        { parse_mode: 'HTML' }
                    ).catch(() => {});
                }
            }
        });
    },

    execute: async (sock, msg, args, userProfile, commandName) => {
        const chat = msg.key.remoteJid;

        if (commandName === '.autojoin') {
            const action = args[0]?.toLowerCase();
            if (action === 'on' || action === 'off') {
                global.autoJoinEnabled = action === 'on';
                try {
                    const sf = path.join(__dirname, '../data/botState.json');
                    const saved = fs.existsSync(sf) ? JSON.parse(fs.readFileSync(sf, 'utf-8')) : {};
                    saved.autoJoinEnabled = global.autoJoinEnabled;
                    fs.writeFileSync(sf, JSON.stringify(saved));
                } catch {}
                return sock.sendMessage(chat, {
                    text: `\`\`\`\n  AUTO-JOIN : ${global.autoJoinEnabled ? 'ENGAGED 🟢' : 'OFFLINE 🔴'}\n  LIMIT     : ${MAX_PER_DAY}/day\n  DELAY     : ${MIN_DELAY_MS/1000}-${MAX_DELAY_MS/1000}s\n\`\`\``
                }, { quoted: msg });
            }
            const pending = await Intel.countDocuments({ status: 'pending' }).catch(() => 0);
            return sock.sendMessage(chat, {
                text: `📡 Auto-Join: ${global.autoJoinEnabled ? '🟢 ON' : '🔴 OFF'}\nQueue: ${pending} links\n\n*.autojoin on* / *.autojoin off*`
            }, { quoted: msg });
        }

        if (commandName === '.joinqueue') {
            checkReset();
            const pending    = await Intel.countDocuments({ status: 'pending' }).catch(() => 0);
            const processing = await Intel.countDocuments({ status: 'processing' }).catch(() => 0);
            const joined     = await Intel.countDocuments({ status: 'joined' }).catch(() => 0);
            const failed     = await Intel.countDocuments({ status: 'failed' }).catch(() => 0);
            return sock.sendMessage(chat, {
                text: `\`\`\`\n┌──────────────────────────────┐\n│  📡  INTEL RADAR REPORT      │\n├──────────────────────────────┤\n│  PENDING    : ${String(pending).padEnd(18)}│\n│  PROCESSING : ${String(processing).padEnd(18)}│\n│  JOINED     : ${String(joined).padEnd(18)}│\n│  FAILED     : ${String(failed).padEnd(18)}│\n│  TODAY      : ${`${dailyJoins}/${MAX_PER_DAY}`.padEnd(18)}│\n│  ENGINE     : ${(global.autoJoinEnabled ? 'ENGAGED 🟢' : 'OFFLINE 🔴').padEnd(18)}│\n└──────────────────────────────┘\n\`\`\``
            }, { quoted: msg });
        }

        if (commandName === '.massdrop') {
            const text = args.join(' ')
                || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
                || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;
            if (!text) return sock.sendMessage(chat, { text: '❌ Paste links or reply to a message with *.massdrop*' }, { quoted: msg });
            const added = await extractAndStore(text);
            if (added > 0) return sock.sendMessage(chat, { text: `✅ *${added} links* added to queue!\n\nUse *.autojoin on* to start joining.` }, { quoted: msg });
            return sock.sendMessage(chat, { text: '⚠️ No valid WhatsApp links found.' }, { quoted: msg });
        }

        if (commandName === '.scrape') {
            const url = args[0];
            if (!url?.startsWith('http')) return sock.sendMessage(chat, { text: '❌ Usage: *.scrape [url]*' }, { quoted: msg });
            await sock.sendMessage(chat, { text: `🕷️ Scraping: ${url.slice(0, 50)}...` });
            try {
                const axios   = require('axios');
                const cheerio = require('cheerio');
                const { data } = await axios.get(url, {
                    timeout: 15000,
                    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' }
                });
                const $ = cheerio.load(data);
                const added = await extractAndStore($('body').text() + ' ' + data);
                if (added > 0) return sock.sendMessage(chat, { text: `✅ *${added} new links* scraped & queued!` }, { quoted: msg });
                return sock.sendMessage(chat, { text: '⚠️ No new links found on that page.' }, { quoted: msg });
            } catch (e) {
                return sock.sendMessage(chat, { text: `❌ Scrape failed: ${e.message}` }, { quoted: msg });
            }
        }
    }
};
