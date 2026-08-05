import fs from 'fs';

const path = './public/global_dictionary_vi.json';
const dict = JSON.parse(fs.readFileSync(path, 'utf8'));

let changedCount = 0;

function toTitleCase(str) {
    return str.split(' ').map(s => {
        if (s.length === 0) return s;
        return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    }).join(' ');
}

dict.forEach(c => {
    if (c.words) {
        c.words.forEach(w => {
            const original = w.word;
            w.word = toTitleCase(w.word);
            if (original !== w.word) {
                changedCount++;
            }
        });
    }
});

fs.writeFileSync(path, JSON.stringify(dict, null, 2), 'utf8');
console.log(`Converted ${changedCount} words to Title Case in ${path}`);
