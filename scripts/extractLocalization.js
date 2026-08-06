import fs from 'fs';
import path from 'path';

const originalPath = './public/global_dictionary.json';
const translatedPath = './public/global_dictionary_translated_vi.json';
const localesDir = './public/locales';
const outPath = path.join(localesDir, 'vi.json');

console.log('Reading original and translated files...');
const originalDict = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
const translatedDict = JSON.parse(fs.readFileSync(translatedPath, 'utf8'));

if (originalDict.length !== translatedDict.length) {
    console.error(`Mismatch in category count! Original: ${originalDict.length}, Translated: ${translatedDict.length}`);
    process.exit(1);
}

const viLocale = {
    categories: {},
    words: {}
};

let missingNames = 0;
let missingWords = 0;

for (let i = 0; i < originalDict.length; i++) {
    const origCat = originalDict[i];
    const transCat = translatedDict[i];

    // Map category name
    if (origCat.name && transCat.name) {
        viLocale.categories[origCat.name] = transCat.name;
    } else {
        missingNames++;
    }

    // Map words
    if (origCat.words && transCat.words) {
        for (let j = 0; j < origCat.words.length; j++) {
            const origWord = origCat.words[j].word;
            const transWord = transCat.words[j] ? transCat.words[j].word : null;
            if (origWord && transWord) {
                // If there is a duplicate word from another category, this will safely overwrite it.
                // Generally acceptable for global translation table.
                viLocale.words[origWord] = transWord;
            } else {
                missingWords++;
            }
        }
    }
}

if (!fs.existsSync(localesDir)) {
    fs.mkdirSync(localesDir, { recursive: true });
}

fs.writeFileSync(outPath, JSON.stringify(viLocale, null, 2), 'utf8');
console.log(`Successfully extracted localization map to ${outPath}`);
console.log(`Mapped ${Object.keys(viLocale.categories).length} unique categories.`);
console.log(`Mapped ${Object.keys(viLocale.words).length} unique words.`);
if (missingNames > 0 || missingWords > 0) {
    console.warn(`Warnings: Missing names: ${missingNames}, Missing words: ${missingWords}`);
}
