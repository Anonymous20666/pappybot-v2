// modules/menuEngine.js
const fs = require('fs');
const path = require('path');

const CATEGORY_ICONS = {
    SYSTEM: '⚙️', BROADCAST: '📡', STATUS: '🌀', STRIKE: '⚡',
    GROWTH_ENGINE: '🚀', INTEL: '🕵️', STEALTH: '🥷', AESTHETIC: '🎨', GENERAL: '💠'
};

function generateMenu(userRole) {
    const pluginsDir = path.join(__dirname, '../plugins');
    const files = fs.readdirSync(pluginsDir).filter(f => f.endsWith('.js'));
    const menuMap = {};

    files.forEach(file => {
        try {
            const plugin = require(path.join(pluginsDir, file));
            if (!plugin.commands) return;
            const category = plugin.category ? plugin.category.toUpperCase() : 'GENERAL';
            if (!menuMap[category]) menuMap[category] = [];
            plugin.commands.forEach(cmd => {
                if (hasPermission(userRole, cmd.role)) menuMap[category].push(cmd.cmd);
            });
        } catch (e) {}
    });

    return formatMenu(menuMap, userRole);
}

function hasPermission(userRole, requiredRole = 'owner') {
    if (userRole === 'owner') return true;
    if (userRole === 'admin' && (requiredRole === 'admin' || requiredRole === 'public')) return true;
    if (userRole === 'public' && requiredRole === 'public') return true;
    return false;
}

function formatMenu(menuMap) {
    let out = '';
    for (const category in menuMap) {
        const cmds = menuMap[category];
        if (!cmds.length) continue;
        const icon = CATEGORY_ICONS[category] || '◈';
        out += `${icon} *${category}*\n`;
        cmds.forEach(cmd => { out += `  ┊ ${cmd}\n`; });
        out += '\n';
    }
    return out.trim();
}

module.exports = { generateMenu };
