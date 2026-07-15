import { test, describe } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Mock UUID
let uuidCounter = 0;
const uuidv4 = () => `id-${uuidCounter++}`;

// --- Simulated Logic from GraphEditor ---

function loadDataIntoGraph(data) {
    const nodes = [];
    const edges = [];
    
    // Simulate Pass 3: Create word nodes
    data.categories.forEach(cat => {
        cat.words.forEach(w => {
            const wordLower = String(w.fullWord).toLowerCase();
            
            let gIndex = undefined;
            if (data.allWordEntries && Array.isArray(data.allWordEntries)) {
                const arrIdx = data.allWordEntries.findIndex(e => String(e.fullWord).toLowerCase() === wordLower);
                if (arrIdx !== -1) gIndex = arrIdx + 1;
            }

            const wordNode = {
                id: uuidv4(),
                type: 'custom',
                data: { label: wordLower, isCategory: false, isChunk: false, globalIndex: gIndex, originalWord: w.fullWord }
            };
            nodes.push(wordNode);

            // Chunks (flattened format)
            if (data.allWordEntries && Array.isArray(data.allWordEntries)) {
                data.allWordEntries.forEach((entry, arrIdx) => {
                    if (entry.parentWord && String(entry.parentWord).toLowerCase() === wordLower) {
                        const chunkNode = {
                            id: uuidv4(),
                            type: 'custom',
                            data: { label: String(entry.fullWord).toLowerCase(), isCategory: false, isChunk: true, globalIndex: arrIdx + 1, originalWord: entry.fullWord, parentWord: entry.parentWord }
                        };
                        nodes.push(chunkNode);
                        edges.push({ source: wordNode.id, target: chunkNode.id });
                    }
                });
            }
        });
    });

    return { nodes, edges };
}

function simulateMagicChange(nodes, edges, parentNodeId, chunk1Label, chunk2Label) {
    const parentNode = nodes.find(n => n.id === parentNodeId);
    if (!parentNode) return { nodes, edges };

    const inheritedGlobalIndex = parentNode.data.globalIndex;
    
    // Remove globalIndex from parent
    parentNode.data.globalIndex = undefined;

    const c1Id = uuidv4();
    const c2Id = uuidv4();

    // The key logic we fixed: inheritedGlobalIndex and inheritedGlobalIndex + 0.5
    nodes.push({
        id: c1Id,
        type: 'custom',
        data: { label: chunk1Label.toLowerCase(), isCategory: false, isChunk: true, globalIndex: inheritedGlobalIndex, originalWord: chunk1Label, parentWord: parentNode.data.originalWord }
    });
    nodes.push({
        id: c2Id,
        type: 'custom',
        data: { label: chunk2Label.toLowerCase(), isCategory: false, isChunk: true, globalIndex: inheritedGlobalIndex !== undefined ? inheritedGlobalIndex + 0.5 : undefined, originalWord: chunk2Label, parentWord: parentNode.data.originalWord }
    });

    edges.push({ source: parentNode.id, target: c1Id });
    edges.push({ source: parentNode.id, target: c2Id });

    return { nodes, edges };
}

function exportToJson(nodes, edges, originalData) {
    const spawnQueueIds = nodes
        .filter(n => typeof n.data.globalIndex === 'number')
        .sort((a, b) => a.data.globalIndex - b.data.globalIndex)
        .map(n => n.id);

    const newAllWordEntries = [];
    spawnQueueIds.forEach(id => {
        const n = nodes.find(n => n.id === id);
        let parentLabel = null;
        if (n.data.isChunk) {
            const edge = edges.find(e => e.target === id);
            if (edge) {
                const parent = nodes.find(p => p.id === edge.source);
                if (parent && parent.data.originalWord) {
                    parentLabel = parent.data.originalWord.charAt(0).toUpperCase() + parent.data.originalWord.slice(1);
                }
            }
        }
        
        newAllWordEntries.push({
            fullWord: n.data.originalWord,
            parentWord: parentLabel,
            icon: null,
            IsCracked: 0,
            crackBreakNum: 0,
            IsLinked: 0,
            linkedChunkWords: []
        });
    });

    return {
        ...originalData,
        allWordEntries: newAllWordEntries
    };
}


