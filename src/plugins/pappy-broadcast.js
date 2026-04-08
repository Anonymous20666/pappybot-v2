// plugins/pappy-broadcast.js — PAPPY V3 GOD MODE
const fs   = require('fs');
const path = require('path');
const { broadcastQueue } = require('../services/bullEngine');
const logger = require('../services/logger');

const SCHEDULE_FILE = path.join(__dirname, '../data/schedule-db.json');
const activeSchedules = new Map();
const yieldLoop = () => new Promise(resolve => setImmediate(resolve));

// ── 2026 PREMIUM KAWAII GODCAST TEMPLATES ─────────────────────────────────────
// Designed for WhatsApp group status — short, punchy, renders fully, no cut-off
const AESTHETIC_TEMPLATES = [

    // TIER 1: PREMIUM KAWAII INVITE
    (t) => `\u0BAF\u0BC8\u0BAF\u0BC8 \u02DA\uFF61\u2E38(\u02F6\u1D14 \u1D15 \u1D14\u02F6)\uD83D\uDC8C you're invited \u2661\n\n\uD83C\uDF38 active gc\n\uD83C\uDF38 good vibes only\n\uD83C\uDF38 ur people are here\n\n\uD83D\uDD17 join: ${t}\n\n\u2E38\uFF61\u02DA \u0BAF\u0BC8\u0BAF\u0BC8`,

    (t) => `\u2709\uFE0F \u02DA\uFF61\u2E38 private invite \u2E38\uFF61\u02DA\n\n꒰ \uD83C\uDF53 ꒱ we saved u a spot\n꒰ \uD83D\uDC8C ꒱ don't miss this\n꒰ \uD83C\uDF38 ꒱ ur vibe is needed\n\n\uD83D\uDD17 ${t}\n\n(\u02F6\u1D14 \u1D15 \u1D14\u02F6) come through \u2661`,

    (t) => `\u2E38\uFF61\u00B0\u2729 soft gc alert \u2729\u00B0\uFF61\u2E38\n\n\u2726 no drama\n\u2726 just vibes\n\u2726 ur new fav place\n\n\uD83D\uDD17 ${t}\n\n꒰ \uD83E\uDDF8 ꒱ we're waiting for u`,

    (t) => `\uD83C\uDF37 \u02DA \u0602\u2728 \u2729 \u22C6\uFF61\u02DA \u02DA \u0602 \uD83C\uDF37\n\nyou've been personally invited\nto the gc everyone's talking about\n\n\uD83D\uDD17 ${t}\n\n\u02DA\uFF61\u2E38 don't sleep on this \u2E38\uFF61\u02DA`,

    (t) => `(\u3063\u02D8\u03C9\u02D8\u03C2 ) \uD83D\uDC8C\n\npsst \u2014 this gc is different\nand u deserve to be in it\n\n\uD83C\uDF38 active\n\uD83C\uDF38 real ones only\n\uD83C\uDF38 good energy guaranteed\n\n\uD83D\uDD17 ${t}`,

    // TIER 2: FOMO + URGENCY
    (t) => `\u26A0\uFE0F last invite dropping rn\n\nafter this the link changes\nand u'll have to beg \uD83D\uDE2D\n\nnow or never bestie\n\n\uD83D\uDD17 ${t}\n\n꒰ \uD83C\uDF80 ꒱ don't say we didn't warn u`,

    (t) => `POV: u found the gc\neveryone's been looking for \uD83D\uDC40\n\n\u2726 limited spots\n\u2726 once full it's full\n\u2726 ur missing out rn\n\n\uD83D\uDD17 ${t}`,

    (t) => `\uD83D\uDEA8 ur fav people are already inside\nwhat are u waiting for \uD83D\uDE2D\n\n\u2727 active daily\n\u2727 good energy only\n\u2727 ur new fav place\n\n\uD83D\uDD17 ${t}`,

    (t) => `ngl this gc is different \uD83E\uDEF6\n\n\u2726 no dry convos\n\u2726 no fake energy\n\u2726 just ur people\n\nwe're growing fast\nbe here before it blows up\n\n\uD83D\uDD17 ${t}`,

    (t) => `last invite going out tonight \u2726\n\nafter this the link changes\nand u'll have to beg to get in \uD83D\uDE2D\n\nnow or never bestie\n\n\uD83D\uDD17 ${t}`,

    // TIER 3: MYSTERY / EXCLUSIVE
    (t) => `\uD83E\uDD2B this isn't for everyone\n\nonly the ones who actually\nwant smth real\n\nu seem like one of them \uD83D\uDC41\uFE0F\n\n\uD83D\uDD17 ${t}\n\n꒰ \uD83D\uDD10 ꒱ by invite only`,

    (t) => `\u2726\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2726\n  \uD83D\uDC8C private invite\n  don't share this\n\u2726\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2726\n\nwe're selective for a reason\nand u made the cut \uD83E\uDEF6\n\n\uD83D\uDD17 ${t}`,

    (t) => `\u02DA\uFF61\u2E38 not everyone gets this link \u2E38\uFF61\u02DA\n\nbut u do \uD83C\uDF80\n\n\uD83C\uDF38 curated gc\n\uD83C\uDF38 real connections\n\uD83C\uDF38 ur kind of people\n\n\uD83D\uDD17 ${t}`,

    (t) => `shhh \uD83E\uDD2B\n\nthis gc is lowkey the best thing\non ur phone rn\n\ndon't tell everyone\n(but also tell everyone) \uD83D\uDE2D\n\n\uD83D\uDD17 ${t}`,

    // TIER 4: SOFT LIFE / AESTHETIC
    (t) => `\u02DA \u0602\u2728 \u2729 \u22C6\uFF61\u02DA  soft launch  \u02DA \u0602\u2728 \u2729 \u22C6\uFF61\u02DA\n\na space for ppl who just\nget it without explaining \uD83C\uDF38\n\ncome be soft with us\n\n\uD83D\uDD17 ${t}`,

    (t) => `your new fav place on wa \uD83C\uDF37\n\n꒰ \uD83C\uDF75 ꒱ morning convos\n꒰ \uD83C\uDF19 ꒱ late night talks\n꒰ \uD83D\uDC8C ꒱ good vibes always\n\nwe saved u a seat \uD83E\uDE91\u2728\n\n\uD83D\uDD17 ${t}`,

    (t) => `\u2709\uFE0F u have a new message \uD83D\uDC8C\nfrom ur future fav gc\n\nopen it? \uD83C\uDF80\n\n\uD83D\uDD17 ${t}\n\n(\u02F6\u1D14 \u1D15 \u1D14\u02F6) we're waiting`,

    (t) => `꒰ \uD83E\uDDF8 ꒱ comfort gc unlocked\n\nno pressure\nno judgment\njust us being us \uD83C\uDF37\n\nu belong here fr\n\n\uD83D\uDD17 ${t}`,

    (t) => `\uD83C\uDFA7 soft hours\n\nplaylist on\nphone charged\nready to meet ur people?\n\nwe're right here \uD83C\uDF19\n\n\uD83D\uDD17 ${t}`,

    // TIER 5: HYPE / ENERGY
    (t) => `\u26A1 main character gc \u26A1\n\nwe don't wait for things to happen\nwe make them happen \uD83D\uDC85\n\ncome build with us\n\n\uD83D\uDD17 ${t}`,

    (t) => `real ones only \uD83E\uDEF5\n\n\u2726 we don't do fake energy\n\u2726 we don't do boring\n\u2726 we just vibe & grow\n\nif u know u know \uD83D\uDD25\n\n\uD83D\uDD17 ${t}`,

    (t) => `the gc ur friends are too scared\nto tell u about \uD83D\uDE2D\uD83D\uDD25\n\nactive \u2022 unfiltered \u2022 addictive\n\ncome see why everyone's talking \uD83D\uDC40\n\n\uD83D\uDD17 ${t}`,

    // TIER 6: COMMUNITY / GROWTH
    (t) => `we're building smth big \uD83C\uDFD7\uFE0F\n\nand we want the right people\nin the room when it happens\n\nu in? \uD83E\uDD1D\n\n\uD83D\uDD17 ${t}`,

    (t) => `imagine a gc where\n\n\u2713 ppl actually respond\n\u2713 the energy is always right\n\u2713 u actually look forward to it\n\nthat's us \uD83E\uDEF6\n\n\uD83D\uDD17 ${t}`,

    (t) => `it's giving chosen family \uD83E\uDEF2\n\nthe kind of gc u check\nbefore u even check ur dms\n\ncome home bestie \uD83C\uDFE0\n\n\uD83D\uDD17 ${t}`,

    (t) => `this gc is going viral\nand u can say u were here first \uD83D\uDCC8\n\nearly members always win\n\ndon't miss ur window \u23F0\n\n\uD83D\uDD17 ${t}`,

    // TIER 7: LATE NIGHT / EMOTIONAL
    (t) => `3am and this gc is still\npopping off \uD83D\uDE2D\uD83D\uDD25\n\nwe don't sleep we just vibe\n\ncome be nocturnal with us \uD83C\uDF19\n\n\uD83D\uDD17 ${t}`,

    (t) => `for the ones who feel like\nthey never fully fit in anywhere\n\nu fit here \uD83E\uDEF6\nwe promise\n\n\uD83D\uDD17 ${t}`,

    (t) => `everyone's asking\n"what gc are u in?" \uD83D\uDC40\n\nbe the one with the answer\n\n\uD83D\uDD17 ${t}\n\n꒰ \uD83C\uDF38 ꒱ join us`,

    (t) => `okay but why is this gc\nactually so good \uD83D\uDE2D\n\nlike we don't even understand\nhow we got this lucky\n\ncome find out \uD83D\uDD17 ${t}`,

];

