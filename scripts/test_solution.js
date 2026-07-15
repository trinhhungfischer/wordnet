import fs from 'fs';
import { calculateSolution } from './src/lib/solutionCalculator';

const levelStr = fs.readFileSync('public/levels/Level 20.json', 'utf8');
const levelData = JSON.parse(levelStr);

const nodes = levelData.nodes;
const edges = levelData.edges;

// Reconstruct spawn queue
const spawnQueueIds = [];
const linkedWords = levelData.bubbleSeparatorData?.linkedWords || [];
const isChained = (n) => {
  const label = String(n.data.label).toLowerCase();
  if (linkedWords.some(w => w.toLowerCase() === label)) return true;
  const childEdges = edges.filter(e => e.source === n.id);
  const chunkLabels = childEdges
    .map(e => nodes.find(c => c.id === e.target))
    .filter(c => c && c.data.isChunk)
    .map(c => String(c.data.label).toLowerCase());
  return chunkLabels.some(cLabel => linkedWords.some(w => w.toLowerCase() === cLabel));
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

console.log('Total nodes:', nodes.length);
console.log('Drop Queue length:', spawnQueueIds.length);
console.log('Chained words config:', linkedWords);
console.log('Break threshold:', levelData.bubbleSeparatorData?.breakThreshold);

const result = calculateSolution(nodes, edges, levelData, spawnQueueIds);
console.log('\n--- SOLUTION STEPS ---');
result.steps.forEach(s => {
  console.log('[' + s.type + '] ' + s.left + (s.right ? ' + ' + s.right + ' -> ' : '') + s.result + (s.text ? s.text : ''));
});
