import fs from 'fs';

const dictPath = './public/global_dictionary_vi.json';
let dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

const myScratch = 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\4efeb95b-eaba-4ac0-a150-359042eb53a2\\scratch\\';
const altScratches = {
    4: 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\1e71a8a3-a682-4894-a32e-eb77eee6d072\\scratch\\',
    13: 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\77b256bf-fb30-4322-a555-1f501070b82a\\scratch\\'
};

let mergedCount = 0;

for (let i = 1; i <= 13; i++) {
    let p = `${myScratch}extra_chunk${i}.json`;
    if (!fs.existsSync(p)) {
        if (altScratches[i]) {
            p = `${altScratches[i]}extra_chunk${i}.json`;
        }
    }
    
    if (fs.existsSync(p)) {
        try {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            dict = dict.concat(data);
            mergedCount += data.length;
            console.log(`Merged extra_chunk${i}.json`);
        } catch(e) {
            console.log(`Error reading extra_chunk${i}.json: ` + e.message);
        }
    } else {
        console.log(`extra_chunk${i}.json NOT FOUND`);
    }
}

// Deduplicate existing categories by merging their words if names match
const uniqueDataMap = new Map();
dict.forEach(c => {
    const key = c.name.toLowerCase();
    if (uniqueDataMap.has(key)) {
        const existing = uniqueDataMap.get(key);
        const existingWords = existing.words.map(w => w.word.toLowerCase());
        c.words.forEach(w => {
            if (!existingWords.includes(w.word.toLowerCase())) {
                existing.words.push(w);
            }
        });
    } else {
        uniqueDataMap.set(key, c);
    }
});
const uniqueData = Array.from(uniqueDataMap.values());

fs.writeFileSync(dictPath, JSON.stringify(uniqueData, null, 2), 'utf8');
console.log(`Successfully added categories. New total categories: ${uniqueData.length}`);