function saveSchedules() {
    try { fs.writeFileSync(SCHEDULE_FILE, JSON.stringify([...activeSchedules.values()].map(s => s.meta), null, 2)); } catch {}
}

function parseTime(input) {
    const v = parseInt(input);
    if (input.endsWith('m')) return Date.now() + v * 60000;
    if (input.endsWith('h')) return Date.now() + v * 3600000;
    if (input.endsWith('d')) return Date.now() + v * 86400000;
    return null;
}

function queueSchedule(meta) {
    const waitTime = Math.max(meta.time - Date.now(), 2000);
    const timeout = setTimeout(async () => {
        try {
            const sock = global.waSocks?.get(meta.botId)
                || [...(global.waSocks?.values() || [])].find(s => s?.user)
                || global.waSock;
            if (sock) {
                const groupData = await fetchAllGroups(sock);
                await executeBroadcastTask(sock, groupData, meta.text, meta.mode, meta.chat, meta.isGodcast);
            }
        } catch (e) { logger.error(`Schedule failed ${meta.id}: ${e.message}`); }
        finally {
            if (meta.isLoop) {
                meta.time += meta.loopInterval;
                queueSchedule(meta); saveSchedules();
            } else {
                activeSchedules.delete(meta.id); saveSchedules();
            }
        }
    }, waitTime);
    activeSchedules.set(meta.id, { timeout, meta });
}

