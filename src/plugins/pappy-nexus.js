// plugins/pappy-nexus.js
// 🎯 NEXUS SNIPER PROTOCOL: Invisible Contextual Targeting

const taskManager = require('../core/taskManager');
const stealth = require('../core/stealthEngine');
const logger = require('../core/logger');

module.exports = {
    category: 'GROWTH_ENGINE',
    commands: [
        { cmd: '.nexus', role: 'owner' } 
        // Usage: .nexus [groupJid] [Spintax Payload using {group} as a placeholder]
        // Example: .nexus 1234@g.us Hey! Saw you in {group}. Quick question...
    ],

    execute: async (sock, msg, args, userProfile, cmd, abortSignal) => {
        const chat = msg.key.remoteJid;
        const botId = sock.user?.id?.split(':')[0];
        
        const targetGroup = args.shift();
        const rawText = args.join(' ') || msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation;

        if (!targetGroup || !targetGroup.endsWith('@g.us') || !rawText) {
            return sock.sendMessage(chat, { text: '🎯 *NEXUS SNIPER V3*\n\n❌ Invalid syntax.\n\n*Usage:*\n`.nexus [groupJid] [message]`\n\n💡 *Tip:* Use `{group}` in your text to auto-insert the group name — makes every DM look 100% human and personal.' });
        }

        await sock.sendMessage(chat, { text: `\`\`\`\n╔══════════════════════════════╗\n║  🎯  NEXUS SNIPER V3         ║\n╚══════════════════════════════╝\n\n  TARGET : ${targetGroup.slice(0,30)}\n  STATUS : INFILTRATING...\n\`\`\`` });

        try {
            // 1. Extract Group Metadata invisibly
            const meta = await sock.groupMetadata(targetGroup);
            const groupName = meta.subject || "the group"; 
            
            // 2. Filter out the bot itself and the Group Admins (never DM strict admins!)
            const targetJids = meta.participants
                .filter(p => !p.id.includes(botId) && !p.admin)
                .map(p => p.id);

            if (targetJids.length === 0) return sock.sendMessage(chat, { text: '❌ No safe targets found. (Only admins exist in this sector).' });

            await sock.sendMessage(chat, { text: `\`\`\`\n  TARGETS : ${targetJids.length} locked\n  ADMINS  : excluded\n  MODE    : stealth DM\n  JITTER  : 25-75s/msg\n\`\`\`\n_Ghost protocol engaged. This will take hours._` });

            let success = 0;
            let failed = 0;

            // 3. Queue the Sniper Shots with extreme jitter
            for (let i = 0; i < targetJids.length; i++) {
                const targetJid = targetJids[i];
                const taskId = `NEXUS_${botId}_${targetJid}`;

                taskManager.submit(taskId, async (jobSignal) => {
                    if (jobSignal.aborted) throw new Error('AbortError');
                    
                    // Inject the localized Group Name into the Spintax
                    const contextualText = rawText.replace(/\{group\}/gi, groupName);
                    
                    // Mutate the final Spintax so no two messages are identical
                    const mutatedText = stealth.mutateMessage(contextualText);

                    // Emulate human typing speed tailored to the mutated message length
                    await stealth.simulateHumanInteraction(sock, targetJid, mutatedText, jobSignal);
                    
                    // Execute the silent strike
                    await sock.sendMessage(targetJid, { text: mutatedText });
                    success++;

                }, { 
                    priority: 1, 
                    timeout: 45000, 
                    retries: 0, 
                    // 🛡️ EXTREME ANTI-BAN JITTER: Wait 25 to 75 seconds between every single DM
                    jitter: [25000, 75000] 
                }).catch(() => { failed++; });
            }

            // Monitor background progress
            const monitor = setInterval(() => {
                if (success + failed >= targetJids.length) {
                    clearInterval(monitor);
                    sock.sendMessage(chat, { text: `\`\`\`\n╔══════════════════════════════╗\n║  🏁  NEXUS COMPLETE          ║\n╚══════════════════════════════╝\n\n  DELIVERED : ${success}\n  FAILED    : ${failed}\n  RATE      : ${Math.round(success/(success+failed)*100)||0}%\n\`\`\`` });
                }
            }, 60000); 

        } catch (err) {
            logger.error('Nexus extraction failed:', err);
            sock.sendMessage(chat, { text: `⚠️ Core failure: ${err.message}` });
        }
    }
};
