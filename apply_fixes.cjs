const fs = require('fs');
let code = fs.readFileSync('src/components/GraphEditor.tsx', 'utf8');

// 1. Delete setSpawnQueueIds wrapper
code = code.replace(/const setSpawnQueueIds = useCallback\(\(updater: string\[\] \| \(\(prev: string\[\]\) => string\[\]\)\) => \{[\s\S]*?\}, \[setNodes\]\);/, '');

// 2. Delete the useEffect for syncing spawnQueueIds
code = code.replace(/\/\/ Sync spawnQueueIds with nodes\/edges[\s\S]*?\}, \[nodes, edges\]\);/, '');

// 3. Update loadHistory
code = code.replace(/if \(parsed\.spawnQueueIds\) \{\s*setSpawnQueueIds\(parsed\.spawnQueueIds\);\s*\}/, 
`if (parsed.spawnQueueIds) {
            parsed.nodes.forEach((n) => {
              const idx = parsed.spawnQueueIds.indexOf(n.id);
              if (idx !== -1) n.data.globalIndex = idx + 1;
            });
          }`);

// 4. Update handleAddChild
code = code.replace(/const xOffset = siblingIndex === 0 \? 0 : \(siblingIndex % 2 === 0 \? 1 : -1\) \* Math.ceil\(siblingIndex \/ 2\) \* 150;\s*childNode = \{[\s\S]*?data: \{ label: childLabel, isCategory: false, isChunk \}\s*\};/, 
`const xOffset = siblingIndex === 0 ? 0 : (siblingIndex % 2 === 0 ? 1 : -1) * Math.ceil(siblingIndex / 2) * 150;
      const maxGlobalIndex = nodes.reduce((max, n) => Math.max(max, (n.data?.globalIndex) || 0), 0);
      childNode = {
        id: uuidv4(),
        type: 'custom',
        position: { x: parentNode.position.x + xOffset, y: parentNode.position.y + 120 },
        data: { label: childLabel, isCategory: false, isChunk, globalIndex: maxGlobalIndex + 1 }
      };`);

// 5. Update handleImportDictionary 
code = code.replace(/const createdCats = new Set<string>\(\);/, 
`const createdCats = new Set<string>();
    let nextGlobalIndex = nodes.reduce((max, n) => Math.max(max, (n.data?.globalIndex) || 0), 0) + 1;`);

code = code.replace(/importedNodes\.push\(\{\s*id: wordId,\s*type: 'custom',\s*position: \{ x: 0, y: 0 \},\s*data: \{ label: w\.word\.toLowerCase\(\), isCategory: false, icon: w\.icon \}\s*\}\);/,
`importedNodes.push({
            id: wordId,
            type: 'custom',
            position: { x: 0, y: 0 },
            data: { label: w.word.toLowerCase(), isCategory: false, icon: w.icon, globalIndex: nextGlobalIndex++ }
          });`);

code = code.replace(/if \(queueUpdates\.length > 0 \|\| queueInsertions\.length > 0\) \{[\s\S]*?return newQueue;\s*\}\);\s*\}/, '');

// 6. Update handleMagicChange
code = code.replace(/const usedCategories = new Set<string>\(\);/,
`const usedCategories = new Set<string>();
    let nextGlobalIndex = nodes.reduce((max, n) => Math.max(max, (n.data?.globalIndex) || 0), 0) + 1;`);

code = code.replace(/newImportedNodes\.push\(\{\s*id: wordId,\s*type: 'custom',\s*position: oldWordNode\?\.position \|\| \{ x: 0, y: 0 \},\s*data: \{ label: w\.word\.toLowerCase\(\), isCategory: false, icon: newIcon \}\s*\}\);/,
`newImportedNodes.push({
            id: wordId,
            type: 'custom',
            position: oldWordNode?.position || { x: 0, y: 0 },
            data: { label: w.word.toLowerCase(), isCategory: false, icon: newIcon, globalIndex: inheritedGlobalIndex !== undefined ? inheritedGlobalIndex : nextGlobalIndex++ }
          });`);

code = code.replaceAll(/data: \{ label: c1, isCategory: false, isChunk: true \}\}\);/g,
`data: { label: c1, isCategory: false, isChunk: true, globalIndex: nextGlobalIndex++ }});`);
code = code.replaceAll(/data: \{ label: c2, isCategory: false, isChunk: true \}\}\);/g,
`data: { label: c2, isCategory: false, isChunk: true, globalIndex: nextGlobalIndex++ }});`);

code = code.replace(/\/\/ Update spawnQueueIds to replace old word IDs with new word\/chunk IDs[\s\S]*?return newQueue;\s*\}\);/, '');

// 7. Update handleShuffleRange
code = code.replace(/setSpawnQueueIds\(prev => \{[\s\S]*?return newQueue;\s*\}\);/, 
`setNodes(nds => {
      const queue = nds.filter(n => typeof n.data?.globalIndex === 'number')
                       .sort((a,b) => (a.data?.globalIndex) - (b.data?.globalIndex));
      const sliceToShuffle = queue.slice(rawStart - 1, rawEnd);
      const indices = sliceToShuffle.map(n => n.data.globalIndex);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      return nds.map(n => {
        const sliceIdx = sliceToShuffle.findIndex(sn => sn.id === n.id);
        if (sliceIdx !== -1) {
          return { ...n, data: { ...n.data, globalIndex: indices[sliceIdx] } };
        }
        return n;
      });
    });`);

// 8. Update Drag and Drop
code = code.replace(/const oldIdx = spawnQueueIds\.indexOf\(draggedId\);\s*const newIdx = spawnQueueIds\.indexOf\(nodeId\);\s*if \(oldIdx !== -1 && newIdx !== -1\) \{[\s\S]*?\}\);\s*\}/,
`const draggedNode = nodes.find(n => n.id === draggedId);
                          const targetNode = nodes.find(n => n.id === nodeId);
                          if (draggedNode && targetNode && typeof targetNode.data.globalIndex === 'number') {
                            handleUpdateNodeIndex(draggedId, targetNode.data.globalIndex);
                          }`);

fs.writeFileSync('src/components/GraphEditor.tsx', code);
console.log('Successfully applied all changes');
