import fs from 'fs';

const inputPath = './scratch/shuffled_words_vi.json';
const words = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const numAgents = 5;
const chunkSize = 500;

if (!fs.existsSync('./scratch/agent_chunks')) {
    fs.mkdirSync('./scratch/agent_chunks', { recursive: true });
}

for (let i = 0; i < numAgents; i++) {
    const chunk = words.slice(i * chunkSize, (i + 1) * chunkSize);
    const chunkPath = `./scratch/agent_chunks/chunk${i + 1}.json`;
    fs.writeFileSync(chunkPath, JSON.stringify(chunk, null, 2), 'utf8');
    console.log(`Created chunk ${i + 1} with ${chunk.length} words at ${chunkPath}`);
}
