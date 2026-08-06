import fs from 'fs';

const dictPath = './public/global_dictionary_vi.json';
let dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

const numChunks = 5;
const possibleDirs = [
    './scratch/',
    'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\213d2b5f-8ed3-4724-8be4-166ed554b463\\scratch\\',
    'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\1c7b214b-b23e-4f3c-8f06-efb2e0811887\\scratch\\'
];

let mergedCount = 0;

for (let i = 1; i <= numChunks; i++) {
    let found = false;
    for (const dir of possibleDirs) {
        const p = `${dir}dict_chunk${i}.json`;
        if (fs.existsSync(p)) {
            try {
                const data = JSON.parse(fs.readFileSync(p, 'utf8'));
                dict = dict.concat(data);
                console.log(`Merged dict_chunk${i}.json from ${dir}`);
                found = true;
                mergedCount++;
                break;
            } catch(e) {
                console.log(`Error reading ${p}: ` + e.message);
            }
        }
    }
    if (!found) console.log(`dict_chunk${i}.json NOT FOUND`);
}

// Deduplicate
const uniqueDataMap = new Map();
dict.forEach(c => {
    const key = c.name.toLowerCase();
    if (uniqueDataMap.has(key)) {
        const existing = uniqueDataMap.get(key);
        const existingWords = existing.words.map(w => w.word.toLowerCase());
        
        c.words.forEach(w => {
            if (w && w.word && typeof w.word === 'string' && !existingWords.includes(w.word.toLowerCase())) {
                existing.words.push({ word: w.word, icon: null, popularity: w.popularity || 90 });
            }
        });
        
        // Merge parents
        if (c.parents) {
            c.parents.forEach(p => {
                if (!existing.parents.includes(p)) existing.parents.push(p);
            });
        }
        
        // Merge subcategories
        if (c.subcategories) {
            c.subcategories.forEach(sub => {
                if (!existing.subcategories.includes(sub)) existing.subcategories.push(sub);
            });
        }
    } else {
        // Ensure proper schema for new categories
        c.words = c.words.map(w => {
            if (typeof w === 'string') return { word: w, icon: null, popularity: 90 };
            delete w.parents;
            return w;
        });
        uniqueDataMap.set(key, c);
    }
});
let uniqueData = Array.from(uniqueDataMap.values());

// Forward links for tree
uniqueData.forEach(c => {
    if (c.parents) {
        c.parents.forEach(p => {
            const parent = uniqueData.find(x => x.name.toLowerCase() === p.toLowerCase());
            if (parent) {
                if (!parent.subcategories) parent.subcategories = [];
                if (!parent.subcategories.includes(c.name)) {
                    parent.subcategories.push(c.name);
                }
            }
        });
    }
});

fs.writeFileSync(dictPath, JSON.stringify(uniqueData, null, 2), 'utf8');
console.log(`Successfully merged ${mergedCount} chunks. New total categories: ${uniqueData.length}`);
