const fs = require('fs');
const path = require('path');

const PUBLIC_DICT_PATH = path.join(__dirname, '..', 'public', 'global_dictionary.json');
const SRC_DICT_PATH = path.join(__dirname, '..', 'src', 'data', 'global_dictionary.json');

// Cozy/Casual/Female-friendly category keywords
const cozyKeywords = [
  'flower', 'flowers', 'rose', 'roses', 'lily', 'lilies', 'tulip', 'tulips', 'blossom', 'blossoms', 'daisy', 'daisies', 'orchid', 'orchids', 'flora',
  'baking', 'bake', 'bakes', 'cake', 'cakes', 'dessert', 'desserts', 'cookie', 'cookies', 'sweet', 'sweets', 'candy', 'candies', 'chocolate', 'chocolates', 'pastry', 'pastries', 'pie', 'pies', 'bread', 'breads', 'bakery', 'bakeries', 'sugar',
  'cosmetics', 'makeup', 'lipstick', 'lipsticks', 'beauty', 'skincare', 'facial', 'salon', 'salons', 'spa', 'spas', 'hair', 'nail', 'nails', 'scent', 'scents', 'perfume', 'perfumes',
  'fashion', 'clothes', 'clothing', 'shoe', 'shoes', 'dress', 'dresses', 'skirt', 'skirts', 'outfit', 'outfits', 'accessory', 'accessories', 'jewelry', 'ring', 'rings', 'necklace', 'necklaces', 'bracelet', 'bracelets', 'earrings',
  'pet', 'pets', 'cat', 'cats', 'dog', 'dogs', 'puppy', 'puppies', 'kitten', 'kittens', 'hamster', 'hamsters', 'animal', 'animals', 'bird', 'birds', 'bunny', 'bunnies', 'rabbit', 'rabbits',
  'cafe', 'cafes', 'tea', 'teas', 'coffee', 'coffees', 'juice', 'juices', 'drink', 'drinks', 'soda', 'sodas', 'beverage', 'beverages',
  'romance', 'love', 'wedding', 'weddings', 'bride', 'brides', 'marriage', 'marriages', 'heart', 'hearts', 'kiss', 'kisses', 'date', 'dates',
  'home', 'homes', 'house', 'houses', 'kitchen', 'kitchens', 'bedroom', 'bedrooms', 'furniture', 'cozy', 'decor', 'household', 'households',
  'garden', 'gardens', 'plant', 'plants', 'herb', 'herbs', 'leaf', 'leaves', 'tree', 'trees', 'nature',
  'art', 'arts', 'craft', 'crafts', 'hobby', 'hobbies', 'paint', 'painting', 'paintings', 'sketch', 'sketches', 'knitting', 'sewing', 'drawing', 'drawings', 'needlework', 'quilt', 'quilts', 'yarn', 'yarns', 'crochet', 'needlecraft',
  'toy', 'toys', 'doll', 'dolls', 'teddy', 'teddies', 'play',
  'family', 'families', 'baby', 'babies', 'child', 'children', 'mother', 'mothers', 'father', 'fathers', 'sister', 'sisters', 'brother', 'brothers', 'parent', 'parents',
  'holiday', 'holidays', 'christmas', 'party', 'parties', 'festival', 'festivals', 'celebration', 'celebrations',
  'vegetable', 'vegetables', 'veggies', 'fruit', 'fruits', 'berry', 'berries', 'food', 'foods', 'ingredient', 'ingredients', 'spice', 'spices',
  'shape', 'shapes', 'color', 'colors',
  'tableware', 'kitchenware', 'cookware', 'utensil', 'utensils'
];

// Tech, Gaming, Slang, Corporate category keywords (Heavy Penalty - 70%)
const techAndFinanceKeywords = [
  'computer', 'computers', 'programming', 'software', 'code', 'codes', 'database', 'databases', 'network', 'networks', 'web', 'internet', 'technology', 'technologies', 'tech', 'digital',
  'finance', 'finances', 'stock', 'stocks', 'market', 'markets', 'invest', 'investment', 'investments', 'economy', 'economics', 'business', 'businesses', 'corporate', 'bank', 'banks', 'loan', 'loans', 'insurance', 'audit', 'auditing',
  'slang', 'meme', 'memes', 'viral', 'clout', 'flex', 'trendy', 'hashtag', 'hashtags', 'gaming', 'video game', 'video games', 'console', 'consoles'
];

// Dry/Academic/Technical/Military category keywords (Medium Penalty - 50%)
const academicKeywords = [
  'geometry', 'math', 'mathematics', 'algebra', 'calculus', 'arithmetic', 'equation', 'equations',
  'science', 'sciences', 'physics', 'chemistry', 'biology', 'anatomy', 'geology', 'astronomy', 'astrophysics', 'academic', 'scientific',
  'politics', 'government', 'governments', 'policy', 'policies', 'law', 'laws', 'court', 'courts', 'legal', 'senate', 'congress', 'federal', 'statecraft',
  'military', 'war', 'wars', 'weapon', 'weapons', 'army', 'armies', 'navy', 'navies', 'battle', 'battles', 'soldier', 'soldiers', 'combat', 'ammunition', 'tactical',
  'jargon', 'technical', 'industry', 'industries', 'engineering', 'machinery', 'tooling'
];

function hasMatchingToken(name, keywordList) {
  const tokens = name.toLowerCase().split(/[^a-z0-9]+/);
  return keywordList.some(k => tokens.includes(k));
}

