// plugins/pappy-invite.js
// 🌸 Cinematic Invite Generator (60+ Soft Life & Kaomoji Templates)

const axios = require('axios');
const logger = require('../services/logger');
const { buildLinkPreview } = require('../services/linkPreview'); 

// 🎨 60+ SOFT LIFE & KAWAII ASCII AESTHETICS
// n = group name, s = size, c = invite code
const inviteAesthetics = [
    // --- SOFT & COZY ---
    (n, s, o, d, c) => `(づ｡◕‿‿◕｡)づ 💕\n\ncome join *${n}* ✨\nit’s giving soft life 🌸\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `ʕ•ᴥ•ʔ 🍯\n\nsweetest spot on your dash 🧸\nmeet ${s} cuties in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(✿◠‿◠) 🍵\n\npure aesthetics & good vibes\nstep into *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ˘ ³˘)♥︎ 💅\n\nmain character energy only\njoin *${n}* 🎀\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧\n\nvibe check passed ✅\nwe're ${s} deep in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(灬º‿º灬)♡ 🍓\n\nyour new digital home~\ncome to *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(o˘◡˘o) ☁️\n\nhead in the clouds\nchilling in *${n}* ✨\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(◕‿◕✿) 🌷\n\ngrowing our little garden\n*${n}* is waiting for u~\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(,,>﹏<,,) 🎧\n\nplaylist on, world off\nvibing in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(ꈍᴗꈍ) 🌙\n\nsleepy soft vibes\ngoodnight from *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,

    // --- SPARKLY & ANGELIC ---
    (n, s, o, d, c) => `ଘ(੭ˊᵕˋ)੭* ੈ✩‧₊˚\n\nangel energy activated 🕊️\njoin *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(✧ω✧) 💎\n\nflawless aesthetics\n${s} icons in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(*¯︶¯*) ✨\n\nliving our best lives\nwelcome to *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(☆▽☆) 🥂\n\ncheers to the good times\n*${n}* is popping off\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(✯◡✯) 🌌\n\nstarry skies & late nights\nenter *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ´ ▽ \` ).｡ｏ♡\n\ndreaming out loud\njoin the vibe in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(o^▽^o) 🦋\n\nbutterfly effect\nflutter into *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(≧◡≦) 🤍\n\npure intentions only\nwe are *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(◕ᴗ◕✿) 💫\n\nmanifesting greatness\njoin ${s} souls in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ◡‿◡ ) 🦢\n\nelegant & unbothered\nstep inside *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,

    // --- Y2K & TEXTING ---
    (n, s, o, d, c) => `(¬‿¬) 📱\n\nu up?\nwe're active in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(⌐■_■) 💽\n\ny2k digital dreams\nloading *${n}*...\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(≧ω≦) 🎮\n\nplayer 1 ready\nlevel up in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ˘▽˘)っ♨️\n\nspilling the tea\nexclusive in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(☞ﾟヮﾟ)☞ 💸\n\ngetting this digital bag\n${s} bosses in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(•◡•) / 🧃\n\nsipping juice, taking names\nchill with *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ͡° ͜ʖ ͡°) 📸\n\ncapturing moments\nfront row at *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(>‿◠)✌️ 💖\n\npeace, love, and wifi\nbroadcasting from *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ‾́ ◡ ‾́ ) 💿\n\nnostalgia on repeat\npress play on *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(O_O) 🍿\n\nthe drama is unmatched\nwatching *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,

    // --- DREAMY & ETHEREAL ---
    (n, s, o, d, c) => `( ╥﹏╥) 🌧️\n\npluviophile aesthetics\nfinding shelter in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ᵘ ᵕ ᵘ ⁎) 🎐\n\nwind chimes & gentle breezes\nrelax in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ᴜ ω ᴜ ) 🕸️\n\nsoft grunge diaries\n${s} ghosts in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ´-ω･)︻┻┳══━一 💔\n\ncupid's arrow strikes\nfalling for *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ˶ˆ꒳ˆ˵ ) 🕯️\n\nmidnight confessions\nsecrets of *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ｡ •̀ ᴖ •́ ｡) 🥀\n\nbeautifully chaotic\ngetting lost in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ⊃・ω・)⊃ 🔮\n\npredicting good energy\nyour future is in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( • ̀ω•́ )✧ 🗝️\n\nunlocking the vault\nexclusive entry to *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( > 〰 < ) 🖤\n\ndark academia vibes\nstudying *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ╯°□°)╯ 🍷\n\ncheers to the elite\n${s} icons in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,

    // --- CUTE & PLAYFUL ---
    (n, s, o, d, c) => `૮₍ ˶•⤙•˶ ₎ა 🍰\n\nsnack time & group chats\nfeasting in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ˶°ㅁ°) !! 🎀\n\nomg you haven't joined yet?\nrun to *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(๑>ᴗ<๑) 🎡\n\nlife is a theme park\nenjoy the ride in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( •ᴗ•)🪄 🐇\n\npulling magic out the hat\nwelcome to *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ˘▽˘)っ♨️ 🍜\n\nlate night ramen runs\nchatting in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ˙꒳​˙ ) 💌\n\nyou've got a secret invite\nopen *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(„• ֊ •„) 🎈\n\nfloating away with the vibes\njoin ${s} cuties in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(๑•͈ᴗ•͈) 🎨\n\npainting our own world\ncolor outside the lines in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ˶ˆ ᗜ ˆ˵ ) 🌴\n\ndigital vacation mode\nrelaxing in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(つ✧ω✧)つ 🛒\n\nwindow shopping for vibes\nadd *${n}* to cart\n\n🔗 https://chat.whatsapp.com/${c}`,
    
    // --- EXTRA NEW ADDITIONS ---
    (n, s, o, d, c) => `(❁´◡\`❁) 🍑\n\npeachy clean vibes\njoin ${s} others in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ˶ˆ꒳ˆ˵ ) 🧁\n\nsweetest escape\nstep into *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ᵘ ᵕ ᵘ ⁎) 🎀\n\ntied with a bow\nyour invite to *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `(˶˃ ᵕ ˂˶) .ᐟ.ᐟ\n\nbig mood today\nwe are *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ๑ ˃̵ᴗ˂̵)و ♡\n\nwinning at life\ncelebrate in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`,
    (n, s, o, d, c) => `( ´ ∀ \` )ﾉ 🌻\n\nsunshine and good days\nbrighten up in *${n}*\n\n🔗 https://chat.whatsapp.com/${c}`
];

