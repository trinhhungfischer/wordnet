import fs from 'fs';

const dictPath = './public/global_dictionary_vi.json';
let dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

const myScratch = 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\4efeb95b-eaba-4ac0-a150-359042eb53a2\\scratch\\';

const agentRoots = {
    1: "Khoa Học & Công Nghệ",
    2: "Tự Nhiên & Địa Lý",
    3: "Nghề Nghiệp & Xã Hội",
    4: "Văn Hoá & Khái Niệm",
    5: "Ẩm Thực & Món Ăn"
};

// Create agent roots
for (let i = 1; i <= 5; i++) {
    const rootName = agentRoots[i];
    if (!dict.find(c => c.name === rootName)) {
        dict.push({
            name: rootName,
            parents: ["Từ vựng mở rộng"],
            subcategories: [],
            popularity: 90.0,
            words: []
        });
    }
}

for (let i = 1; i <= 5; i++) {
    let p = `${myScratch}long_chunk${i}.json`;
    if (fs.existsSync(p)) {
        try {
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            const rootName = agentRoots[i];
            
            data.forEach(c => {
                // Link new category to the specific root
                if (!c.parents) c.parents = [];
                if (!c.parents.includes(rootName)) {
                    c.parents.push(rootName);
                }
            });
            dict = dict.concat(data);
            console.log(`Merged long_chunk${i}.json`);
        } catch(e) {
            console.log(`Error reading long_chunk${i}.json: ` + e.message);
        }
    } else {
        console.log(`long_chunk${i}.json NOT FOUND`);
    }
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
                existing.words.push(w);
            }
        });
        // Merge parents
        c.parents.forEach(p => {
            if (!existing.parents.includes(p)) existing.parents.push(p);
        });
        // Merge subcategories
        if (c.subcategories) {
            c.subcategories.forEach(sub => {
                if (!existing.subcategories.includes(sub)) existing.subcategories.push(sub);
            });
        }
    } else {
        uniqueDataMap.set(key, c);
    }
});
let uniqueData = Array.from(uniqueDataMap.values());

// Build forward links
uniqueData.forEach(c => {
    c.parents.forEach(p => {
        const parent = uniqueData.find(x => x.name.toLowerCase() === p.toLowerCase());
        if (parent && !parent.subcategories.includes(c.name)) {
            parent.subcategories.push(c.name);
        }
    });
});

fs.writeFileSync(dictPath, JSON.stringify(uniqueData, null, 2), 'utf8');
console.log(`Successfully added longer categories. New total categories: ${uniqueData.length}`);
