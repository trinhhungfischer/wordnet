import fs from 'fs';
import path from 'path';
import nlp from 'compromise';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- ARGUMENT PARSING ---
const args = process.argv.slice(2);
let startLevel = 1;
let endLevel = 1;
let minPop = 0;
let targetProperNoun = -1; // -1 means auto-calculate from old tree
let inDir = '../level_configs';
let outDir = '../level_configs';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--start' && args[i + 1]) startLevel = parseInt(args[++i]);
  else if (args[i] === '--end' && args[i + 1]) endLevel = parseInt(args[++i]);
  else if (args[i] === '--minPop' && args[i + 1]) minPop = parseInt(args[++i]);
  else if (args[i] === '--targetProperNoun' && args[i + 1]) targetProperNoun = parseFloat(args[++i]);
  else if (args[i] === '--inDir' && args[i + 1]) inDir = args[++i];
  else if (args[i] === '--outDir' && args[i + 1]) outDir = args[++i];
}

console.log(`Starting Batch Magic Change from Level ${startLevel} to ${endLevel}`);
console.log(`minPopularity: ${minPop}, targetProperNoun: ${targetProperNoun === -1 ? 'Auto' : targetProperNoun}`);
console.log(`Input Directory: ${inDir}`);
console.log(`Output Directory: ${outDir}`);

const levelConfigsDir = path.isAbsolute(inDir) ? inDir : path.join(__dirname, inDir);
const outputConfigsDir = path.isAbsolute(outDir) ? outDir : path.join(__dirname, outDir);

if (!fs.existsSync(outputConfigsDir)) {
  fs.mkdirSync(outputConfigsDir, { recursive: true });
}

const dictionaryPath = path.join(__dirname, '../public/global_dictionary.json');

// Load Dictionary
console.log('Loading global dictionary...');
const globalDict = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'));

// --- GLOBAL MEMORY ---
const historyCategories: string[] = []; // max 150
const historyWords: string[] = []; // max 300

const MAX_CAT_HISTORY = 150;
const MAX_WORD_HISTORY = 300;

// --- Caching ---
const properNounCache = new Map<string, boolean>();
const hasProperNoun = (word: string) => {
  if (properNounCache.has(word)) return properNounCache.get(word)!;
  const result = nlp(word).has('#ProperNoun');
  properNounCache.set(word, result);
  return result;
};

const rootCache = new Map<string, string>();
const getRoot = (w: string) => {
  if (rootCache.has(w)) return rootCache.get(w)!;
  let r = nlp(w).compute('root').text('root');
  const result = (r ? r : w).toLowerCase().trim();
  rootCache.set(w, result);
  return result;
};

const getHistoryPenalty = (catName: string) => historyCategories.includes(catName.toLowerCase()) ? 1 : 0;
const getWordHistoryPenalty = (wordRoot: string) => historyWords.includes(wordRoot) ? 1 : 0;

const isDuplicateRoot = (root: string, seenRoots: Set<string>) => {
    if (seenRoots.has(root)) return true;
    for (const seen of seenRoots) {
        if ((root.startsWith(seen) || seen.startsWith(root)) && Math.abs(root.length - seen.length) <= 2) {
            return true;
        }
    }
    return false;
};

const getTreeSig = (catName: string, allCats: any[]): any => {
  const c = allCats.find((x: any) => x.category === catName);
  if (!c) return { numWords: 0, subcats: [], oldWords: [], oldHasIcon: false };
  const subcats = allCats.filter((x: any) => x.parentCategory === catName);
  const subSig = subcats.map((x: any) => getTreeSig(x.category, allCats));
  return { numWords: c.words.length, subcats: subSig, oldWords: c.words.map((w: any) => w.fullWord), oldHasIcon: !!c.icon };
};

const dictSigCache = new Map<string, any>();
const getDictSig = (catName: string): any => {
  const lowerName = catName.toLowerCase();
  if (dictSigCache.has(lowerName)) return dictSigCache.get(lowerName);

  const entry = globalDict.find((e: any) => e.name.toLowerCase() === lowerName);
  if (!entry) {
    dictSigCache.set(lowerName, { numWords: 0, subcats: [] });
    return dictSigCache.get(lowerName);
  }
  const subSig = entry.subcategories.map((sub: string) => getDictSig(sub));
  const result = { numWords: entry.words.length, subcats: subSig };
  dictSigCache.set(lowerName, result);
  return result;
};

