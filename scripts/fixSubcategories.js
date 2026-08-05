import fs from 'fs';

const path = './public/global_dictionary.json';
const dict = JSON.parse(fs.readFileSync(path, 'utf8'));

// Build a map of all category names (lowercase to exact original casing)
const nameMap = new Map();
dict.forEach(c => {
    nameMap.set(c.name.toLowerCase(), c.name);
});

let addedSubcats = 0;
let addedParents = 0;

// 1. Populate missing subcategories
dict.forEach(c => {
    if (!c.subcategories) c.subcategories = [];
    const existingSubs = c.subcategories.map(s => s.toLowerCase());
    
    c.words.forEach(w => {
        const wLower = w.word.toLowerCase();
        if (nameMap.has(wLower) && !existingSubs.includes(wLower)) {
            c.subcategories.push(nameMap.get(wLower));
            existingSubs.push(wLower);
            addedSubcats++;
        }
    });
});

// 2. Populate missing parents
// If category A has category B in its subcategories, B should have A in its parents
dict.forEach(c => {
    c.subcategories.forEach(subName => {
        const child = dict.find(x => x.name.toLowerCase() === subName.toLowerCase());
        if (child) {
            if (!child.parents) child.parents = [];
            if (!child.parents.find(p => p.toLowerCase() === c.name.toLowerCase())) {
                child.parents.push(c.name);
                addedParents++;
            }
        }
    });
});

fs.writeFileSync(path, JSON.stringify(dict, null, 2), 'utf8');
console.log(`Successfully fixed dictionary. Added ${addedSubcats} subcategories and ${addedParents} parents.`);
