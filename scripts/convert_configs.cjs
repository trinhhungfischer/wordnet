const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  let data;
  try {
    data = JSON.parse(content);
  } catch (e) {
    console.error('Error parsing', filePath);
    return;
  }

  let modified = false;

  // 1. Process categories to remove chunks
  if (data.categories && Array.isArray(data.categories)) {
    data.categories.forEach(cat => {
      if (cat.words && Array.isArray(cat.words)) {
        cat.words.forEach(word => {
          if ('chunks' in word) {
            delete word.chunks;
            modified = true;
          }
        });
      }
    });
  }

  // 2. Process allWordEntries to convert chunks to new format
  if (data.allWordEntries && Array.isArray(data.allWordEntries)) {
    let newEntries = [];
    data.allWordEntries.forEach(entry => {
      if (entry.chunks && entry.chunks.length > 0) {
        // Cut word
        entry.chunks.forEach(chunk => {
          let chunkStr = typeof chunk === 'string' ? chunk : Object.keys(chunk)[0];
          let newEntry = { ...entry };
          delete newEntry.chunks;
          
          let parentStr = entry.fullWord || '';
          newEntry.parentWord = parentStr.charAt(0).toUpperCase() + parentStr.slice(1);
          newEntry.fullWord = chunkStr.charAt(0).toUpperCase() + chunkStr.slice(1);
          
          newEntries.push(newEntry);
          modified = true;
        });
      } else {
        // Uncut word
        let newEntry = { ...entry };
        if ('chunks' in newEntry) {
          delete newEntry.chunks;
          modified = true;
        }
        newEntries.push(newEntry);
      }
    });
    
    if (modified) {
      data.allWordEntries = newEntries;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    console.log('Converted:', filePath);
  } else {
    console.log('Skipped (already new format or no chunks):', filePath);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.json')) {
      processFile(fullPath);
    }
  }
}

const dirs = [
  path.join(__dirname, 'real_configs'),
  path.join(__dirname, 'public', 'levels')
];

dirs.forEach(walkDir);