module.exports = {
    category: 'AESTHETIC',
    commands: [{ cmd: '.invitecard', role: 'public' }], 
    
    execute: async (sock, msg, args, userProfile, cmd, abortSignal) => {
        const jid = msg.key.remoteJid;
        
        // Support grabbing the link from arguments OR a replied-to message
        const quotedText = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.conversation ||
                           msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.extendedTextMessage?.text || '';
        const input = args.join(' ') || quotedText;

        // Silently delete the user's trigger message to keep the chat clean
        await sock.sendMessage(jid, { delete: msg.key }).catch(() => {});

        // Extract just the invite code from the link
        const linkMatch = input.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{20,24})/i);
        if (!linkMatch) return sock.sendMessage(jid, { text: '❌ *Invalid Link!*\nUsage: `.invitecard https://chat.whatsapp.com/...` or reply to a link.' });

        const inviteCode = linkMatch[1];
        const fullLink = `https://chat.whatsapp.com/${inviteCode}`;
        
        try {
            await sock.sendMessage(jid, { text: '🔍 _Scanning group metadata & generating elite preview..._' });

            // 1. Fetch live group info from WhatsApp servers
            const groupInfo = await sock.groupGetInviteInfo(inviteCode).catch(() => null);

            // 2. Generate our ultra-premium Link Preview Card via the new engine
            const preview = await buildLinkPreview(fullLink);

            // Set up fallback variables just in case the WhatsApp server fetch fails
            const groupName = groupInfo?.subject || preview?.externalAdReply?.title || 'Unknown Sector';
            const memberCount = groupInfo?.size || 'Unknown';
            const creator = groupInfo?.owner ? `+${groupInfo.owner.split('@')[0]}` : 'Hidden';
            const desc = groupInfo?.desc || preview?.externalAdReply?.body || 'No description provided.';

            // 3. Try to grab the group's profile picture directly
            let pfpBuffer = null;
            if (groupInfo) {
                try {
                    const pfpUrl = await sock.profilePictureUrl(groupInfo.id, 'image');
                    if (pfpUrl) {
                        const res = await axios.get(pfpUrl, { responseType: 'arraybuffer' });
                        pfpBuffer = Buffer.from(res.data, 'binary');
                    }
                } catch (e) {} // Silent fail if no PFP
            }

            // 4. Roll the dice for a random aesthetic!
            const randomStyle = inviteAesthetics[Math.floor(Math.random() * inviteAesthetics.length)];
            const aestheticCaption = randomStyle(groupName, memberCount, creator, desc, inviteCode);

            // 5. Construct the PERFECT Ad Reply
            let adReply = preview ? preview.externalAdReply : {
                title: groupName,
                body: `Join ${memberCount} members`,
                mediaType: 1,
                sourceUrl: fullLink,
                renderLargerThumbnail: true,
                showAdAttribution: false
            };

            // 🔥 If we downloaded the group's PFP, force it to be the card's thumbnail!
            if (pfpBuffer) {
                adReply.thumbnail = pfpBuffer;
            }

            // 6. Send purely as a TEXT message to avoid the double-image glitch
            await sock.sendMessage(jid, { 
                text: aestheticCaption,
                contextInfo: {
                    externalAdReply: adReply,
                    isForwarded: true,       // Makes it look viral
                    forwardingScore: 999     
                }
            });

        } catch (error) {
            logger.error('Invite Card Error:', error);
            return sock.sendMessage(jid, { text: '❌ *Failed to generate card.*\nThe link might be revoked or invalid.' });
        }
    }
};
