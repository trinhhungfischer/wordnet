import fs from 'fs';

const dictPath = './public/global_dictionary_vi.json';
let dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

const altScratches = {
    2: 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\8a5da1cb-bb27-4ef7-8139-9af73598bf37\\scratch\\'
};

const agentRoots = {
    2: "Thế Giới & Vũ Trụ"
};

let i = 2;
let p = `${altScratches[i]}extra_long_chunk${i}.json`;

if (fs.existsSync(p)) {
    try {
        const data = JSON.parse(fs.readFileSync(p, 'utf8'));
        const rootName = agentRoots[i];
        
        data.forEach(c => {
            if (!c.parents) c.parents = [];
            if (!c.parents.includes(rootName)) {
                c.parents.push(rootName);
            }
        });
        dict = dict.concat(data);
        console.log(`Merged extra_long_chunk${i}.json`);
    } catch(e) {
        console.log(`Error reading extra_long_chunk${i}.json: ` + e.message);
    }
} else {
    console.log(`extra_long_chunk${i}.json NOT FOUND at ${p}`);
}

const uniqueDataMap = new Map();
dict.forEach(c => {
    const key = c.name.toLowerCase();
    if (uniqueDataMap.has(key)) {
        const existing = uniqueDataMap.get(key);
        const existingWords = existing.words.map(w => w.word.toLowerCase());
        c.words.forEach(w => {
            if (w && w.word && typeof w.word === 'string' && !existingWords.includes(w.word.toLowerCase())) {
                existing.words.push(w);
            }
        });
        if (c.parents) {
            c.parents.forEach(p => {
                if (!existing.parents.includes(p)) existing.parents.push(p);
            });
        }
    } else {
        uniqueDataMap.set(key, c);
    }
});
let uniqueData = Array.from(uniqueDataMap.values());

fs.writeFileSync(dictPath, JSON.stringify(uniqueData, null, 2), 'utf8');
console.log(`Successfully added categories. New total categories: ${uniqueData.length}`);
