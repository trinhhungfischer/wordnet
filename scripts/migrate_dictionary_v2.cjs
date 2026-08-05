const fs = require('fs');
const path = require('path');

const srcDataDir = path.join(__dirname, '..', 'src', 'data');
const inputPath = path.join(srcDataDir, 'global_dictionary.json');
const outputPath = path.join(srcDataDir, 'global_dictionary_v2.json');

console.log('Reading dictionary from:', inputPath);
const rawData = fs.readFileSync(inputPath, 'utf8');
const oldDict = JSON.parse(rawData);

const newCategories = {};
const newWords = {};

// Helper to choose the best icon
function resolveIcon(oldIcon, newIcon) {
    if (!oldIcon && !newIcon) return null;
    if (!oldIcon) return newIcon;
    if (!newIcon) return oldIcon;
    
    const oldHasExt = /\.(png|jpg|jpeg|svg|webp)$/i.test(oldIcon);
    const newHasExt = /\.(png|jpg|jpeg|svg|webp)$/i.test(newIcon);
    
    if (newHasExt && !oldHasExt) return newIcon;
    if (oldHasExt && !newHasExt) return oldIcon;
    
    // If both have extensions or neither do, prefer the longer one or just default to newIcon
    return newIcon.length > oldIcon.length ? newIcon : oldIcon;
}

oldDict.forEach(category => {
    // Collect word IDs/Names for this category
    const wordNames = [];
    
    category.words.forEach(wordObj => {
        const wordName = wordObj.word;
        wordNames.push(wordName);
        
        if (!newWords[wordName]) {
            // First time seeing this word
            newWords[wordName] = {
                icon: wordObj.icon,
                popularity: wordObj.popularity,
                originalBackupPopularity: wordObj.originalBackupPopularity
            };
        } else {
            // Word exists, resolve conflicts
            const existing = newWords[wordName];
            
            existing.icon = resolveIcon(existing.icon, wordObj.icon);
            existing.popularity = Math.max(existing.popularity || 0, wordObj.popularity || 0);
            existing.originalBackupPopularity = Math.max(existing.originalBackupPopularity || 0, wordObj.originalBackupPopularity || 0);
        }
    });
    
    // Store category without the full word objects
    newCategories[category.name] = {
        parents: category.parents || [],
        subcategories: category.subcategories || [],
        words: wordNames,
        popularity: category.popularity
    };
});

const v2Structure = {
    categories: newCategories,
    words: newWords
};

console.log('Writing V2 dictionary to:', outputPath);
const outputStr = JSON.stringify(v2Structure, null, 2);
fs.writeFileSync(outputPath, outputStr, 'utf8');

const oldStats = fs.statSync(inputPath);
const newStats = fs.statSync(outputPath);

console.log(`\n--- Migration Complete ---`);
console.log(`Total Categories: ${Object.keys(newCategories).length}`);
console.log(`Total Unique Words: ${Object.keys(newWords).length}`);
console.log(`Original size: ${(oldStats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`New size: ${(newStats.size / 1024 / 1024).toFixed(2)} MB`);
console.log(`Space saved: ${((oldStats.size - newStats.size) / oldStats.size * 100).toFixed(2)}%`);
