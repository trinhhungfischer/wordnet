import fs from 'fs';
import path from 'path';

const MINOR_WORDS = new Set(["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "from", "by", "of", "in", "as"]);

function toTitleCase(str, isVietnamese = false) {
    if (!str) return '';
    return str.toLowerCase().replace(/(?:^|[\s-])\w/g, (match) => {
        return match.toUpperCase();
    });
}

// Ensure first letter of the whole string is ALWAYS uppercase
function formatStr(str, isVi = false) {
    let t = toTitleCase(str.trim(), isVi);
    return t.charAt(0).toUpperCase() + t.slice(1);
}

const dictPath = 'public/global_dictionary.json';
const viPath = 'public/locales/vi.json';
const viTransPath = 'public/global_dictionary_translated_vi.json';

// 1. Standardize global_dictionary.json
const dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));
const newDictMap = new Map();
let catDups = 0;
let wordDups = 0;

dict.forEach(cat => {
    const catName = formatStr(cat.name, false);
    if (!newDictMap.has(catName)) {
        newDictMap.set(catName, { ...cat, name: catName, words: [] });
    }
    const catObj = newDictMap.get(catName);
    
    // Merge words and deduplicate
    const wMap = new Map();
    catObj.words.forEach(w => wMap.set(formatStr(w.word, false), w));
    
    cat.words.forEach(w => {
        const wordName = formatStr(w.word, false);
        if (wMap.has(wordName)) {
            wordDups++;
        } else {
            wMap.set(wordName, { ...w, word: wordName });
        }
    });
    
    catObj.words = Array.from(wMap.values());
});

const newDict = Array.from(newDictMap.values());
catDups = dict.length - newDict.length;

// 2. Standardize vi.json
const vi = JSON.parse(fs.readFileSync(viPath, 'utf8'));
const newVi = { categories: {}, words: {} };
let viCatDups = 0;
let viWordDups = 0;

Object.entries(vi.categories).forEach(([k, v]) => {
    const key = formatStr(k, false);
    const val = formatStr(v, true);
    if (newVi.categories[key]) viCatDups++;
    newVi.categories[key] = val; // Latest overwrites
});

Object.entries(vi.words).forEach(([k, v]) => {
    const key = formatStr(k, false);
    const val = formatStr(v, true);
    if (newVi.words[key]) viWordDups++;
    newVi.words[key] = val; // Latest overwrites
});

// 3. Generate global_dictionary_translated_vi.json
const newTransDict = newDict.map(cat => {
    const tName = newVi.categories[cat.name] || cat.name;
    const tWords = cat.words.map(w => ({
        ...w,
        word: newVi.words[w.word] || w.word
    }));
    return { ...cat, name: tName, words: tWords };
});

fs.writeFileSync(dictPath, JSON.stringify(newDict, null, 2));
fs.writeFileSync(viPath, JSON.stringify(newVi, null, 2));
fs.writeFileSync(viTransPath, JSON.stringify(newTransDict, null, 2));

console.log({
    originalDictLength: dict.length,
    newDictLength: newDict.length,
    removedCatDups: catDups,
    removedWordDups: wordDups,
    removedViCatKeys: viCatDups,
    removedViWordKeys: viWordDups
});
