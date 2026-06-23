import { useMemo, useState, useEffect } from 'react';
import { X, Calculator, ArrowRight, Zap, Target, LayoutGrid, Link as LinkIcon, Snowflake, Lock, Key, Bomb, Wrench, PenTool } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import { calculateSolution } from '../lib/solutionCalculator';

const lockKeyColors = [
  '#eab308', // yellow
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#14b8a6', // teal
  '#f97316', // orange
  '#3b82f6', // blue
  '#10b981'  // emerald
];

interface SolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  levelData: any;
  spawnQueueIds: string[];
}

export default function SolutionModal({ isOpen, onClose, nodes, edges, levelData, spawnQueueIds }: SolutionModalProps) {
  if (!isOpen) return null;

  const solution = useMemo(() => {
    return calculateSolution(nodes, edges, levelData, spawnQueueIds);
  }, [nodes, edges, levelData, spawnQueueIds]);

  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const [boardSortMode, setBoardSortMode] = useState<'default' | 'name' | 'family'>('default');

  const familyColors = useMemo(() => {
    const map = new Map<string, string>();
    const hues = [210, 350, 150, 40, 280, 190, 310, 90, 25, 240];
    let idx = 0;
    nodes.forEach(n => {
      if (n.data.isCategory || (!n.data.isChunk && !n.data.isCategory)) { // Parent capable nodes
        map.set(n.id, `hsla(${hues[idx % hues.length]}, 70%, 65%, 1)`);
        idx++;
      }
    });
    return map;
  }, [nodes]);

  // Auto-select the first step on open
  useEffect(() => {
    if (solution.steps.length > 0) {
      setSelectedStepIndex(0);
    } else {
      setSelectedStepIndex(null);
    }
  }, [solution]);

  const activeStep = selectedStepIndex !== null && solution.steps[selectedStepIndex] ? solution.steps[selectedStepIndex] : null;
  const activeBoardState = activeStep ? activeStep.boardState : [];
  const currentMove = activeStep ? activeStep.moveIndex : 0;

  const displayNodes = useMemo(() => {
    const list = activeBoardState.map((bubbleState: any, idx: number) => {
      const nodeId = bubbleState.id;
      let isTemp = false;
      let displayLabel = bubbleState.label;
      let familyId = nodeId;
      let familyName = '';
      let isChunk = false;
      let isCategory = false;
      let isChained = bubbleState.isChained;
      let chainMergesLeft = bubbleState.chainMergesLeft;
      let iceMergesLeft = bubbleState.iceMergesLeft;
      let crackMergesLeft = bubbleState.crackMergesLeft;
      let burstMovesRemaining = bubbleState.burstMovesRemaining;
      let lockIndex = bubbleState.lockIndex;
      let keyIndex = bubbleState.keyIndex;
      let screwCount = bubbleState.screwCount;
      let isScrewDriver = bubbleState.isScrewDriver;
      let screwLockIndex = bubbleState.screwLockIndex;
      let screwDriverIndex = bubbleState.screwDriverIndex;
      let node = nodes.find(n => n.id === nodeId);

      if (nodeId.startsWith('temp_[')) {
         isTemp = true;
         const match = nodeId.match(/^temp_\[(.*?)\]_\[(.*?)\]$/);
         if (match) {
            displayLabel = match[1];
            familyId = match[2];
         }
         isCategory = false; // it's a combined bubble
         const familyNode = nodes.find(n => n.id === familyId);
         if (familyNode) familyName = String(familyNode.data.label);
      } else {
         if (!node) return null;
         displayLabel = String(node.data.label);
         isChunk = Boolean(node.data.isChunk);
         isCategory = Boolean(node.data.isCategory);
         const parentEdge = edges.find(e => e.target === nodeId);
         familyId = parentEdge ? parentEdge.source : nodeId;
         const familyNode = nodes.find(n => n.id === familyId);
         if (familyNode) familyName = String(familyNode.data.label);
      }

      return { nodeId, node, isTemp, displayLabel, isChunk, isCategory, familyId, familyName, isChained, chainMergesLeft, iceMergesLeft, crackMergesLeft, burstMovesRemaining, lockIndex, keyIndex, screwCount, isScrewDriver, screwLockIndex, screwDriverIndex, originalIdx: idx };
    }).filter(Boolean) as any[];

    if (boardSortMode === 'name') {
      list.sort((a, b) => String(a.displayLabel).localeCompare(String(b.displayLabel)));
    } else if (boardSortMode === 'family') {
      list.sort((a, b) => {
        const famCmp = a.familyName.localeCompare(b.familyName);
        if (famCmp !== 0) return famCmp;
        return String(a.displayLabel).localeCompare(String(b.displayLabel));
      });
    }

    return list;
  }, [activeBoardState, nodes, edges, levelData, boardSortMode]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        width: '900px', maxWidth: '95vw', height: '85vh',
        background: 'var(--bg-main)', borderRadius: '16px',
        border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--panel-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={20} color="#818cf8" /> Level Solution & Difficulty
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Content - Two Columns */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          
          {/* LEFT COLUMN: Stats & Timeline */}
          <div style={{ flex: 3, padding: '20px', overflowY: 'auto', borderRight: '1px solid var(--panel-border)' }}>
            
            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {/* Moves & Score */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Performance Metrics
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Optimal Moves:</span>
                    <span style={{ fontWeight: 'bold' }}>{solution.totalMoves}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                    <span>Bonus Turns Earned:</span>
                    <span style={{ fontWeight: 'bold', color: '#22c55e' }}>+{solution.bonusTurns}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                    <span>Min Recommended Limit:</span>
                    <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{solution.recommendedMoveLimit}</span>
                  </div>
                </div>
              </div>

              {/* Difficulty */}
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Difficulty Rating
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '32px', fontWeight: 'bold', lineHeight: 1, color: solution.difficulty.color }}>
                    {solution.difficulty.score}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: solution.difficulty.color, marginBottom: '4px' }}>
                    {solution.difficulty.label}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {solution.difficulty.factors.map((factor: string, i: number) => (
                    <div key={i} style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                      <span style={{ color: solution.difficulty.color }}>•</span> {factor}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Target size={16} /> Optimal Merge Sequence
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', marginTop: '-8px' }}>
                Click on any step below to view the board state at that exact moment.
              </p>
              
              {solution.steps.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                  No merges required. Add words and chunks to the level.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {solution.steps.map((step: any, idx: number) => {
                    const isSelected = selectedStepIndex === idx;
                    
                    return (
                      <div 
                        key={step.id} 
                        onClick={() => setSelectedStepIndex(idx)}
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', 
                          background: isSelected 
                            ? 'rgba(56, 189, 248, 0.15)' 
                            : step.type === 'event' 
                              ? 'rgba(234, 179, 8, 0.05)' 
                              : step.type === 'success'
                                ? 'rgba(34, 197, 94, 0.05)'
                                : step.isComboBonus ? 'rgba(34, 197, 94, 0.05)' : 'rgba(255,255,255,0.02)', 
                          border: isSelected 
                            ? '1px solid var(--accent)' 
                            : step.type === 'event' 
                              ? '1px solid rgba(234, 179, 8, 0.2)' 
                              : step.type === 'success'
                                ? '1px solid rgba(34, 197, 94, 0.2)'
                                : step.isComboBonus ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid transparent',
                          borderRadius: '8px', cursor: 'pointer', transition: 'all 0.15s'
                        }}
                      >
                        {(step.type !== 'event' && step.type !== 'success') ? (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>{step.moveIndex}.</span>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>-</span>
                        )}
                        
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {(step.type === 'event' || step.type === 'success') ? (
                            <span style={{ fontSize: '13px', color: step.type === 'success' ? '#4ade80' : '#fde047', fontWeight: 600 }}>{step.text}</span>
                          ) : (
                            <>
                              <span style={{ 
                                padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                background: step.type === 'chunk' ? 'rgba(99,102,241,0.2)' : 'rgba(244,63,94,0.2)',
                                color: step.type === 'chunk' ? '#a5b4fc' : '#fda4af'
                              }}>{step.left}</span>
                              
                              <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>+</span>
                              
                              <span style={{ 
                                padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                                background: step.type === 'chunk' ? 'rgba(99,102,241,0.2)' : 'rgba(244,63,94,0.2)',
                                color: step.type === 'chunk' ? '#a5b4fc' : '#fda4af'
                              }}>{step.right}</span>
                              
                              <ArrowRight size={14} color="var(--text-muted)" style={{ margin: '0 4px' }} />
                              
                              <span style={{ 
                                padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold',
                                background: 'rgba(255,255,255,0.1)', color: 'white'
                              }}>{step.result}</span>
                            </>
                          )}
                        </div>

                        {step.isComboBonus && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: '12px', fontWeight: 'bold' }}>
                            <Zap size={14} fill="#4ade80" /> +1 Turn
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Board State */}
          <div style={{ flex: 2, padding: '20px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h4 style={{ margin: 0, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
                  <LayoutGrid size={16} /> Board State
                </h4>
                <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                  {['default', 'name', 'family'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setBoardSortMode(mode as any)}
                      style={{
                        padding: '2px 8px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', border: 'none',
                        background: boardSortMode === mode ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                        color: boardSortMode === mode ? 'white' : 'var(--text-muted)'
                      }}
                    >
                      {mode === 'default' ? 'Time' : mode === 'name' ? 'A-Z' : 'By Set'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: 'bold' }}>
                  Move {currentMove}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                  {activeBoardState.length} / {levelData?.maxBubblesInScene || 20} Bubbles
                </span>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
              {displayNodes.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '40px', fontStyle: 'italic' }}>
                  Board is empty.
                </div>
              ) : (
                displayNodes.map(({ nodeId, node, isTemp, displayLabel, isChunk, isCategory, familyId, isChained, chainMergesLeft, iceMergesLeft, crackMergesLeft, burstMovesRemaining, lockIndex, keyIndex, screwCount, isScrewDriver, screwLockIndex, screwDriverIndex, originalIdx }: any) => {
                  
                  const baseColorStr = familyColors.get(familyId) || 'hsla(230, 70%, 65%, 1)';
                  const familyBg = baseColorStr.replace(', 1)', ', 0.15)');
                  const familyBorder = baseColorStr.replace(', 1)', ', 0.4)');
                  
                  const useFamilyColor = boardSortMode === 'family';

                  const bgColor = useFamilyColor ? familyBg : (isChained ? 'rgba(129, 140, 248, 0.15)' : (isChunk ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.05)'));
                  const borderColor = useFamilyColor ? familyBorder : (isChained ? '1px solid rgba(129, 140, 248, 0.4)' : (isChunk ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--panel-border)'));
                  const textColor = useFamilyColor ? baseColorStr : (isChunk ? '#a5b4fc' : 'var(--text-main)');

                  return (
                    <div 
                      key={`${nodeId}-${originalIdx}`}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        padding: '8px 12px', borderRadius: '8px',
                        background: bgColor,
                        border: useFamilyColor ? `1px solid ${borderColor}` : borderColor,
                        color: textColor
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {!isChunk && !isCategory && !isTemp && node?.data?.icon && (
                            <img src={`/word_icon/${node.data.icon}.png`} alt="" style={{ width: 14, height: 14 }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }} />
                          )}
                          <strong style={{ textTransform: isChunk ? 'none' : 'capitalize' }}>{displayLabel}</strong>
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isChained && (
                            <span title={`Chained Bubble (${chainMergesLeft} groups left)`} style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#818cf8', fontSize: '11px', fontWeight: 'bold' }}>
                              <LinkIcon size={14} color="#818cf8" /> {chainMergesLeft > 0 ? chainMergesLeft : ''}
                            </span>
                          )}
                          {iceMergesLeft > 0 && (
                            <span title={`Frozen (${iceMergesLeft} groups left)`} style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#38bdf8', fontSize: '11px', fontWeight: 'bold' }}>
                              <Snowflake size={14} color="#38bdf8" /> {iceMergesLeft}
                            </span>
                          )}
                          {crackMergesLeft > 0 && (
                            <span title={`Cracked Glass (${crackMergesLeft} groups left)`} style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#fbbf24', fontSize: '11px', fontWeight: 'bold' }}>
                              <Snowflake size={14} color="#fbbf24" /> {crackMergesLeft}
                            </span>
                          )}
                          {burstMovesRemaining !== undefined && (
                            <span title={`Bomb (${burstMovesRemaining} moves left)`} style={{ display: 'flex', alignItems: 'center', gap: '2px', color: burstMovesRemaining <= 3 ? '#ef4444' : '#f97316', fontSize: '11px', fontWeight: 'bold' }}>
                              <Bomb size={14} color={burstMovesRemaining <= 3 ? '#ef4444' : '#f97316'} /> {burstMovesRemaining}
                            </span>
                          )}
                          {lockIndex !== -1 && lockIndex !== undefined && (
                            <span title="Locked Word" style={{ display: 'flex', alignItems: 'center', gap: '2px', color: lockKeyColors[lockIndex % lockKeyColors.length], fontSize: '11px', fontWeight: 'bold' }}>
                              <Lock size={14} color={lockKeyColors[lockIndex % lockKeyColors.length]} /> Locked
                            </span>
                          )}
                          {keyIndex !== -1 && keyIndex !== undefined && (
                            <span title="Key Word" style={{ display: 'flex', alignItems: 'center', gap: '2px', color: lockKeyColors[keyIndex % lockKeyColors.length], fontSize: '11px', fontWeight: 'bold' }}>
                              <Key size={14} color={lockKeyColors[keyIndex % lockKeyColors.length]} /> Key
                            </span>
                          )}
                          {screwCount !== undefined && screwCount > 0 && (
                            <span title={`Screw Locked (${screwCount} left)`} style={{ display: 'flex', alignItems: 'center', gap: '2px', color: (screwLockIndex !== undefined && screwLockIndex !== -1) ? lockKeyColors[screwLockIndex % lockKeyColors.length] : '#f97316', fontSize: '11px', fontWeight: 'bold' }}>
                              <Wrench size={14} color={(screwLockIndex !== undefined && screwLockIndex !== -1) ? lockKeyColors[screwLockIndex % lockKeyColors.length] : '#f97316'} /> {screwCount}
                            </span>
                          )}
                          {isScrewDriver && (
                            <span title="Screw Driver" style={{ display: 'flex', alignItems: 'center', gap: '2px', color: (screwDriverIndex !== undefined && screwDriverIndex !== -1) ? lockKeyColors[screwDriverIndex % lockKeyColors.length] : '#fb923c', fontSize: '11px', fontWeight: 'bold' }}>
                              <PenTool size={14} color={(screwDriverIndex !== undefined && screwDriverIndex !== -1) ? lockKeyColors[screwDriverIndex % lockKeyColors.length] : '#fb923c'} /> Driver
                            </span>
                          )}
                          <span style={{ fontSize: '10px', opacity: 0.7, padding: '2px 4px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                            {isTemp ? 'Merged Bubble' : (isChunk ? 'Chunk' : (isCategory ? 'Category' : 'Word'))}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
