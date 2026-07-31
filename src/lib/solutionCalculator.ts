import type { Node, Edge } from '@xyflow/react';
import globalDictData from '../data/global_dictionary.json';
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
  screwCount?: number;
  isScrewDriver?: boolean;
  screwLockIndex?: number;
  screwDriverIndex?: number;
  reqLockWeight?: number;
  isIceBomb?: boolean;
  iceBombTurnToActive?: number;
  iceBombConfigTurnToActive?: number;
  iceBombConfigFreezeTurns?: number;
  iceBombInfectedFreezeTurns?: number;
  isSpikeBubble?: boolean;
  isBombCrackingBubble?: boolean;
  bombMergeRemain?: number;
  bombChainCount?: number;
  isFloatBubble?: boolean;
  mergesToFloat?: number;
  isTeleportBubble?: boolean;
  mergesToTeleport?: number;
  stackPipeId?: number;
  stackPipeDepth?: number;
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
  vocabDifficulty: {
    score: number;
    label: string;
    factors: string[];
    color: string;
  };
  moveDifficulty: {
    score: number;
    label: string;
    factors: string[];
    color: string;
  };
  learningDifficulty: {
    score: number;
    label: string;
    factors: string[];
    color: string;
  };
}

export function calculateSolution(nodes: Node[], edges: Edge[], levelData: any, spawnQueueIds: string[] = []): SolutionResult {
  const localSpawnQueueIds = [...spawnQueueIds];
  const steps: MergeStep[] = [];
  let moveCount = 0;
  let bonusTurns = 0;
  let stepIdCounter = 1;

  let chainBroken = false;
  let completedCategoriesCount = 0;
  let bombPenalties = 0;
  const explodedBombs = new Set<string>();
  const screwEventsEmitted = new Set<string>();

  interface ActiveIceBomb {
    turnToActiveRemaining: number;
    configTurnToActive: number;
    configFreezeTurns: number;
  }
  
  interface InfectedIceBomb {
    freezeMergesLeft: number;
    configTurnToActive: number;
    configFreezeTurns: number;
  }
  
  const activeIceBombs = new Map<string, ActiveIceBomb>();
  const infectedIceBombs = new Map<string, InfectedIceBomb>();
  const floatBubblesRemoved = new Set<string>();
  const teleportCounts = new Map<string, number>();

  levelData?.iceBombBubbles?.forEach((ib: any) => {
     activeIceBombs.set(ib.word.toLowerCase(), {
        turnToActiveRemaining: ib.turnToActive,
        configTurnToActive: ib.turnToActive,
        configFreezeTurns: ib.freezeTurns
     });
  });

  const crackBreakMap: Record<string, number> = {};
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
    let screwCountCalc: number | undefined;
    let isScrewDriverCheck: boolean | undefined;
    let screwLockIndex = -1;
    let screwDriverIndex = -1;
    let reqLockWeight: number | undefined;
    let isSpikeBubble = false;
    let isBombCrackingBubble = false;
    let bombMergeRemain: number | undefined;
    let bombChainCount: number | undefined;
    let isFloatBubble = false;
    let mergesToFloat: number | undefined;
    let isTeleportBubble = false;
    let mergesToTeleport: number | undefined;
    let stackPipeId: number | undefined;
    let stackPipeDepth: number | undefined;

    const w = displayLabel.toLowerCase();
    const currentWeight = displayLabel.split('|').length;
    
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

      if (levelData?.spikeBubbles?.some((s: any) => (typeof s === 'string' ? s : s.word).toLowerCase() === w)) {
        isSpikeBubble = true;
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
      const screwLockRuleIdx = levelData?.screwLockBubbles?.findIndex((s: any) => s.screwLockWord.toLowerCase() === w);
      if (screwLockRuleIdx !== undefined && screwLockRuleIdx !== -1) {
        const screwLockRule = levelData.screwLockBubbles[screwLockRuleIdx];
        screwLockIndex = screwLockRuleIdx;
        const mergedDrivers = screwLockRule.screwDriverWords.filter((dw: string) => usedWords.has(dw.toLowerCase())).length;
        screwCountCalc = screwLockRule.screwCount - mergedDrivers;
        if (screwCountCalc < 0) screwCountCalc = 0;
      }
      
      const screwDriverIdx = levelData?.screwLockBubbles?.findIndex((s: any) => s.screwDriverWords.some((dw: string) => dw.toLowerCase() === w));
      if (screwDriverIdx !== undefined && screwDriverIdx !== -1) {
        screwDriverIndex = screwDriverIdx;
        isScrewDriverCheck = true;
      } else {
        isScrewDriverCheck = false;
      }
      
      const reqLockRule = levelData?.requirementLockBubbles?.find((r: any) => r.requirementLockWord.toLowerCase() === w);
      if (reqLockRule) {
        if (currentWeight < reqLockRule.requireWeight) {
          reqLockWeight = reqLockRule.requireWeight;
        }
      }
      
      const bombCrackingRule = levelData?.bombCrackingBubbles?.find((b: any) => b.word.toLowerCase() === w);
      if (bombCrackingRule && currentWeight === 1) {
        isBombCrackingBubble = true;
        let rem = bombCrackingRule.mergeRemain;
        if (wordDropMove?.has(w)) {
           rem = bombCrackingRule.mergeRemain - (moveCount - wordDropMove.get(w)!);
        }
        if (rem < 0) rem = 0;
        bombMergeRemain = rem;
        bombChainCount = bombCrackingRule.chainCount;
      }
      
      const floatRule = levelData?.floatBubbles?.find((f: any) => f.word.toLowerCase() === w);
      if (floatRule && !floatBubblesRemoved.has(w) && currentWeight === 1) {
        isFloatBubble = true;
        let rem = floatRule.mergesToFloat;
        if (wordDropMove?.has(w)) {
           rem = floatRule.mergesToFloat - (moveCount - wordDropMove.get(w)!);
        }
        if (rem < 0) rem = 0;
        mergesToFloat = rem;
      }
      
      const teleportRule = levelData?.teleportBubbles?.find((f: any) => f.word.toLowerCase() === w);
      if (teleportRule && currentWeight === 1) {
        isTeleportBubble = true;
        let rem = teleportRule.mergesToTeleport;
        if (wordDropMove?.has(w)) {
           rem = teleportRule.mergesToTeleport - ((moveCount - wordDropMove.get(w)!) % teleportRule.mergesToTeleport);
        }
        if (rem === 0) rem = teleportRule.mergesToTeleport;
        mergesToTeleport = rem;
      }

      const stackPipeRule = levelData?.stackPipes?.find((p: any) => p.words.some((pw: string) => pw.toLowerCase() === w));
      if (stackPipeRule) {
        stackPipeId = stackPipeRule.pipeId;
        stackPipeDepth = stackPipeRule.words.findIndex((pw: string) => pw.toLowerCase() === w);
      }
    }

    let isIceBomb = false;
    let iceBombTurnToActive: number | undefined;
    let iceBombConfigTurnToActive: number | undefined;
    let iceBombConfigFreezeTurns: number | undefined;
    let iceBombInfectedFreezeTurns: number | undefined;

    if (activeIceBombs.has(w)) {
      isIceBomb = true;
      const ib = activeIceBombs.get(w)!;
      iceBombTurnToActive = ib.turnToActiveRemaining;
      iceBombConfigTurnToActive = ib.configTurnToActive;
      iceBombConfigFreezeTurns = ib.configFreezeTurns;
    }

    if (infectedIceBombs.has(w)) {
      iceBombInfectedFreezeTurns = infectedIceBombs.get(w)!.freezeMergesLeft;
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
      burstMovesRemaining,
      screwCount: screwCountCalc,
      isScrewDriver: isScrewDriverCheck,
      screwLockIndex,
      screwDriverIndex,
      reqLockWeight,
      isIceBomb,
      iceBombTurnToActive,
      iceBombConfigTurnToActive,
      iceBombConfigFreezeTurns,
      iceBombInfectedFreezeTurns,
      isSpikeBubble,
      isBombCrackingBubble,
      bombMergeRemain,
      bombChainCount,
      isFloatBubble,
      mergesToFloat,
      isTeleportBubble,
      mergesToTeleport,
      stackPipeId,
      stackPipeDepth
    };
  };

  const addStep = (type: 'chunk' | 'category' | 'event' | 'success', left: string, right: string, result: string, text?: string) => {
    if (type !== 'event' && type !== 'success') {
      const leftW = left.toLowerCase();
      const rightW = right.toLowerCase();
      activeIceBombs.delete(leftW);
      activeIceBombs.delete(rightW);
      infectedIceBombs.delete(leftW);
      infectedIceBombs.delete(rightW);
    }
    
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

      // Check Bomb Cracking Explosions
      levelData?.bombCrackingBubbles?.forEach((b: any) => {
        const w = b.word.toLowerCase();
        if (!usedWords.has(w) && wordDropMove.has(w)) {
          const dropTime = wordDropMove.get(w)!;
          const rem = b.mergeRemain - (currentMoveIndex - dropTime);
          if (rem <= 0) {
            wordDropMove.set(w, currentMoveIndex); // Reset countdown
            bombPenalties++;
            
            const mergedBids = board.filter(bid => {
                if (bid.startsWith('temp_[')) return true;
                if (wordToChunks.has(bid) && resolvedWords.has(bid)) return true;
                return false;
            });
            
            let unmergedCount = 0;
            let chainCount = b.chainCount || 1;
            
            for (let i = 0; i < chainCount && mergedBids.length > 0; i++) {
                const randIdx = Math.floor(Math.random() * mergedBids.length);
                const targetBid = mergedBids[randIdx];
                mergedBids.splice(randIdx, 1);
                
                let targetDisplay = "";
                
                if (targetBid.startsWith('temp_[')) {
                    const match = targetBid.match(/^temp_\[(.*?)\]_\[(.*?)\]$/);
                    if (match) {
                        const lbls = match[1].split('|').map(s => s.trim());
                        targetDisplay = match[1];
                        const catId = match[2];
                        board.splice(board.indexOf(targetBid), 1);
                        
                        // Pop one bubble off the merged group
                        const poppedLabel = lbls.pop()!;
                        const catWordIds = catToWords.get(catId) || [];
                        const wordsToRestore = catWordIds.filter(wid => {
                            const l = String(nodes.find(n => n.id === wid)?.data.label).toLowerCase().trim();
                            return l === poppedLabel.toLowerCase();
                        });
                        
                        // Restore the popped word
                        wordsToRestore.forEach(wid => {
                            board.push(wid);
                            const l = String(nodes.find(n => n.id === wid)?.data.label).toLowerCase();
                            usedWords.delete(l);
                        });
                        
                        // Keep the rest merged
                        if (lbls.length > 1) {
                            const remainingStr = lbls.join(' | ');
                            const newTempId = `temp_[${remainingStr}]_[${catId}]`;
                            board.push(newTempId);
                        } else if (lbls.length === 1) {
                            const remRestore = catWordIds.filter(wid => {
                                const l = String(nodes.find(n => n.id === wid)?.data.label).toLowerCase().trim();
                                return l === lbls[0].toLowerCase();
                            });
                            remRestore.forEach(wid => {
                                board.push(wid);
                                const l = String(nodes.find(n => n.id === wid)?.data.label).toLowerCase();
                                usedWords.delete(l);
                            });
                        }
                        
                        resolvedCategories.delete(catId);
                        
                        unmergedCount++;
                        steps.push({
                           id: `step-${stepIdCounter++}`,
                           type: 'event',
                           left: '',
                           right: '',
                           result: '',
                           text: `💥 Bomb Cracking popped "${poppedLabel}" off "${targetDisplay}"!`,
                           isComboBonus: false,
                           boardState: board.map(bid => getBubbleState(bid)),
                           moveIndex: currentMoveIndex
                        });
                    }
                } else {
                    const cNode = nodes.find(n => n.id === targetBid);
                    targetDisplay = String(cNode?.data.label);
                    board.splice(board.indexOf(targetBid), 1);
                    
                    const wordId = targetBid;
                    const chunkIds = wordToChunks.get(wordId) || [];
                    chunkIds.forEach(cid => {
                        board.push(cid);
                        const l = String(nodes.find(n => n.id === cid)?.data.label).toLowerCase();
                        usedWords.delete(l);
                    });
                    
                    resolvedWords.delete(wordId);
                    usedWords.delete(targetDisplay.toLowerCase());
                    
                    unmergedCount++;
                    steps.push({
                       id: `step-${stepIdCounter++}`,
                       type: 'event',
                       left: '',
                       right: '',
                       result: '',
                       text: `💥 Bomb Cracking shattered "${targetDisplay}" into pieces!`,
                       isComboBonus: false,
                       boardState: board.map(bid => getBubbleState(bid)),
                       moveIndex: currentMoveIndex
                    });
                }
            }
            
            if (unmergedCount === 0) {
               steps.push({
                  id: `step-${stepIdCounter++}`,
                  type: 'event',
                  left: '',
                  right: '',
                  result: '',
                  text: `💥 Bomb Cracking exploded on "${b.word}"! (+1 move penalty)`,
                  isComboBonus: false,
                  boardState: board.map(bid => getBubbleState(bid)),
                  moveIndex: currentMoveIndex
               });
            }
          }
        }
      });

      // Check Float Bubbles
      levelData?.floatBubbles?.forEach((b: any) => {
        const w = b.word.toLowerCase();
        if (!usedWords.has(w) && wordDropMove.has(w)) {
          const dropTime = wordDropMove.get(w)!;
          const rem = b.mergesToFloat - (currentMoveIndex - dropTime);
          if (rem <= 0 && !floatBubblesRemoved.has(w)) {
            floatBubblesRemoved.add(w);
            
            // Remove from board and add to END of remainingQueue
            const nodeOnBoardIndex = board.findIndex(bid => {
                const n = nodes.find(nn => nn.id === bid);
                const displayLabel = n ? String(n.data.label) : bid.split('_')[1]?.replace(/^\[|\]$/g, '') || bid;
                return displayLabel.toLowerCase() === w;
            });
            
            if (nodeOnBoardIndex !== -1) {
                const poppedId = board[nodeOnBoardIndex];
                board.splice(nodeOnBoardIndex, 1);
                localSpawnQueueIds.push(poppedId);
                
                steps.push({
                   id: `step-${stepIdCounter++}`,
                   type: 'event',
                   left: '',
                   right: '',
                   result: '',
                   text: `☁️ Float Bubble "${b.word}" floated away and returned to Drop Queue!`,
                   isComboBonus: false,
                   boardState: board.map(bid => getBubbleState(bid)),
                   moveIndex: currentMoveIndex
                });
                
                // Drop a new bubble from queue to replace it if possible
                if (queueIndex < localSpawnQueueIds.length && board.length < maxBubbles) {
                   const nextId = localSpawnQueueIds[queueIndex];
                   board.push(nextId);
                   droppedWords.add(nextId);
                   queueIndex++;
                   
                   const node = nodes.find(n => n.id === nextId);
                   if (node?.data.isChunk) {
                      const parentEdge = edges.find(e => e.target === nextId);
                      if (parentEdge) {
                         const parentNode = nodes.find(n => n.id === parentEdge.source);
                         if (parentNode) {
                            const pLabel = String(parentNode.data.label).toLowerCase();
                            if (!wordDropMove.has(pLabel)) wordDropMove.set(pLabel, moveCount);
                         }
                      }
                      const cLabel = String(node.data.label).toLowerCase();
                      if (!wordDropMove.has(cLabel)) wordDropMove.set(cLabel, moveCount);
                   } else if (node) {
                      const label = String(node.data.label).toLowerCase();
                      if (!wordDropMove.has(label)) wordDropMove.set(label, moveCount);
                   }
                   
                   const displayLabel = node ? String(node.data.label) : nextId.split('_')[1]?.replace(/^\[|\]$/g, '') || nextId;
                   steps.push({
                       id: `step-${stepIdCounter++}`,
                       type: 'event',
                       left: '',
                       right: '',
                       result: '',
                       text: `🔄 A new bubble "${displayLabel}" dropped to replace the floated one!`,
                       isComboBonus: false,
                       boardState: board.map(bid => getBubbleState(bid)),
                       moveIndex: currentMoveIndex
                   });
                }
            }
          }
        }
      });

      // Check Teleport Bubbles
      levelData?.teleportBubbles?.forEach((b: any) => {
        const w = b.word.toLowerCase();
        if (!usedWords.has(w) && wordDropMove.has(w)) {
          const dropTime = wordDropMove.get(w)!;
          const movesSinceDrop = currentMoveIndex - dropTime;
          if (movesSinceDrop > 0) {
            const currentTriggerCount = Math.floor(movesSinceDrop / b.mergesToTeleport);
            const recordedCount = teleportCounts.get(w) || 0;
            
            if (currentTriggerCount > recordedCount) {
              teleportCounts.set(w, currentTriggerCount);
              
              // Teleport: Move from current position to the end of the board
              const nodeOnBoardIndex = board.findIndex(bid => {
                  const n = nodes.find(nn => nn.id === bid);
                  const displayLabel = n ? String(n.data.label) : bid.split('_')[1]?.replace(/^\[|\]$/g, '') || bid;
                  return displayLabel.toLowerCase() === w;
              });
              
              if (nodeOnBoardIndex !== -1 && nodeOnBoardIndex !== board.length - 1) {
                  const poppedId = board[nodeOnBoardIndex];
                  board.splice(nodeOnBoardIndex, 1);
                  board.push(poppedId); // Teleport to the end
                  
                  const n = nodes.find(nn => nn.id === poppedId);
                  const displayLabel = n ? String(n.data.label) : poppedId.split('_')[1]?.replace(/^\[|\]$/g, '') || poppedId;
                  
                  steps.push({
                     id: `step-${stepIdCounter++}`,
                     type: 'event',
                     left: '',
                     right: '',
                     result: '',
                     text: `⚡ Teleport Bubble "${displayLabel}" teleported to a new position!`,
                     isComboBonus: false,
                     boardState: board.map(bid => getBubbleState(bid)),
                     moveIndex: currentMoveIndex
                  });
              }
            }
          }
        }
      });

      // Check Screw Drivers
      levelData?.screwLockBubbles?.forEach((s: any) => {
         const driverLabels = s.screwDriverWords.map((dw:string) => dw.toLowerCase());
         driverLabels.forEach((dw: string) => {
            if (usedWords.has(dw) && !screwEventsEmitted.has(dw)) {
               screwEventsEmitted.add(dw);
               const driverOriginalCase = s.screwDriverWords.find((d:string) => d.toLowerCase() === dw) || dw;
               steps.push({
                 id: `step-${stepIdCounter++}`,
                 type: 'event',
                 left: '',
                 right: '',
                 result: '',
                 text: `🔧 Tháo 1 ốc của "${s.screwLockWord}" nhờ "${driverOriginalCase}"`,
                 isComboBonus: false,
                 boardState: board.map(bid => getBubbleState(bid)),
                 moveIndex: currentMoveIndex
               });
            }
         });
      });

       // Check Ice Bombs
       const iceBombsToExplode: string[] = [];
       board.forEach(bid => {
          const node = nodes.find(n => n.id === bid);
          const displayLabel = node ? String(node.data.label) : bid.split('_')[1]?.replace(/^\[|\]$/g, '') || bid;
          const w = displayLabel.toLowerCase();
          if (activeIceBombs.has(w)) {
             const ib = activeIceBombs.get(w)!;
             ib.turnToActiveRemaining--;
             if (ib.turnToActiveRemaining <= 0) {
                iceBombsToExplode.push(bid);
             }
          }
       });

       iceBombsToExplode.forEach(bombBid => {
          const candidateBids = board.filter(b => {
              const n = nodes.find(x => x.id === b);
              if (n && n.data.isChunk) return false;
              if (b.startsWith('temp_')) return false;
              const lbl = n ? String(n.data.label) : b.split('_')[1]?.replace(/^\[|\]$/g, '') || b;
              const wl = lbl.toLowerCase();
              return !activeIceBombs.has(wl) && !infectedIceBombs.has(wl);
          });
          
          const bombNode = nodes.find(n => n.id === bombBid);
          const bombLabel = bombNode ? String(bombNode.data.label) : bombBid.split('_')[1]?.replace(/^\[|\]$/g, '') || bombBid;
          const bombW = bombLabel.toLowerCase();
          const ib = activeIceBombs.get(bombW)!;

          if (candidateBids.length > 0) {
              const targetBid = candidateBids[Math.floor(Math.random() * candidateBids.length)];
              const targetNode = nodes.find(n => n.id === targetBid);
              const targetLabel = targetNode ? String(targetNode.data.label) : targetBid.split('_')[1]?.replace(/^\[|\]$/g, '') || targetBid;
              const targetW = targetLabel.toLowerCase();

              infectedIceBombs.set(targetW, {
                  freezeMergesLeft: ib.configFreezeTurns,
                  configTurnToActive: ib.configTurnToActive,
                  configFreezeTurns: ib.configFreezeTurns
              });

              ib.turnToActiveRemaining = ib.configTurnToActive;

              steps.push({
                  id: `step-${stepIdCounter++}`,
                  type: 'event',
                  left: '',
                  right: '',
                  result: '',
                  text: `💣 Ice Bomb "${bombLabel}" exploded and froze "${targetLabel}"!`,
                  isComboBonus: false,
                  boardState: board.map(bid => getBubbleState(bid)),
                  moveIndex: currentMoveIndex
              });
          } else {
              ib.turnToActiveRemaining = ib.configTurnToActive;
          }
       });

       // Handle Infected Ice Bombs
       const infectedToThaw: string[] = [];
       board.forEach(bid => {
          const node = nodes.find(n => n.id === bid);
          const displayLabel = node ? String(node.data.label) : bid.split('_')[1]?.replace(/^\[|\]$/g, '') || bid;
          const w = displayLabel.toLowerCase();
          if (infectedIceBombs.has(w)) {
             const infected = infectedIceBombs.get(w)!;
             infected.freezeMergesLeft--;
             if (infected.freezeMergesLeft <= 0) {
                infectedToThaw.push(bid);
             }
          }
       });

       infectedToThaw.forEach(thawBid => {
          const node = nodes.find(n => n.id === thawBid);
          const displayLabel = node ? String(node.data.label) : thawBid.split('_')[1]?.replace(/^\[|\]$/g, '') || thawBid;
          const w = displayLabel.toLowerCase();
          
          const infected = infectedIceBombs.get(w)!;
          infectedIceBombs.delete(w);
          
          activeIceBombs.set(w, {
              turnToActiveRemaining: infected.configTurnToActive,
              configTurnToActive: infected.configTurnToActive,
              configFreezeTurns: infected.configFreezeTurns
          });

          steps.push({
              id: `step-${stepIdCounter++}`,
              type: 'event',
              left: '',
              right: '',
              result: '',
              text: `🧊 Infected bubble "${displayLabel}" thawed and became a new Ice Bomb!`,
              isComboBonus: false,
              boardState: board.map(bid => getBubbleState(bid)),
              moveIndex: currentMoveIndex
          });
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
    
    const screwLockRule = levelData?.screwLockBubbles?.find((s: any) => s.screwLockWord.toLowerCase() === w);
    if (screwLockRule) {
      const mergedDrivers = screwLockRule.screwDriverWords.filter((dw: string) => usedWords.has(dw.toLowerCase())).length;
      if (screwLockRule.screwCount - mergedDrivers > 0) return true;
    }
    
    const frozenRule = levelData?.frozenBubbles?.find((f: any) => f.word.toLowerCase() === w);
    if (frozenRule) {
       const dropTime = wordDropMove.has(w) ? wordDropMove.get(w)! : moveCount;
       const mergesDone = moveCount - dropTime;
       if (mergesDone < frozenRule.mergesNeeded) return true;
    }
    
    // Stack Pipe logic
    const stackPipeRule = levelData?.stackPipes?.find((p: any) => p.words.some((pw: string) => pw.toLowerCase() === w));
    if (stackPipeRule) {
      const wDepth = stackPipeRule.words.findIndex((pw: string) => pw.toLowerCase() === w);
      let maxDepthOnBoard = -1;
      
      board.forEach(bid => {
        const node = nodes.find(n => n.id === bid);
        const displayLabel = node ? String(node.data.label) : bid.split('_')[1]?.replace(/^\[|\]$/g, '') || bid;
        const bw = displayLabel.toLowerCase();
        const bDepth = stackPipeRule.words.findIndex((pw: string) => pw.toLowerCase() === bw);
        if (bDepth > maxDepthOnBoard) {
          maxDepthOnBoard = bDepth;
        }
      });
      
      if (wDepth < maxDepthOnBoard) {
        return true; // Not the top-most bubble, so locked
      }
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
    while (dropped < count && board.length < maxBubbles && queueIndex < localSpawnQueueIds.length) {
      const nextId = localSpawnQueueIds[queueIndex];
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
          
          let allSpikes = true;
          for (const cid of chunkIds) {
            if (!getBubbleState(cid).isSpikeBubble) {
              allSpikes = false;
              break;
            }
          }
          if (allSpikes && chunkIds.length > 1) {
             continue; // Cannot merge if ALL pieces are Spike Bubbles
          }
          
          let score = 10;
          const wordLabel = String(nodes.find(n => n.id === wordId)?.data.label).toLowerCase();
          const burstRule = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === wordLabel);
          if (burstRule) {
             const rem = burstRule.movesRemaining - moveCount;
             score = Math.max(score, 100 - rem * 5);
          }
          const bombCrackingRule = levelData?.bombCrackingBubbles?.find((b: any) => b.word.toLowerCase() === wordLabel);
          if (bombCrackingRule) {
             const rem = bombCrackingRule.mergeRemain - moveCount;
             score = Math.max(score, 100 - rem * 5);
          }
          
          // Boost if word is part of a category that has a bomb (so AI forms the word to save the bomb)
          const parentCatEdge = edges.find(e => e.target === wordId && catNodes.some(n => n.id === e.source));
          if (parentCatEdge) {
             const catId = parentCatEdge.source;
             const catWordIds = catToWords.get(catId) || [];
             catWordIds.forEach(cwid => {
                const cwLabel = String(nodes.find(n => n.id === cwid)?.data.label).toLowerCase();
                const burst = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === cwLabel);
                if (burst) {
                   const dropTime = wordDropMove.get(cwLabel) || moveCount;
                   score = Math.max(score, 100 - (burst.movesRemaining - (moveCount - dropTime)) * 5);
                }
                const bc = levelData?.bombCrackingBubbles?.find((b: any) => b.word.toLowerCase() === cwLabel);
                if (bc) {
                   const dropTime = wordDropMove.get(cwLabel) || moveCount;
                   score = Math.max(score, 100 - (bc.mergeRemain - (moveCount - dropTime)) * 5);
                }
             });
          }
          // Also check chunks!
          chunkIds.forEach(cid => {
             const cLabel = String(nodes.find(n => n.id === cid)?.data.label).toLowerCase();
             const cBurst = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === cLabel);
             if (cBurst) {
                 const rem = cBurst.movesRemaining - moveCount;
                 score = Math.max(score, 100 - rem * 5);
             }
             const cBombCracking = levelData?.bombCrackingBubbles?.find((b: any) => b.word.toLowerCase() === cLabel);
             if (cBombCracking) {
                 const rem = cBombCracking.mergeRemain - moveCount;
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
                      
                      const weight1 = p1.startsWith('temp_') ? label1.split('|').length : 1;
                      const weight2 = p2.startsWith('temp_') ? label2.split('|').length : 1;
                      
                      const isSpike1 = getBubbleState(p1).isSpikeBubble;
                      const isSpike2 = getBubbleState(p2).isSpikeBubble;
                      if (isSpike1 && isSpike2) continue; // Cannot merge two spike bubbles

                      const reqLock1 = levelData?.requirementLockBubbles?.find((r: any) => r.requirementLockWord.toLowerCase() === label1);
                      if (reqLock1 && weight2 < reqLock1.requireWeight) continue;

                      const reqLock2 = levelData?.requirementLockBubbles?.find((r: any) => r.requirementLockWord.toLowerCase() === label2);
                      if (reqLock2 && weight1 < reqLock2.requireWeight) continue;
                      
                      const labels1 = label1.split('|');
                      const labels2 = label2.split('|');
                      
                      labels1.forEach(l => {
                          const burst = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === l);
                          if (burst) {
                              const dropTime = wordDropMove.get(l) || moveCount;
                              score = Math.max(score, 100 - (burst.movesRemaining - (moveCount - dropTime)) * 5);
                          }
                          const bc = levelData?.bombCrackingBubbles?.find((b: any) => b.word.toLowerCase() === l);
                          if (bc) {
                              const dropTime = wordDropMove.get(l) || moveCount;
                              score = Math.max(score, 100 - (bc.mergeRemain - (moveCount - dropTime)) * 5);
                          }
                      });
                      
                      labels2.forEach(l => {
                          const burst = levelData?.burstBubbles?.find((b: any) => b.word.toLowerCase() === l);
                          if (burst) {
                              const dropTime = wordDropMove.get(l) || moveCount;
                              score = Math.max(score, 100 - (burst.movesRemaining - (moveCount - dropTime)) * 5);
                          }
                          const bc = levelData?.bombCrackingBubbles?.find((b: any) => b.word.toLowerCase() === l);
                          if (bc) {
                              const dropTime = wordDropMove.get(l) || moveCount;
                              score = Math.max(score, 100 - (bc.mergeRemain - (moveCount - dropTime)) * 5);
                          }
                      });

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
        
        // Safety check to prevent infinite loop (e.g. bomb cracking loop) inside the merge loop
        if (moveCount > 100) {
          addStep('event', '', '', '', `⚠️ Simulation aborted: Infinite loop detected or level too complex (>100 moves).`);
          progress = false;
          mergedSomething = false;
          break;
        }

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

  const recommendedMoveLimit = Math.max(1, moveCount - bonusTurns + bombPenalties);
  const { difficulty, vocabDifficulty, moveDifficulty, learningDifficulty } = calculateDifficulty(nodes, edges, levelData, recommendedMoveLimit, steps);

  return {
    steps,
    totalMoves: moveCount,
    bonusTurns,
    recommendedMoveLimit,
    difficulty,
    vocabDifficulty,
    moveDifficulty,
    learningDifficulty
  };
}

function calculateDifficulty(nodes: Node[], _edges: Edge[], levelData: any, recommendedMoveLimit: number, steps: any[]) {
  // Compute Peak Congestion & Congestion Turns
  let peakCongestion = 0;
  let congestionTurns = 0;
  const maxBubbles = levelData?.maxBubblesInScene || 20;
  const threshold = maxBubbles * 0.8;

  steps.forEach((step: any) => {
    const boardSize = step.boardState?.length || 0;
    if (boardSize > peakCongestion) peakCongestion = boardSize;
    if (boardSize >= threshold) congestionTurns++;
  });

  const configMoveLimit = levelData?.moveLimit || 0;
  const moveTightness = configMoveLimit - recommendedMoveLimit;

  // 1. Vocabulary Difficulty calculation
  const wordNodes = nodes.filter(n => !n.data.isCategory && !n.data.isChunk);
  let ultraRare = 0; let veryRare = 0; let rare = 0; let common = 0;
  wordNodes.forEach(wn => {
    const wLabel = String(wn.data.label).toLowerCase();
    let foundPop: number | null = null;
    for (const cat of globalDict) {
      const match = cat.words.find((w: any) => w.word.toLowerCase() === wLabel);
      if (match && match.popularity !== undefined) {
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

  let rawRarityScore = (ultraRare * 6.0) + (veryRare * 3.0) + (rare * 0.5);
  const totalWords = wordNodes.length;
  const wordsNotDropped = Math.max(0, totalWords - maxBubbles);
  const rarityDensity = totalWords > 0 ? (ultraRare + veryRare + rare) / totalWords : 0;
  
  // Option 2: Density Multiplier
  const densityMultiplier = 1 + rarityDensity * 2;
  let finalRarityScore = rawRarityScore * densityMultiplier;
  
  if (totalWords > 0 && common > totalWords * 0.7) {
    finalRarityScore = Math.max(0, finalRarityScore - 10);
  }

  // Calculate Vocab Score
  const rawVocabScore = (wordsNotDropped * 1.0) + (finalRarityScore * 1.2);
  const vocabScore = Math.round(Math.max(0, Math.min(100, rawVocabScore)));
  
  const vocabFactors: string[] = [];
  vocabFactors.push(`Total Words: ${totalWords}`);
  vocabFactors.push(`Words in Queue (not dropped): ${wordsNotDropped}`);
  if (ultraRare > 0) vocabFactors.push(`${ultraRare} Ultra Rare words`);
  if (veryRare > 0) vocabFactors.push(`${veryRare} Very Rare words`);
  if (rare > 0) vocabFactors.push(`${rare} Rare words`);
  vocabFactors.push(`Rarity Density: ${Math.round(rarityDensity * 100)}%`);
  vocabFactors.push(`Density Multiplier: ${densityMultiplier.toFixed(2)}x`);

  const vocabLabel = getDifficultyLabel(vocabScore);
  const vocabColor = getDifficultyColor(vocabScore);

  // 2. Puzzle / Move Difficulty calculation
  let moveScore = 0;
  let moveLabel = 'Easy';
  let moveColor = '#22c55e'; // green-500
  const moveFactors: string[] = [];

  if (configMoveLimit <= 0) {
    moveScore = 0;
    moveLabel = 'Infinite';
    moveColor = '#22c55e';
    moveFactors.push(`Infinite moves enabled (${configMoveLimit})`);
  } else {
    const rawMoveScore = 30 + (peakCongestion * 2.5) + (congestionTurns * 1.5) - (moveTightness * 3.0);
    moveScore = Math.round(Math.max(0, Math.min(100, rawMoveScore)));
    moveLabel = getDifficultyLabel(moveScore);
    moveColor = getDifficultyColor(moveScore);
    moveFactors.push(`Peak Congestion: ${peakCongestion}`);
    moveFactors.push(`Congestion Turns: ${congestionTurns}`);
    moveFactors.push(`Move Tightness (Buffer): ${moveTightness}`);
  }

  // 3. New Combined Difficulty
  const nestedCount = nodes.filter(n => n.data.isCategory && !n.data.isRoot).length;
  let nestedPenalty = 0;
  if (nestedCount === 1) nestedPenalty = 5;
  else if (nestedCount === 2) nestedPenalty = 10;
  else if (nestedCount === 3) nestedPenalty = 20;
  else if (nestedCount === 4) nestedPenalty = 40;
  else if (nestedCount > 4) nestedPenalty = 40 + (nestedCount - 4) * 10;
  
  let bufferPenalty = 0;
  if (configMoveLimit > 0) {
    const moveBuffer = configMoveLimit - recommendedMoveLimit;
    if (moveBuffer < 10) {
      bufferPenalty = (10 - moveBuffer) * 8;
    } else if (moveBuffer > 15) {
      bufferPenalty = -Math.min(25, (moveBuffer - 15) * 2.0);
    }
  }

  // User Education / Mechanic Unfamiliarity Penalty
  let levelNumber = 0;
  if (levelData?.m_Name) {
    const match = levelData.m_Name.match(/\d+/);
    if (match) {
      levelNumber = parseInt(match[0]) + 1; // Convert 0-indexed to 1-indexed
    }
  }

  const INTRO_LEVELS: Record<string, number> = {
    nested: 5,
    separator: 20,
    frozen: 30,
    keyLock: 50,
    burst: 81,
    screwLock: 161,
    requirementLock: 201,
  };

  const activeMechanics: string[] = [];
  if (nestedCount > 0) activeMechanics.push('nested');
  if (levelData?.useBubbleSeparator > 0) activeMechanics.push('separator');
  if (levelData?.frozenBubbles && levelData.frozenBubbles.length > 0) activeMechanics.push('frozen');
  if (levelData?.keyLockBubbles && levelData.keyLockBubbles.length > 0) activeMechanics.push('keyLock');
  if (levelData?.burstBubbles && levelData.burstBubbles.length > 0) activeMechanics.push('burst');
  if (levelData?.bombCrackingBubbles && levelData.bombCrackingBubbles.length > 0) activeMechanics.push('bombCracking');
  if (levelData?.floatBubbles && levelData.floatBubbles.length > 0) activeMechanics.push('float');
  if (levelData?.teleportBubbles && levelData.teleportBubbles.length > 0) activeMechanics.push('teleport');
  if (levelData?.screwLockBubbles && levelData.screwLockBubbles.length > 0) activeMechanics.push('screwLock');
  if (levelData?.requirementLockBubbles && levelData.requirementLockBubbles.length > 0) activeMechanics.push('requirementLock');

  let mechanicUnfamiliarityScore = 0;
  const learningFactors: string[] = [];

  if (levelNumber > 0) {
    activeMechanics.forEach(mech => {
      const introLevel = INTRO_LEVELS[mech];
      if (introLevel) {
        const dist = levelNumber - introLevel;
        if (dist <= 2) {
          let penalty = 0;
          let desc = '';
          if (dist <= 0) {
            penalty = 20;
            desc = `New mechanic: ${mech} (+20)`;
          } else if (dist === 1) {
            penalty = 12;
            desc = `2nd encounter: ${mech} (+12)`;
          } else if (dist === 2) {
            penalty = 6;
            desc = `3rd encounter: ${mech} (+6)`;
          }
          mechanicUnfamiliarityScore += penalty;
          if (penalty > 0) {
            learningFactors.push(desc);
          }
        }
      }
    });
  }
  mechanicUnfamiliarityScore = Math.min(30, mechanicUnfamiliarityScore);
  if (mechanicUnfamiliarityScore > 0) {
    learningFactors.unshift(`Mechanic unfamiliarity penalty: +${mechanicUnfamiliarityScore}`);
  }

  // Progression Offset: 10 levels first default +15, then decreases by 5 every 10 levels
  const progressionOffset = levelNumber > 0 ? Math.max(0, 15 - Math.floor((levelNumber - 1) / 10) * 5) : 0;
  if (progressionOffset > 0) {
    learningFactors.push(`Progression stage offset (L${levelNumber}): +${progressionOffset}`);
  }

  const learningScore = Math.min(100, mechanicUnfamiliarityScore + progressionOffset);
  const learningLabel = getLearningLabel(learningScore);
  const learningColor = getLearningColor(learningScore);

  let proposedScore = (vocabScore * 0.35) + (moveScore * 0.65) + nestedPenalty + bufferPenalty + learningScore;
  if (configMoveLimit <= 0) {
    proposedScore = 0; // Infinite/Tutorial levels are always Easy (0.0)
  }
  proposedScore = Math.max(0, proposedScore);
  const score = Math.round(proposedScore * 10) / 10;

  const factors: string[] = [];
  factors.push(`Base Vocab Component (35%): ${(vocabScore * 0.35).toFixed(1)}`);
  factors.push(`Base Move Component (65%): ${(moveScore * 0.65).toFixed(1)}`);
  if (nestedCount > 0) {
    factors.push(`Nested Categories Penalty (${nestedCount}): +${nestedPenalty.toFixed(1)}`);
  }
  if (configMoveLimit > 0) {
    const moveBuffer = configMoveLimit - recommendedMoveLimit;
    if (bufferPenalty > 0) {
      factors.push(`Tight Move Buffer Penalty (Buffer: ${moveBuffer}): +${bufferPenalty.toFixed(1)}`);
    } else if (bufferPenalty < 0) {
      factors.push(`Generous Move Buffer Reward (Buffer: ${moveBuffer}): -${Math.abs(bufferPenalty).toFixed(1)}`);
    }
  }
  if (learningScore > 0) {
    factors.push(`Learning Penalty: +${learningScore.toFixed(1)}`);
  }

  const label = getDifficultyLabel(score);
  const color = getDifficultyColor(score);

  return {
    difficulty: { score, label, factors, color },
    vocabDifficulty: { score: vocabScore, label: vocabLabel, factors: vocabFactors, color: vocabColor },
    moveDifficulty: { score: moveScore, label: moveLabel, factors: moveFactors, color: moveColor },
    learningDifficulty: { score: learningScore, label: learningLabel, factors: learningFactors, color: learningColor }
  };
}

function getDifficultyLabel(score: number): string {
  if (score > 67) return 'Expert';
  if (score > 58) return 'Hard';
  if (score > 35) return 'Medium';
  return 'Easy';
}

function getDifficultyColor(score: number): string {
  if (score > 67) return '#ef4444'; // red-500
  if (score > 58) return '#f97316'; // orange-500
  if (score > 35) return '#eab308'; // yellow-500
  return '#22c55e'; // green-500
}

function getLearningLabel(score: number): string {
  if (score >= 35) return 'Steep';
  if (score >= 20) return 'Moderate';
  if (score >= 5) return 'Intuitive';
  return 'Familiar';
}

function getLearningColor(score: number): string {
  if (score >= 35) return '#ef4444'; // red-500
  if (score >= 20) return '#f97316'; // orange-500
  if (score >= 5) return '#eab308'; // yellow-500
  return '#22c55e'; // green-500
}
