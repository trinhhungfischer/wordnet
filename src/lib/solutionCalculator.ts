import type { Node, Edge } from '@xyflow/react';

export interface MergeStep {
  id: string;
  type: 'chunk' | 'category';
  left: string;
  right: string;
  result: string;
  isComboBonus: boolean;
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

export function calculateSolution(nodes: Node[], edges: Edge[], levelData: any): SolutionResult {
  const steps: MergeStep[] = [];
  let moveCount = 0;
  let bonusTurns = 0;
  let stepIdCounter = 1;

  const addStep = (type: 'chunk' | 'category', left: string, right: string, result: string) => {
    moveCount++;
    const isComboBonus = moveCount % 5 === 0;
    if (isComboBonus) bonusTurns++;
    
    steps.push({
      id: `step-${stepIdCounter++}`,
      type,
      left,
      right,
      result,
      isComboBonus
    });
  };

  // Phase 1: Chunk merges
  const rootWords = nodes.filter(n => !n.data.isCategory && !n.data.isChunk);
  
  rootWords.forEach(wordNode => {
    const chunkEdges = edges.filter(e => e.source === wordNode.id);
    const chunkNodes = chunkEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as Node[];
    const chunks = chunkNodes.filter(n => n.data.isChunk).map(n => String(n.data.label));
    
    if (chunks.length > 0) {
      let currentString = chunks[0];
      for (let i = 1; i < chunks.length; i++) {
        const nextChunk = chunks[i];
        const mergedString = currentString + nextChunk;
        addStep('chunk', currentString, nextChunk, mergedString);
        currentString = mergedString;
      }
    }
  });

  // Phase 2: Category merges
  const categories = nodes.filter(n => n.data.isCategory);
  
  categories.forEach(catNode => {
    const childEdges = edges.filter(e => e.source === catNode.id);
    const childNodes = childEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as Node[];
    const words = childNodes.filter(n => !n.data.isChunk).map(n => String(n.data.label));
    
    if (words.length > 1) {
      let currentBubble = String(catNode.data.label);
      
      // The first merge is word 1 + word 2 -> category bubble
      addStep('category', words[0], words[1], currentBubble);
      
      for (let i = 2; i < words.length; i++) {
        addStep('category', currentBubble, words[i], currentBubble);
      }
    } else if (words.length === 1) {
      // Just a single word in this category? Merge it into the category bubble directly?
      // Usually categories need at least 2 words to merge.
    }
  });

  const recommendedMoveLimit = Math.max(1, moveCount - bonusTurns + 2); // +2 margin of error

  // Calculate Difficulty
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
