import fs from 'fs';
import path from 'path';

const dirs = [
  'public/level_configs',
  'public/real_levels',
  'public/level_configs_vi',
  'public/real_levels_vi'
];

dirs.forEach(dir => {
  const fullPath = path.resolve(dir);
  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath);
    const levelNames = files
      .filter(f => f.endsWith('.json') && f.startsWith('Level ') && f !== 'index.json')
      .map(f => f.replace('.json', ''));
      
    levelNames.sort((a, b) => {
      const matchA = a.match(/\d+/);
      const matchB = b.match(/\d+/);
      if (matchA && matchB) {
        return parseInt(matchA[0]) - parseInt(matchB[0]);
      }
      return a.localeCompare(b);
    });

    fs.writeFileSync(path.join(fullPath, 'index.json'), JSON.stringify(levelNames, null, 2));
    console.log(`Generated index.json for ${dir} with ${levelNames.length} levels.`);
  }
});