describe('Magic Change Indexing Tests', () => {

    test('Level 29 - Magic Change on a regular word should insert chunks sequentially', () => {
        const raw = fs.readFileSync('public/levels/Level 29.json', 'utf8');
        const data = JSON.parse(raw);
        
        let { nodes, edges } = loadDataIntoGraph(data);
        
        // Find Keyboard
        const keyboardNode = nodes.find(n => n.data.originalWord === 'Keyboard');
        assert.ok(keyboardNode, 'Keyboard should exist in nodes');
        const keyboardIndex = keyboardNode.data.globalIndex;
        assert.ok(keyboardIndex !== undefined, 'Keyboard should have a globalIndex initially');

        // Apply Magic Change: Keyboard -> Key + board
        ({ nodes, edges } = simulateMagicChange(nodes, edges, keyboardNode.id, 'Key', 'board'));

        const exportedData = exportToJson(nodes, edges, data);
        
        // Exclude properties that are default initialized and not strictly required for structural match
        const originalEntries = data.allWordEntries.map(e => ({ fullWord: e.fullWord, parentWord: e.parentWord }));
        const exportedEntries = exportedData.allWordEntries.map(e => ({ fullWord: e.fullWord, parentWord: e.parentWord }));

        // It should have 1 more entry
        assert.strictEqual(exportedEntries.length, originalEntries.length + 1, "Export should have 1 more entry than original");
        
        // Keyboard should be gone
        assert.ok(!exportedEntries.find(e => e.fullWord === 'Keyboard'), "Keyboard should no longer be in the queue");
        
        // Key and board should be present
        const keyChunk = exportedEntries.find(e => e.fullWord === 'Key');
        const boardChunk = exportedEntries.find(e => e.fullWord === 'board');
        assert.ok(keyChunk, "Key should be in the queue");
        assert.strictEqual(keyChunk.parentWord, 'Keyboard', "Key should have parentWord Keyboard");
        assert.ok(boardChunk, "board should be in the queue");
        assert.strictEqual(boardChunk.parentWord, 'Keyboard', "board should have parentWord Keyboard");

        // They should be inserted sequentially where Keyboard was
        const expectedIndex = keyboardIndex - 1; // 0-based array index
        assert.strictEqual(exportedEntries[expectedIndex].fullWord, 'Key', "Key should take Keyboard's old slot");
        assert.strictEqual(exportedEntries[expectedIndex + 1].fullWord, 'board', "board should immediately follow Key");
    });

    test('Level 19 - Magic Change should insert chunks sequentially and update queue', () => {
        const raw = fs.readFileSync('public/levels/Level 19.json', 'utf8');
        const data = JSON.parse(raw);
        
        let { nodes, edges } = loadDataIntoGraph(data);
        
        // Find Bunny
        const bunnyNode = nodes.find(n => n.data.originalWord === 'Bunny');
        assert.ok(bunnyNode, 'Bunny should exist in nodes');
        const bunnyIndex = bunnyNode.data.globalIndex;
        assert.ok(bunnyIndex !== undefined, 'Bunny should have a globalIndex initially');

        // Apply Magic Change: Bunny -> Bun + ny
        ({ nodes, edges } = simulateMagicChange(nodes, edges, bunnyNode.id, 'Bun', 'ny'));

        const exportedData = exportToJson(nodes, edges, data);
        
        // Verify output
        const originalEntries = data.allWordEntries.map(e => e.fullWord);
        const exportedEntries = exportedData.allWordEntries.map(e => e.fullWord);
        
        // It should have 1 more entry
        assert.strictEqual(exportedEntries.length, originalEntries.length + 1, "Export should have 1 more entry than original");
        
        // Bunny should be gone, replaced by Bun and ny
        assert.ok(!exportedEntries.includes('Bunny'), "Bunny should no longer be in the queue");
        assert.ok(exportedEntries.includes('Bun'), "Bun should be in the queue");
        assert.ok(exportedEntries.includes('ny'), "ny should be in the queue");

        // They should be inserted where Bunny was
        const expectedIndex = bunnyIndex - 1; // 0-based array index
        assert.strictEqual(exportedEntries[expectedIndex], 'Bun', "Bun should take Bunny's old slot");
        assert.strictEqual(exportedEntries[expectedIndex + 1], 'ny', "ny should immediately follow Bun");
    });

});
