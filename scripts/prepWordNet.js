import fs from 'fs';
import readline from 'readline';

function toTitleCase(str) {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

async function processFile() {
    const filePath = './Localization/words_vi.txt';
    const outPath = './scratch/shuffled_words_vi.json';
    
    if (!fs.existsSync('./scratch')) {
        fs.mkdirSync('./scratch', { recursive: true });
    }

    const uniqueWordsMap = new Map();

    const rl = readline.createInterface({
        input: fs.createReadStream(filePath),
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const obj = JSON.parse(line);
            let text = obj.text;
            if (!text) continue;

            // Filter rules
            // 1. Remove if it contains hyphen
            if (text.includes('-')) continue;
            
            // 2. Trim and check length
            text = text.trim();
            if (text.length < 2 || text.length > 16) continue;

            // 3. Must be valid characters (optional, let's just stick to length and no-hyphen)

            // Deduplicate case-insensitively
            const lower = text.toLowerCase();
            if (!uniqueWordsMap.has(lower)) {
                uniqueWordsMap.set(lower, toTitleCase(text));
            }
        } catch (e) {
            // Ignore parse errors on bad lines
        }
    }

    // Extract values
    let words = Array.from(uniqueWordsMap.values());
    console.log(`Extracted ${words.length} unique valid words from the dictionary.`);

    // Shuffle the array
    for (let i = words.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [words[i], words[j]] = [words[j], words[i]];
    }

    fs.writeFileSync(outPath, JSON.stringify(words, null, 2), 'utf8');
    console.log(`Saved shuffled words to ${outPath}`);
}

processFile();
