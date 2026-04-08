// plugins/pappy-admin.js — User & Group Management
const User = require('../core/models/User');
const userEngine = require('../modules/userEngine');

module.exports = {
    category: 'ADMIN',
    commands: [
        { cmd: '.ban',     role: 'owner' },
        { cmd: '.unban',   role: 'owner' },
        { cmd: '.warn',    role: 'admin' },
        { cmd: '.groups',  role: 'owner' },
        { cmd: '.kick',    role: 'admin' },
        { cmd: '.promote', role: 'admin' },
        { cmd: '.demote',  role: 'admin' },
    ],

    execute: async (sock, msg, args, userProfile, commandName) => {
        const jid = msg.key.remoteJid;
        const ctx = msg.message?.extendedTextMessage?.contextInfo;
        const mentioned = ctx?.mentionedJid?.[0] || ctx?.participant;
        const rawNumber = args[0]?.replace(/[^0-9]/g, '');
        const targetJid = mentioned || (rawNumber ? `${rawNumber}@s.whatsapp.net` : null);

        if (commandName === '.groups') {
            const all = await sock.groupFetchAllParticipating();
            const entries = Object.values(all);
            const lines = entries.map((g, i) => `${i + 1}. *${g.subject}* — ${g.participants.length} members\n   \`${g.id}\``).join('\n\n');
            const chunks = lines.match(/[\s\S]{1,3800}/g) || ['No groups found.'];
            for (const chunk of chunks) await sock.sendMessage(jid, { text: chunk });
            return;
        }

        if (!targetJid) return sock.sendMessage(jid, { text: `❌ Tag a user or provide a number.\nUsage: \`${commandName} @user\`` });

        const num = targetJid.replace('@s.whatsapp.net', '');

        if (commandName === '.ban') {
            await User.updateOne({ userId: targetJid }, { 'activity.isBanned': true }, { upsert: true });
            userEngine.cache?.delete(targetJid);
            return sock.sendMessage(jid, { text: `\`\`\`\n╔══════════════════════════════╗\n║  🔨  USER BANNED             ║\n╚══════════════════════════════╝\n\n  USER : +${num}\n  STATUS : BANNED ❌\n\`\`\`\n_They can no longer use bot commands._` });
        }

        if (commandName === '.unban') {
            await User.updateOne({ userId: targetJid }, { 'activity.isBanned': false }, { upsert: true });
            userEngine.cache?.delete(targetJid);
            return sock.sendMessage(jid, { text: `\`\`\`\n╔══════════════════════════════╗\n║  ✅  USER UNBANNED           ║\n╚══════════════════════════════╝\n\n  USER : +${num}\n  STATUS : RESTORED ✅\n\`\`\`` });
        }

        if (commandName === '.warn') {
            const user = await User.findOneAndUpdate(
                { userId: targetJid },
                { $inc: { 'stats.warnings': 1 } },
                { upsert: true, new: true }
            );
            const warns = user?.stats?.warnings || 1;
            if (warns >= 3) {
                await User.updateOne({ userId: targetJid }, { 'activity.isBanned': true });
                userEngine.cache?.delete(targetJid);
                return sock.sendMessage(jid, { text: `⚠️ *+${num}* has been *auto-banned* after ${warns} warnings.`, mentions: [targetJid] });
            }
            return sock.sendMessage(jid, { text: `⚠️ *Warning ${warns}/3* issued to @${num}.\n_3 warnings = auto-ban._`, mentions: [targetJid] });
        }

        if (!jid.endsWith('@g.us')) return sock.sendMessage(jid, { text: '❌ This command only works in groups.' });

        if (commandName === '.kick') {
            await sock.groupParticipantsUpdate(jid, [targetJid], 'remove').catch(() => {});
            return sock.sendMessage(jid, { text: `👢 *+${num}* has been removed from the group.` });
        }

        if (commandName === '.promote') {
            await sock.groupParticipantsUpdate(jid, [targetJid], 'promote').catch(() => {});
            return sock.sendMessage(jid, { text: `⬆️ *+${num}* promoted to admin.` });
        }

        if (commandName === '.demote') {
            await sock.groupParticipantsUpdate(jid, [targetJid], 'demote').catch(() => {});
            return sock.sendMessage(jid, { text: `⬇️ *+${num}* demoted from admin.` });
        }
    }
};
