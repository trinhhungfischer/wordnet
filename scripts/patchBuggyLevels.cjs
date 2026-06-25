const fs = require('fs');

const buggy = [173, 201, 216, 222, 227, 228, 231, 258, 294, 373, 386, 396, 418, 423, 449];

buggy.forEach(level => {
  const file = `public/real_levels/Level ${level}.json`;
  if (!fs.existsSync(file)) return;
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));

  const subcats = d.categories.filter(c => c.parentCategory);
  const subcatNames = subcats.map(c => c.category.toLowerCase());

  const getSafeWord = (word) => {
    if (!word) return word;
    const lower = word.toLowerCase();
    if (!subcatNames.includes(lower)) return word;

    const catObj = subcats.find(c => c.category.toLowerCase() === lower);
    if (catObj && catObj.words && catObj.words.length > 0) {
      const safeChild = catObj.words.find(cw => !subcatNames.includes(cw.fullWord.toLowerCase()));
      if (safeChild) {
        return safeChild.fullWord.charAt(0).toUpperCase() + safeChild.fullWord.slice(1);
      } else {
        return catObj.words[0].fullWord.charAt(0).toUpperCase() + catObj.words[0].fullWord.slice(1);
      }
    }
    return word;
  };

  if (d.frozenBubbles) {
    d.frozenBubbles = d.frozenBubbles.map(b => ({ ...b, word: getSafeWord(b.word) }));
  }
  if (d.burstBubbles) {
    d.burstBubbles = d.burstBubbles.map(b => ({ ...b, word: getSafeWord(b.word) }));
  }
  if (d.backwardBubbles) {
    d.backwardBubbles = d.backwardBubbles.map(b => ({ ...b, word: getSafeWord(b.word) }));
  }
  if (d.crackedBubbles) {
    d.crackedBubbles = d.crackedBubbles.map(b => typeof b === 'string' ? getSafeWord(b) : { ...b, word: getSafeWord(b.word) });
  }
  if (d.keyLockBubbles) {
    d.keyLockBubbles = d.keyLockBubbles.map(b => ({ ...b, keyWord: getSafeWord(b.keyWord), lockWord: getSafeWord(b.lockWord) }));
  }
  if (d.bubbleChains) {
    d.bubbleChains = d.bubbleChains.map(b => ({
      ...b,
      chainRootWord: getSafeWord(b.chainRootWord),
      linkList: (b.linkList || []).map(l => ({ ...l, linkedWord: getSafeWord(l.linkedWord) }))
    }));
  }
  if (d.screwLockBubbles) {
    d.screwLockBubbles = d.screwLockBubbles.map(b => ({
      ...b,
      screwLockWord: getSafeWord(b.screwLockWord || b.screwWord),
      screwDriverWords: (b.screwDriverWords || []).map(w => getSafeWord(w))
    }));
  }
  if (d.crypticBubbles) {
    d.crypticBubbles = d.crypticBubbles.map(cb => {
      const lowerLabel = cb.word.toLowerCase();
      const newWord = getSafeWord(cb.word);
      if (newWord.toLowerCase() !== lowerLabel) {
        const newRevealAtMerge = new Array(newWord.length).fill(0);
        const oldReveal = cb.revealAtMerge || [];
        for (let j = 0; j < Math.min(newWord.length, oldReveal.length); j++) {
          newRevealAtMerge[j] = oldReveal[j];
        }
        const { letters, ...rest } = cb;
        return { ...rest, word: newWord, revealAtMerge: newRevealAtMerge };
      }
      return cb;
    });
  }
  if (d.bubbleSeparatorData && d.bubbleSeparatorData.linkedWords) {
    d.bubbleSeparatorData.linkedWords = d.bubbleSeparatorData.linkedWords.map(w => getSafeWord(w));
  }

  fs.writeFileSync(file, JSON.stringify(d, null, 2));
  console.log(`Patched Level ${level}`);
});
