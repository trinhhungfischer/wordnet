const fs = require('fs');
const path = require('path');

const realLevelsDir = path.join(__dirname, '../public/real_levels');

let count = 0;
for (let i = 1; i <= 498; i++) {
  const filePath = path.join(realLevelsDir, `Level ${i}.json`);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  if (data.categories && data.allWordEntries) {
    const subcats = data.categories.filter(c => c.parentCategory).map(c => c.category.toLowerCase());
    const originalLength = data.allWordEntries.length;
    
    // Filter out entries that are actually subcategories
    data.allWordEntries = data.allWordEntries.filter(entry => {
      const isSubcat = subcats.includes(entry.fullWord.toLowerCase());
      return !isSubcat;
    });

    if (data.allWordEntries.length < originalLength) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Removed ${originalLength - data.allWordEntries.length} subcategories from allWordEntries in Level ${i}`);
      count++;
    }
  }
}

console.log(`Cleaned up subcategories in ${count} levels.`);
