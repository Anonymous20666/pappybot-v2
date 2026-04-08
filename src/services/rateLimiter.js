// services/rateLimiter.js — PAPPY V3
const { connection: redis } = require('./redis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const nodeIdPath = path.join(__dirname, '../data/node-id.txt');
let NODE_ID = '';
if (fs.existsSync(nodeIdPath)) {
    NODE_ID = fs.readFileSync(nodeIdPath, 'utf8').trim();
} else {
    NODE_ID = 'NODE_' + crypto.randomBytes(3).toString('hex').toUpperCase();
    if (!fs.existsSync(path.dirname(nodeIdPath))) fs.mkdirSync(path.dirname(nodeIdPath), { recursive: true });
    fs.writeFileSync(nodeIdPath, NODE_ID);
}

// In-memory rate limit cache — instant, no Redis round-trip for most checks
const memCache = new Map();
const LIMITS = { user: 2000, group: 800 };

function memCheck(key, ttl) {
    const now = Date.now();
    const exp = memCache.get(key);
    if (exp && now < exp) return false; // still rate limited
    memCache.set(key, now + ttl);
    // Auto-cleanup old entries every 500 checks
    if (memCache.size > 500) {
        for (const [k, v] of memCache) { if (v < now) memCache.delete(k); }
    }
    return true;
}

class RateLimiter {
    async check(userId, groupId = null) {
        // In-memory check first — zero latency
        const userKey = `u:${NODE_ID}:${userId}`;
        if (!memCheck(userKey, LIMITS.user)) return false;

        if (groupId) {
            const groupKey = `g:${NODE_ID}:${groupId}`;
            if (!memCheck(groupKey, LIMITS.group)) return false;
        }

        return true;
    }
}

module.exports = new RateLimiter();
