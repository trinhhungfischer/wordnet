import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { calculateSolution } from '../src/lib/solutionCalculator.js';

const levelsDir = path.join(process.cwd(), 'public', 'real_levels');
const globalDict = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'public', 'global_dictionary.json'), 'utf8'));

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
  results.push('Level,Total Nodes,Spawn Queue Length,Solver Moves,Bonus Turns,Config Move Limit,Old Score,Old Label,Peak Congestion,Congestion Turns,Rarity Score,Mechanics Count,Move Tightness,Finetuned Score,Finetuned Label,Total Categories');

  for (let i = 0; i <= 2000; i++) {
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
      
      let peakCongestion = 0;
      let congestionTurns = 0;
      const maxBubbles = data.maxBubblesInScene || 20;
      const threshold = maxBubbles * 0.8;

      res.steps.forEach((step: any) => {
        const boardSize = step.boardState.length;
        if (boardSize > peakCongestion) peakCongestion = boardSize;
        if (boardSize >= threshold) congestionTurns++;
      });
      
      let rarityScore = 0;
      const wordNodes = nodes.filter(n => !n.data.isCategory && !n.data.isChunk);
      if (wordNodes.length > 0) {
        let ultraRare = 0; let veryRare = 0; let rare = 0; let common = 0;
        wordNodes.forEach(wn => {
          const wLabel = String(wn.data.label).toLowerCase();
          let foundPop: number | null = null;
          for (const cat of globalDict) {
            const match = cat.words.find((w: any) => w.word.toLowerCase() === wLabel);
            if (match && match.popularity) {
              foundPop = match.popularity;
              break;
            }
          }
          if (foundPop !== null) {
            if (foundPop < 15) ultraRare++;
            else if (foundPop < 30) veryRare++;
            else if (foundPop < 50) rare++;
            else if (foundPop > 80) common++;
          }
        });
        rarityScore = (ultraRare * 8) + (veryRare * 4) + (rare * 2);
        if (common > wordNodes.length * 0.7) rarityScore -= 10;
      }
      
      // Calculate Mechanics
      let mechanicsCount = 0;
      if (data.useBubbleSeparator === 1) mechanicsCount++;
      if (data.frozenBubbles && data.frozenBubbles.length > 0) mechanicsCount++;
      if (data.keyLockBubbles && data.keyLockBubbles.length > 0) mechanicsCount++;
      if (data.burstBubbles && data.burstBubbles.length > 0) mechanicsCount++;
      if (data.crypticBubbles && data.crypticBubbles.length > 0) mechanicsCount++;
      if (data.screwLockBubbles && data.screwLockBubbles.length > 0) mechanicsCount++;
      if (data.backwardBubbles && data.backwardBubbles.length > 0) mechanicsCount++;
      if (data.crackedBubbles && data.crackedBubbles.length > 0) mechanicsCount++;
      if (data.linkedBubbles && data.linkedBubbles.length > 0) mechanicsCount++;
      
      const configMoveLimit = data.moveLimit || 0;
      const moveTightness = configMoveLimit - res.recommendedMoveLimit;
      
      let rawScore = (
        nodes.length * 9.4 +
        peakCongestion * 4.7 +
        rarityScore * 0.9 -
        moveTightness * 2.1 -
        congestionTurns * 1.6 -
        358.1
      );
      // Scale down to 100-point format (Max was ~480, divide by 4.8)
      let finetunedScore = rawScore / 4.8;
      finetunedScore = Math.max(0, Math.round(finetunedScore * 10) / 10);
      
      let finetunedLabel = 'Expert';
      if (finetunedScore <= 35) finetunedLabel = 'Easy';
      else if (finetunedScore <= 58) finetunedLabel = 'Medium';
      else if (finetunedScore <= 67) finetunedLabel = 'Hard';
      
      const totalCategories = data.categories ? data.categories.length : 0;
      
      results.push(`Level ${i},${nodes.length},${spawnQueueIds.length},${res.recommendedMoveLimit},${res.bonusTurns},${configMoveLimit},${res.difficulty.score},${res.difficulty.label},${peakCongestion},${congestionTurns},${rarityScore},${mechanicsCount},${moveTightness},${finetunedScore},${finetunedLabel},${totalCategories}`);
    } catch (e: any) {
      console.error(`Error in Level ${i}:`, e.message);
      results.push(`Level ${i},ERROR,,,,,,,,,,,,,,`);
    }
  }

  const outPath = path.join(process.cwd(), 'analysis_scripts', '2026-06-26', 'Real_Levels_Difficulty_v3.csv');
  fs.writeFileSync(outPath, results.join('\n'));
  console.log('✅ Analysis complete. Output saved to ' + outPath);
}

runAnalysis();
