const fs = require('fs');
const https = require('https');

const DICT_PATH = 'e:/3HP-Project/wordnet tool/public/global_dictionary.json';

const fetchFrequency = (word) => {
  return new Promise((resolve) => {
    // encodeURIComponent handles spaces, but datamuse works best with single words
    // for multi-words like "Food & Drinks", we will just take the first word "Food" or skip.
    // Let's just query it as is
    const cleanWord = word.replace(/[^a-zA-Z0-9_ ]/g, '').trim().split(' ')[0]; 
    if (!cleanWord) return resolve(0);

    const url = `https://api.datamuse.com/words?sp=${encodeURIComponent(cleanWord)}&md=f&max=1`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.length > 0 && json[0].tags) {
            const fTag = json[0].tags.find(t => t.startsWith('f:'));
            if (fTag) {
              return resolve(parseFloat(fTag.substring(2)));
            }
          }
          resolve(0);
        } catch (e) {
          resolve(0);
        }
      });
    }).on('error', () => resolve(0));
  });
};

async function run() {
  const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));
  console.log(`Loaded dictionary with ${dict.length} categories.`);
  
  for (let i = 0; i < dict.length; i++) {
    const cat = dict[i];
    // Score category
    cat.popularity = await fetchFrequency(cat.name);
    
    // Score words
    for (let j = 0; j < cat.words.length; j++) {
      cat.words[j].popularity = await fetchFrequency(cat.words[j].word);
    }
    
    console.log(`Processed category: ${cat.name}`);
  }

  fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2));
  console.log('Successfully updated global_dictionary.json with Datamuse popularity scores!');
}

run();
