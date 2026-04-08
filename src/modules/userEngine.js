// modules/userEngine.js
const User = require('../core/models/User');
const { ownerWhatsAppJids } = require('../config');
const logger = require('../core/logger');

class UserEngine {
    constructor() {
        this.cache = new Map(); // sender → { profile, ts }
        this.CACHE_TTL = 3 * 60 * 1000; // 3 min
    }

    _resolveRole(userId, isGroupAdmin) {
        if (ownerWhatsAppJids && ownerWhatsAppJids.includes(userId)) return 'owner';
        if (isGroupAdmin) return 'admin';
        return 'public';
    }

    async getOrCreate(userId, name = 'Unknown', isGroupAdmin = false) {
        // Always resolve role from config first — never trust DB alone for owner
        const liveRole = this._resolveRole(userId, isGroupAdmin);

        // Check cache
        const cached = this.cache.get(userId);
        if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
            // Still enforce live owner role even from cache
            if (liveRole === 'owner') cached.profile.role = 'owner';
            return cached.profile;
        }

        try {
            let user = await User.findOne({ userId });

            if (!user) {
                user = await User.create({ userId, name, role: liveRole });
                logger.info(`👤 New user: ${name} [${liveRole}]`);
            } else {
                // Always enforce owner from config — DB can never override it
                if (liveRole === 'owner' && user.role !== 'owner') user.role = 'owner';
                user.activity.lastSeen = Date.now();
                user.stats.messagesSent += 1;
                await user.save();
            }

            this.cache.set(userId, { profile: user, ts: Date.now() });
            return user;
        } catch (error) {
            logger.error(`DB error for ${userId}:`, error.message);
            return {
                role: liveRole,
                activity: { isBanned: false },
                stats: { commandsUsed: 0 }
            };
        }
    }

    async setRole(userId, role) {
        try {
            await User.updateOne({ userId }, { role }, { upsert: false });
            // Invalidate cache
            this.cache.delete(userId);
            return true;
        } catch { return false; }
    }

    async recordCommand(userId) {
        try {
            await User.updateOne({ userId }, { $inc: { 'stats.commandsUsed': 1 } });
        } catch {}
    }
}

module.exports = new UserEngine();
