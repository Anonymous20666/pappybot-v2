// core/commandRouter.js — PAPPY V3
const fs = require('fs');
const path = require('path');
const eventBus = require('./eventBus');
const taskManager = require('./taskManager');
const rateLimiter = require('../services/rateLimiter');
const userEngine = require('../modules/userEngine');
const logger = require('./logger');
const { globalPrefix, ownerWhatsAppJids } = require('../config');

class CommandRouter {
    constructor() {
        this.plugins = new Map();       // cmd → plugin
        this.cmdRoles = new Map();      // cmd → role (fast lookup)
        this.loadPlugins();
        this.initBus();
    }

    loadPlugins() {
        const dir = path.join(__dirname, '../plugins');
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
        for (const file of files) {
            try {
                const plugin = require(path.join(dir, file));
                if (plugin.init) eventBus.on('system.boot', (sock) => plugin.init(sock));
                if (plugin.commands) {
                    plugin.commands.forEach(cmd => {
                        this.plugins.set(cmd.cmd, plugin);
                        this.cmdRoles.set(cmd.cmd, cmd.role || 'public');
                    });
                }
            } catch (err) { logger.error(`Failed to load plugin: ${file}`, err.message); }
        }
        logger.success(`✅ Loaded ${this.plugins.size} commands from ${files.length} plugins`);
    }

    initBus() {
        eventBus.on('message.upsert', async ({ sock, msg, text, isGroup, sender, botId, isGroupAdmin }) => {
            // Fast path — ignore non-commands immediately
            if (!text || !text.startsWith(globalPrefix)) return;

            const args = text.slice(globalPrefix.length).trim().split(/ +/);
            const commandName = `.${args.shift().toLowerCase()}`;

            const plugin = this.plugins.get(commandName);
            if (!plugin) return;

            const requiredRole = this.cmdRoles.get(commandName);

            // Fast owner check from config — no DB needed
            const isOwner = ownerWhatsAppJids && ownerWhatsAppJids.includes(sender);

            // Quick role gate — owner > admin > public
            if (requiredRole === 'owner' && !isOwner) return;
            if (requiredRole === 'admin' && !isOwner && !isGroupAdmin) return;

            // Rate limit check
            const groupId = isGroup ? msg.key.remoteJid : null;
            if (!(await rateLimiter.check(sender, groupId))) return;

            // Get user profile (cached — rarely hits DB)
            const userProfile = await userEngine.getOrCreate(sender, msg.pushName, isGroupAdmin);
            if (userProfile.activity?.isBanned) return;

            // Admin role gate
            if (requiredRole === 'owner' && userProfile.role !== 'owner') return;

            // Fire and forget — unique task ID prevents duplicate execution
            const taskId = `CMD_${commandName}_${sender}_${msg.key.id}`;
            taskManager.submit(taskId, async (abortSignal) => {
                await plugin.execute(sock, msg, args, userProfile, commandName, abortSignal);
            }, { priority: 5, timeout: 60000 }).catch(err => {
                if (err.name !== 'AbortError') logger.error(`Error in ${commandName}: ${err.message}`);
            });

            // Record command usage async — never blocks
            userEngine.recordCommand(sender).catch(() => {});
        });
    }
}

module.exports = new CommandRouter();
