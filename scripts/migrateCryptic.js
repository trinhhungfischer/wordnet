import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dirsToScan = [
  path.join(__dirname, '../public/levels'),
  path.join(__dirname, '../public/real_levels'),
  path.join(__dirname, '../level_configs')
];

let filesChanged = 0;

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.json')) {
      processFile(fullPath);
    }
  }
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    let changed = false;

    if (data.crypticBubbles && Array.isArray(data.crypticBubbles)) {
      data.crypticBubbles = data.crypticBubbles.map(cb => {
        if (cb.letters) {
          changed = true;
          const wordLen = cb.word ? cb.word.length : cb.letters.length;
          const revealAtMerge = cb.letters.map(l => l.revealAtMerge || 0);
          const { letters, ...rest } = cb;
          return { ...rest, revealAtMerge };
        }
        return cb;
      });
    }

    if (changed) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Updated ${filePath}`);
      filesChanged++;
    }
  } catch (err) {
    console.error(`Error processing ${filePath}: ${err.message}`);
  }
}

for (const dir of dirsToScan) {
  console.log(`Scanning ${dir}...`);
  processDirectory(dir);
}

console.log(`Done. Updated ${filesChanged} files.`);
