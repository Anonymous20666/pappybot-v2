// core/watchdog.js — PAPPY V3
const logger = require('./logger');
const taskManager = require('./taskManager');

class SmartWatchdog {
    constructor(timeoutMs = 120000) {
        this.timeoutMs = timeoutMs;
        this.monitors = new Map();
        // Health check every 60s
        setInterval(() => this.runDiagnostics(), 60000).unref();
    }

    attach(botId, sock, restartCallback) {
        if (this.monitors.has(botId)) {
            clearInterval(this.monitors.get(botId).interval);
            this.monitors.delete(botId);
        }

        const monitor = {
            lastSeen: Date.now(),
            interval: setInterval(() => this._check(botId, sock, restartCallback), 30000)
        };
        monitor.interval.unref();

        this.monitors.set(botId, monitor);

        // Listen to connection updates
        const connHandler = (update) => {
            if (update.connection === 'open' || update.receivedPendingNotifications) {
                this.update(botId);
            }
        };
        const msgHandler = () => this.update(botId);

        sock.ev.on('connection.update', connHandler);
        sock.ev.on('messages.upsert', msgHandler);

        monitor.connHandler = connHandler;
        monitor.msgHandler = msgHandler;
    }

    update(botId) {
        const monitor = this.monitors.get(botId);
        if (monitor) monitor.lastSeen = Date.now();
    }

    _check(botId, sock, restartCallback) {
        const monitor = this.monitors.get(botId);
        if (!monitor) return;

        const idleTime = Date.now() - monitor.lastSeen;

        if (idleTime > this.timeoutMs / 2) {
            try { sock.ws.ping(); } catch {}
        }

        if (idleTime > this.timeoutMs) {
            logger.error(`🚨 [WATCHDOG] Zombie detected for ${botId}. Restarting...`);
            clearInterval(monitor.interval);
            this.monitors.delete(botId);
            restartCallback();
        }
    }

    runDiagnostics() {
        const stats = taskManager.getStats();
        const memMB = Math.round(process.memoryUsage().rss / 1024 / 1024);

        if (stats.queued > 200 && stats.running >= taskManager.concurrency) {
            logger.warn('[WATCHDOG] Queue congestion — flushing low-priority tasks');
            taskManager.queue = taskManager.queue.filter(j => j.priority >= 3);
        }

        if (memMB > 1200) {
            logger.warn(`[WATCHDOG] High memory: ${memMB}MB — running GC`);
            if (global.gc) global.gc();
            global.messageCache = new WeakMap();
        }
    }

    detach(botId) {
        const monitor = this.monitors.get(botId);
        if (monitor) {
            clearInterval(monitor.interval);
            this.monitors.delete(botId);
        }
    }
}

module.exports = new SmartWatchdog();
