import fs from 'fs';
import path from 'path';

const scratchDir = 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\4efeb95b-eaba-4ac0-a150-359042eb53a2\\scratch';
let merged = [];

for (let i = 1; i <= 3; i++) {
  const p = path.join(scratchDir, `chunk${i}.json`);
  if (fs.existsSync(p)) {
    try {
      const data = JSON.parse(fs.readFileSync(p, 'utf8'));
      merged = merged.concat(data);
      console.log(`Loaded chunk${i}.json with ${data.length} categories.`);
    } catch(e) {
      console.error(`Error parsing chunk${i}.json`, e);
    }
  } else {
    console.error(`File not found: ${p}`);
  }
}

const outPath = './public/global_dictionary_vi.json';
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
console.log('Successfully merged ' + merged.length + ' categories into global_dictionary_vi.json');
