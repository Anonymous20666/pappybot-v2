// core/bullEngine.js — OMEGA BEAST MODE
// Concurrent workers, smart socket wait, zero tolerance for failure

const { Queue, Worker } = require('bullmq');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const stealth = require('./stealthEngine');
const logger  = require('./logger');
const config  = require('../config');

// ── Node ID ───────────────────────────────────────────────────────────────────
const nodeIdPath = path.join(__dirname, '../data/node-id.txt');
let NODE_ID = '';
if (fs.existsSync(nodeIdPath)) {
    NODE_ID = fs.readFileSync(nodeIdPath, 'utf8').trim();
} else {
    NODE_ID = 'NODE_' + crypto.randomBytes(3).toString('hex').toUpperCase();
    fs.mkdirSync(path.dirname(nodeIdPath), { recursive: true });
    fs.writeFileSync(nodeIdPath, NODE_ID);
}

const QUEUE_NAME = `omega-broadcast-${NODE_ID}`;

const conn = {
    connection: {
        host:     config.redis.host,
        port:     config.redis.port,
        password: config.redis.password,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
    }
};

// ── Queue ─────────────────────────────────────────────────────────────────────
const broadcastQueue = new Queue(QUEUE_NAME, {
    ...conn,
    defaultJobOptions: {
        attempts:         15,
        backoff:          { type: 'exponential', delay: 10000 },
        removeOnComplete: true,
        removeOnFail:     50,
    }
});

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ── Wait for live socket — up to 3 minutes ────────────────────────────────────
async function waitForSocket(botId, maxWait = 180000) {
    const start = Date.now();
    while (Date.now() - start < maxWait) {
        if (global.waSocks) {
            for (const [key, s] of global.waSocks.entries()) {
                if (s?.user && key.includes(botId)) return s;
            }
            // Fallback: any live socket
            for (const [, s] of global.waSocks.entries()) {
                if (s?.user) return s;
            }
        }
        if (global.waSock?.user) return global.waSock;
        await delay(3000);
    }
    return null;
}

// ── Worker — 3 concurrent, beast throughput ───────────────────────────────────
const broadcastWorker = new Worker(QUEUE_NAME, async (job) => {
    const { botId, targetJid, textContent, mode, useGhostProtocol, font, backgroundColor, mediaPath, isVideo } = job.data;

    const sock = await waitForSocket(botId, 180000);
    if (!sock) throw new Error(`Socket offline after 3min wait — will retry`);

    const mutated = stealth.mutateMessage(textContent);

    // ── Ghost protocol ─────────────────────────────────────────────────────────
    // Step 1: Send invisible zero-width chars to GROUP CHAT — wakes the connection
    // Step 2: Delete immediately — members never see it
    // Step 3: Real godcast posts to GROUP STATUS — works on any group size
    if (useGhostProtocol) {
        try {
            const ghost = await Promise.race([
                sock.sendMessage(targetJid, { text: '\u200B\u200C\u200D\uFEFF' }),
                delay(6000).then(() => null)
            ]);
            await delay(300);
            if (ghost?.key) {
                await Promise.race([
                    sock.sendMessage(targetJid, { delete: ghost.key }),
                    delay(6000)
                ]);
            }
            await delay(800);
        } catch {}
    }

    // ── Build payload ─────────────────────────────────────────────────────────
    // RULE: advanced_status ALWAYS posts to group status ring — NEVER to chat
    // gcast (mode=normal) posts to chat as text
    let payload;
    let sendTarget = targetJid;
    let sendOptions = {};

    if (mode === 'advanced_status') {
        if (mediaPath && fs.existsSync(mediaPath)) {
            // ── Media status (image/video) ────────────────────────────────────
            const buf = fs.readFileSync(mediaPath);
            payload = isVideo
                ? { video: buf, caption: mutated, gifPlayback: false }
                : { image: buf, caption: mutated };
            // Send to group status ring via status@broadcast with statusJidList
            sendTarget  = 'status@broadcast';
            sendOptions = { statusJidList: [targetJid] };
        } else {
            // ── Text/link status ──────────────────────────────────────────────
            // Always use groupStatusMessage — this posts to the group status ring
            // WhatsApp renders links inside groupStatusMessage as tappable links
            const argb = parseInt('FF' + (backgroundColor || '#000000').replace('#', ''), 16);
            payload = {
                groupStatusMessage: {
                    text:            mutated,
                    font:            font ?? 3,
                    backgroundArgb:  argb,
                }
            };
            // groupStatusMessage is sent directly to the group JID — not status@broadcast
            sendTarget  = targetJid;
            sendOptions = {};
        }
    } else {
        // gcast — plain text to group chat
        payload     = { text: mutated };
        sendTarget  = targetJid;
        sendOptions = {};
    }

    // ── Send with timeout ─────────────────────────────────────────────────────
    try {
        await Promise.race([
            sock.sendMessage(sendTarget, payload, sendOptions),
            delay(30000).then(() => { throw new Error('Send timeout'); })
        ]);
    } catch (e) {
        if (e.code === 'EPIPE' || e.code === 'ECONNRESET' || e.message?.includes('Socket')) {
            throw new Error('Socket disconnected - will retry');
        }
        throw e;
    }

    if (mediaPath) { try { fs.unlinkSync(mediaPath); } catch {} }

    // Adaptive delay based on group size
    const gs = job.data.groupSize || 0;
    await delay(gs > 1000 ? 4000 : gs > 200 ? 2500 : 1500);

    return { delivered: true, targetJid };

}, {
    ...conn,
    concurrency: 5,  // 5 parallel workers — beast throughput on 8vcore
    limiter: { max: 10, duration: 1000 },  // max 10 jobs/sec
});

// ── Events ────────────────────────────────────────────────────────────────────
broadcastWorker.on('completed', (job) => {
    logger.success(`[GODCAST] ✅ ${job.data.targetJid}`);
});

broadcastWorker.on('failed', (job, err) => {
    if (job?.attemptsMade >= (job?.opts?.attempts || 15)) {
        logger.error(`[GODCAST] 💀 GAVE UP ${job?.data?.targetJid} after ${job?.attemptsMade} attempts`);
    } else {
        logger.warn(`[GODCAST] ⚠️ Retry ${job?.attemptsMade}/${job?.opts?.attempts} — ${job?.data?.targetJid}: ${err.message}`);
    }
});

broadcastWorker.on('error', (err) => {
    if (err.code !== 'ECONNRESET') logger.error(`[WORKER] ${err.message}`);
});

// ── Wipe ──────────────────────────────────────────────────────────────────────
async function wipeQueue() {
    try {
        await broadcastQueue.pause();
        await broadcastQueue.obliterate({ force: true });
        await broadcastQueue.resume();
        return true;
    } catch {
        await broadcastQueue.resume().catch(() => {});
        return false;
    }
}

logger.system(`⚡ OMEGA BEAST ENGINE ONLINE [${QUEUE_NAME}] — 5 workers, 15 retries`);
module.exports = { broadcastQueue, wipeQueue };
