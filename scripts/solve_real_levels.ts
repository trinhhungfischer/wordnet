import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { calculateSolution } from '../src/lib/solutionCalculator.js';

const levelsDir = path.join(process.cwd(), 'public', 'real_levels');

function buildGraph(data: any) {
  const newNodes: any[] = [];
  const newEdges: any[] = [];
  const catNodesMap: Record<string, any> = {};

  if (!data.categories) return { nodes: [], edges: [] };

  // Pass 1: Categories
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

  // Pass 2: Connect nested
  data.categories.forEach((cat: any) => {
    if (cat.parentCategory) {
      const parentNode = catNodesMap[cat.parentCategory.toLowerCase()];
      const childNode = catNodesMap[cat.category.toLowerCase()];
      if (parentNode && childNode) {
        newEdges.push({ id: `e-${parentNode.id}-${childNode.id}`, source: parentNode.id, target: childNode.id });
      }
    }
  });

  // Pass 3: Words and Chunks
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

        // Handle chunks
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

function runAnalysis() {
  const results: string[] = [];
  results.push('Level,Total Nodes,Spawn Queue Length,Solver Moves,Bonus Turns,Recommended Moves,Difficulty Score,Difficulty Label');

  for (let i = 0; i <= 1000; i++) {
    const filePath = path.join(levelsDir, `Level ${i}.json`);
    const altFilePath = path.join(levelsDir, `${i}.json`);
    
    let targetFile = '';
    if (fs.existsSync(filePath)) targetFile = filePath;
    else if (fs.existsSync(altFilePath)) targetFile = altFilePath;
    else continue;

    try {
      const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));
      const { nodes, edges } = buildGraph(data);
      const spawnQueueIds = getSpawnQueue(nodes, edges, data);
      
      const res = calculateSolution(nodes, edges, data, spawnQueueIds);
      
      results.push(`Level ${i},${nodes.length},${spawnQueueIds.length},${res.totalMoves},${res.bonusTurns},${res.recommendedMoveLimit},${res.difficulty.score},${res.difficulty.label}`);
    } catch (e: any) {
      console.error(`Error in Level ${i}:`, e.message);
      results.push(`Level ${i},ERROR,,,,,,`);
    }
  }

  fs.writeFileSync('Real_Levels_Difficulty.csv', results.join('\n'), 'utf8');
  console.log('✅ Wrote Real_Levels_Difficulty.csv');
}

runAnalysis();
