import fs from 'fs';

const numAgents = 5;
let merged = [];

for (let i = 1; i <= numAgents; i++) {
    const p = `./scratch/translation_chunks/chunk_${i}_vi.json`;
    if (fs.existsSync(p)) {
        try {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            merged = merged.concat(data);
            console.log(`Merged chunk_${i}_vi.json with ${data.length} categories.`);
        } catch(e) {
            console.error(`Error reading ${p}: ` + e.message);
        }
    } else {
        console.error(`File not found: ${p}`);
    }
}

const outPath = './public/global_dictionary_translated_vi_sample.json';
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
console.log(`Successfully merged ${merged.length} translated categories into ${outPath}`);
