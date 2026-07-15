const fs = require('fs');
const path = require('path');

const realLevelsDir = path.join(__dirname, '../public/real_levels');

function shuffle(array) {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

for (let i = 130; i <= 250; i++) {
  const filePath = path.join(realLevelsDir, `Level ${i}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`Level ${i} not found, skipping...`);
    continue;
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (data.allWordEntries && data.maxBubblesInScene !== undefined) {
    const splitIndex = data.maxBubblesInScene;
    
    // We only shuffle the elements from index `maxBubblesInScene` to the end
    if (splitIndex < data.allWordEntries.length) {
      const initialBubbles = data.allWordEntries.slice(0, splitIndex);
      const remainingBubbles = data.allWordEntries.slice(splitIndex);

      // Shuffle the remaining bubbles
      const shuffledRemaining = shuffle(remainingBubbles);

      // Re-assemble the array
      data.allWordEntries = [...initialBubbles, ...shuffledRemaining];

      // Write back to the file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`Shuffled Level ${i}`);
    } else {
      console.log(`Level ${i} maxBubblesInScene is larger than allWordEntries, skipping...`);
    }
  } else {
    console.log(`Level ${i} is missing allWordEntries or maxBubblesInScene, skipping...`);
  }
}
