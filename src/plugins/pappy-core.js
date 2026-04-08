// plugins/pappy-core.js — PAPPY V3
const fs = require('fs');
const path = require('path');
const os = require('os');
const { generateMenu } = require('../modules/menuEngine');

const bindDbPath = path.join(__dirname, '../data/stickerCmds.json');

const menuAesthetics = [
    (cmds, name, role) => `\`\`\`\n╔══════════════════════════╗\n║  ⚡  PAPPY V3  //  OMEGA  ║\n╚══════════════════════════╝\n\`\`\`\n> 👤 *${name}*  ·  [${role}]\n> 🟢 All systems nominal\n\n${cmds}\n\n*<// END TRANSMISSION />*`,

    (cmds, name, role) => `⚜️ *Ω  P A P P Y  E L I T E* ⚜️\n━━━━━━━━━━━━━━━━━━━━━━\nGreetings, *${name}*\nClearance: \`${role}\`\n\n${cmds}\n━━━━━━━━━━━━━━━━━━━━━━\n_Excellence in execution._`,

    (cmds, name, role) => `🌃 *N E X U S  C O R E  V3*\n\`\`\`\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n USER: ${name.slice(0,14).padEnd(16)}\n RANK: ${role.padEnd(16)}\n▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓\n\`\`\`\n${cmds}\n\n⚡ _Stay wired._`,

    (cmds, name, role) => `🥷 *G H O S T _ N E T*\nAgent: *${name}*  ·  Status: [CLASSIFIED]\n\n${cmds}\n\n_We operate in the shadows._`,

    (cmds, name, role) => `\`\`\`\n> PAPPY OS v3.0\n> login: ${name}\n> access: GRANTED (${role})\n> [=== EXECUTE ===]\n\`\`\`\n${cmds}\n\n_Wake up, Neo..._`,

    (cmds, name, role) => `🌌 *A S T R A L  C O R E*\n✨ Commander: *${name}*  🚀 Rank: ${role}\n\n✧ ─── *Constellations* ─── ✧\n\n${cmds}\n\n_To the stars._ 🌠`,

    (cmds, name, role) => `🌸 *P A P P Y  C h a n* 🌸\nHiii *${name}*! (≧◡≦) ♡  ·  role: ${role} ✨\n\n╭・✦ 🎀 *Commands* 🎀 ✦・╮\n\n${cmds}\n\n╰・┈┈┈┈┈┈┈┈┈┈┈┈┈┈・╯\n_Let's do our best today!_ 💖`,

    (cmds, name, role) => `🩸 *V A M P I R I C  C O R E*\nLord *${name}*, the night is ours.  ·  Bloodline: ${role}\n\n🦇 ── *Dark Arts* ── 🦇\n\n${cmds}\n\n_Eternity awaits._ 🥀`,

    (cmds, name, role) => `👾 *A R C A D E  M O D E*\nPLAYER 1: *${name}*  ·  CLASS: ${role}  ·  READY!\n\n🕹️ ── *MOVESET* ── 🕹️\n\n${cmds}\n\n_INSERT COIN TO CONTINUE_ 🪙`,

    (cmds, name, role) => `👑 *T H E  I M P E R I U M*\nBy order of *${name}*  ·  Authority: ${role}\n\n📜 ── *Decrees* ── 📜\n\n${cmds}\n\n_Long live the Empire._ ⚔️`,

    (cmds, name, role) => `🎌 *A N I M E  A R C* 🎌\n(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧  *${name}*  ·  ${role}\n\n${cmds}\n\n_Power level: OVER 9000_ 🔥`,

    (cmds, name, role) => `💜 *L O - F I  V I B E S*\n(ꈍᴗꈍ) 🎧  *${name}*  ·  ${role}\n\n${cmds}\n\n_playlist on. world off._ 🌙`,

    (cmds, name, role) => `🔮 *C Y B E R  W I T C H*\n✦ *${name}*  ·  coven rank: ${role} ✦\n\n${cmds}\n\n_hex the algorithm._ 🕸️`,

    (cmds, name, role) => `🏙️ *C I T Y  O F  G O D S*\n⚡ *${name}*  ·  clearance: ${role}\n\n${cmds}\n\n_built different._ 🌆`,

    (cmds, name, role) => `🤍 *A E S T H E T I C  C O R E*\n꒰ *${name}* ꒱  ·  ${role}\n\n${cmds}\n\n_soft life. hard moves._ ✨`,

    (cmds, name, role) => `🖤 *D A R K  A C A D E M I A*\n*${name}*  ·  scholar rank: ${role}\n\n${cmds}\n\n_knowledge is power._ 📚`,

    (cmds, name, role) => `⚡ *C Y B E R P U N K  2077*\n\`\`\`\n[ USER: ${name.padEnd(20)} ]\n[ RANK: ${role.padEnd(20)} ]\n[ STATUS: JACKED IN      ]\n\`\`\`\n${cmds}\n\n_Night City never sleeps._ 🌆`,

    (cmds, name, role) => `🛸 *A L I E N  O P E R A T O R*\n◈ Agent: *${name}*  ◈  Class: ${role}\n\n${cmds}\n\n_Signal received from sector 7._ 🌌`,
];

