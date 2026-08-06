import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDictionary, InputCategory } from './build_vi_dictionary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log("Starting pipeline...");
  
  // Wait a little bit for build_vi_dictionary.ts to init its huge files
  // init() runs synchronously on import, so it should be done already!
  
  const inputPath = path.resolve(__dirname, '../temp_vi_categories_input.json');
  if (!fs.existsSync(inputPath)) {
    console.error("Input file not found. Run populate_vi_words.ts first.");
    process.exit(1);
  }

  console.log("Reading input categories...");
  const rawData = fs.readFileSync(inputPath, 'utf-8');
  const inputCategories: InputCategory[] = JSON.parse(rawData);

  console.log(`Processing ${inputCategories.length} categories...`);
  const finalDictionary = buildDictionary(inputCategories);
  
  // Sort by category name
  finalDictionary.sort((a, b) => a.name.localeCompare(b.name));

  // Sort words within each category alphabetically
  finalDictionary.forEach(cat => {
    cat.words.sort((a, b) => a.word.localeCompare(b.word));
  });

  const outputPath = path.resolve(__dirname, '../public/global_dictionary_vi.json');
  fs.writeFileSync(outputPath, JSON.stringify(finalDictionary, null, 2), 'utf-8');

  console.log(`Success! Final dictionary written to ${outputPath}`);
  console.log(`Total categories: ${finalDictionary.length}`);
  const totalWords = finalDictionary.reduce((sum, cat) => sum + cat.words.length, 0);
  console.log(`Total validated words: ${totalWords}`);
}

run();