async function fetchAllGroups(sock) {
    const raw = await sock.groupFetchAllParticipating();
    return Object.values(raw).map(g => ({
        id: g.id,
        size: g.participants.length,
        name: g.subject || g.id
    }));
}

async function executeBroadcastTask(sock, groupData, textContent, mode, chat, isGodcast) {
    const botId   = sock.user.id.split(':')[0];
    const batchId = Date.now();

    let finalText = textContent;
    if (mode === 'advanced_status') {
        const tpl = AESTHETIC_TEMPLATES[Math.floor(Math.random() * AESTHETIC_TEMPLATES.length)];
        finalText = tpl(textContent);
    }

    const jobs = groupData.map(group => ({
        name: `BCAST_${botId}_${group.id}_${batchId}`,
        data: {
            botId,
            targetJid:        group.id,
            textContent:      finalText,
            mode,
            font:             3,
            backgroundColor:  '#000000',
            useGhostProtocol: isGodcast,
            groupSize:        group.size,
            batchId
        },
        opts: {
            priority:         group.size > 500 ? 1 : group.size > 100 ? 2 : 3,
            removeOnComplete: true,
            removeOnFail:     50,
            attempts:         15,
            backoff:          { type: 'exponential', delay: 10000 }
        }
    }));

    const CHUNK = 500;
    for (let i = 0; i < jobs.length; i += CHUNK) {
        await broadcastQueue.addBulk(jobs.slice(i, i + CHUNK));
        await yieldLoop();
    }

    await sock.sendMessage(chat, {
        text: `\`\`\`\n╔══════════════════════════════╗\n║  📡  PAPPY V3 GODCAST        ║\n╚══════════════════════════════╝\n\n  MODE    : ${isGodcast ? 'GODCAST 👻' : 'GCAST 📨'}\n  GROUPS  : ${groupData.length} sectors\n  BATCH   : #${batchId.toString().slice(-6)}\n  RETRY   : 15x AUTO ✅\n\`\`\`\n_Every group status will be hit. No skips._`
    });
}