const isFulfilled = (req: any, avail: any): boolean => {
  if (avail.numWords < req.numWords) return false;
  let availSubs = [...avail.subcats];
  for (const rSub of req.subcats) {
    const matchIdx = availSubs.findIndex(aSub => isFulfilled(rSub, aSub));
    if (matchIdx === -1) return false;
    availSubs.splice(matchIdx, 1);
  }
  return true;
};

// --- CHUNK AUTO CUT LOGIC ---
const createChunks = (word: string) => {
  const cleanWord = String(word).trim().toLowerCase();
  
  // GraphEditor inherited chunk logic doesn't check length, it always cuts.
  // We prioritize splitting by space if it exists, otherwise Math.floor(length/2) 
  // to match GraphEditor's behavior.
  const spaceIndex = cleanWord.indexOf(' ');
  if (spaceIndex !== -1) {
    return [cleanWord.slice(0, spaceIndex + 1), cleanWord.slice(spaceIndex + 1)];
  } else {
    // Match GraphEditor Math.floor
    const chunkLen = Math.floor(cleanWord.length / 2) || 1;
    return [cleanWord.substring(0, chunkLen), cleanWord.substring(chunkLen)];
  }
};

// --- IMPORT BRANCH LOGIC ---
const generateNewBranch = (
  catName: string,
  parentCategory: string | null,
  reqSig: any,
  outCategories: any[],
  outWordEntries: any[],
  targetProperNoun: number,
  targetPop: number,
  magicChangeRoots: Set<string>,
  wordMapping: Map<string, string>,
  chunkMapping: Map<string, string>,
  oldAllWordEntries: any[]
) => {
  const entry = globalDict.find((e: any) => e.name.toLowerCase() === catName.toLowerCase());
  if (!entry) return;

  const newCat = {
    category: entry.name,
    parentCategory: parentCategory,
    icon: reqSig?.oldHasIcon ? (entry.icon || entry.name.toLowerCase()) : null,
    words: [] as any[]
  };
  outCategories.push(newCat);

  let chosenSubcategories: string[] = [];
  let availSubs = [...entry.subcategories];
  availSubs.sort(() => Math.random() - 0.5);

  reqSig.subcats.forEach((rSub: any) => {
    const matchIdx = availSubs.findIndex(subName => {
        if (isDuplicateRoot(getRoot(subName), magicChangeRoots)) return false;
        return isFulfilled(rSub, getDictSig(subName));
    });
    if (matchIdx !== -1) {
      const chosenSub = availSubs[matchIdx];
      availSubs.splice(matchIdx, 1);
      chosenSubcategories.push(chosenSub);
      magicChangeRoots.add(getRoot(chosenSub));
      generateNewBranch(chosenSub, entry.name, rSub, outCategories, outWordEntries, targetProperNoun, targetPop, magicChangeRoots, wordMapping, chunkMapping, oldAllWordEntries);
    } else {
      // Fallback
      const fallbackIdx = availSubs.findIndex(subName => isFulfilled(rSub, getDictSig(subName)));
      if (fallbackIdx !== -1) {
          const chosenSub = availSubs[fallbackIdx];
          availSubs.splice(fallbackIdx, 1);
          chosenSubcategories.push(chosenSub);
          magicChangeRoots.add(getRoot(chosenSub));
          generateNewBranch(chosenSub, entry.name, rSub, outCategories, outWordEntries, targetProperNoun, targetPop, magicChangeRoots, wordMapping, chunkMapping, oldAllWordEntries);
      }
    }
  });

  let forcedWords = entry.words.filter((w: any) => 
    chosenSubcategories.some((sub: string) => sub.toLowerCase() === w.word.toLowerCase())
  );
  let otherWords = entry.words.filter((w: any) => 
    !chosenSubcategories.some((sub: string) => sub.toLowerCase() === w.word.toLowerCase())
  );

  otherWords.sort(() => Math.random() - 0.5);

  // Sort logic
  const wantsProper = targetProperNoun !== -1 ? targetProperNoun : autoProperRatio;
  
  otherWords.sort((a: any, b: any) => {
    const aPop = a.popularity || 50;
    const bPop = b.popularity || 50;
    const aMet = aPop >= minPop ? 1 : 0;
    const bMet = bPop >= minPop ? 1 : 0;
    if (aMet !== bMet) return bMet - aMet; // minPop first

    // History penalty across levels (lower is better)
    const aHist = getWordHistoryPenalty(getRoot(a.word));
    const bHist = getWordHistoryPenalty(getRoot(b.word));
    if (aHist !== bHist) return aHist - bHist;

    const aProper = hasProperNoun(a.word) ? 1 : 0;
    const bProper = hasProperNoun(b.word) ? 1 : 0;
    
    const wProp = wantsProper >= 0.5 ? 1 : 0;
    const aProperScore = Math.abs(aProper - wProp);
    const bProperScore = Math.abs(bProper - wProp);
    
    if (aProperScore !== bProperScore) return aProperScore - bProperScore; // lower is better
    return Math.abs(aPop - targetPop) - Math.abs(bPop - targetPop);
  });

  const anchor = otherWords[0];
  const anchorPop = anchor?.popularity || 0;

  if (anchor) {
    otherWords.sort((a: any, b: any) => {
      if (a === anchor) return -1;
      if (b === anchor) return 1;

      const aMet = (a.popularity || 0) >= minPop ? 1 : 0;
      const bMet = (b.popularity || 0) >= minPop ? 1 : 0;
      if (aMet !== bMet) return bMet - aMet;

      const aHist = getWordHistoryPenalty(getRoot(a.word));
      const bHist = getWordHistoryPenalty(getRoot(b.word));
      if (aHist !== bHist) return aHist - bHist;

      return Math.abs((a.popularity || 0) - anchorPop) - Math.abs((b.popularity || 0) - anchorPop);
    });
  }

  // Duplicate root filtering
  const uniqueWords: any[] = [];
  const duplicateWords: any[] = [];
  const tempSeenRoots = new Set<string>(magicChangeRoots);

  for (const w of forcedWords) {
    const root = getRoot(w.word);
    tempSeenRoots.add(root);
    uniqueWords.push(w);
  }

  for (const w of otherWords) {
    const root = getRoot(w.word);
    let isDuplicate = isDuplicateRoot(root, tempSeenRoots);

    if (!isDuplicate) {
      tempSeenRoots.add(root);
      uniqueWords.push(w);
    } else {
      duplicateWords.push(w);
    }
  }

  const numRequired = reqSig.numWords;
  let retries = 0;
  while (uniqueWords.length < numRequired && retries < 1000) {
      retries++;
      let randomCat = globalDict[Math.floor(Math.random() * globalDict.length)];
      if (!randomCat.words || randomCat.words.length === 0) continue;
      let randomWord = randomCat.words[Math.floor(Math.random() * randomCat.words.length)];
      let r = getRoot(randomWord.word);
      if (!isDuplicateRoot(r, tempSeenRoots)) {
          tempSeenRoots.add(r);
          uniqueWords.push(randomWord);
      }
  }

  while (uniqueWords.length < numRequired && duplicateWords.length > 0) {
    uniqueWords.push(duplicateWords.shift());
  }

  let wordsToImport = uniqueWords.slice(0, numRequired);

  wordsToImport.forEach((w: any, index: number) => {
    const wRoot = getRoot(w.word);
    magicChangeRoots.add(wRoot);
    
    // Add to word history
    historyWords.push(wRoot);
    if (historyWords.length > MAX_WORD_HISTORY) historyWords.shift();

    const oldWordStr = reqSig.oldWords && reqSig.oldWords[index];
    let oldEntry = null;
    let oldChunks: any[] = [];
    if (oldWordStr) {
      const oldWordLower = oldWordStr.toLowerCase();
      wordMapping.set(oldWordLower, w.word.toLowerCase());
      oldEntry = oldAllWordEntries?.find((e: any) => !e.parentWord && String(e.fullWord).toLowerCase() === oldWordLower);
      oldChunks = oldAllWordEntries?.filter((e: any) => e.parentWord && String(e.parentWord).toLowerCase() === oldWordLower) || [];
      
      // If parent entry doesn't exist but chunks do, inherit mechanics from the first chunk
      if (!oldEntry && oldChunks.length > 0) {
        oldEntry = oldChunks[0];
      }
    }

    const isSubcategory = chosenSubcategories.some((sub: string) => sub.toLowerCase() === w.word.toLowerCase());
    let chunks: string[] = [];
    if (!isSubcategory && oldWordStr) {
      if (oldChunks.length > 0) {
        chunks = createChunks(w.word);
      }
    }
    
    // Default values
    let isCracked = 0;
    let crackBreakNum = 0;
    let isLinked = 0;
    
    // Inherit from old word entry to preserve mechanics!
    if (oldEntry) {
      isCracked = oldEntry.IsCracked || 0;
      crackBreakNum = oldEntry.crackBreakNum || 0;
      isLinked = oldEntry.IsLinked || 0;
    }

    const parentWordStr = w.word.charAt(0).toUpperCase() + w.word.slice(1);
    const wordEntry = {
      ...(oldEntry || {}),
      fullWord: parentWordStr,
      parentWord: null,
      icon: null,
      IsCracked: isCracked,
      crackBreakNum: crackBreakNum,
      IsLinked: isLinked,
      linkedChunkWords: []
    };
    delete wordEntry.chunks;

    // Do NOT add subcategories to outWordEntries!
    if (!isSubcategory) {
      if (chunks.length === 0) {
        outWordEntries.push(wordEntry);
      } else {
        if (oldChunks.length > 0) {
          const oldC1 = oldChunks[0]?.fullWord.toLowerCase();
          const oldC2 = oldChunks[1]?.fullWord.toLowerCase();
          if (oldC1 && chunks.length > 0) chunkMapping.set(oldC1, chunks[0].toLowerCase());
          if (oldC2 && chunks.length > 1) chunkMapping.set(oldC2, chunks[1].toLowerCase());
        }
        chunks.forEach((chunkStr) => {
          let chunkOldEntry = oldChunks.find((e: any) => String(e.fullWord).toLowerCase() === chunkStr.toLowerCase());
          if (!chunkOldEntry && oldChunks.length > 0) chunkOldEntry = oldChunks[0];
          
          let cIsCracked = chunkOldEntry?.IsCracked || 0;
          let cCrackBreakNum = chunkOldEntry?.crackBreakNum || 0;
          let cIsLinked = chunkOldEntry?.IsLinked || 0;

          outWordEntries.push({
            ...(chunkOldEntry || {}),
            fullWord: chunkStr.charAt(0).toUpperCase() + chunkStr.slice(1),
            parentWord: parentWordStr,
            icon: null,
            IsCracked: cIsCracked,
            crackBreakNum: cCrackBreakNum,
            IsLinked: cIsLinked,
            linkedChunkWords: []
          });
        });
      }
    }

    newCat.words.push({
      fullWord: w.word.toLowerCase(),
      chunks: chunks,
      icon: null,
      IsCracked: 0,
      crackBreakNum: 0,
      IsLinked: 0,
      linkedChunkWords: []
    });
  });
};

