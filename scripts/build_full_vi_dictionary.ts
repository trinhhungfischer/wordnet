import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Load Data
const globalDictPath = path.resolve(__dirname, '../public/global_dictionary.json');
const viLocalesPath = path.resolve(__dirname, '../public/locales/vi.json');
const freqPath = path.resolve(__dirname, '../public/locales/vn_word_frequencies.tsv');
const viDictPath = path.resolve(__dirname, '../public/locales/dictionary.txt');
const outputPath = path.resolve(__dirname, '../public/global_dictionary_vi.json');

const globalDict: any[] = JSON.parse(fs.readFileSync(globalDictPath, 'utf-8'));
const viLocales = JSON.parse(fs.readFileSync(viLocalesPath, 'utf-8'));
const categoriesMap = viLocales.categories || {};
const wordsMap = viLocales.words || {};

// 2. Init Validation and Popularity logic
const wordFrequencies = new Map<string, number>();
const dictionaryWords = new Set<string>();
let maxFrequency = 1;

try {
  const freqData = fs.readFileSync(freqPath, 'utf-8');
  for (const line of freqData.split('\n')) {
    const parts = line.trim().split('\t');
    if (parts.length >= 3) {
      const freq = parseInt(parts[1], 10);
      const word = parts[2].toLowerCase();
      if (!isNaN(freq)) {
        wordFrequencies.set(word, freq);
        if (freq > maxFrequency) maxFrequency = freq;
      }
    }
  }
} catch (e) {
  console.error("Failed to load frequencies", e);
}

try {
  const dictData = fs.readFileSync(viDictPath, 'utf-8');
  for (const line of dictData.split('\n')) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed.text) {
        dictionaryWords.add(parsed.text.toLowerCase());
      }
    } catch (e) {}
  }
} catch (e) {
  console.error("Failed to load vi dictionary", e);
}

function validateWord(word: string): boolean {
  return dictionaryWords.has(word.toLowerCase());
}

function calculatePopularity(word: string): number {
  const normalized = word.toLowerCase();
  if (!validateWord(normalized)) return 0;
  const freq = wordFrequencies.get(normalized);
  if (freq === undefined || freq <= 1) return 15;
  const score = Math.round((Math.log(freq) / Math.log(maxFrequency)) * 100);
  return Math.max(15, Math.min(100, score));
}

// Helper to translate and standardize
function getViTranslation(engWord: string, map: any): string {
  const vi = map[engWord];
  if (vi) return vi;
  // If not found, fallback to English (assuming the game allows mixed, or we drop them. 
  // Let's keep english as fallback but mark it for easy filtering, actually let's just return the English word.
  return engWord;
}

function toTitleCase(str: string): string {
  if (!str) return str;
  return str.split(' ').map(s => {
      if (s.length === 0) return s;
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  }).join(' ');
}

// 3. Process
const fullViDict: any[] = [];
let droppedCategories = 0;
let translatedWordsCount = 0;
let droppedWordsCount = 0;

for (const cat of globalDict) {
  const viCatName = getViTranslation(cat.name, categoriesMap);
  
  const viParents = cat.parents.map((p: string) => getViTranslation(p, categoriesMap));
  const viSubcategories = cat.subcategories.map((s: string) => getViTranslation(s, categoriesMap));

  const validViWords: any[] = [];
  let totalPopularity = 0;

  for (const w of cat.words) {
    const viWordStr = getViTranslation(w.word, wordsMap);
    
    // Validate if the translated word is an actual Vietnamese word
    if (validateWord(viWordStr)) {
      const pop = calculatePopularity(viWordStr);
      validViWords.push({
        word: toTitleCase(viWordStr),
        icon: w.icon || null,
        popularity: pop
      });
      totalPopularity += pop;
      translatedWordsCount++;
    } else {
      // If it's an English fallback and isn't a valid Vietnamese word, it gets dropped
      droppedWordsCount++;
    }
  }

  // Only include category if it has at least one valid word
  if (validViWords.length > 0) {
    // Deduplicate words inside category by uppercase word
    const uniqueWords = new Map<string, any>();
    validViWords.forEach(w => uniqueWords.set(w.word, w));
    
    const finalWords = Array.from(uniqueWords.values());
    finalWords.sort((a, b) => a.word.localeCompare(b.word));

    const avgPopularity = Math.round(totalPopularity / validViWords.length);

    fullViDict.push({
      name: viCatName,
      parents: Array.from(new Set(viParents)).sort(),
      subcategories: Array.from(new Set(viSubcategories)).sort(),
      popularity: avgPopularity,
      words: finalWords
    });
  } else {
    droppedCategories++;
  }
}

// 4. Merge duplicate categories in case multiple English categories mapped to the same Vietnamese category
const mergedCategories = new Map<string, any>();

fullViDict.forEach(cat => {
    let existing = mergedCategories.get(cat.name);
    if (!existing) {
        existing = {
            name: cat.name,
            parents: new Set<string>(),
            subcategories: new Set<string>(),
            popularitySum: 0,
            popularityCount: 0,
            wordsMap: new Map<string, any>()
        };
        mergedCategories.set(cat.name, existing);
    }
    
    cat.parents.forEach((p: string) => existing.parents.add(p));
    cat.subcategories.forEach((s: string) => existing.subcategories.add(s));
    existing.popularitySum += cat.popularity;
    existing.popularityCount++;
    
    cat.words.forEach((w: any) => {
        existing.wordsMap.set(w.word, w);
    });
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

fs.writeFileSync(outputPath, JSON.stringify(finalDict, null, 2), 'utf-8');

console.log(`[build_full_vi_dictionary] Finished successfully!`);
console.log(`Total Categories generated: ${finalDict.length} (Dropped: ${droppedCategories})`);
console.log(`Total Valid Vietnamese Words mapped: ${translatedWordsCount} (Dropped invalid: ${droppedWordsCount})`);
