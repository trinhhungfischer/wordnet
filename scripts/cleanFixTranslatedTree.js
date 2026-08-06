import fs from 'fs';

const originalPath = './public/global_dictionary.json';
const translatedPath = './public/global_dictionary_translated_vi.json';
const mapPath = './public/locales/vi.json';

console.log('Reading files...');
const originalDict = JSON.parse(fs.readFileSync(originalPath, 'utf8'));
const translatedDict = JSON.parse(fs.readFileSync(translatedPath, 'utf8'));
const localeMap = JSON.parse(fs.readFileSync(mapPath, 'utf8')).categories;

// Create a case-insensitive map
const lowerMap = {};
for (const key in localeMap) {
    lowerMap[key.toLowerCase()] = localeMap[key];
}

let mappedCount = 0;
let caseFixedCount = 0;
let missingCount = 0;

for (let i = 0; i < originalDict.length; i++) {
    const origCat = originalDict[i];
    const transCat = translatedDict[i];

    if (origCat.parents && origCat.parents.length > 0) {
        transCat.parents = origCat.parents.map(parent => {
            const lowerParent = parent.toLowerCase();
            if (localeMap[parent]) {
                mappedCount++;
                return localeMap[parent];
            } else if (lowerMap[lowerParent]) {
                mappedCount++;
                caseFixedCount++;
                return lowerMap[lowerParent];
            } else {
                missingCount++;
                return parent;
            }
        });
    }

    if (origCat.subcategories && origCat.subcategories.length > 0) {
        transCat.subcategories = origCat.subcategories.map(sub => {
            const lowerSub = sub.toLowerCase();
            if (localeMap[sub]) {
                mappedCount++;
                return localeMap[sub];
            } else if (lowerMap[lowerSub]) {
                mappedCount++;
                caseFixedCount++;
                return lowerMap[lowerSub];
            } else {
                missingCount++;
                return sub;
            }
        });
    }
}

fs.writeFileSync(translatedPath, JSON.stringify(translatedDict, null, 2), 'utf8');
console.log(`Successfully rebuilt and updated ${translatedPath} from source.`);
console.log(`Total exact matches: ${mappedCount}`);
console.log(`Fixed via case-insensitive matching: ${caseFixedCount}`);
console.log(`Still missing/unmapped: ${missingCount}`);