module.exports = {
    category: 'SYSTEM',
    commands: [
        { cmd: '.menu', role: 'public' },
        { cmd: '.sys', role: 'public' },
        { cmd: '.bind', role: 'public' },
        { cmd: '.sudo', role: 'owner' }
    ],

    execute: async (sock, msg, args, userProfile, commandName) => {
        const jid = msg.key.remoteJid;

        if (commandName === '.menu') {
            const rawMenu = generateMenu(userProfile.role);
            const randomStyle = menuAesthetics[Math.floor(Math.random() * menuAesthetics.length)];
            const menuText = randomStyle(rawMenu, userProfile.name || 'Operator', userProfile.role.toUpperCase());
            return sock.sendMessage(jid, {
                text: menuText,
                contextInfo: {
                    externalAdReply: {
                        title: '⚡ PAPPY V3 — GOD MODE',
                        body: 'Enterprise WhatsApp Growth Engine',
                        mediaType: 1,
                        renderLargerThumbnail: false,
                        sourceUrl: 'https://t.me/holyPappy'
                    }
                }
            }, { quoted: msg });
        }

        if (commandName === '.sys') {
            const mem = process.memoryUsage();
            const uptime = process.uptime();
            const h = Math.floor(uptime / 3600), m = Math.floor((uptime % 3600) / 60), s = Math.floor(uptime % 60);
            const botRam = (mem.heapUsed / 1024 / 1024).toFixed(1);
            const totalMem = (os.totalmem() / 1024 / 1024).toFixed(0);
            const freeMem = (os.freemem() / 1024 / 1024).toFixed(0);
            const cpuLoad = os.loadavg()[0].toFixed(2);
            const nodes = global.waSocks?.size || 0;
            const stats = `\`\`\`\n┌──────────────────────────────┐\n│  ⚡ PAPPY V3 TELEMETRY       │\n├──────────────────────────────┤\n│  UPTIME   : ${`${h}h ${m}m ${s}s`.padEnd(17)}│\n│  BOT RAM  : ${`${botRam} MB`.padEnd(17)}│\n│  SYS RAM  : ${`${freeMem}/${totalMem} MB`.padEnd(17)}│\n│  CPU LOAD : ${`${cpuLoad}`.padEnd(17)}│\n│  NODES    : ${`${nodes} active`.padEnd(17)}│\n└──────────────────────────────┘\n\`\`\``;
            return sock.sendMessage(jid, { text: stats });
        }

        if (commandName === '.bind') {
            const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            const sticker = quotedMsg?.stickerMessage;
            if (!sticker) return sock.sendMessage(jid, { text: '☄️ *Reply to a sticker* to bind a command to it.' });
            const commandToBind = args.join(' ');
            if (!commandToBind) return sock.sendMessage(jid, { text: '☄️ *Usage:* `.bind .flashtag 50`' });
            const stickerId = Buffer.isBuffer(sticker.fileSha256)
                ? sticker.fileSha256.toString('base64')
                : Buffer.from(Object.values(sticker.fileSha256)).toString('base64');
            let db = {};
            if (fs.existsSync(bindDbPath)) db = JSON.parse(fs.readFileSync(bindDbPath, 'utf-8'));
            db[stickerId] = commandToBind.startsWith('.') ? commandToBind : `.${commandToBind}`;
            fs.writeFileSync(bindDbPath, JSON.stringify(db));
            await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});
            return sock.sendMessage(jid, { text: `⚡ *Ghost Trigger Bound*\n\nSticker → \`${db[stickerId]}\`\n\n_Send the sticker anytime to fire the command._` });
        }

        if (commandName === '.sudo') {
            const userEngine = require('../modules/userEngine');
            const User = require('../core/models/User');
            const action = args[0]?.toLowerCase();
            const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
                || msg.message?.extendedTextMessage?.contextInfo?.participant;
            const rawNumber = args[1]?.replace(/[^0-9]/g, '');
            const targetJid = mentioned || (rawNumber ? `${rawNumber}@s.whatsapp.net` : null);

            if (!action || !['add','remove','list'].includes(action)) {
                return sock.sendMessage(jid, { text: '```\n╔══════════════════════════════╗\n║  🔐  SUDO MANAGER V3         ║\n╚══════════════════════════════╝\n\n  .sudo add @user        grant owner\n  .sudo add 2348xxxxxxx  by number\n  .sudo remove @user     revoke owner\n  .sudo list             show owners\n```' });
            }

            if (action === 'list') {
                const owners = await User.find({ role: 'owner' }).select('userId name');
                const list = owners.map(u => `  • +${u.userId.replace('@s.whatsapp.net','')} (${u.name||'Unknown'})`).join('\n') || '  No owners found.';
                return sock.sendMessage(jid, { text: '```\n╔══════════════════════════════╗\n║  👑  OWNER LIST              ║\n╚══════════════════════════════╝\n\n' + list + '\n```' });
            }

            if (!targetJid) return sock.sendMessage(jid, { text: '❌ Provide a user.\n\n.sudo add @user\n.sudo add 2348164167112' });

            const newRole = action === 'add' ? 'owner' : 'public';
            const num = targetJid.replace('@s.whatsapp.net','');
            let user = await User.findOne({ userId: targetJid });
            if (!user) {
                try { user = await User.create({ userId: targetJid, name: num, role: newRole }); }
                catch(e) { return sock.sendMessage(jid, { text: `❌ Failed: ${e.message}` }); }
            } else {
                await User.updateOne({ userId: targetJid }, { role: newRole });
            }
            if (userEngine.cache) userEngine.cache.delete(targetJid);
            const status = action === 'add' ? 'GRANTED ✅' : 'REVOKED ❌';
            return sock.sendMessage(jid, { text: `\`\`\`\n╔══════════════════════════════╗\n║  🔐  SUDO ${status}         ║\n╚══════════════════════════════╝\n\n  USER : +${num}\n  ROLE : ${newRole.toUpperCase()}\n\`\`\`\n_Takes effect immediately._` });
        }
    }
};
