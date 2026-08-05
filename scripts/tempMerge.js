import fs from 'fs';

const p1 = 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\aa03903d-13a9-4242-b32f-e319c0e5977d\\scratch\\short_chunk1.json';
const p2 = 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\9f036155-d0fb-47ee-a8e9-514a17689a14\\scratch\\short_chunk2.json';
const p3 = 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\4efeb95b-eaba-4ac0-a150-359042eb53a2\\scratch\\short_chunk3.json';

let merged = [];
[p1, p2, p3].forEach((p, idx) => {
    try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        merged = merged.concat(data);
        console.log(`Chunk ${idx + 1} loaded with ${data.length} categories.`);
    } catch(e) { console.log(`Error on chunk ${idx + 1}: ` + e.message); }
});

fs.writeFileSync('./public/global_dictionary_vi.json', JSON.stringify(merged, null, 2), 'utf8');
console.log('Categories: ' + merged.map(c => c.name).join(', '));
