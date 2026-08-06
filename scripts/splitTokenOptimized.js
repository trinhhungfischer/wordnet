import fs from 'fs';

const inputPath = './public/global_dictionary.json';
const dict = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

// Extract minimal data to save tokens
const minimalDict = dict.map(c => {
    return {
        n: c.name,
        w: c.words.map(w => w.word)
    };
});

// We will split into chunks of 200 categories.
// 6596 categories / 200 = 33 chunks
const numAgents = 33;
const chunkSize = Math.ceil(minimalDict.length / numAgents);

if (!fs.existsSync('./scratch/full_translation')) {
    fs.mkdirSync('./scratch/full_translation', { recursive: true });
}

for (let i = 0; i < numAgents; i++) {
    const chunk = minimalDict.slice(i * chunkSize, (i + 1) * chunkSize);
    if (chunk.length === 0) continue;
    const chunkPath = `./scratch/full_translation/chunk_${i + 1}.json`;
    fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2), 'utf8');
    console.log(`Created chunk_${i + 1}.json with ${chunk.length} categories.`);
}
