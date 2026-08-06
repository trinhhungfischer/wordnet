import fs from 'fs';

const inputPath = './public/global_dictionary.json';
const dict = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Take a sample of 100 categories for the proof of concept
const sample = dict.slice(0, 100);

const numAgents = 5;
const chunkSize = Math.ceil(sample.length / numAgents);

if (!fs.existsSync('./scratch/translation_chunks')) {
    fs.mkdirSync('./scratch/translation_chunks', { recursive: true });
}

for (let i = 0; i < numAgents; i++) {
    const chunk = sample.slice(i * chunkSize, (i + 1) * chunkSize);
    const chunkPath = `./scratch/translation_chunks/chunk_${i + 1}.json`;
    fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2), 'utf8');
    console.log(`Created chunk_${i + 1}.json with ${chunk.length} categories.`);
}
