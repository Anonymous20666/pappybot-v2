const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'user'], default: 'user' },
    activity: {
        isBanned: { type: Boolean, default: false },
        warns: { type: Number, default: 0 },
        lastSeen: { type: Date, default: Date.now }
    },
    stats: {
        commandsUsed: { type: Number, default: 0 },
        messagesReceived: { type: Number, default: 0 }
    }
}, { timestamps: true });

const IntelSchema = new mongoose.Schema({
    linkCode: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['pending', 'processing', 'joined', 'failed'], default: 'pending', index: true },
    joinedAt: { type: Date },
    groupJid: { type: String }
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);
const Intel = mongoose.model('Intel', IntelSchema);

module.exports = { User, Intel };
