const fs = require('fs');
const path = require('path');

const realLevelsDir = path.join(__dirname, '../public/real_levels');

let count = 0;
for (let i = 1; i <= 498; i++) {
  const filePath = path.join(realLevelsDir, `Level ${i}.json`);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let modified = false;

  if (data.categories) {
    for (const cat of data.categories) {
      if (cat.words) {
        for (const word of cat.words) {
          if (word.chunks !== undefined) {
            delete word.chunks;
            modified = true;
          }
        }
      }
    }
  }

  // Also check allWordEntries just in case
  if (data.allWordEntries) {
    for (const entry of data.allWordEntries) {
      if (entry.chunks !== undefined) {
        delete entry.chunks;
        modified = true;
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    count++;
  }
}

console.log(`Removed chunks property from ${count} levels in real_levels.`);