function run() {
  if (!fs.existsSync(PUBLIC_DICT_PATH)) {
    console.error(`Error: Cannot find dictionary at ${PUBLIC_DICT_PATH}`);
    return;
  }

  console.log('Reading global dictionary...');
  const dict = JSON.parse(fs.readFileSync(PUBLIC_DICT_PATH, 'utf-8'));
  console.log(`Loaded ${dict.length} categories.`);

  // Step 1: Classify categories and collect word memberships
  const wordCategories = new Map(); // word -> Set of category names
  const categoryTypes = new Map();  // categoryName -> 'cozy' | 'tech' | 'academic' | 'neutral'

  dict.forEach(cat => {
    let type = 'neutral';
    if (hasMatchingToken(cat.name, cozyKeywords)) {
      type = 'cozy';
    } else if (hasMatchingToken(cat.name, techAndFinanceKeywords)) {
      type = 'tech';
    } else if (hasMatchingToken(cat.name, academicKeywords)) {
      type = 'academic';
    }
    categoryTypes.set(cat.name, type);

    cat.words.forEach(wObj => {
      const cleanWord = wObj.word.trim().toLowerCase();
      if (!wordCategories.has(cleanWord)) {
        wordCategories.set(cleanWord, new Set());
      }
      wordCategories.get(cleanWord).add(cat.name);
    });
  });

  // Step 2: Determine word classification globally (Cozy takes highest precedence)
  const wordClassifications = new Map(); // word -> type
  wordCategories.forEach((catSet, word) => {
    let hasCozy = false;
    let hasTech = false;
    let hasAcademic = false;
    catSet.forEach(catName => {
      const type = categoryTypes.get(catName);
      if (type === 'cozy') hasCozy = true;
      if (type === 'tech') hasTech = true;
      if (type === 'academic') hasAcademic = true;
    });

    if (hasCozy) {
      wordClassifications.set(word, 'cozy'); // Cozy takes precedence
    } else if (hasTech) {
      wordClassifications.set(word, 'tech');
    } else if (hasAcademic) {
      wordClassifications.set(word, 'academic');
    } else {
      wordClassifications.set(word, 'neutral');
    }
  });

  // Stats counters
  let cozyCats = 0, techCats = 0, academicCats = 0, neutralCats = 0;
  categoryTypes.forEach(type => {
    if (type === 'cozy') cozyCats++;
    else if (type === 'tech') techCats++;
    else if (type === 'academic') academicCats++;
    else neutralCats++;
  });

  console.log(`\nCategory classification stats:`);
  console.log(`- Cozy/Casual: ${cozyCats}`);
  console.log(`- Tech/Gaming/Finance: ${techCats}`);
  console.log(`- Academic/Dry: ${academicCats}`);
  console.log(`- Neutral: ${neutralCats}`);

  // Step 3: Apply popularity adjustments
  let boostedCount = 0;
  let penalizedCount = 0;
  let unchangedCount = 0;

  dict.forEach(cat => {
    let catTotalScore = 0;
    let catValidWords = 0;

    cat.words.forEach(wObj => {
      const cleanWord = wObj.word.trim().toLowerCase();
      const wordClass = wordClassifications.get(cleanWord);
      
      // Use originalBackupPopularity or fallback to popularity to start from clean state
      if (wObj.originalBackupPopularity === undefined) {
        wObj.originalBackupPopularity = wObj.popularity || 50.0;
      }
      
      const originalPop = wObj.originalBackupPopularity;

      if (wordClass === 'cozy') {
        if (originalPop < 50.0) {
          // Only boost cozy words that are Rare or higher (original popularity < 50)
          // Boost by 1.5x, capped at 79.0 to stay in the Standard/Normal range (never become Common > 80)
          const newPop = Math.min(79.0, originalPop * 1.5);
          wObj.popularity = parseFloat(newPop.toFixed(2));
          boostedCount++;
        } else {
          wObj.popularity = originalPop;
          unchangedCount++;
        }
      } else if (wordClass === 'tech') {
        // Tech words penalized heavily (70% reduction -> multiplier 0.3)
        const newPop = Math.max(0, originalPop * 0.3);
        wObj.popularity = parseFloat(newPop.toFixed(2));
        penalizedCount++;
      } else if (wordClass === 'academic') {
        // Academic words penalized moderately (50% reduction -> multiplier 0.5)
        const newPop = Math.max(0, originalPop * 0.5);
        wObj.popularity = parseFloat(newPop.toFixed(2));
        penalizedCount++;
      } else {
        wObj.popularity = originalPop;
        unchangedCount++;
      }

      if (wObj.popularity > 0) {
        catTotalScore += wObj.popularity;
        catValidWords++;
      }
    });

    // Recalculate average category popularity
    cat.popularity = catValidWords > 0 ? parseFloat((catTotalScore / catValidWords).toFixed(2)) : 0;
  });

  console.log(`\nWord popularity adjustment stats:`);
  console.log(`- Boosted (Cozy & Rare): ${boostedCount} word-entries`);
  console.log(`- Penalized (Tech/Academic): ${penalizedCount} word-entries`);
  console.log(`- Unchanged (Neutral/High Cozy): ${unchangedCount} word-entries`);

  // Step 4: Save updated dictionary to both files
  fs.writeFileSync(PUBLIC_DICT_PATH, JSON.stringify(dict, null, 2));
  console.log(`\nSuccessfully updated global dictionary in public: ${PUBLIC_DICT_PATH}`);

  if (fs.existsSync(path.dirname(SRC_DICT_PATH))) {
    fs.writeFileSync(SRC_DICT_PATH, JSON.stringify(dict, null, 2));
    console.log(`Successfully updated global dictionary in src/data: ${SRC_DICT_PATH}`);
  } else {
    console.warn(`Warning: src/data directory not found, skipped updating src copy.`);
  }
}

run();
