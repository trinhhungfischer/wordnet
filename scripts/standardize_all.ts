import fs from 'fs';
import path from 'path';

function toTitleCase(str: string): string {
    if (!str) return str;
    return str.split(' ').map(s => {
        if (s.length === 0) return s;
        // Capitalize first letter, lowercase the rest
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }).join(' ');
}

// 1. Standardize global_dictionary.json
const dictPath = path.resolve('public/global_dictionary.json');
let rawDict = '[]';
try {
    rawDict = fs.readFileSync(dictPath, 'utf8');
} catch(e) {
    console.error("Could not read global_dictionary.json");
    process.exit(1);
}
const dictCategories: any[] = JSON.parse(rawDict);

const mergedCategories = new Map<string, any>();
let originalCatCount = dictCategories.length;

dictCategories.forEach(cat => {
    const stdName = toTitleCase(cat.name);
    
    let existing = mergedCategories.get(stdName);
    if (!existing) {
        existing = {
            name: stdName,
            parents: new Set<string>(),
            subcategories: new Set<string>(),
            popularitySum: 0,
            popularityCount: 0,
            wordsMap: new Map<string, any>()
        };
        mergedCategories.set(stdName, existing);
    }
    
    if (cat.parents) {
        cat.parents.forEach((p: string) => existing.parents.add(toTitleCase(p)));
    }
    if (cat.subcategories) {
        cat.subcategories.forEach((s: string) => existing.subcategories.add(toTitleCase(s)));
    }
    if (typeof cat.popularity === 'number') {
        existing.popularitySum += cat.popularity;
        existing.popularityCount++;
    }
    
    if (cat.words) {
        cat.words.forEach((w: any) => {
            if (w && w.word) {
                // Keep words as they are, but deduplicate by uppercase
                const upperWord = w.word.toUpperCase();
                const existingWord = existing.wordsMap.get(upperWord);
                if (!existingWord || (w.popularity > existingWord.popularity)) {
                    existing.wordsMap.set(upperWord, {
                        word: w.word, // Preserve original casing of the word or make uppercase? The previous script made them uppercase. Let's keep original for English.
                        icon: w.icon || null,
                        popularity: w.popularity || 0
                    });
                }
            }
        });
    }
});

const finalDict = Array.from(mergedCategories.values()).map(cat => {
    return {
        name: cat.name,
        parents: Array.from(cat.parents).sort(),
        subcategories: Array.from(cat.subcategories).sort(),
        popularity: cat.popularityCount > 0 ? Math.round(cat.popularitySum / cat.popularityCount) : 50,
        words: Array.from(cat.wordsMap.values()).sort((a: any, b: any) => a.word.localeCompare(b.word))
    };
});
finalDict.sort((a, b) => a.name.localeCompare(b.name));

fs.writeFileSync(dictPath, JSON.stringify(finalDict, null, 2), 'utf-8');
console.log(`[global_dictionary.json] Standardized and merged from ${originalCatCount} to ${finalDict.length} categories.`);

// 2. Standardize locales/vi.json
const viLocalesPath = path.resolve('public/locales/vi.json');
let rawVi = '{}';
try {
    rawVi = fs.readFileSync(viLocalesPath, 'utf8');
} catch(e) {
    console.error("Could not read locales/vi.json");
    process.exit(1);
}
const viLocales = JSON.parse(rawVi);

let viCatChanges = 0;
if (viLocales.categories) {
    for (const key in viLocales.categories) {
        const original = viLocales.categories[key];
        const titleCased = toTitleCase(original);
        if (original !== titleCased) {
            viLocales.categories[key] = titleCased;
            viCatChanges++;
        }
    }
}

let viWordChanges = 0;
if (viLocales.words) {
    for (const key in viLocales.words) {
        const original = viLocales.words[key];
        const titleCased = toTitleCase(original);
        if (original !== titleCased) {
            viLocales.words[key] = titleCased;
            viWordChanges++;
        }
    }
}

fs.writeFileSync(viLocalesPath, JSON.stringify(viLocales, null, 2), 'utf-8');
console.log(`[locales/vi.json] Standardized. Changed ${viCatChanges} categories and ${viWordChanges} words to Title Case.`);
