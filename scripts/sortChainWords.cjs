const fs = require('fs');
const path = require('path');

const realLevelsDir = path.join(__dirname, '../public/real_levels');

let count = 0;
for (let i = 130; i <= 498; i++) {
  const filePath = path.join(realLevelsDir, `Level ${i}.json`);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  
  let modified = false;
  
  if (data.bubbleSeparatorData && data.bubbleSeparatorData.linkedWords && data.bubbleSeparatorData.linkedWords.length > 0) {
    const chainWords = data.bubbleSeparatorData.linkedWords.map(w => w.toLowerCase());
    
    const chainEntries = [];
    const otherEntries = [];
    
    for (const entry of data.allWordEntries) {
      if (chainWords.includes(entry.fullWord.toLowerCase())) {
        chainEntries.push(entry);
      } else {
        otherEntries.push(entry);
      }
    }
    
    data.allWordEntries = [...chainEntries, ...otherEntries];
    modified = true;
    console.log(`Reordered chain words for Level ${i}`);
    count++;
  }

  // Also check if there are legacy bubbleChains just in case
  if (data.bubbleChains && data.bubbleChains.length > 0) {
    const chainWordStrings = new Set();
    data.bubbleChains.forEach(bc => {
      if (bc.chainRootWord) chainWordStrings.add(bc.chainRootWord.toLowerCase());
      if (bc.linkList) {
        bc.linkList.forEach(ll => {
          if (ll.linkedWord) chainWordStrings.add(ll.linkedWord.toLowerCase());
        });
      }
    });

    if (chainWordStrings.size > 0) {
      const chainEntries = [];
      const otherEntries = [];
      for (const entry of data.allWordEntries) {
        if (chainWordStrings.has(entry.fullWord.toLowerCase())) {
          chainEntries.push(entry);
        } else {
          otherEntries.push(entry);
        }
      }
      data.allWordEntries = [...chainEntries, ...otherEntries];
      modified = true;
      console.log(`Reordered legacy bubbleChains for Level ${i}`);
      count++;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

console.log(`Finished processing ${count} levels.`);
