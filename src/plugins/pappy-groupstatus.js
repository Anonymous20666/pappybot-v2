// plugins/pappy-groupstatus.js
const { downloadMediaMessage } = require('gifted-baileys');
const { broadcastQueue } = require('../core/bullEngine');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '../data/temp_media');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const BG_COLORS = { black: '#000000', blue: '#1A73E8', red: '#E53935', purple: '#7B1FA2' };
const FONTS = { sans: 0, serif: 1, mono: 2, bold: 4 };
const gsConfig = { backgroundColor: BG_COLORS.black, font: FONTS.sans, repeat: 1 };

// ⚡ V8 Event Loop Unblocker
const yieldLoop = () => new Promise(resolve => setImmediate(resolve));

module.exports = {
    category: 'STATUS',
    commands: [
        { cmd: '.updategstatus', role: 'public' },
        { cmd: '.gstatus', role: 'owner' },
        { cmd: '.ggstatus', role: 'owner' }
    ],
    getGsConfig: () => gsConfig,
    setGsConfig: (p) => Object.assign(gsConfig, p),
    BG_COLORS, FONTS,

    execute: async (sock, msg, args, userProfile, commandName) => {
        const chat = msg.key.remoteJid;
        const botId = sock.user.id.split(':')[0];
        
        let targetJids = [];
        let amount = gsConfig.repeat;
        let text = args.join(' ');

        if (commandName === '.gstatus') {
            amount = parseInt(args[0]) || 1;
            targetJids = [args[1]];
            text = args.slice(2).join(' ');
        } else if (commandName === '.ggstatus') {
            amount = parseInt(args[0]) || 1;
            text = args.slice(1).join(' ');
            const all = await sock.groupFetchAllParticipating();
            targetJids = Object.keys(all);
        } else {
            targetJids = [chat];
        }

        const jobs = [];
        for (let i = 0; i < amount; i++) {
            targetJids.forEach(jid => {
                jobs.push({
                    name: `GS_${botId}_${jid}`,
                    data: {
                        botId, 
                        targetJid: jid, 
                        mode: 'advanced_status',
                        textContent: text || '🔱',
                        font: gsConfig.font,
                        backgroundColor: gsConfig.backgroundColor,
                        useGhostProtocol: true // 👻 Enable Ghost (Invisible text first)
                    },
                    opts: { removeOnComplete: true, removeOnFail: 1000, priority: 2 }
                });
            });
        }

        // 🛑 MEMORY SAFE BATCHING: Push to Redis in chunks of 500
        const CHUNK_SIZE = 500;
        for (let i = 0; i < jobs.length; i += CHUNK_SIZE) {
            await broadcastQueue.addBulk(jobs.slice(i, i + CHUNK_SIZE));
            await yieldLoop(); 
        }

        await sock.sendMessage(chat, { text: `\`\`\`\n┌──────────────────────────────┐\n│  🌀  GROUP STATUS ENGINE     │\n├──────────────────────────────┤\n│  JOBS    : ${String(jobs.length).padEnd(19)}│\n│  ENGINE  : BULLMQ ARMED      │\n│  STATUS  : PROCESSING...     │\n└──────────────────────────────┘\n\`\`\`` });
    }
};
