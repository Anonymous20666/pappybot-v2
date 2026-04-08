// core/eventBus.js — PAPPY V3
const EventEmitter = require('events');

class EventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(100); // Prevent memory leak warnings with many plugins
    }
}

module.exports = new EventBus();
