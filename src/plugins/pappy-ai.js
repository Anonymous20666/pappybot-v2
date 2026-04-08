// plugins/pappy-ai.js — PAPPY V3 AI ENGINE
const logger = require('../services/logger');

let ai = null;
try { ai = require('../services/ai'); } catch (e) { logger.warn('[AI] Module offline'); }

module.exports = {
    category: 'AI',
    commands: [
        { cmd: '.ai',    role: 'public' },
        { cmd: '.ask',   role: 'public' },
        { cmd: '.chat',  role: 'public' },
    ],

    execute: async (sock, msg, args, userProfile, commandName) => {
        const jid = msg.key.remoteJid;

        if (!ai) {
            return sock.sendMessage(jid, { text: '❌ *AI module is offline.*' }, { quoted: msg });
        }

        // Get prompt from args or quoted message
        const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation
            || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text;
        const prompt = args.join(' ') || quotedText;

        if (!prompt || prompt.trim() === '') {
            return sock.sendMessage(jid, {
                text: '```\n╔══════════════════════════════╗\n║  🤖  PAPPY AI V3             ║\n╚══════════════════════════════╝\n\n  Usage:\n  .ai [your question]\n  .ask [anything]\n  .chat [message]\n\n  Examples:\n  .ai write a promo for my group\n  .ask how to grow my WhatsApp\n  .chat tell me a joke\n```'
            }, { quoted: msg });
        }

        // Send typing indicator
        await sock.sendPresenceUpdate('composing', jid).catch(() => {});

        // Send thinking message
        const thinkMsg = await sock.sendMessage(jid, {
            text: '```\n[ 🤖 PAPPY AI THINKING... ]\n```'
        }, { quoted: msg });

        try {
            const userId = userProfile?.userId || msg.key.participant || msg.key.remoteJid;
            const response = await ai.generateText(prompt, userId);

            // Delete thinking message and send real response
            if (thinkMsg?.key) await sock.sendMessage(jid, { delete: thinkMsg.key }).catch(() => {});

            return sock.sendMessage(jid, { text: response }, { quoted: msg });

        } catch (err) {
            if (thinkMsg?.key) await sock.sendMessage(jid, { delete: thinkMsg.key }).catch(() => {});
            logger.error('[AI] Generate failed:', err.message);
            return sock.sendMessage(jid, {
                text: `❌ *AI Error:* ${err.message}`
            }, { quoted: msg });
        }
    }
};
