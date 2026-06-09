import type { Node, Edge } from '@xyflow/react';

export interface MergeStep {
  id: string;
  type: 'chunk' | 'category' | 'event' | 'success';
  left: string;
  right: string;
  result: string;
  text?: string;
  isComboBonus: boolean;
  boardState: string[];
  moveIndex: number;
}

export interface SolutionResult {
  steps: MergeStep[];
  totalMoves: number;
  bonusTurns: number;
  recommendedMoveLimit: number;
  difficulty: {
    score: number;
    label: string;
    factors: string[];
    color: string;
  };
}

export function calculateSolution(nodes: Node[], edges: Edge[], levelData: any, spawnQueueIds: string[] = []): SolutionResult {
  const steps: MergeStep[] = [];
  let moveCount = 0;
  let bonusTurns = 0;
  let stepIdCounter = 1;

  const addStep = (type: 'chunk' | 'category' | 'event' | 'success', left: string, right: string, result: string, text?: string) => {
    let currentMoveIndex = moveCount;
    if (type !== 'event' && type !== 'success') {
      moveCount++;
      currentMoveIndex = moveCount;
      const isComboBonus = moveCount % 5 === 0;
      if (isComboBonus) bonusTurns++;
      
      steps.push({
        id: `step-${stepIdCounter++}`,
        type,
        left,
        right,
        result,
        text,
        isComboBonus,
        boardState: [...board],
        moveIndex: currentMoveIndex
      });
    } else {
      steps.push({
        id: `step-${stepIdCounter++}`,
        type,
        left: '',
        right: '',
        result: '',
        text,
        isComboBonus: false,
        boardState: [...board],
        moveIndex: currentMoveIndex
      });
    }
  };

  const linkedWords = new Set((levelData?.bubbleSeparatorData?.linkedWords || []).map((w: string) => w.toLowerCase()));
  const breakThreshold = levelData?.bubbleSeparatorData?.breakThreshold || 3;
  let chainBroken = false;

  const crackBreakMap: Record<string, number> = {};
  if (levelData?.allWordEntries) {
    levelData.allWordEntries.forEach((e: any) => {
      const wordName = e.parentWord ? String(e.parentWord).toLowerCase() : String(e.fullWord).toLowerCase();
      if (e.crackBreakNum > 0) {
        crackBreakMap[wordName] = e.crackBreakNum;
      }
    });
  }

  const catNodes = nodes.filter(n => n.data.isCategory);
  
  // Maps for quick lookup
  const wordToChunks = new Map<string, string[]>(); // Word ID -> Chunk IDs
  const catToWords = new Map<string, string[]>();   // Cat ID -> Word IDs
  
  const wordNodes = nodes.filter(n => !n.data.isCategory && !n.data.isChunk);
  wordNodes.forEach(w => {
    const chunkEdges = edges.filter(e => e.source === w.id);
    const chunkIds = chunkEdges.map(e => e.target);
    if (chunkIds.length > 0) {
      wordToChunks.set(w.id, chunkIds);
    }
  });

  catNodes.forEach(cat => {
    const wordEdges = edges.filter(e => e.source === cat.id);
    const wIds = wordEdges.map(e => e.target);
    catToWords.set(cat.id, wIds);
  });

  let completedCategoriesCount = 0;

  const isWordLocked = (w: string) => {
    w = w.toLowerCase();
    if (crackBreakMap[w] && completedCategoriesCount < crackBreakMap[w]) return true;
    if (linkedWords.has(w) && !chainBroken && levelData?.useBubbleSeparator === 1) return true;
    return false;
  };

  // Simulator State
  const maxBubbles = levelData?.maxBubblesInScene || 20;
  let board: string[] = []; // Array of node IDs currently on the board
  let queueIndex = 0;
  const resolvedWords = new Set<string>(); // Word IDs that have been merged from chunks
  const resolvedCategories = new Set<string>(); // Cat IDs that have been completed

  addStep('event', '', '', '', '🎮 Game Start');

  const doDrops = (count: number) => {
    const newlyDropped: string[] = [];
    let dropped = 0;
    while (dropped < count && board.length < maxBubbles && queueIndex < spawnQueueIds.length) {
      const nextId = spawnQueueIds[queueIndex];
      board.push(nextId);
      newlyDropped.push(nextId);
      queueIndex++;
      dropped++;
    }
    if (newlyDropped.length > 0) {
      const dropNames = newlyDropped.map(id => String(nodes.find(n => n.id === id)?.data.label));
      addStep('event', '', '', '', `🎈 Dropped ${newlyDropped.length} bubbles: ${dropNames.join(', ')}`);
      return true;
    }
    return false;
  };

  // 1. Initial Spawn (fill board up to maxBubbles)
  doDrops(maxBubbles);

  // Simulator Loop
  while (true) {
    let progress = false;

    // 2. Try Merges
    let mergedSomething = false;
    do {
      mergedSomething = false;

      // Try Chunk -> Word Merge
      for (const [wordId, chunkIds] of wordToChunks.entries()) {
        if (!resolvedWords.has(wordId) && chunkIds.every(cid => board.includes(cid))) {
          // All chunks are on board! Merge them into Word.
          
          // Update Board State BEFORE generating steps so steps capture the new board state
          board = board.filter(id => !chunkIds.includes(id)); // Remove chunks
          board.push(wordId); // Add word to board
          resolvedWords.add(wordId);
          mergedSomething = true;
          progress = true;

          // Generate Merge Steps for Chunks
          const chunks = chunkIds.map(cid => String(nodes.find(n => n.id === cid)?.data.label));
          let currentString = chunks[0];
          for (let i = 1; i < chunks.length; i++) {
            const nextChunk = chunks[i];
            const mergedString = currentString + nextChunk;
            addStep('chunk', currentString, nextChunk, mergedString);
            
            // Rule: Merging 2 chunks drops 1 new bubble
            if (doDrops(1)) {
              progress = true;
            }
            
            currentString = mergedString;
          }
        }
      }

      // Try Word -> Category Merge
      for (const [catId, wordIds] of catToWords.entries()) {
        if (!resolvedCategories.has(catId)) {
          // Check if all required words are on the board
          const allWordsOnBoard = wordIds.every(wid => board.includes(wid));
          if (allWordsOnBoard) {
            // Check if all required words are unlocked
            const allWordsUnlocked = wordIds.every(wid => {
              const label = String(nodes.find(n => n.id === wid)?.data.label);
              return !isWordLocked(label);
            });

            if (allWordsUnlocked) {
              // We do NOT remove words from the board yet!
              // Instead, we merge them step by step.
              const catLabel = String(nodes.find(n => n.id === catId)?.data.label);
              const words = wordIds.map(wid => String(nodes.find(n => n.id === wid)?.data.label));
              
              if (words.length > 1) {
                let currentBubbleStr = words[0];
                let currentBubbleId = wordIds[0];

                for (let i = 1; i < words.length; i++) {
                  const nextWordStr = words[i];
                  const nextWordId = wordIds[i];
                  const mergedString = `${currentBubbleStr} | ${nextWordStr}`;
                  const mergedId = `temp_[${mergedString}]_[${catId}]`;

                  // Update Board State: remove the two parts, add the combined part
                  board = board.filter(id => id !== currentBubbleId && id !== nextWordId);
                  board.push(mergedId);

                  addStep('category', currentBubbleStr, nextWordStr, mergedString);

                  currentBubbleStr = mergedString;
                  currentBubbleId = mergedId;
                }

                // Final step: remove the fully combined bubble from board
                board = board.filter(id => id !== currentBubbleId);
              }

              const isSubCategory = edges.some(e => e.target === catId && catNodes.some(n => n.id === e.source));
              if (isSubCategory) {
                board.push(catId);
              }

              resolvedCategories.add(catId);
              completedCategoriesCount++;
              mergedSomething = true;
              progress = true;

              addStep('success', '', '', '', `✨ Completed Category: ${catLabel.toUpperCase()}`);

              // Rule: Category merge drops 4 bubbles, OR 3 if it's a sub-category
              const dropCount = isSubCategory ? 3 : 4;
              if (doDrops(dropCount)) {
                progress = true;
              }

              // Check Ice Events
              Object.keys(crackBreakMap).forEach(w => {
                if (crackBreakMap[w] === completedCategoriesCount) {
                  addStep('event', '', '', '', `🧊 Ice broken on "${w}" (${completedCategoriesCount} categories broken)`);
                }
              });

              // Check Chain Events
              if (levelData?.useBubbleSeparator === 1 && !chainBroken) {
                if (completedCategoriesCount === breakThreshold) {
                  addStep('event', '', '', '', `⛓️ Chain destroyed! (${completedCategoriesCount}/${breakThreshold} categories broken)`);
                  chainBroken = true;
                }
              }
            }
          }
        }
      }
    } while (mergedSomething);

    // If nothing spawned and nothing merged, we are stuck.
    if (!progress) {
      break;
    }
  }

  // Deadlock Check
  if (resolvedCategories.size < catNodes.length) {
    const remainingCats = catNodes.length - resolvedCategories.size;
    addStep('event', '', '', '', `⚠️ DEADLOCK! Board full (${board.length}/${maxBubbles}) with no valid merges. Cannot solve the remaining ${remainingCats} categories. Please adjust the Drop Order or increase max Bubbles!`);
  } else if (board.length > 0) {
    // If categories are solved but junk remains
    const junkCount = board.length;
    addStep('event', '', '', '', `⚠️ ${junkCount} unused bubble(s) remain on the board. Solution completed, but the map is not clean.`);
  } else {
    addStep('success', '', '', '', `🏆 Level Complete! All bubbles cleared.`);
  }

  const recommendedMoveLimit = Math.max(1, moveCount - bonusTurns + 2);
  const difficulty = calculateDifficulty(nodes, edges, levelData, moveCount);

  return {
    steps,
    totalMoves: moveCount,
    bonusTurns,
    recommendedMoveLimit,
    difficulty
  };
}

