import fs from 'fs';

const inputPath = './public/global_dictionary.json';
const outPath = './public/global_dictionary_translated_vi.json';
const dict = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const numAgents = 33;
let globalIndex = 0;
let successCount = 0;
let failedChunks = [];

for (let i = 1; i <= numAgents; i++) {
    const chunkPath = `./scratch/full_translation/chunk_${i}_vi.json`;
    if (!fs.existsSync(chunkPath)) {
        console.error(`Missing chunk: chunk_${i}_vi.json`);
        failedChunks.push(i);
        // We still need to advance globalIndex by the expected chunk size so following chunks align
        // The last chunk might have fewer than 200.
        // Actually, let's look at the original chunk files to know how many to skip.
        const originalChunk = JSON.parse(fs.readFileSync(`./scratch/full_translation/chunk_${i}.json`, 'utf8'));
        globalIndex += originalChunk.length;
        continue;
    }

    try {
        const translatedChunk = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
        
        for (let j = 0; j < translatedChunk.length; j++) {
            const translatedCat = translatedChunk[j];
            const originalCat = dict[globalIndex];
            
            // Reapply Vietnamese name
            originalCat.name = translatedCat.n || originalCat.name;
            
            // Reapply Vietnamese words
            if (translatedCat.w && Array.isArray(translatedCat.w)) {
                for (let k = 0; k < translatedCat.w.length && k < originalCat.words.length; k++) {
                    originalCat.words[k].word = translatedCat.w[k];
                }
            }
            globalIndex++;
            successCount++;
        }
    } catch(e) {
        console.error(`Error parsing chunk_${i}_vi.json: ${e.message}`);
        failedChunks.push(i);
        const originalChunk = JSON.parse(fs.readFileSync(`./scratch/full_translation/chunk_${i}.json`, 'utf8'));
        globalIndex += originalChunk.length;
    }
}

fs.writeFileSync(outPath, JSON.stringify(dict, null, 2), 'utf8');
console.log(`Successfully translated and mapped ${successCount} out of ${dict.length} categories.`);
if (failedChunks.length > 0) {
    console.log(`Missing or failed chunks: ${failedChunks.join(', ')}`);
}
