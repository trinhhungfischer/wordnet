import fs from 'fs';

const dictPath = './public/global_dictionary_vi.json';
let dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

const myScratch = 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\4efeb95b-eaba-4ac0-a150-359042eb53a2\\scratch\\';
const altScratches = {
    4: 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\523f912d-f753-4153-a1a1-24af36280cb4\\scratch\\',
    5: 'C:\\Users\\Zitga\\.gemini\\antigravity\\brain\\dcb44eab-779c-47d9-951d-b4fa047f490b\\scratch\\'
};

const agentRoots = {
    1: "Lịch Sử & Thần Thoại",
    2: "Thế Giới & Vũ Trụ",
    3: "Cơ Thể & Sức Khoẻ",
    4: "Gia Đình & Đồ Dùng",
    5: "Đặc Sản Vùng Miền"
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
    let p = `${myScratch}extra_long_chunk${i}.json`;
    if (!fs.existsSync(p)) {
        if (altScratches[i]) {
            p = `${altScratches[i]}extra_long_chunk${i}.json`;
        }
    }
    
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
            console.log(`Merged extra_long_chunk${i}.json`);
        } catch(e) {
            console.log(`Error reading extra_long_chunk${i}.json: ` + e.message);
        }
    } else {
        console.log(`extra_long_chunk${i}.json NOT FOUND`);
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
        uniqueDataMap.set(key, c);
    }
});
let uniqueData = Array.from(uniqueDataMap.values());

// Build forward links (make sure parents have these as subcategories)
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

// Update the root "Từ vựng mở rộng" to have all the roots
const root = uniqueData.find(x => x.name === "Từ vựng mở rộng");
if (root) {
    for (let i = 1; i <= 5; i++) {
        const rName = agentRoots[i];
        if (!root.subcategories.includes(rName)) {
            root.subcategories.push(rName);
        }
    }
}

fs.writeFileSync(dictPath, JSON.stringify(uniqueData, null, 2), 'utf8');
console.log(`Successfully added categories. New total categories: ${uniqueData.length}`);
