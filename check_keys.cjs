const fs = require('fs');
const path = require('path');
const dir = 'public/real_levels';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
let found = false;
for (const file of files) {
    try {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
        if (data.keyLockBubbles && Array.isArray(data.keyLockBubbles)) {
            for (let i = 0; i < data.keyLockBubbles.length; i++) {
                const bubble = data.keyLockBubbles[i];
                if (bubble.key && bubble.key.id === undefined) {
                    console.log(`File: ${file}, keyLockBubbles index: ${i} has key but no id`);
                    found = true;
                } else if (bubble.key === undefined) {
                    console.log(`File: ${file}, keyLockBubbles index: ${i} has no key object`);
                    found = true;
                }
            }
        }
    } catch(e) {
        console.error("Error parsing", file, e);
    }
}
if (!found) console.log('No missing ids found.');
