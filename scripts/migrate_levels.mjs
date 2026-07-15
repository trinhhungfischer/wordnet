import fs from 'fs';
import path from 'path';

const levelsDir = path.join(process.cwd(), 'public', 'levels');

function migrateLevelFile(filePath) {
  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);
    
    let isModified = false;

    // 1. Migrate categories (remove chunks)
    if (data.categories && Array.isArray(data.categories)) {
      data.categories.forEach(cat => {
        if (cat.words && Array.isArray(cat.words)) {
          cat.words.forEach(word => {
            if (word.hasOwnProperty('chunks')) {
              delete word.chunks;
              isModified = true;
            }
          });
        }
      });
    }

    // 2. Migrate allWordEntries (flatten chunks, remove uncut word if cut, remove chunks array)
    if (data.allWordEntries && Array.isArray(data.allWordEntries)) {
      const newAllWordEntries = [];
      let entryModified = false;
      
      data.allWordEntries.forEach(entry => {
        // If it's already new format (parentWord !== undefined), just delete chunks if present
        if (entry.hasOwnProperty('parentWord')) {
           if (entry.hasOwnProperty('chunks')) {
             delete entry.chunks;
             entryModified = true;
           }
           newAllWordEntries.push(entry);
           return;
        }

        // It's old format
        entryModified = true;
        
        if (entry.chunks && entry.chunks.length > 0) {
          // This is a cut word. Replace with its chunks.
          entry.chunks.forEach(chunkItem => {
            const chunkStr = typeof chunkItem === 'string' ? chunkItem : Object.keys(chunkItem)[0];
            if (!chunkStr) return;
            
            const newChunkEntry = { ...entry };
            newChunkEntry.fullWord = chunkStr.charAt(0).toUpperCase() + chunkStr.slice(1);
            newChunkEntry.parentWord = entry.fullWord.charAt(0).toUpperCase() + entry.fullWord.slice(1);
            delete newChunkEntry.chunks;
            
            newAllWordEntries.push(newChunkEntry);
          });
        } else {
          // Uncut word
          const newEntry = { ...entry };
          newEntry.parentWord = null;
          delete newEntry.chunks;
          newAllWordEntries.push(newEntry);
        }
      });
      
      if (entryModified) {
        data.allWordEntries = newAllWordEntries;
        isModified = true;
      }
    }
    
    // Remove spawnQueue if it exists
    if (data.hasOwnProperty('spawnQueue')) {
      delete data.spawnQueue;
      isModified = true;
    }

    if (isModified) {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ Migrated: ${path.basename(filePath)}`);
    } else {
      console.log(`⏭️  Skipped (Already migrated): ${path.basename(filePath)}`);
    }
  } catch (err) {
    console.error(`❌ Error migrating ${path.basename(filePath)}:`, err);
  }
}

function runMigration() {
  const files = fs.readdirSync(levelsDir).filter(f => f.endsWith('.json') && f !== 'index.json');
  console.log(`Found ${files.length} level files to migrate.`);
  
  files.forEach(file => {
    migrateLevelFile(path.join(levelsDir, file));
  });
  
  console.log('🎉 Migration complete!');
}

runMigration();
