const nodes = [
  { id: '1', data: { isCategory: false, isChunk: false, label: 'rap' } }
];
const edges = [];

const currentDropNodeIds = nodes
  .filter(n => n.data.isChunk || (!n.data.isCategory && !n.data.isChunk && !edges.some(e => e.source === n.id)))
  .map(n => n.id);

let spawnQueueIds = [];

// Simulate sync useEffect
const next = spawnQueueIds.filter(id => currentDropNodeIds.includes(id));
currentDropNodeIds.forEach(id => {
  if (!next.includes(id)) {
    next.push(id);
  }
});

let newSpawnQueueIds = spawnQueueIds;
if (next.length !== spawnQueueIds.length || next.some((id, i) => id !== spawnQueueIds[i])) {
  newSpawnQueueIds = next;
}

console.log("Result:", newSpawnQueueIds);
