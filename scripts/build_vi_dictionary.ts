import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FREQ_PATH = path.resolve(__dirname, '../public/locales/vn_word_frequencies.tsv');
const DICT_PATH = path.resolve(__dirname, '../public/locales/dictionary.txt');

const wordFrequencies = new Map<string, number>();
const dictionaryWords = new Set<string>();
let maxFrequency = 1;

// Load data synchronously upon import
function init() {
  try {
    const freqData = fs.readFileSync(FREQ_PATH, 'utf-8');
    const freqLines = freqData.split('\n');
    for (const line of freqLines) {
      const parts = line.trim().split('\t');
      // TSV format: rank, freq, word, POS
      if (parts.length >= 3) {
        const freq = parseInt(parts[1], 10);
        const word = parts[2].toLowerCase();
        if (!isNaN(freq)) {
          wordFrequencies.set(word, freq);
          if (freq > maxFrequency) {
            maxFrequency = freq;
          }
        }
      }
    }
  } catch (error) {
    console.error(`Failed to load frequencies from ${FREQ_PATH}:`, error);
  }

  try {
    const dictData = fs.readFileSync(DICT_PATH, 'utf-8');
    const dictLines = dictData.split('\n');
    for (const line of dictLines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.text) {
          dictionaryWords.add(parsed.text.toLowerCase());
        }
      } catch (e) {
        // Ignore invalid JSON lines
      }
    }
  } catch (error) {
    console.error(`Failed to load dictionary from ${DICT_PATH}:`, error);
  }
}

init();

export function validateWord(word: string): boolean {
  return dictionaryWords.has(word.toLowerCase());
}

export function calculatePopularity(word: string): number {
  const normalized = word.toLowerCase();
  
  if (!validateWord(normalized)) {
    return 0; // Not a valid word
  }

  const freq = wordFrequencies.get(normalized);
  if (freq === undefined) {
    return 15; // Valid word, but not in frequency list
  }

  if (freq <= 1) {
    return 15;
  }

  // Logarithmic scaling mapped to 0-100 range, min 15
  const logMax = Math.log(maxFrequency);
  const logFreq = Math.log(freq);
  const score = Math.round((logFreq / logMax) * 100);

  return Math.max(15, Math.min(100, score));
}

export interface InputCategory {
  name: string;
  words: string[];
}

export interface OutputWord {
  word: string;
  icon: string | null;
  popularity: number;
}

export interface OutputCategory {
  name: string;
  parents: string[];
  subcategories: string[];
  popularity: number;
  words: OutputWord[];
}

export function buildDictionary(inputCategories: InputCategory[]): OutputCategory[] {
  return inputCategories.map(category => {
    const validWords: OutputWord[] = [];
    let totalPopularity = 0;

    for (const w of category.words) {
      if (validateWord(w)) {
        const pop = calculatePopularity(w);
        validWords.push({
          word: w.toUpperCase(),
          icon: null,
          popularity: pop
        });
        totalPopularity += pop;
      }
    }

    const avgPopularity = validWords.length > 0
      ? Math.round(totalPopularity / validWords.length)
      : 0;

    return {
      name: category.name,
      parents: [],
      subcategories: [],
      popularity: avgPopularity,
      words: validWords
    };
  });
}
