const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const inputDir = path.join(__dirname, 'levels');
const outputDir = path.join(__dirname, 'level_configs');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const files = fs.readdirSync(inputDir);
let count = 0;

for (const file of files) {
  if (file.endsWith('.asset') && file.startsWith('Level ')) {
    const filePath = path.join(inputDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Remove Unity specific headers
    // Example:
    // %YAML 1.1
    // %TAG !u! tag:unity3d.com,2011:
    // --- !u!114 &11400000
    
    content = content.replace(/%YAML 1\.1\r?\n%TAG !u! tag:unity3d\.com,2011:\r?\n--- !u!\d+ &\d+\r?\n/, '');
    
    try {
      const doc = yaml.load(content);
      const data = doc.MonoBehaviour || doc;
      
      const jsonFileName = file.replace('.asset', '.json');
      const jsonPath = path.join(outputDir, jsonFileName);
      
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      count++;
    } catch (e) {
      console.error(`Error parsing ${file}:`, e.message);
    }
  }
}

console.log(`Successfully converted ${count} level files to JSON in the 'level_configs' folder.`);
