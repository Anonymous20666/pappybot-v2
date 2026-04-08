const { Telegraf, Markup } = require('telegraf');
const logger = require('../utils/logger');
const config = require('../utils/config');

class TelegramHandler {
    constructor() {
        this.bot = null;
    }

    async initialize() {
        this.bot = new Telegraf(config.tgBotToken);

        this.bot.use((ctx, next) => {
            if (ctx.from?.id.toString() !== config.ownerTgId) {
                return;
            }
            return next();
        });

        this.setupCommands();

        await this.bot.launch();
        logger.info('Telegram bot launched');

        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
    }

    setupCommands() {
        this.bot.command('start', (ctx) => {
            ctx.reply(
                '🤖 *PappyBot V2 Control Panel*\n\n' +
                'Available commands:\n' +
                '/status - Check bot status\n' +
                '/pair [phone] - Link WhatsApp number\n' +
                '/logs - View recent logs',
                { parse_mode: 'Markdown' }
            );
        });

        this.bot.command('status', async (ctx) => {
            try {
                const status = await this.getStatus();
                ctx.reply(status, { parse_mode: 'HTML' });
            } catch (error) {
                logger.error('Status command error:', error);
                ctx.reply('❌ Error fetching status');
            }
        });

        this.bot.command('pair', async (ctx) => {
            const args = ctx.message.text.split(' ');
            if (args.length < 2) {
                return ctx.reply('Usage: /pair [phone_number]');
            }

            const phone = args[1].replace(/[^0-9]/g, '');
            ctx.reply(`📱 Pairing request for +${phone} received. Check logs for pairing code.`);
        });

        this.bot.on('text', async (ctx) => {
            logger.info(`Telegram message from ${ctx.from.id}: ${ctx.message.text}`);
        });

        this.bot.catch((error, ctx) => {
            logger.error('Telegram bot error:', error);
        });
    }

    async getStatus() {
        const mongoose = require('mongoose');
        const dbStatus = mongoose.connection.readyState === 1 ? '🟢 Connected' : '🔴 Disconnected';

        return `📊 <b>Bot Status</b>\n\n` +
            `Database: ${dbStatus}\n` +
            `Uptime: ${process.uptime().toFixed(0)}s\n` +
            `Memory: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(0)}MB`;
    }

    async sendMessage(chatId, text, options = {}) {
        try {
            return await this.bot.telegram.sendMessage(chatId, text, options);
        } catch (error) {
            logger.error('Telegram send error:', error);
            throw error;
        }
    }

    async close() {
        if (this.bot) {
            this.bot.stop();
        }
    }
}

module.exports = TelegramHandler;