// --- PROCESS LEVEL ---
for (let i = startLevel; i <= endLevel; i++) {
  const filePath = path.join(levelConfigsDir, `Level ${i}.json`);
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping Level ${i} (File not found)`);
    continue;
  }

  console.log(`Processing Level ${i}...`);
  const levelData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  const newCategories: any[] = [];
  const newAllWordEntries: any[] = [];
  const magicChangeRoots = new Set<string>();
  const wordMapping = new Map<string, string>(); // oldWordLowerCase -> newWordLowerCase
  const chunkMapping = new Map<string, string>(); // oldChunkLowerCase -> newChunkLowerCase

  const rootCategories = levelData.categories.filter((c: any) => !c.parentCategory);

  for (const root of rootCategories) {
    const sig = getTreeSig(root.category, levelData.categories);
    
    // Analyze old tree
    const allOldWords: string[] = [];
    const collectWords = (catName: string) => {
      const c = levelData.categories.find((x: any) => x.category === catName);
      if (c) {
        c.words.forEach((w: any) => allOldWords.push(w.fullWord));
        levelData.categories.filter((x: any) => x.parentCategory === catName).forEach((sub: any) => collectWords(sub.category));
      }
    };
    collectWords(root.category);

    let targetPop = 50;
    let autoProperRatio = 0;
    if (allOldWords.length > 0) {
      let totalPop = 0;
      let popCount = 0;
      let properCount = 0;
      
      allOldWords.forEach(wLabel => {
        const wStr = String(wLabel);
        if (hasProperNoun(wStr)) properCount++;
        let foundPop: number | null = null;
        for (const cat of globalDict) {
          const match = cat.words.find((w: any) => w.word.toLowerCase() === wStr.toLowerCase());
          if (match && match.popularity) {
            foundPop = match.popularity;
            break;
          }
        }
        if (foundPop !== null) {
          totalPop += foundPop;
          popCount++;
        }
      });
      if (popCount > 0) targetPop = totalPop / popCount;
      autoProperRatio = properCount / allOldWords.length;
    }

    // Find matches
    let matches = globalDict.filter((cat: any) => {
      if (historyCategories.includes(cat.name.toLowerCase())) return false; // Strict no-duplicate in same generation cycle
      if (isDuplicateRoot(getRoot(cat.name), magicChangeRoots)) return false;
      return isFulfilled(sig, getDictSig(cat.name));
    });

    if (matches.length === 0) {
       console.log(`Warning: No unused matches for tree ${root.category}, falling back to used matches`);
       matches = globalDict.filter((cat: any) => {
           if (isDuplicateRoot(getRoot(cat.name), magicChangeRoots)) return false;
           return isFulfilled(sig, getDictSig(cat.name));
       });
    }

    if (matches.length === 0) {
       console.log(`Warning: Strict root filtering failed for tree ${root.category}, falling back to any match`);
       matches = globalDict.filter((cat: any) => isFulfilled(sig, getDictSig(cat.name)));
    }

    if (matches.length === 0) {
       console.log(`Error: Could not find ANY match for ${root.category} in Level ${i}. Keeping old tree.`);
       // Copy old tree
       const copyOldTree = (catName: string) => {
           const c = levelData.categories.find((x: any) => x.category === catName);
           if (c) {
              newCategories.push(c);
              const subcatNames = levelData.categories.filter((x: any) => x.parentCategory).map((x: any) => x.category.toLowerCase());
              c.words.forEach((w: any) => {
                  const isSubcat = subcatNames.includes(w.fullWord.toLowerCase());
                  if (!isSubcat && !newAllWordEntries.some(e => String(e.fullWord) === String(w.fullWord))) {
                      newAllWordEntries.push(w);
                  }
              });
              levelData.categories.filter((x: any) => x.parentCategory === catName).forEach((sub: any) => copyOldTree(sub.category));
           }
       };
       copyOldTree(root.category);
       continue;
    }

    matches.sort(() => Math.random() - 0.5);

    const categoryScores = new Map<string, number>();
    matches.forEach((cat: any) => {
       let totalPop = 0;
       let properCount = 0;
       let wCount = 0;
       cat.words.forEach((w: any) => {
          if (w.popularity) { totalPop += w.popularity; wCount++; }
          if (hasProperNoun(w.word)) properCount++;
       });
       const avgPop = wCount > 0 ? totalPop / wCount : 50;
       const properRatio = cat.words.length > 0 ? properCount / cat.words.length : 0;
       const popDist = Math.abs(avgPop - targetPop);
       const tProper = targetProperNoun !== -1 ? targetProperNoun : autoProperRatio;
       const properDist = Math.abs(properRatio - tProper) * 50;
       categoryScores.set(cat.name, popDist + properDist);
    });

    matches.sort((a: any, b: any) => {
      const aPenalty = getHistoryPenalty(a.name);
      const bPenalty = getHistoryPenalty(b.name);
      if (aPenalty !== bPenalty) return aPenalty - bPenalty;

      if (minPop > 0) {
        const aCount = a.words.filter((w: any) => (w.popularity || 0) >= minPop).length;
        const bCount = b.words.filter((w: any) => (w.popularity || 0) >= minPop).length;
        if (aCount !== bCount) return bCount - aCount;
      }
      const scoreA = categoryScores.get(a.name) || 0;
      const scoreB = categoryScores.get(b.name) || 0;
      return scoreA - scoreB;
    });

    let chosenCat = matches[0];
    let pool = matches.filter(m => getHistoryPenalty(m.name) === getHistoryPenalty(matches[0].name));
    if (minPop > 0 && pool.length > 0) {
      const maxCount = pool[0].words.filter((w: any) => (w.popularity || 0) >= minPop).length;
      pool = pool.filter(m => {
        const count = m.words.filter((w: any) => (w.popularity || 0) >= minPop).length;
        return count >= maxCount * 0.7;
      });
    }

    const poolSize = Math.max(1, Math.floor(pool.length * 0.5));
    const randIndex = Math.floor(Math.random() * poolSize);
    chosenCat = pool[randIndex] || matches[0];

    magicChangeRoots.add(getRoot(chosenCat.name));
    historyCategories.push(chosenCat.name.toLowerCase());
    if (historyCategories.length > MAX_CAT_HISTORY) historyCategories.shift();

    generateNewBranch(chosenCat.name, null, sig, newCategories, newAllWordEntries, autoProperRatio, targetPop, magicChangeRoots, wordMapping, chunkMapping, levelData.allWordEntries || []);
  }

  levelData.categories = newCategories;
  levelData.allWordEntries = newAllWordEntries;

  // Remap mechanics (frozenBubbles, burstBubbles, etc.)
  const remapWordOrChunk = (w: string) => {
    if (!w) return w;
    const lower = w.toLowerCase();
    if (wordMapping.has(lower)) {
       const newWordLower = wordMapping.get(lower)!;
       return newWordLower.charAt(0).toUpperCase() + newWordLower.slice(1);
    }
    if (chunkMapping.has(lower)) {
       const newChunkLower = chunkMapping.get(lower)!;
       return newChunkLower.charAt(0).toUpperCase() + newChunkLower.slice(1);
    }
    return w;
  };

  if (levelData.bubbleSeparatorData?.linkedWords) {
    levelData.bubbleSeparatorData.linkedWords = levelData.bubbleSeparatorData.linkedWords.map((lw: string) => remapWordOrChunk(lw));
  }
  if (levelData.frozenBubbles) {
    levelData.frozenBubbles = levelData.frozenBubbles.map((fb: any) => ({ ...fb, word: remapWordOrChunk(fb.word) }));
  }
  if (levelData.burstBubbles) {
    levelData.burstBubbles = levelData.burstBubbles.map((bb: any) => ({ ...bb, word: remapWordOrChunk(bb.word) }));
  }
  if (levelData.backwardBubbles) {
    levelData.backwardBubbles = levelData.backwardBubbles.map((bw: any) => ({ ...bw, word: remapWordOrChunk(bw.word) }));
  }
  if (levelData.keyLockBubbles) {
    levelData.keyLockBubbles = levelData.keyLockBubbles.map((kl: any) => ({ ...kl, keyWord: remapWordOrChunk(kl.keyWord), lockWord: remapWordOrChunk(kl.lockWord) }));
  }
  if (levelData.bubbleChains) {
    levelData.bubbleChains = levelData.bubbleChains.map((bc: any) => ({
      ...bc,
      chainRootWord: remapWordOrChunk(bc.chainRootWord),
      linkList: bc.linkList ? bc.linkList.map((ll: any) => ({ ...ll, linkedWord: remapWordOrChunk(ll.linkedWord) })) : []
    }));
  }
  if (levelData.crypticBubbles) {
    levelData.crypticBubbles = levelData.crypticBubbles.map((cb: any) => {
      const lowerLabel = cb.word.toLowerCase();
      if (wordMapping.has(lowerLabel)) {
        const newWordLower = wordMapping.get(lowerLabel)!;
        const newWord = newWordLower.charAt(0).toUpperCase() + newWordLower.slice(1);
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
  if (levelData.screwLockBubbles) {
    levelData.screwLockBubbles = levelData.screwLockBubbles.map((sl: any) => ({
      ...sl,
      screwLockWord: remapWordOrChunk(sl.screwLockWord || sl.screwWord),
      screwDriverWords: (sl.screwDriverWords || []).map((sdw: string) => remapWordOrChunk(sdw))
    }));
  }
  if (levelData.crackedBubbles) {
    levelData.crackedBubbles = levelData.crackedBubbles.map((cb: any) => typeof cb === 'string' ? remapWordOrChunk(cb) : { ...cb, word: remapWordOrChunk(cb.word) });
  }
  if (levelData.linkedBubbles) {
    levelData.linkedBubbles = levelData.linkedBubbles.map((lb: any) => typeof lb === 'string' ? remapWordOrChunk(lb) : { ...lb, word: remapWordOrChunk(lb.word) });
  }

  // Deduplicate allWordEntries just in case
  const uniqueEntriesMap = new Map();
  levelData.allWordEntries.forEach((entry: any) => {
    const key = entry.parentWord ? `${String(entry.parentWord).toLowerCase()}_${String(entry.fullWord).toLowerCase()}` : `_${String(entry.fullWord).toLowerCase()}`;
    if (!uniqueEntriesMap.has(key)) {
      uniqueEntriesMap.set(key, entry);
    }
  });
  levelData.allWordEntries = Array.from(uniqueEntriesMap.values());

  const outFilePath = path.join(outputConfigsDir, `Level ${i}.json`);
  fs.writeFileSync(outFilePath, JSON.stringify(levelData, null, 2), 'utf8');
  console.log(`Saved Level ${i} to ${outFilePath}`);
}

console.log('Batch Magic Change completed successfully!');
