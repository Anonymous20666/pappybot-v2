const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { User } = require('../storage/models');

class CommandRouter {
    constructor(whatsappHandler) {
        this.whatsapp = whatsappHandler;
        this.plugins = new Map();
        this.commands = new Map();
        this.loadPlugins();
    }

    loadPlugins() {
        const pluginsDir = path.join(__dirname, '../plugins');
        
        if (!fs.existsSync(pluginsDir)) {
            logger.warn('Plugins directory not found');
            return;
        }

        const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
        
        for (const file of files) {
            try {
                const pluginPath = path.join(pluginsDir, file);
                delete require.cache[require.resolve(pluginPath)];
                const plugin = require(pluginPath);
                
                if (plugin.commands && Array.isArray(plugin.commands)) {
                    this.plugins.set(file, plugin);
                    
                    plugin.commands.forEach(cmdObj => {
                        this.commands.set(cmdObj.cmd, {
                            plugin: file,
                            role: cmdObj.role || 'public',
                            execute: plugin.execute
                        });
                    });
                    
                    if (plugin.init && this.whatsapp.sock) {
                        plugin.init(this.whatsapp.sock);
                    }
                    
                    logger.info(`Loaded plugin: ${file} (${plugin.commands.length} commands)`);
                }
            } catch (error) {
                logger.error(`Failed to load plugin ${file}:`, error.message);
            }
        }
        
        logger.info(`Total commands loaded: ${this.commands.size}`);
    }

    async execute(command, msg, args) {
        try {
            const cmdData = this.commands.get(command);
            
            if (!cmdData) {
                return;
            }

            const userId = msg.key.remoteJid;
            const user = await this.getOrCreateUser(userId);

            if (user.activity.isBanned) {
                logger.warn(`Banned user ${userId} attempted: ${command}`);
                return;
            }

            user.stats.commandsUsed += 1;
            user.activity.lastSeen = new Date();
            await user.save().catch(err => logger.error('User save error:', err));

            await cmdData.execute(this.whatsapp.sock, msg, args, user, command);

        } catch (error) {
            logger.error(`Command error (${command}):`, error.message);
            
            try {
                await this.whatsapp.sendMessage(
                    msg.key.remoteJid,
                    { text: `❌ Error: ${error.message}` },
                    { quoted: msg }
                );
            } catch (sendError) {
                logger.error('Failed to send error message:', sendError.message);
            }
        }
    }

    async getOrCreateUser(userId) {
        try {
            let user = await User.findOne({ userId });
            
            if (!user) {
                user = await User.create({ userId });
                logger.info(`New user: ${userId}`);
            }

            return user;
        } catch (error) {
            logger.error('User fetch error:', error.message);
            return {
                userId,
                role: 'user',
                activity: { isBanned: false },
                stats: { commandsUsed: 0 },
                save: async () => {}
            };
        }
    }
}

module.exports = CommandRouter;
