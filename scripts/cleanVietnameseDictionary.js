import fs from 'fs';

const dictPath = './public/global_dictionary_vi.json';
let dict = JSON.parse(fs.readFileSync(dictPath, 'utf8'));

const exactJunk = ["XI", "NHAN", "GIA", "LÁI", "TỐC", "ĐỘ", "TĂNG", "GIẢM", "NHIỆT", "THƯƠNG", "CỨU", "CẤP", "LỆNH", "CẢNH", "SÁT", "GIAO", "THÔNG", "BÁO", "HIỆU", "AN", "TOÀN"];
const exactJunkTitleCase = exactJunk.map(w => w.charAt(0) + w.slice(1).toLowerCase());
const allJunk = new Set([...exactJunk, ...exactJunkTitleCase]);

let wordsRemoved = 0;

dict.forEach(category => {
    // Filter malformed words
    category.words = category.words.filter(w => w && typeof w.word === 'string' && w.word.trim().length > 0);
    
    // Filter out specific junk words
    category.words = category.words.filter(w => {
        if (allJunk.has(w.word) || allJunk.has(w.word.toUpperCase())) {
            wordsRemoved++;
            return false;
        }
        return true;
    });

    // Heuristic: if a category name is "Lái Xe" and it has words "Xi" and "Nhan", maybe recombine them?
    // Actually just deleting them is fine because we have plenty of words.
    
    // Also delete any word that is 1 character long
    category.words = category.words.filter(w => {
        if (w.word.length <= 1) {
            wordsRemoved++;
            return false;
        }
        return true;
    });
});

fs.writeFileSync(dictPath, JSON.stringify(dict, null, 2), 'utf8');
console.log(`Clean up complete!`);
console.log(`Words completely removed (junk): ${wordsRemoved}`);
