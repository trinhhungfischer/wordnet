const fs = require('fs');
const path = require('path');

const levelsDir = path.join(__dirname, '../public/real_levels');
let totalLevels = 0;

const stats = {
  frozenBubbles: 0,
  burstBubbles: 0,
  backwardBubbles: 0,
  keyLockBubbles: 0,
  crypticBubbles: 0,
  screwLockBubbles: 0,
  cycleLockBubbles: 0,
  immovableBubbles: 0,
  countdownBubbles: 0,
  linkedBubbles: 0,
  chunkSplitting: 0,
  crackedBubbles: 0,
  crackBubbles: 0,
  targetProperNoun: 0,
  bossMode: 0
};

const mechanicsPerLevel = {};

for (let i = 501; i <= 1000; i++) {
  const file = path.join(levelsDir, `Level ${i}.json`);
  if (!fs.existsSync(file)) {
    console.log(`Level ${i}.json not found`);
    continue;
  }

  totalLevels++;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  
  mechanicsPerLevel[`Level ${i}`] = [];

  const checkAndAdd = (key) => {
    if (data[key] && data[key].length > 0) {
      stats[key]++;
      mechanicsPerLevel[`Level ${i}`].push(key);
    }
  };

  // Check array properties
  checkAndAdd('frozenBubbles');
  checkAndAdd('burstBubbles');
  checkAndAdd('backwardBubbles');
  checkAndAdd('keyLockBubbles');
  checkAndAdd('crypticBubbles');
  checkAndAdd('screwLockBubbles');
  checkAndAdd('cycleLockBubbles');
  checkAndAdd('immovableBubbles');
  checkAndAdd('countdownBubbles');
  
  // For chunk splitting (cắt chunk), it's created when words are broken down into chunks
  let hasChunks = false;
  if (data.allWordEntries && data.allWordEntries.some(e => e.parentWord)) {
    hasChunks = true;
  }
  
  if (hasChunks) {
    stats.chunkSplitting++;
    mechanicsPerLevel[`Level ${i}`].push('Cắt chunk (Chunk Splitting)');
  }

  // Cracked bubbles
  let hasCracked = false;
  if (data.crackedBubbles && data.crackedBubbles.length > 0) {
    hasCracked = true;
  } else if (data.crackBubbles && data.crackBubbles.length > 0) {
    hasCracked = true;
  } else {
    data.categories?.forEach(cat => {
      cat.words?.forEach(w => {
        if (w.IsCracked || w.crackBreakNum > 0) {
          hasCracked = true;
        }
      });
    });
  }
  if (hasCracked) {
    stats.crackedBubbles++;
    mechanicsPerLevel[`Level ${i}`].push('crackedBubbles');
  }
  
  // Others
  if (data.targetProperNoun) {
    stats.targetProperNoun++;
    mechanicsPerLevel[`Level ${i}`].push('targetProperNoun');
  }
  
  if (data.bossMode || data.isBossMode) {
    stats.bossMode++;
    mechanicsPerLevel[`Level ${i}`].push('bossMode');
  }
}

let markdown = `# Analysis of Mechanisms in Levels 501 - 1000

## Summary Statistics
Total levels analyzed: ${totalLevels}

| Mechanism | Count (Levels) | Percentage |
| :--- | :--- | :--- |
`;

Object.keys(stats).forEach(key => {
  const pct = ((stats[key] / totalLevels) * 100).toFixed(1);
  markdown += `| ${key} | ${stats[key]} | ${pct}% |\n`;
});

markdown += `\n## Details by Level\n`;

for (let i = 501; i <= 1000; i++) {
  const mechs = mechanicsPerLevel[`Level ${i}`];
  if (mechs && mechs.length > 0) {
    markdown += `- **Level ${i}**: ${mechs.join(', ')}\n`;
  }
}

fs.mkdirSync(path.join(__dirname), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'mechanics_501_1000.md'), markdown);

console.log('Analysis completed. Check analysis/mechanics_501_1000.md');
