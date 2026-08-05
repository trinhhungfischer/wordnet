import fs from 'fs';
import path from 'path';

const csvPath = path.join(process.cwd(), '024-Bubble - User Journey.csv');
const levelsDir = path.join(process.cwd(), 'public', 'real_levels');

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n');

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  
  // A naive CSV split that respects quotes. 
  // Each match is either quoted string or non-comma chars
  const cols: string[] = [];
  let inQuotes = false;
  let currentWord = '';
  for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
          inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
          cols.push(currentWord);
          currentWord = '';
      } else {
          currentWord += c;
      }
  }
  cols.push(currentWord);

  if (cols.length >= 6) {
    const levelStr = cols[0].trim();
    const moveLimitStr = cols[5].trim();
    
    const level = parseInt(levelStr, 10);
    const moveLimit = parseInt(moveLimitStr, 10);
    
    if (!isNaN(level) && !isNaN(moveLimit)) {
      const jsonPath = path.join(levelsDir, `Level ${level}.json`);
      if (fs.existsSync(jsonPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
          if (data.moveLimit !== moveLimit) {
            data.moveLimit = moveLimit;
            fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
            console.log(`Updated Level ${level} with moveLimit = ${moveLimit}`);
          }
        } catch (e) {
          console.error(`Error processing Level ${level}:`, e);
        }
      } else {
        // console.warn(`Level ${level} not found.`);
      }
    }
  }
}
console.log("✅ Done updating moveLimit!");