module.exports = {
    category: 'BROADCAST',
    commands: [
        { cmd: '.gcast',           role: 'admin' },
        { cmd: '.godcast',         role: 'admin' },
        { cmd: '.stopcast',        role: 'admin' },
        { cmd: '.schedulecast',    role: 'admin' },
        { cmd: '.schedulegodcast', role: 'admin' },
        { cmd: '.loopcast',        role: 'admin' },
        { cmd: '.loopgodcast',     role: 'admin' },
        { cmd: '.listschedule',    role: 'admin' },
        { cmd: '.cancelschedule',  role: 'admin' },
    ],

    init: () => {
        if (!fs.existsSync(path.join(__dirname, '../data'))) fs.mkdirSync(path.join(__dirname, '../data'));
        if (fs.existsSync(SCHEDULE_FILE)) {
            try { JSON.parse(fs.readFileSync(SCHEDULE_FILE, 'utf-8')).forEach(queueSchedule); } catch {}
        }
    },

    execute: async (sock, msg, args, userProfile, cmd) => {
        const chat    = msg.key.remoteJid;
        const botId   = sock.user?.id?.split(':')[0];
        const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
            || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;

        if (cmd === '.stopcast') {
            return sock.sendMessage(chat, { text: '🛑 *Stopcast noted.*\nUse Telegram → Wipe Queue to hard stop.' });
        }

        if (['.schedulecast', '.schedulegodcast', '.loopcast', '.loopgodcast'].includes(cmd)) {
            const timeArg = args.shift();
            const textContent = args.join(' ') || quotedText;
            if (!timeArg || !textContent) return sock.sendMessage(chat, { text: '❌ Usage: `.schedulecast 10m Message`\nSupports: m h d' });
            const time = parseTime(timeArg);
            if (!time) return sock.sendMessage(chat, { text: '❌ Invalid time. Use: 10m, 2h, 1d' });
            const id = 'SCH-' + Math.random().toString(36).slice(2, 8).toUpperCase();
            const isGodcast = cmd.includes('godcast');
            const isLoop    = cmd.startsWith('.loop');
            queueSchedule({ id, chat, botId, text: textContent, time, mode: isGodcast ? 'advanced_status' : 'normal', isLoop, loopInterval: isLoop ? (time - Date.now()) : null, isGodcast });
            saveSchedules();
            return sock.sendMessage(chat, { text: `\`\`\`\n╔══════════════════════════════╗\n║  🗓  SCHEDULED DROP          ║\n╚══════════════════════════════╝\n\n  ID   : ${id}\n  TYPE : ${isLoop ? 'LOOP 🔁' : 'ONE-TIME'}\n  MODE : ${isGodcast ? 'GODCAST 👻' : 'GCAST 📨'}\n\`\`\`` });
        }

        if (cmd === '.listschedule') {
            if (!activeSchedules.size) return sock.sendMessage(chat, { text: '📭 No active schedules.' });
            let list = '';
            activeSchedules.forEach((s, id) => {
                const rem = Math.max(0, Math.round((s.meta.time - Date.now()) / 60000));
                list += `  • \`${id}\` — ~${rem}m ${s.meta.isLoop ? '🔁' : ''}\n`;
            });
            return sock.sendMessage(chat, { text: `\`\`\`\n╔══════════════════════════════╗\n║  🗓  ACTIVE SCHEDULES        ║\n╚══════════════════════════════╝\n\n${list}\`\`\`` });
        }

        if (cmd === '.cancelschedule') {
            if (!args[0]) return sock.sendMessage(chat, { text: '❌ Usage: `.cancelschedule SCH-XXXXXX`' });
            if (activeSchedules.has(args[0])) {
                clearTimeout(activeSchedules.get(args[0]).timeout);
                activeSchedules.delete(args[0]); saveSchedules();
                return sock.sendMessage(chat, { text: `🛑 Schedule \`${args[0]}\` cancelled.` });
            }
            return sock.sendMessage(chat, { text: '❌ Schedule ID not found.' });
        }

        if (cmd === '.gcast' || cmd === '.godcast') {
            const textContent = args.join(' ') || quotedText;
            if (!textContent) return sock.sendMessage(chat, { text: '❌ *Payload required.*\n\nUsage: `.godcast your message or link`' });
            const isGodcast = cmd === '.godcast';
            const groupData = await fetchAllGroups(sock);
            if (!groupData.length) return sock.sendMessage(chat, { text: '❌ No groups found.' });
            await executeBroadcastTask(sock, groupData, textContent, isGodcast ? 'advanced_status' : 'normal', chat, isGodcast);
        }
    }
};
