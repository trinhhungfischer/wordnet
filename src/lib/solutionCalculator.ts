import type { Node, Edge } from '@xyflow/react';
import globalDictData from '../../public/global_dictionary.json';
const globalDict: any = globalDictData;

export interface BoardBubbleState {
  id: string;
  label: string;
  isChained: boolean;
  chainMergesLeft: number;
  iceMergesLeft: number;
  crackMergesLeft: number;
}

export interface MergeStep {
  id: string;
  type: 'chunk' | 'category' | 'event' | 'success';
  left: string;
  right: string;
  result: string;
  text?: string;
  isComboBonus: boolean;
  boardState: BoardBubbleState[];
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

  let chainBroken = false;
  let completedCategoriesCount = 0;
  let crackBreakMap: Record<string, number> = {};

  if (levelData?.allWordEntries) {
    levelData.allWordEntries.forEach((e: any) => {
      const wordName = e.parentWord ? String(e.parentWord).toLowerCase() : String(e.fullWord).toLowerCase();
      if (e.crackBreakNum > 0) {
        crackBreakMap[wordName] = e.crackBreakNum;
      }
    });
  }

  const linkedWords = new Set((levelData?.bubbleSeparatorData?.linkedWords || []).map((w: string) => w.toLowerCase()));
  const breakThreshold = levelData?.bubbleSeparatorData?.breakThreshold || 3;

