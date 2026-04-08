const fs = require('fs');
const path = require('path');

function fixPaths(dir) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            fixPaths(fullPath);
        } else if (file.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let changed = false;
            
            // Fix config paths
            if (content.includes("require('../config')")) {
                content = content.replace(/require\('\.\.\/config'\)/g, "require('../../config')");
                changed = true;
            }
            
            // Fix core paths from plugins
            if (fullPath.includes('/plugins/') && content.includes("require('../core/")) {
                content = content.replace(/require\('\.\.\/core\//g, "require('../services/");
                changed = true;
            }
            
            // Fix modules paths from plugins
            if (fullPath.includes('/plugins/') && content.includes("require('../modules/")) {
                content = content.replace(/require\('\.\.\/modules\//g, "require('../modules/");
                changed = true;
            }
            
            if (changed) {
                fs.writeFileSync(fullPath, content);
                console.log('Fixed:', fullPath);
            }
        }
    }
}

fixPaths('./src');
console.log('Done!');
