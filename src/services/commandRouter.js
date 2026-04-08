const logger = require('../utils/logger');
const { User } = require('../storage/models');
const aiService = require('./ai');

class CommandRouter {
    constructor(whatsappHandler) {
        this.whatsapp = whatsappHandler;
        this.commands = new Map();
        this.registerCommands();
    }

    registerCommands() {
        this.commands.set('menu', this.handleMenu.bind(this));
        this.commands.set('ai', this.handleAI.bind(this));
        this.commands.set('ping', this.handlePing.bind(this));
        this.commands.set('help', this.handleHelp.bind(this));
    }

    async execute(command, msg, args) {
        try {
            const handler = this.commands.get(command);
            
            if (!handler) {
                logger.debug(`Unknown command: ${command}`);
                return;
            }

            const userId = msg.key.remoteJid;
            const user = await this.getOrCreateUser(userId);

            if (user.activity.isBanned) {
                logger.warn(`Banned user ${userId} attempted command: ${command}`);
                return;
            }

            user.stats.commandsUsed += 1;
            user.activity.lastSeen = new Date();
            await user.save();

            await handler(msg, args, user);

        } catch (error) {
            logger.error(`Command execution error (${command}):`, error);
            
            try {
                await this.whatsapp.sendMessage(
                    msg.key.remoteJid,
                    { text: '❌ An error occurred while processing your command.' },
                    { quoted: msg }
                );
            } catch (sendError) {
                logger.error('Failed to send error message:', sendError);
            }
        }
    }

    async getOrCreateUser(userId) {
        try {
            let user = await User.findOne({ userId });
            
            if (!user) {
                user = await User.create({ userId });
                logger.info(`New user created: ${userId}`);
            }

            return user;
        } catch (error) {
            logger.error('User fetch/create error:', error);
            throw error;
        }
    }

    async handleMenu(msg) {
        const menuText = `
╭━━━『 PAPPY BOT V2 』━━━╮
│
│ 🤖 *COMMANDS*
│ • .menu - Show this menu
│ • .ai [prompt] - Ask AI
│ • .ping - Check bot status
│ • .help - Get help
│
╰━━━━━━━━━━━━━━━━━━━╯
        `.trim();

        await this.whatsapp.sendMessage(
            msg.key.remoteJid,
            { text: menuText },
            { quoted: msg }
        );
    }

    async handleAI(msg, args) {
        if (args.length === 0) {
            await this.whatsapp.sendMessage(
                msg.key.remoteJid,
                { text: '❌ Usage: .ai [your question]' },
                { quoted: msg }
            );
            return;
        }

        const prompt = args.join(' ');
        
        await this.whatsapp.sendMessage(
            msg.key.remoteJid,
            { text: '🤖 Thinking...' },
            { quoted: msg }
        );

        try {
            const response = await aiService.generateText(prompt, msg.key.remoteJid);
            
            await this.whatsapp.sendMessage(
                msg.key.remoteJid,
                { text: `🤖 *AI Response:*\n\n${response}` },
                { quoted: msg }
            );
        } catch (error) {
            await this.whatsapp.sendMessage(
                msg.key.remoteJid,
                { text: '❌ AI service is temporarily unavailable. Please try again later.' },
                { quoted: msg }
            );
        }
    }

    async handlePing(msg) {
        const uptime = process.uptime();
        const memory = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);

        await this.whatsapp.sendMessage(
            msg.key.remoteJid,
            { text: `🏓 Pong!\n\n⏱️ Uptime: ${uptime.toFixed(0)}s\n💾 Memory: ${memory}MB` },
            { quoted: msg }
        );
    }

    async handleHelp(msg) {
        await this.handleMenu(msg);
    }
}

module.exports = CommandRouter;
