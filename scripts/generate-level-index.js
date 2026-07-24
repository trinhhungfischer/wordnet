import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetPath = path.resolve(__dirname, '../public/real_levels');
if (!fs.existsSync(targetPath)) {
  console.log('No real_levels folder found');
  process.exit(0);
}

const files = fs.readdirSync(targetPath);
const levelNames = files
  .filter(f => f.endsWith('.json') && f !== 'index.json')
  .map(f => f.replace('.json', ''));

levelNames.sort((a, b) => {
  const numA = parseInt(a.replace(/[^0-9]/g, ''));
  const numB = parseInt(b.replace(/[^0-9]/g, ''));
  if (!isNaN(numA) && !isNaN(numB)) {
    return numA - numB;
  }
  return a.localeCompare(b);
});

const outputPath = path.resolve(__dirname, '../public/levels_index.json');
fs.writeFileSync(outputPath, JSON.stringify(levelNames, null, 2), 'utf-8');
console.log('Generated levels_index.json with ' + levelNames.length + ' levels.');
