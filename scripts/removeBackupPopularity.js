import fs from 'fs';

const paths = [
    './public/global_dictionary.json',
    './public/global_dictionary_vi.json'
];

paths.forEach(p => {
    try {
        if (!fs.existsSync(p)) return;
        const dict = JSON.parse(fs.readFileSync(p, 'utf8'));
        let removedCount = 0;
        
        dict.forEach(c => {
            if (c.originalBackupPopularity !== undefined) {
                delete c.originalBackupPopularity;
                removedCount++;
            }
            if (c.words) {
                c.words.forEach(w => {
                    if (w.originalBackupPopularity !== undefined) {
                        delete w.originalBackupPopularity;
                        removedCount++;
                    }
                });
            }
        });
        
        if (removedCount > 0) {
            fs.writeFileSync(p, JSON.stringify(dict, null, 2), 'utf8');
            console.log(`Removed ${removedCount} instances of originalBackupPopularity from ${p}`);
        } else {
            console.log(`No originalBackupPopularity found in ${p}`);
        }
    } catch(e) {
        console.error(`Error processing ${p}:`, e.message);
    }
});
