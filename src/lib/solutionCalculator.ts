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
  lockIndex: number;
  keyIndex: number;
  burstMovesRemaining?: number;
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
  
  let bombPenalties = 0;
  const explodedBombs = new Set<string>();

  if (levelData?.allWordEntries) {
    levelData.allWordEntries.forEach((e: any) => {
      const wordName = e.parentWord ? String(e.parentWord).toLowerCase() : String(e.fullWord).toLowerCase();
      if (e.crackBreakNum > 0) {
        crackBreakMap[wordName] = e.crackBreakNum;
      }
    });
  }

  const linkedWords = new Set((levelData?.bubbleSeparatorData?.linkedWords || []).map((w: string) => w.toLowerCase()));

  // Expand linkedWords to include chunks and parents
  nodes.forEach(node => {
    if (node.data.isChunk && linkedWords.has(String(node.data.label).toLowerCase())) {
      const parentEdge = edges.find(e => e.target === node.id);
      if (parentEdge) {
        const parentNode = nodes.find(n => n.id === parentEdge.source);
        if (parentNode) {
           linkedWords.add(String(parentNode.data.label).toLowerCase());
        }
      }
    }
  });


  const breakThreshold = levelData?.bubbleSeparatorData?.breakThreshold || 3;

  const getBubbleState = (bid: string): BoardBubbleState => {
    const node = nodes.find(n => n.id === bid);
    const displayLabel = node ? String(node.data.label) : bid.split('_')[1]?.replace(/^\[|\]$/g, '') || bid;

    let isChained = false;
    let chainMergesLeft = 0;
    let iceMergesLeft = 0;
    let crackMergesLeft = 0;
    let lockIndex = -1;
    let keyIndex = -1;
    let burstMovesRemaining: number | undefined;

    const w = displayLabel.toLowerCase();
    
    if (linkedWords.has(w) && !chainBroken && levelData?.useBubbleSeparator === 1) {
       isChained = true;
       chainMergesLeft = breakThreshold - completedCategoriesCount;
    }
    
    if (crackBreakMap[w] && completedCategoriesCount < crackBreakMap[w]) {
       crackMergesLeft = crackBreakMap[w] - completedCategoriesCount;
    }
    
    if (node) {
      const frozenRule = levelData?.frozenBubbles?.find((f: any) => f.word.toLowerCase() === w);
      if (frozenRule) {
         let mergesDone = moveCount;
         if (wordDropMove?.has(w)) {
            mergesDone = moveCount - wordDropMove.get(w)!;
         } else {
            mergesDone = 0;
         }
         
         if (mergesDone < frozenRule.mergesNeeded) {
            iceMergesLeft = frozenRule.mergesNeeded - mergesDone;
         }
      }
      
      const lockIdx = levelData?.keyLockBubbles?.findIndex((k: any) => k.lockWord.toLowerCase() === w);
      if (lockIdx !== undefined && lockIdx !== -1 && !usedWords.has(levelData.keyLockBubbles[lockIdx].keyWord.toLowerCase())) {
        lockIndex = lockIdx;
      }

      const keyIdx = levelData?.keyLockBubbles?.findIndex((k: any) => k.keyWord.toLowerCase() === w);
      if (keyIdx !== undefined && keyIdx !== -1 && !usedWords.has(w)) {
        keyIndex = keyIdx;
      }
      
      const burstRule = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === w);
      if (burstRule) {
        let rem = burstRule.movesRemaining;
        if (wordDropMove?.has(w)) {
           rem = burstRule.movesRemaining - (moveCount - wordDropMove.get(w)!);
        }
        if (rem < 0) rem = 0;
        burstMovesRemaining = rem;
      }
    }

    return {
      id: bid,
      label: displayLabel,
      isChained,
      chainMergesLeft: chainMergesLeft > 0 ? chainMergesLeft : 0,
      iceMergesLeft: iceMergesLeft > 0 ? iceMergesLeft : 0,
      crackMergesLeft: crackMergesLeft > 0 ? crackMergesLeft : 0,
      lockIndex,
      keyIndex,
      burstMovesRemaining
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
        const w = f.word.toLowerCase();
        if (wordDropMove.has(w)) {
          const dropTime = wordDropMove.get(w)!;
          const mergesDone = currentMoveIndex - dropTime;
          if (mergesDone === f.mergesNeeded) {
            steps.push({
              id: `step-${stepIdCounter++}`,
              type: 'event',
              left: '',
              right: '',
              result: '',
              text: `🧊 Ice thawed on "${f.word}" (${f.mergesNeeded} merges performed)`,
              isComboBonus: false,
              boardState: board.map(bid => getBubbleState(bid)),
              moveIndex: currentMoveIndex
            });
          }
        }
      });

      // Check Bomb Explosions
      levelData?.burstBubbles?.forEach((b: any) => {
        const w = b.word.toLowerCase();
        if (!usedWords.has(w) && !explodedBombs.has(w) && wordDropMove.has(w)) {
          const dropTime = wordDropMove.get(w)!;
          const rem = b.movesRemaining - (currentMoveIndex - dropTime);
          if (rem <= 0) {
            explodedBombs.add(w);
            bombPenalties++;
            steps.push({
              id: `step-${stepIdCounter++}`,
              type: 'event',
              left: '',
              right: '',
              result: '',
              text: `💣 Bomb exploded on "${b.word}"! (+1 move penalty)`,
              isComboBonus: false,
              boardState: board.map(bid => getBubbleState(bid)),
              moveIndex: currentMoveIndex
            });
          }
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
  const wordDropMove = new Map<string, number>(); // Tracks the move index when a word/chunk first entered the board

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
    if (frozenRule) {
       const dropTime = wordDropMove.has(w) ? wordDropMove.get(w)! : moveCount;
       const mergesDone = moveCount - dropTime;
       if (mergesDone < frozenRule.mergesNeeded) return true;
    }
    
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
      
      const node = nodes.find(n => n.id === nextId);
      if (node?.data.isChunk) {
         const parentEdge = edges.find(e => e.target === nextId);
         if (parentEdge) {
            const parentNode = nodes.find(n => n.id === parentEdge.source);
            if (parentNode) {
               const pLabel = String(parentNode.data.label).toLowerCase();
               if (!wordDropMove.has(pLabel)) {
                   wordDropMove.set(pLabel, moveCount);
               }
            }
         }
         const cLabel = String(node.data.label).toLowerCase();
         if (!wordDropMove.has(cLabel)) wordDropMove.set(cLabel, moveCount);
      } else if (node) {
         const label = String(node.data.label).toLowerCase();
         if (!wordDropMove.has(label)) wordDropMove.set(label, moveCount);
      }
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
      let possibleMerges: any[] = [];

      // Try Chunk -> Word Merge
      for (const [wordId, chunkIds] of wordToChunks.entries()) {
        if (!resolvedWords.has(wordId) && chunkIds.every(cid => board.includes(cid))) {
          let score = 10;
          const wordLabel = String(nodes.find(n => n.id === wordId)?.data.label).toLowerCase();
          const burstRule = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === wordLabel);
          if (burstRule) {
             const rem = burstRule.movesRemaining - moveCount;
             score = Math.max(score, 100 - rem * 5);
          }
          // Also check chunks!
          chunkIds.forEach(cid => {
             const cLabel = String(nodes.find(n => n.id === cid)?.data.label).toLowerCase();
             const cBurst = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === cLabel);
             if (cBurst) {
                 const rem = cBurst.movesRemaining - moveCount;
                 score = Math.max(score, 100 - rem * 5);
             }
          });
          // Also check if this word belongs to a category that has an active bomb on the board
          const parentCat = edges.find(e => e.target === wordId && catNodes.some(n => n.id === e.source))?.source;
          if (parentCat) {
             const catWordIds = catToWords.get(parentCat) || [];
             const piecesOnBoard = board.filter(id => {
                if (catWordIds.includes(id)) return true;
                if (id.endsWith(`_[${parentCat}]`)) return true;
                return false;
             });
             piecesOnBoard.forEach(pid => {
                const pLabel = getBubbleState(pid).label.toLowerCase();
                const pBurst = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === pLabel);
                if (pBurst) {
                   const rem = pBurst.movesRemaining - moveCount;
                   // High priority, but slightly lower than direct bomb on the chunk itself
                   score = Math.max(score, 90 - rem * 5); 
                }
             });
          }
          possibleMerges.push({ type: 'chunk', wordId, chunkIds, score });
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
                for (let i = 0; i < availablePieces.length; i++) {
                   for (let j = i + 1; j < availablePieces.length; j++) {
                      let p1 = availablePieces[i];
                      let p2 = availablePieces[j];
                      
                      let score = 20;
                      const label1 = getBubbleState(p1).label.toLowerCase();
                      const label2 = getBubbleState(p2).label.toLowerCase();
                      
                      const burstRule1 = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === label1);
                      const burstRule2 = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === label2);
                      
                      if (burstRule1) score = Math.max(score, 100 - (burstRule1.movesRemaining - moveCount) * 5);
                      if (burstRule2) score = Math.max(score, 100 - (burstRule2.movesRemaining - moveCount) * 5);

                      possibleMerges.push({ type: 'category', catId, p1, p2, originalWordIds, piecesOnBoard, score });
                   }
                }
             }
          }
        }
      }

      if (possibleMerges.length > 0) {
        possibleMerges.sort((a, b) => b.score - a.score);
        const bestMerge = possibleMerges[0];

        if (bestMerge.type === 'chunk') {
          const { wordId, chunkIds } = bestMerge;
          board = board.filter(id => !chunkIds.includes(id)); // Remove chunks
          board.push(wordId); // Add word to board
          droppedWords.add(wordId);
          resolvedWords.add(wordId);
          
          const chunks = chunkIds.map((cid: string) => String(nodes.find(n => n.id === cid)?.data.label));
          chunks.forEach((c: string) => usedWords.add(c.toLowerCase()));
          
          mergedSomething = true;
          progress = true;

          let currentString = chunks[0];
          for (let i = 1; i < chunks.length; i++) {
            const nextChunk = chunks[i];
            const mergedString = currentString + nextChunk;
            addStep('chunk', currentString, nextChunk, mergedString);
            
            if (doDrops(1)) {
              progress = true;
            }
            
            currentString = mergedString;
          }
        } else if (bestMerge.type === 'category') {
          const { catId, p1, p2, originalWordIds, piecesOnBoard } = bestMerge;
          const label1 = getBubbleState(p1).label;
          const label2 = getBubbleState(p2).label;
          const mergedString = `${label1} | ${label2}`;
          const mergedId = `temp_[${mergedString}]_[${catId}]`;

          // If the constituent words are linked, the resulting merged word must also be linked
          if (linkedWords.has(label1.toLowerCase()) || linkedWords.has(label2.toLowerCase())) {
             linkedWords.add(mergedString.toLowerCase());
          }

          board = board.filter(id => id !== p1 && id !== p2);
          board.push(mergedId);

          usedWords.add(label1.toLowerCase());
          usedWords.add(label2.toLowerCase());

          addStep('category', label1, label2, mergedString);
          mergedSomething = true;
          progress = true;

          const undroppedCount = originalWordIds.filter((id: string) => !droppedWords.has(id)).length;
          if (undroppedCount === 0 && piecesOnBoard.length === 2 && originalWordIds.length === 4) {
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
            
            levelData?.keyLockBubbles?.forEach((kl: any) => {
              if (usedWords.has(kl.keyWord.toLowerCase())) {
              }
            });

            if (levelData?.useBubbleSeparator === 1 && !chainBroken) {
              if (completedCategoriesCount === breakThreshold) {
                addStep('event', '', '', '', `⛓️ Chain destroyed! (${completedCategoriesCount}/${breakThreshold} categories broken)`);
                chainBroken = true;
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

  const recommendedMoveLimit = Math.max(1, moveCount - bonusTurns + bombPenalties + 2);
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

  const burstCount = levelData?.burstBubbles?.length || 0;
  if (burstCount > 0) {
    score += burstCount * 6;
    factors.push(`${burstCount} Bomb Words`);
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
