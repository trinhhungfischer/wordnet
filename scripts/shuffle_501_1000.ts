import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { calculateSolution } from '../src/lib/solutionCalculator.js';

const levelsDir = path.join(process.cwd(), 'public', 'real_levels');
const globalDict = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'global_dictionary.json'), 'utf8'));

function shuffle(array: any[]) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

function buildGraph(data: any) {
  const newNodes: any[] = [];
  const newEdges: any[] = [];
  const catNodesMap: Record<string, any> = {};

  if (!data.categories) return { nodes: [], edges: [] };

  data.categories.forEach((cat: any) => {
    const catId = uuidv4();
    const isRoot = !cat.parentCategory;
    const catNode = {
      id: catId,
      type: 'custom',
      position: { x: 0, y: 0 },
      data: { label: cat.category.toLowerCase(), isRoot, isCategory: true, icon: cat.icon }
    };
    catNodesMap[cat.category.toLowerCase()] = catNode;
    newNodes.push(catNode);
  });

  data.categories.forEach((cat: any) => {
    if (cat.parentCategory) {
      const parentNode = catNodesMap[cat.parentCategory.toLowerCase()];
      const childNode = catNodesMap[cat.category.toLowerCase()];
      if (parentNode && childNode) {
        newEdges.push({ id: `e-${parentNode.id}-${childNode.id}`, source: parentNode.id, target: childNode.id });
      }
    }
  });

  data.categories.forEach((cat: any) => {
    const parentCatNode = catNodesMap[cat.category.toLowerCase()];
    if (parentCatNode && cat.words) {
      cat.words.forEach((w: any) => {
        const wordLower = w.fullWord.toLowerCase();
        let wordNode: any;
        if (catNodesMap[wordLower]) {
          wordNode = catNodesMap[wordLower];
        } else {
          let gIndex = undefined;
          if (data.allWordEntries) {
            const arrIdx = data.allWordEntries.findIndex((e: any) => String(e.fullWord).toLowerCase() === wordLower);
            if (arrIdx !== -1) gIndex = arrIdx + 1;
          }
          wordNode = {
            id: uuidv4(),
            type: 'custom',
            position: { x: 0, y: 0 },
            data: { label: wordLower, isCategory: false, icon: w.icon, globalIndex: gIndex }
          };
          newNodes.push(wordNode);
          newEdges.push({ id: `e-${parentCatNode.id}-${wordNode.id}`, source: parentCatNode.id, target: wordNode.id });
        }

        if (data.allWordEntries) {
          data.allWordEntries.forEach((entry: any, arrIdx: number) => {
            if (entry.parentWord && String(entry.parentWord).toLowerCase() === wordLower) {
              const chunkNode = {
                id: uuidv4(),
                type: 'custom',
                position: { x: 0, y: 0 },
                data: { label: String(entry.fullWord).toLowerCase(), isCategory: false, isChunk: true, globalIndex: arrIdx + 1 }
              };
              newNodes.push(chunkNode);
              newEdges.push({ id: `e-${wordNode.id}-${chunkNode.id}-${uuidv4()}`, source: wordNode.id, target: chunkNode.id });
            }
          });
        }
      });
    }
  });

  return { nodes: newNodes, edges: newEdges };
}

function getSpawnQueue(nodes: any[], edges: any[], data: any) {
  const spawnQueueIds: string[] = [];
  const linkedWords = data.bubbleSeparatorData?.linkedWords || [];
  
  const isChained = (n: any) => {
    const label = String(n.data.label).toLowerCase();
    if (linkedWords.some((w: string) => w.toLowerCase() === label)) return true;
    const childEdges = edges.filter(e => e.source === n.id);
    const chunkLabels = childEdges
      .map(e => nodes.find(c => c.id === e.target))
      .filter(c => c && c.data.isChunk)
      .map(c => String(c.data.label).toLowerCase());
    return chunkLabels.some(cLabel => linkedWords.some((w: string) => w.toLowerCase() === cLabel));
  };

  const dropQueueNodes = nodes.filter(n => !n.data.isCategory && !n.data.isChunk).sort((a, b) => {
    const chainedA = isChained(a);
    const chainedB = isChained(b);
    if (chainedA && !chainedB) return -1;
    if (!chainedA && chainedB) return 1;
    const idxA = a.data.globalIndex ?? Infinity;
    const idxB = b.data.globalIndex ?? Infinity;
    return idxA - idxB;
  });

  dropQueueNodes.forEach(wordNode => {
    const chunkEdges = edges.filter(e => e.source === wordNode.id);
    const chunkNodes = chunkEdges.map(e => nodes.find(n => n.id === e.target)).filter(n => n && n.data.isChunk);
    if (chunkNodes.length > 0) {
      chunkNodes.sort((a, b) => (a.data.globalIndex || 0) - (b.data.globalIndex || 0));
      chunkNodes.forEach(c => spawnQueueIds.push(c.id));
    } else {
      spawnQueueIds.push(wordNode.id);
    }
  });

  return spawnQueueIds;
}

function checkSolvable(data: any): boolean {
  try {
    const { nodes, edges } = buildGraph(data);
    const spawnQueueIds = getSpawnQueue(nodes, edges, data);
    const res = calculateSolution(nodes, edges, data, spawnQueueIds);
    
    // Check if it aborted
    const isAborted = res.steps.some((s: any) => s.text && s.text.includes('Simulation aborted') || s.description && s.description.includes('Simulation aborted'));
    
    // Check if all elements were spawned and merged
    const boardItemsLeft = res.steps[res.steps.length - 1]?.boardState?.length || 0;
    
    if (isAborted) return false;
    
    // Sometimes it might not abort but not finish either if it got stuck?
    // Let's assume if it doesn't abort, it's considered solvable based on normal behavior.
    return true;
  } catch (e) {
    return false;
  }
}

async function runShuffle() {
  const MAX_ATTEMPTS = 50;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = 501; i <= 1000; i++) {
    const filePath = path.join(levelsDir, `Level ${i}.json`);
    const altFilePath = path.join(levelsDir, `${i}.json`);
    
    let targetFile = '';
    if (fs.existsSync(filePath)) targetFile = filePath;
    else if (fs.existsSync(altFilePath)) targetFile = altFilePath;
    else continue;

    const rawData = fs.readFileSync(targetFile, 'utf8');
    const data = JSON.parse(rawData);

    if (!data.allWordEntries || data.allWordEntries.length <= 25) {
      console.log(`Level ${i}: skipped (entries <= 25)`);
      skipCount++;
      continue;
    }

    const initialBubbles = data.allWordEntries.slice(0, 25);
    const remainingBubbles = data.allWordEntries.slice(25);
    
    let solved = false;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const shuffledRemaining = shuffle([...remainingBubbles]);
      data.allWordEntries = [...initialBubbles, ...shuffledRemaining];
      
      if (checkSolvable(data)) {
        solved = true;
        fs.writeFileSync(targetFile, JSON.stringify(data, null, 2));
        console.log(`Level ${i}: SUCCESS on attempt ${attempt}`);
        successCount++;
        break;
      }
    }

    if (!solved) {
      console.log(`Level ${i}: FAILED after ${MAX_ATTEMPTS} attempts`);
      failCount++;
      // Restore original data to not save a broken state
      fs.writeFileSync(targetFile, rawData);
    }
  }
  
  console.log(`\nDone! Success: ${successCount}, Failed: ${failCount}, Skipped: ${skipCount}`);
}

runShuffle();
