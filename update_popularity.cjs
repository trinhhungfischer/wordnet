const fs = require('fs');
const https = require('https');

const DICT_PATH = './public/global_dictionary.json';

// Download top 10,000 words
https.get('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const topWords = data.split('\n').map(w => w.trim().toLowerCase()).filter(Boolean);
    const wordScores = new Map();
    
    // Assign score from 1.0 (most popular) to 0.0 (least popular in top 10k)
    // Actually, maybe 1.0 is highest popularity.
    // rank 0 => 1.0
    // rank 9999 => 0.0001
    topWords.forEach((word, index) => {
      wordScores.set(word, 1 - (index / topWords.length));
    });

    console.log(`Loaded ${topWords.length} popular words.`);

    // Read dictionary
    const dict = JSON.parse(fs.readFileSync(DICT_PATH, 'utf-8'));
    let updatedCount = 0;

    dict.forEach(category => {
      category.words.forEach(w => {
        const cleanWord = w.word.toLowerCase();
        // Base score is 0 for words not in top 10k
        let score = wordScores.get(cleanWord) || 0;
        w.popularity = score;
        updatedCount++;
      });
    });

    fs.writeFileSync(DICT_PATH, JSON.stringify(dict, null, 2));
    console.log(`Updated ${updatedCount} words with popularity scores.`);
  });
}).on('error', err => {
  console.error(err);
});
