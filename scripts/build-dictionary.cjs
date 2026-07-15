const fs = require('fs');
const path = require('path');

const levelsDir = path.join(__dirname, 'public', 'levels');
const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json') && f !== 'index.json');

const dict = {};

files.forEach(f => {
    const data = JSON.parse(fs.readFileSync(path.join(levelsDir, f), 'utf8'));
    if (!data.categories) return;

    data.categories.forEach(cat => {
        if (!cat.category) return;
        const nameRaw = String(cat.category);
        const nameLower = nameRaw.toLowerCase();

        if (!dict[nameLower]) {
            dict[nameLower] = {
                name: nameRaw.charAt(0).toUpperCase() + nameRaw.slice(1),
                parents: new Set(),
                subcategories: new Set(),
                words: new Set()
            };
        }

        // Add parent
        if (cat.parentCategory) {
            const parentRaw = String(cat.parentCategory);
            const parentLower = parentRaw.toLowerCase();
            dict[nameLower].parents.add(parentRaw);
            
            // Ensure parent exists and add this as subcategory
            if (!dict[parentLower]) {
                dict[parentLower] = {
                    name: parentRaw.charAt(0).toUpperCase() + parentRaw.slice(1),
                    parents: new Set(),
                    subcategories: new Set(),
                    words: new Set()
                };
            }
            dict[parentLower].subcategories.add(nameRaw);
        }

        // Add words
        if (cat.words) {
            cat.words.forEach(w => {
                if (!w.fullWord) return;
                const wordStr = String(w.fullWord);
                // In Unity, subcategories are also listed in words array.
                // We should filter them out of 'words' if they are actually subcategories.
                // But we can only do this after passing all files. For now, add all to words.
                dict[nameLower].words.add(wordStr);
            });
        }
    });
});

// Post-processing: Remove subcategories from 'words' arrays
Object.keys(dict).forEach(key => {
    const entry = dict[key];
    const actualWords = new Set();
    
    entry.words.forEach(w => {
        const wLower = w.toLowerCase();
        // If the word exists as a category, and this category is its parent, it's a subcategory!
        // Actually, we already captured subcategories via parentCategory.
        // We just ensure 'words' doesn't contain strings that are in 'subcategories'
        let isSubcat = false;
        entry.subcategories.forEach(sub => {
            if (sub.toLowerCase() === wLower) isSubcat = true;
        });
        
        if (!isSubcat) {
            actualWords.add(w.charAt(0).toUpperCase() + w.slice(1));
        }
    });
    
    entry.words = Array.from(actualWords).sort();
    entry.parents = Array.from(entry.parents).sort();
    entry.subcategories = Array.from(entry.subcategories).sort();
});

// Convert to array format for easier use in frontend
const dictionaryArray = Object.values(dict).sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(
    path.join(__dirname, 'public', 'global_dictionary.json'), 
    JSON.stringify(dictionaryArray, null, 2)
);

console.log(`Successfully built dictionary with ${dictionaryArray.length} categories.`);