function calculateDifficulty(nodes: Node[], _edges: Edge[], levelData: any, moveCount: number) {
  let score = 0;
  const factors: string[] = [];

  // Base score from moves
  score += moveCount;
  factors.push(`Base: ${moveCount} required moves`);

  // Max Bubbles constraint
  const maxBubbles = levelData?.maxBubblesInScene || 10;
  const totalItems = nodes.length; // total nodes
  if (totalItems > maxBubbles * 1.5) {
    score += 15;
    factors.push(`High Congestion: Total items (${totalItems}) far exceeds max bubbles on screen (${maxBubbles})`);
  } else if (totalItems > maxBubbles) {
    score += 5;
    factors.push(`Medium Congestion: More items than screen limit`);
  }

  // Chunks overlap / misleading
  const chunkNodes = nodes.filter(n => n.data.isChunk).map(n => String(n.data.label));
  const chunkCounts: Record<string, number> = {};
  chunkNodes.forEach(c => { chunkCounts[c] = (chunkCounts[c] || 0) + 1; });
  const duplicates = Object.values(chunkCounts).filter(v => v > 1).length;
  if (duplicates > 0) {
    score += duplicates * 8;
    factors.push(`${duplicates} duplicated chunks (Causes confusion)`);
  }

  // Mechanics
  if (levelData?.useBubbleSeparator === 1) {
    score += 10;
    factors.push(`Chain Mechanic Enabled`);
  }

  const frozenCount = levelData?.freezeWords?.length || 0;
  if (frozenCount > 0) {
    score += frozenCount * 4;
    factors.push(`${frozenCount} Frozen Words`);
  }

  const lockCount = levelData?.keyLockWords?.length || 0;
  if (lockCount > 0) {
    score += lockCount * 8;
    factors.push(`${lockCount} Key-Lock Mechanics`);
  }

  // Determine Label
  let label = 'Easy';
  let color = '#22c55e'; // green-500
  if (score > 60) {
    label = 'Expert';
    color = '#ef4444'; // red-500
  } else if (score > 40) {
    label = 'Hard';
    color = '#f97316'; // orange-500
  } else if (score > 20) {
    label = 'Medium';
    color = '#eab308'; // yellow-500
  }

  return {
    score,
    label,
    factors,
    color
  };
}
