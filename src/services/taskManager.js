// core/taskManager.js — PAPPY V3
const { system } = require('../config');

class TaskManager {
    constructor() {
        this.concurrency = system?.maxQueueConcurrency || 50;
        this.running = 0;
        this.queue = [];
        this.activeJobs = new Set();
    }

    submit(id, taskFn, options = {}) {
        const { priority = 1, timeout = 60000, retries = 0, jitter = [0, 0] } = options;

        // Deduplicate — same task already running or queued
        if (this.activeJobs.has(id)) return Promise.resolve();

        return new Promise((resolve, reject) => {
            this.activeJobs.add(id);
            // Insert in priority order without full sort
            const job = { id, taskFn, priority, timeout, retries, jitter, resolve, reject, attempt: 0 };
            let i = this.queue.length;
            while (i > 0 && this.queue[i - 1].priority < priority) i--;
            this.queue.splice(i, 0, job);
            this._processNext();
        });
    }

    async _processNext() {
        if (this.running >= this.concurrency || this.queue.length === 0) return;

        const job = this.queue.shift();
        this.running++;
        job.attempt++;

        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), job.timeout);

        try {
            if (job.jitter[1] > 0) {
                const jitterDelay = Math.floor(Math.random() * (job.jitter[1] - job.jitter[0] + 1)) + job.jitter[0];
                await new Promise(res => setTimeout(res, jitterDelay));
            }
            const result = await job.taskFn(abortController.signal);
            clearTimeout(timeoutId);
            this.activeJobs.delete(job.id);
            job.resolve(result);
        } catch (error) {
            clearTimeout(timeoutId);
            if (job.attempt <= job.retries && error.name !== 'AbortError') {
                job.jitter = [2000, 5000];
                this.queue.push(job);
            } else {
                this.activeJobs.delete(job.id);
                job.reject(error);
            }
        } finally {
            this.running--;
            // Use setImmediate to yield to event loop between tasks
            setImmediate(() => this._processNext());
        }
    }

    cancel(id) {
        this.activeJobs.delete(id);
        this.queue = this.queue.filter(j => j.id !== id);
    }

    getStats() {
        return { running: this.running, queued: this.queue.length, maxConcurrency: this.concurrency };
    }
}

module.exports = new TaskManager();