  const getBubbleState = (bid: string): BoardBubbleState => {
    const node = nodes.find(n => n.id === bid);
    const displayLabel = node ? String(node.data.label) : bid.split('_')[1]?.replace(/^\[|\]$/g, '') || bid;

    let isChained = false;
    let chainMergesLeft = 0;
    let iceMergesLeft = 0;
    let crackMergesLeft = 0;

    if (node) {
      const w = displayLabel.toLowerCase();
      
      if (linkedWords.has(w) && !chainBroken && levelData?.useBubbleSeparator === 1) {
         isChained = true;
         chainMergesLeft = breakThreshold - completedCategoriesCount;
      }
      
      if (crackBreakMap[w] && completedCategoriesCount < crackBreakMap[w]) {
         crackMergesLeft = crackBreakMap[w] - completedCategoriesCount;
      }
      
      const frozenRule = levelData?.frozenBubbles?.find((f: any) => f.word.toLowerCase() === w);
      if (frozenRule && moveCount < frozenRule.mergesNeeded) {
         iceMergesLeft = frozenRule.mergesNeeded - moveCount;
      }
    }

    return {
      id: bid,
      label: displayLabel,
      isChained,
      chainMergesLeft: chainMergesLeft > 0 ? chainMergesLeft : 0,
      iceMergesLeft: iceMergesLeft > 0 ? iceMergesLeft : 0,
      crackMergesLeft: crackMergesLeft > 0 ? crackMergesLeft : 0
    };
  };

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
        boardState: board.map(bid => getBubbleState(bid)),
        moveIndex: currentMoveIndex
      });

      // Check Ice Thaw events immediately after a merge
      levelData?.frozenBubbles?.forEach((f: any) => {
        if (f.mergesNeeded === currentMoveIndex) {
          steps.push({
            id: `step-${stepIdCounter++}`,
            type: 'event',
            left: '',
            right: '',
            result: '',
            text: `🧊 Ice thawed on "${f.word}" (${currentMoveIndex} merges performed)`,
            isComboBonus: false,
            boardState: board.map(bid => getBubbleState(bid)),
            moveIndex: currentMoveIndex
          });
        }
      });
    } else {
      steps.push({
        id: `step-${stepIdCounter++}`,
        type,
        left,
        right,
        result,
        text,
        isComboBonus: false,
        boardState: board.map(bid => getBubbleState(bid)),
        moveIndex: currentMoveIndex
      });
    }
  };

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

  // (Variables moved up)

  const usedWords = new Set<string>(); // Tracks all words/chunks that have been merged

  const isWordIceOrCrackLocked = (w: string) => {
    w = w.toLowerCase();
    
    // Check Key-Lock
    const lockRule = levelData?.keyLockBubbles?.find((k: any) => k.lockWord.toLowerCase() === w);
    if (lockRule) {
      if (!usedWords.has(lockRule.keyWord.toLowerCase())) {
         return true; // Still locked because key is not merged yet
      }
    }

    if (crackBreakMap[w] && completedCategoriesCount < crackBreakMap[w]) return true;
    
    const frozenRule = levelData?.frozenBubbles?.find((f: any) => f.word.toLowerCase() === w);
    if (frozenRule && moveCount < frozenRule.mergesNeeded) return true;
    
    return false;
  };

  // Simulator State
  const maxBubbles = levelData?.maxBubblesInScene || 20;
  let board: string[] = []; // Array of node IDs currently on the board
  const droppedWords = new Set<string>(); // Tracks all words/chunks that have entered the board
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
      droppedWords.add(nextId);
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
          droppedWords.add(wordId);
          resolvedWords.add(wordId);
          
          // Generate Merge Steps for Chunks
          const chunks = chunkIds.map(cid => String(nodes.find(n => n.id === cid)?.data.label));
          
          // Add chunks to usedWords since they were merged
          chunks.forEach(c => usedWords.add(c.toLowerCase()));
          
          mergedSomething = true;
          progress = true;

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

      // Try Word -> Category Merge (Partial Merge Logic)
      for (const [catId, originalWordIds] of catToWords.entries()) {
        if (!resolvedCategories.has(catId)) {
          const piecesOnBoard = board.filter(id => {
             if (originalWordIds.includes(id)) return true;
             if (id.endsWith(`_[${catId}]`)) return true;
             return false;
          });

          const availablePieces = piecesOnBoard.filter(pid => {
             if (pid.startsWith('temp_')) return true;
             const label = getBubbleState(pid).label;
             return !isWordIceOrCrackLocked(label);
          });

          if (availablePieces.length >= 2) {
             let p1 = availablePieces[0];
             let p2 = availablePieces[1];

             const isChainActive = levelData?.useBubbleSeparator === 1 && !chainBroken;
             let canMergeChain = true;

             if (isChainActive) {
                const chainedCount = originalWordIds.filter(wid => {
                  const label = String(nodes.find(n => n.id === wid)?.data.label).toLowerCase();
                  return linkedWords.has(label);
                }).length;
                if (chainedCount > 0 && chainedCount < originalWordIds.length) {
                  canMergeChain = false;
                }
             }

             if (canMergeChain) {
               const label1 = getBubbleState(p1).label;
               const label2 = getBubbleState(p2).label;
               const mergedString = `${label1} | ${label2}`;
               const mergedId = `temp_[${mergedString}]_[${catId}]`;

               board = board.filter(id => id !== p1 && id !== p2);
               board.push(mergedId);

               // Add the pieces to usedWords since they were merged
               usedWords.add(label1.toLowerCase());
               usedWords.add(label2.toLowerCase());

               addStep('category', label1, label2, mergedString);
               mergedSomething = true;
               progress = true;

               const undroppedCount = originalWordIds.filter(id => !droppedWords.has(id)).length;
               if (undroppedCount === 0 && piecesOnBoard.length === 2) {
                  board = board.filter(id => id !== mergedId);
                  const isSubCategory = edges.some(e => e.target === catId && catNodes.some(n => n.id === e.source));
                  if (isSubCategory) {
                    board.push(catId);
                    droppedWords.add(catId);
                  }
                  resolvedCategories.add(catId);
                  completedCategoriesCount++;

                  const catLabel = String(nodes.find(n => n.id === catId)?.data.label);
                  addStep('success', '', '', '', `✨ Completed Category: ${catLabel.toUpperCase()}`);

                  const dropCount = isSubCategory ? 3 : 4;
                  if (doDrops(dropCount)) progress = true;

                  Object.keys(crackBreakMap).forEach(w => {
                    if (crackBreakMap[w] === completedCategoriesCount) {
                      addStep('event', '', '', '', `🧊 Ice broken on "${w}" (${completedCategoriesCount} categories broken)`);
                    }
                  });
                  
                  // Notify if any locks were opened
                  levelData?.keyLockBubbles?.forEach((kl: any) => {
                    if (usedWords.has(kl.keyWord.toLowerCase())) {
                       // We can't know exactly WHICH move unlocked it without tracking previous state, 
                       // but we can just let it unlock silently or check if it was just unlocked.
                       // For simplicity, we just let it be silent.
                    }
                  });

                  if (levelData?.useBubbleSeparator === 1 && !chainBroken) {
                    if (completedCategoriesCount === breakThreshold) {
                      addStep('event', '', '', '', `⛓️ Chain destroyed! (${completedCategoriesCount}/${breakThreshold} categories broken)`);
                      chainBroken = true;
                    }
                  }
               }
               break; // Break loop to re-evaluate board
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

  const frozenCount = levelData?.frozenBubbles?.length || 0;
  if (frozenCount > 0) {
    score += frozenCount * 4;
    factors.push(`${frozenCount} Frozen Words`);
  }

  const lockCount = levelData?.keyLockWords?.length || 0;
  if (lockCount > 0) {
    score += lockCount * 8;
    factors.push(`${lockCount} Key-Lock Mechanics`);
  }

  // Rarity (Popularity) calculation
  const wordNodes = nodes.filter(n => !n.data.isCategory && !n.data.isChunk);
  if (wordNodes.length > 0) {
    let ultraRare = 0;
    let veryRare = 0;
    let rare = 0;
    let common = 0;
    
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

    if (ultraRare > 0) {
      const pts = ultraRare * 8;
      score += pts;
      factors.push(`${ultraRare} Ultra Rare words (+${pts} difficulty)`);
    }
    if (veryRare > 0) {
      const pts = veryRare * 4;
      score += pts;
      factors.push(`${veryRare} Very Rare words (+${pts} difficulty)`);
    }
    if (rare > 0) {
      const pts = rare * 2;
      score += pts;
      factors.push(`${rare} Rare words (+${pts} difficulty)`);
    }
    if (common > wordNodes.length * 0.7) {
      score -= 10;
      factors.push(`Majority of words are very common (-10 difficulty)`);
    }
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
