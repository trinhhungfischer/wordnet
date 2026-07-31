import React, { useState, useEffect, useMemo } from 'react';
import { X, Magnet, Link, Calculator, Snowflake, Lock, Key, Bomb, Eye, Wrench, PenTool, ArrowLeftRight, RefreshCw, CircleDashed, Pin, Timer, Zap, Dumbbell, Radiation, Ghost, Asterisk, Flame, Cloud } from 'lucide-react';
import { lockKeyColors } from './GraphEditor';

interface LevelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  levelData: any;
  onSave: (newData: any) => void;
  onFocusWord?: (word: string) => void;
  onCalculateSolution?: () => void;
  levelName?: string;
}

function Toggle({ checked, onChange }: { checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <div 
      onClick={() => onChange(!checked)}
      style={{
        width: '36px', height: '20px', borderRadius: '10px',
        background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.2)',
        position: 'relative', cursor: 'pointer', transition: 'all 0.2s',
        flexShrink: 0
      }}
    >
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%', background: 'white',
        position: 'absolute', top: '2px', left: checked ? '18px' : '2px',
        transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }} />
    </div>
  );
}

export default function LevelSettings({ isOpen, onClose, levelData, onSave, onFocusWord, onCalculateSolution, levelName }: LevelSettingsProps) {
  const [forceOpen, setForceOpen] = useState<Record<string, boolean>>({});

  const existingChunks = useMemo(() => {
    const chunks = new Set<string>();
    if (levelData?.allWordEntries) {
      levelData.allWordEntries.forEach((e: any) => {
        if (e.chunks && Array.isArray(e.chunks)) {
          e.chunks.forEach((c: string) => chunks.add(c.toLowerCase()));
        }
      });
    }
    return chunks;
  }, [levelData]);

  const [sortedMechanicIds, setSortedMechanicIds] = useState<string[]>([]);
  
  const mechanicsConfig = [
    {
      id: 'chain',
      isActive: () => levelData.useBubbleSeparator === 1,
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Link size={16} color="#818cf8" />
                    Mechanic: Chain
                  </h3>
                  <Toggle 
                    checked={levelData.useBubbleSeparator === 1}
                    onChange={(checked) => {
                      onSave({
                        ...levelData,
                        useBubbleSeparator: checked ? 1 : 0,
                        bubbleSeparatorData: checked ? levelData.bubbleSeparatorData : undefined
                      });
                    }}
                  />
                </div>
        
                {levelData.useBubbleSeparator === 1 && (
                  <div style={{ marginTop: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Break Threshold:</span>
                        <input 
                          type="number" 
                          value={levelData.bubbleSeparatorData?.breakThreshold || 3}
                          onChange={(e) => handleDeepChange('bubbleSeparatorData', 'breakThreshold', parseInt(e.target.value) || 3)}
                          style={{ width: '50px', padding: '4px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none' }}
                        />
                      </div>
                      
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        Linked Words (Drag & Drop from left panel):
                      </div>
                      <div 
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                          if (wordLabel) {
                            const currentLinkedWords = levelData.bubbleSeparatorData?.linkedWords || [];
                            if (!currentLinkedWords.includes(wordLabel)) {
                              handleDeepChange('bubbleSeparatorData', 'linkedWords', [...currentLinkedWords, wordLabel]);
                            }
                          }
                        }}
                        style={{ 
                          minHeight: '80px', padding: '8px', border: '1px dashed rgba(99,102,241,0.5)', 
                          borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexWrap: 'wrap', gap: '6px', alignContent: 'flex-start'
                        }}
                      >
                        {(!levelData.bubbleSeparatorData?.linkedWords || levelData.bubbleSeparatorData.linkedWords.length === 0) ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                            Drop words here
                          </span>
                        ) : (
                          levelData.bubbleSeparatorData.linkedWords.map((word: string, i: number) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
                              <span 
                                onClick={() => {
                                  if (onFocusWord) onFocusWord(word);
                                }}
                                style={{ 
                                  fontSize: '13px', fontWeight: 600, background: 'rgba(99,102,241,0.25)', color: 'white', 
                                  padding: '4px 10px', borderRadius: '6px 0 0 6px', display: 'flex', alignItems: 'center', gap: '4px',
                                  cursor: 'pointer', transition: 'all 0.2s', border: '1px solid rgba(99,102,241,0.3)', borderRight: 'none'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.4)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(99,102,241,0.25)'}
                              >
                                {word}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeepChange('bubbleSeparatorData', 'linkedWords', levelData.bubbleSeparatorData.linkedWords.filter((w: string) => w !== word));
                                }}
                                style={{ 
                                  background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.3)', 
                                  color: '#fca5a5', cursor: 'pointer', padding: '4px 8px', fontSize: '14px', lineHeight: 1,
                                  borderRadius: '0 6px 6px 0', transition: 'all 0.2s'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.4)'}
                                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                              >
                                &times;
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                  </div>
                )}
              </div>
        
              
      )
    },
    {
      id: 'frozen',
      isActive: () => forceOpen.frozen || (levelData.frozenBubbles && levelData.frozenBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Snowflake size={16} color="#38bdf8" />
                    Mechanic: Frozen Bubbles
                  </h3>
                  <Toggle 
                    checked={forceOpen.frozen || (levelData.frozenBubbles && levelData.frozenBubbles.length > 0)}
                    onChange={(checked) => {
                      setForceOpen(prev => ({ ...prev, frozen: checked }));
                      handleChange('frozenBubbles', checked ? [] : undefined);
                    }}
                  />
                </div>
                {(forceOpen.frozen || (levelData.frozenBubbles && levelData.frozenBubbles.length > 0)) && (
                  <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Frozen Words (Drag & Drop from left panel):
                  </div>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const currentFrozen = levelData.frozenBubbles || [];
                        if (!currentFrozen.some((f: any) => f.word === wordLabel)) {
                          handleChange('frozenBubbles', [...currentFrozen, { word: wordLabel, mergesNeeded: 5 }]);
                        }
                      }
                    }}
                    style={{ 
                      minHeight: '80px', padding: '8px', border: '1px dashed rgba(56,189,248,0.5)', 
                      borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}
                  >
                    {(!levelData.frozenBubbles || levelData.frozenBubbles.length === 0) ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        Drop words here
                      </span>
                    ) : (
                      levelData.frozenBubbles.map((frozenItem: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(56,189,248,0.15)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(56,189,248,0.3)' }}>
                          <span 
                            onClick={() => {
                              if (onFocusWord) onFocusWord(frozenItem.word);
                            }}
                            style={{ 
                              fontSize: '13px', fontWeight: 600, color: 'white', 
                              cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'
                            }}
                          >
                            {frozenItem.word}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Merges:</span>
                            <input 
                              type="number" 
                              value={frozenItem.mergesNeeded}
                              onChange={(e) => {
                                const newFrozen = [...levelData.frozenBubbles];
                                newFrozen[i].mergesNeeded = parseInt(e.target.value) || 1;
                                handleChange('frozenBubbles', newFrozen);
                              }}
                              style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                            />
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChange('frozenBubbles', levelData.frozenBubbles.filter((f: any) => f.word !== frozenItem.word));
                            }}
                            style={{ 
                              background: 'transparent', border: 'none', 
                              color: '#fca5a5', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  </div>
                )}
              </div>
        
              
      )
    },
    {
      id: 'crack',
      isActive: () => forceOpen.crack || (levelData.crackBubbles && levelData.crackBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="#fbbf24" />
              Mechanic: Crack Bubbles
            </h3>
            <Toggle 
              checked={forceOpen.crack || (levelData.crackBubbles && levelData.crackBubbles.length > 0)}
              onChange={(checked) => {
                setForceOpen(prev => ({ ...prev, crack: checked }));
                handleChange('crackBubbles', checked ? [] : undefined);
              }}
            />
          </div>
          {(forceOpen.crack || (levelData.crackBubbles && levelData.crackBubbles.length > 0)) && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Crack Words (Drag & Drop from left panel):
              </div>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                  if (wordLabel) {
                    const currentCracks = levelData.crackBubbles || [];
                    if (!currentCracks.some((c: any) => c.word === wordLabel)) {
                      let chunksToSpawn: string[] = [];
                      if (levelData.allWordEntries) {
                        const entry = levelData.allWordEntries.find((e: any) => String(e.fullWord).toLowerCase() === String(wordLabel).toLowerCase());
                        if (entry && entry.chunks) {
                          chunksToSpawn = [...entry.chunks];
                        }
                      }
                      handleChange('crackBubbles', [...currentCracks, { word: wordLabel, crackCount: 3, chunkWords: chunksToSpawn }]);
                    }
                  }
                }}
                style={{ 
                  minHeight: '80px', padding: '8px', border: '1px dashed rgba(251,191,36,0.5)', 
                  borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                }}
              >
                {(!levelData.crackBubbles || levelData.crackBubbles.length === 0) ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    Drop words here to add Crack Bubbles
                  </span>
                ) : (
                  levelData.crackBubbles.map((crackItem: any, i: number) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(251,191,36,0.1)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(251,191,36,0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{ cursor: 'pointer', display: 'flex' }}
                            onClick={() => {
                              if (onFocusWord) onFocusWord(crackItem.word);
                            }}
                            title={`Focus on ${crackItem.word}`}
                          >
                            <Zap size={14} color="#fbbf24" />
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '4px' }}>
                            {crackItem.word && String(crackItem.word).split('').map((char: string, charIdx: number) => {
                               const wStr = String(crackItem.word);
                               const c1 = crackItem.chunkWords[0] || '';
                               const c2 = crackItem.chunkWords[1] || '';
                               const isCurrentCut = (c1 === wStr.slice(0, charIdx) && c2 === wStr.slice(charIdx));
                               
                               return (
                                 <React.Fragment key={charIdx}>
                                   {charIdx > 0 && (
                                     <div 
                                       onClick={() => {
                                          const newCracks = [...levelData.crackBubbles];
                                          newCracks[i].chunkWords[0] = wStr.slice(0, charIdx);
                                          newCracks[i].chunkWords[1] = wStr.slice(charIdx);
                                          handleChange('crackBubbles', newCracks);
                                       }}
                                       title={`Cut here: ${wStr.slice(0, charIdx)} + ${wStr.slice(charIdx)}`}
                                       style={{
                                          width: '12px', height: '16px', cursor: 'pointer',
                                          background: isCurrentCut ? 'rgba(251,191,36,0.8)' : 'transparent',
                                          borderLeft: '1px dashed rgba(255,255,255,0.1)',
                                          borderRight: '1px dashed rgba(255,255,255,0.1)',
                                          margin: '0 2px',
                                          borderRadius: '2px',
                                          transition: 'background 0.2s'
                                       }}
                                       onMouseEnter={(e) => {
                                          if (!isCurrentCut) e.currentTarget.style.background = 'rgba(251,191,36,0.3)';
                                       }}
                                       onMouseLeave={(e) => {
                                          if (!isCurrentCut) e.currentTarget.style.background = 'transparent';
                                       }}
                                     />
                                   )}
                                   <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{char}</span>
                                 </React.Fragment>
                               );
                            })}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hits:</span>
                          <input 
                            type="number" 
                            value={crackItem.crackCount}
                            onChange={(e) => {
                              const newCracks = [...levelData.crackBubbles];
                              newCracks[i].crackCount = parseInt(e.target.value) || 1;
                              handleChange('crackBubbles', newCracks);
                            }}
                            style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                          />
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChange('crackBubbles', levelData.crackBubbles.filter((c: any) => c.word !== crackItem.word));
                            }}
                            style={{ 
                              background: 'transparent', border: 'none', 
                              color: '#fca5a5', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      </div>
                      
                      <div 
                        style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}
                      >
                        Chunks to spawn (Cut above or type):
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '6px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                          
                          {/* Inputs with Duplication Check */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <div style={{ position: 'relative', width: '50%' }}>
                              <input
                                type="text"
                                placeholder="Chunk 1"
                                value={crackItem.chunkWords[0] || ''}
                                onChange={(e) => {
                                  const newCracks = [...levelData.crackBubbles];
                                  newCracks[i].chunkWords[0] = e.target.value;
                                  handleChange('crackBubbles', newCracks);
                                }}
                                style={{ 
                                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
                                  outline: 'none', color: 'white', fontSize: '12px', padding: '4px 20px 4px 8px', 
                                  borderRadius: '4px', width: '100%', textAlign: 'center', boxSizing: 'border-box'
                                }}
                              />
                              {(crackItem.chunkWords[0] && existingChunks.has(crackItem.chunkWords[0].toLowerCase())) ? (
                                <span title="Chunk already exists in level" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: '#4ade80', fontSize: '11px', fontWeight: 'bold' }}>✓</span>
                              ) : null}
                            </div>
                            <span style={{ color: 'var(--text-muted)' }}>+</span>
                            <div style={{ position: 'relative', width: '50%' }}>
                              <input
                                type="text"
                                placeholder="Chunk 2"
                                value={crackItem.chunkWords[1] || ''}
                                onChange={(e) => {
                                  const newCracks = [...levelData.crackBubbles];
                                  newCracks[i].chunkWords[1] = e.target.value;
                                  handleChange('crackBubbles', newCracks);
                                }}
                                style={{ 
                                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', 
                                  outline: 'none', color: 'white', fontSize: '12px', padding: '4px 20px 4px 8px', 
                                  borderRadius: '4px', width: '100%', textAlign: 'center', boxSizing: 'border-box'
                                }}
                              />
                              {(crackItem.chunkWords[1] && existingChunks.has(crackItem.chunkWords[1].toLowerCase())) ? (
                                <span title="Chunk already exists in level" style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', color: '#4ade80', fontSize: '11px', fontWeight: 'bold' }}>✓</span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'icebomb',
      isActive: () => forceOpen.icebomb || (levelData.iceBombBubbles && levelData.iceBombBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Radiation size={16} color="#38bdf8" />
              Mechanic: Ice Bomb Bubbles
            </h3>
            <Toggle 
              checked={forceOpen.icebomb || (levelData.iceBombBubbles && levelData.iceBombBubbles.length > 0)}
              onChange={(checked) => {
                setForceOpen(prev => ({ ...prev, icebomb: checked }));
                handleChange('iceBombBubbles', checked ? [] : undefined);
              }}
            />
          </div>
          {(forceOpen.icebomb || (levelData.iceBombBubbles && levelData.iceBombBubbles.length > 0)) && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Ice Bomb Words (Drag & Drop from left panel):
              </div>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                  if (wordLabel) {
                    const currentIceBombs = levelData.iceBombBubbles || [];
                    if (!currentIceBombs.some((f: any) => f.word === wordLabel)) {
                      handleChange('iceBombBubbles', [...currentIceBombs, { word: wordLabel, turnToActive: 5, freezeTurns: 5 }]);
                    }
                  }
                }}
                style={{ 
                  minHeight: '80px', padding: '8px', border: '1px dashed rgba(56,189,248,0.5)', 
                  borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                }}
              >
                {(!levelData.iceBombBubbles || levelData.iceBombBubbles.length === 0) ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    Drop words here
                  </span>
                ) : (
                  levelData.iceBombBubbles.map((iceBombItem: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(56,189,248,0.15)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(56,189,248,0.3)' }}>
                      <span 
                        onClick={() => {
                          if (onFocusWord) onFocusWord(iceBombItem.word);
                        }}
                        style={{ 
                          fontSize: '13px', fontWeight: 600, color: 'white', 
                          cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'
                        }}
                      >
                        {iceBombItem.word}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Merges:</span>
                        <input 
                          type="number" 
                          value={iceBombItem.turnToActive}
                          onChange={(e) => {
                            const newIceBombs = [...levelData.iceBombBubbles];
                            newIceBombs[i].turnToActive = parseInt(e.target.value) || 1;
                            handleChange('iceBombBubbles', newIceBombs);
                          }}
                          style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Freeze:</span>
                        <input 
                          type="number" 
                          value={iceBombItem.freezeTurns}
                          onChange={(e) => {
                            const newIceBombs = [...levelData.iceBombBubbles];
                            newIceBombs[i].freezeTurns = parseInt(e.target.value) || 1;
                            handleChange('iceBombBubbles', newIceBombs);
                          }}
                          style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                        />
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChange('iceBombBubbles', levelData.iceBombBubbles.filter((f: any) => f.word !== iceBombItem.word));
                        }}
                        style={{ 
                          background: 'transparent', border: 'none', 
                          color: '#fca5a5', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1
                        }}
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'burst',
      isActive: () => forceOpen.burst || (levelData.burstBubbles && levelData.burstBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Bomb size={16} color="#f97316" />
                    Mechanic: Burst Bubbles (Bombs)
                  </h3>
                  <Toggle 
                    checked={forceOpen.burst || (levelData.burstBubbles && levelData.burstBubbles.length > 0)}
                    onChange={(checked) => {
                      setForceOpen(prev => ({ ...prev, burst: checked }));
                      handleChange('burstBubbles', checked ? [] : undefined);
                    }}
                  />
                </div>
                {(forceOpen.burst || (levelData.burstBubbles && levelData.burstBubbles.length > 0)) && (
                  <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Bomb Words (Drag & Drop from left panel):
                  </div>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const currentBurst = levelData.burstBubbles || [];
                        if (!currentBurst.some((b: any) => b.word === wordLabel)) {
                          handleChange('burstBubbles', [...currentBurst, { word: wordLabel, movesRemaining: 6 }]);
                        }
                      }
                    }}
                    style={{ 
                      minHeight: '80px', padding: '8px', border: '1px dashed rgba(249,115,22,0.5)', 
                      borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}
                  >
                    {(!levelData.burstBubbles || levelData.burstBubbles.length === 0) ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        Drop words here
                      </span>
                    ) : (
                      levelData.burstBubbles.map((burstItem: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(249,115,22,0.15)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(249,115,22,0.3)' }}>
                          <span 
                            onClick={() => {
                              if (onFocusWord) onFocusWord(burstItem.word);
                            }}
                            style={{ 
                              fontSize: '13px', fontWeight: 600, color: 'white', 
                              cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'
                            }}
                          >
                            {burstItem.word}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Moves:</span>
                            <input 
                              type="number" 
                              value={burstItem.movesRemaining}
                              onChange={(e) => {
                                const newBurst = [...levelData.burstBubbles];
                                newBurst[i].movesRemaining = parseInt(e.target.value) || 1;
                                handleChange('burstBubbles', newBurst);
                              }}
                              style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                            />
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChange('burstBubbles', levelData.burstBubbles.filter((b: any) => b.word !== burstItem.word));
                            }}
                            style={{ 
                              background: 'transparent', border: 'none', 
                              color: '#fca5a5', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  </div>
                )}
              </div>
        
              
      )
    },
    {
      id: 'backward',
      isActive: () => forceOpen.backward || (levelData.backwardBubbles && levelData.backwardBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ArrowLeftRight size={16} color="#a855f7" />
                    Mechanic: Từ Ngược (Backward)
                  </h3>
                  <Toggle 
                    checked={forceOpen.backward || (levelData.backwardBubbles && levelData.backwardBubbles.length > 0)}
                    onChange={(checked) => {
                      setForceOpen(prev => ({ ...prev, backward: checked }));
                      handleChange('backwardBubbles', checked ? [] : undefined);
                    }}
                  />
                </div>
                {(forceOpen.backward || (levelData.backwardBubbles && levelData.backwardBubbles.length > 0)) && (
                  <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Backward Words (Drag & Drop from left panel):
                  </div>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const currentBackward = levelData.backwardBubbles || [];
                        if (!currentBackward.some((b: any) => b.word === wordLabel)) {
                          handleChange('backwardBubbles', [...currentBackward, { word: wordLabel }]);
                        }
                      }
                    }}
                    style={{ 
                      minHeight: '80px', padding: '8px', border: '1px dashed rgba(168,85,247,0.5)', 
                      borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}
                  >
                    {(!levelData.backwardBubbles || levelData.backwardBubbles.length === 0) ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        Drop words here
                      </span>
                    ) : (
                      levelData.backwardBubbles.map((bwItem: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(168,85,247,0.15)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(168,85,247,0.3)' }}>
                          <span 
                            onClick={() => {
                              if (onFocusWord) onFocusWord(bwItem.word);
                            }}
                            style={{ 
                              fontSize: '13px', fontWeight: 600, color: 'white', 
                              cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'
                            }}
                          >
                            {bwItem.word}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChange('backwardBubbles', levelData.backwardBubbles.filter((b: any) => b.word !== bwItem.word));
                            }}
                            style={{ 
                              background: 'transparent', border: 'none', 
                              color: '#d8b4fe', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  </div>
                )}
              </div>
        
              
      )
    },
    {
      id: 'keyLock',
      isActive: () => forceOpen.keyLock || (levelData.keyLockBubbles && levelData.keyLockBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Lock size={16} color="#eab308" />
                    Mechanic: Locks & Keys
                  </h3>
                  <Toggle 
                    checked={forceOpen.keyLock || (levelData.keyLockBubbles && levelData.keyLockBubbles.length > 0)}
                    onChange={(checked) => {
                      setForceOpen(prev => ({ ...prev, keyLock: checked }));
                      handleChange('keyLockBubbles', checked ? [] : undefined);
                    }}
                  />
                </div>
                {(forceOpen.keyLock || (levelData.keyLockBubbles && levelData.keyLockBubbles.length > 0)) && (
                  <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Lock Words (Drag & Drop from left panel):
                  </div>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const currentLocks = levelData.keyLockBubbles || [];
                        if (!currentLocks.some((l: any) => l.lockWord === wordLabel)) {
                          handleChange('keyLockBubbles', [...currentLocks, { lockWord: wordLabel, keyWord: '' }]);
                        }
                      }
                    }}
                    style={{ 
                      minHeight: '80px', padding: '8px', border: '1px dashed rgba(234,179,8,0.5)', 
                      borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}
                  >
                    {(!levelData.keyLockBubbles || levelData.keyLockBubbles.length === 0) ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        Drop words here to add Locks
                      </span>
                    ) : (
                      levelData.keyLockBubbles.map((lockItem: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(234,179,8,0.15)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(234,179,8,0.3)' }}>
                          <Lock size={14} color={lockKeyColors[i % lockKeyColors.length]} />
                          <span 
                            onClick={() => {
                              if (onFocusWord) onFocusWord(lockItem.lockWord);
                            }}
                            style={{ 
                              fontSize: '13px', fontWeight: 600, color: 'white', 
                              cursor: 'pointer', maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis'
                            }}
                            title={lockItem.lockWord}
                          >
                            {lockItem.lockWord}
                          </span>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1 }}>
                            <Key size={14} color={lockKeyColors[i % lockKeyColors.length]} />
                            <input 
                              type="text" 
                              placeholder="Key Word..."
                              value={lockItem.keyWord}
                              onChange={(e) => {
                                const newLocks = [...levelData.keyLockBubbles];
                                newLocks[i].keyWord = e.target.value;
                                handleChange('keyLockBubbles', newLocks);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                                if (wordLabel) {
                                  const newLocks = [...levelData.keyLockBubbles];
                                  newLocks[i].keyWord = wordLabel;
                                  handleChange('keyLockBubbles', newLocks);
                                }
                              }}
                              style={{ width: '100%', minWidth: '60px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                              title="Type key word or drop a word here"
                            />
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChange('keyLockBubbles', levelData.keyLockBubbles.filter((l: any) => l.lockWord !== lockItem.lockWord));
                            }}
                            style={{ 
                              background: 'transparent', border: 'none', 
                              color: '#fca5a5', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  </div>
                )}
              </div>
        
              
      )
    },
    {
      id: 'screwLock',
      isActive: () => forceOpen.screwLock || (levelData.screwLockBubbles && levelData.screwLockBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Wrench size={16} color="#f97316" />
                    Mechanic: Screw Lock
                  </h3>
                  <Toggle 
                    checked={forceOpen.screwLock || (levelData.screwLockBubbles && levelData.screwLockBubbles.length > 0)}
                    onChange={(checked) => {
                      setForceOpen(prev => ({ ...prev, screwLock: checked }));
                      handleChange('screwLockBubbles', checked ? [] : undefined);
                    }}
                  />
                </div>
                {(forceOpen.screwLock || (levelData.screwLockBubbles && levelData.screwLockBubbles.length > 0)) && (
                  <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Screw Lock Words (Drag & Drop from left panel):
                  </div>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const currentScrews = levelData.screwLockBubbles || [];
                        if (!currentScrews.some((s: any) => s.screwLockWord === wordLabel)) {
                          handleChange('screwLockBubbles', [...currentScrews, { screwLockWord: wordLabel, screwDriverWords: [], id: currentScrews.length, screwCount: 0 }]);
                        }
                      }
                    }}
                    style={{ 
                      minHeight: '80px', padding: '8px', border: '1px dashed rgba(249,115,22,0.5)', 
                      borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}
                  >
                    {(!levelData.screwLockBubbles || levelData.screwLockBubbles.length === 0) ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        Drop words here to add Screw Locks
                      </span>
                    ) : (
                      levelData.screwLockBubbles.map((screwItem: any, i: number) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'rgba(249,115,22,0.1)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(249,115,22,0.3)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Wrench size={14} color={lockKeyColors[i % lockKeyColors.length]} />
                              <span 
                                onClick={() => {
                                  if (onFocusWord) onFocusWord(screwItem.screwLockWord);
                                }}
                                style={{ 
                                  fontSize: '13px', fontWeight: 600, color: 'white', 
                                  cursor: 'pointer', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis'
                                }}
                                title={screwItem.screwLockWord}
                              >
                                {screwItem.screwLockWord}
                              </span>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChange('screwLockBubbles', levelData.screwLockBubbles.filter((s: any) => s.screwLockWord !== screwItem.screwLockWord));
                              }}
                              style={{ 
                                background: 'transparent', border: 'none', 
                                color: '#fca5a5', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1
                              }}
                            >
                              &times;
                            </button>
                          </div>
                          <div 
                            style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                              if (wordLabel && !screwItem.screwDriverWords.includes(wordLabel)) {
                                const newScrews = [...levelData.screwLockBubbles];
                                newScrews[i].screwDriverWords.push(wordLabel);
                                newScrews[i].screwCount = newScrews[i].screwDriverWords.length;
                                handleChange('screwLockBubbles', newScrews);
                              }
                            }}
                          >
                            Driver Words: (Drop here)
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px', minHeight: '20px', padding: '4px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', border: '1px dashed rgba(255,255,255,0.2)' }}>
                              {screwItem.screwDriverWords.map((driver: string, dIdx: number) => (
                                <div key={dIdx} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: 'white' }}>
                                  <PenTool size={10} color={lockKeyColors[i % lockKeyColors.length]} />
                                  <span
                                    onClick={() => {
                                      if (onFocusWord) onFocusWord(driver);
                                    }}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    {driver}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newScrews = [...levelData.screwLockBubbles];
                                      newScrews[i].screwDriverWords = newScrews[i].screwDriverWords.filter((d: string) => d !== driver);
                                      newScrews[i].screwCount = newScrews[i].screwDriverWords.length;
                                      handleChange('screwLockBubbles', newScrews);
                                    }}
                                    style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0, marginLeft: '2px', fontSize: '12px' }}
                                  >&times;</button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  </div>
                )}
              </div>
        
              
      )
    },
    {
      id: 'cycleLock',
      isActive: () => forceOpen.cycleLock || (levelData.cycleLockBubbles && levelData.cycleLockBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={16} color="#14b8a6" />
                    Mechanic: Cycle Lock
                  </h3>
                  <Toggle 
                    checked={forceOpen.cycleLock || (levelData.cycleLockBubbles && levelData.cycleLockBubbles.length > 0)}
                    onChange={(checked) => {
                      setForceOpen(prev => ({ ...prev, cycleLock: checked }));
                      handleChange('cycleLockBubbles', checked ? [] : undefined);
                    }}
                  />
                </div>
                
                {(forceOpen.cycleLock || (levelData.cycleLockBubbles && levelData.cycleLockBubbles.length > 0)) && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Cycle Lock Words (Drag & Drop from left panel):
                    </div>
                    
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                        if (wordLabel) {
                          const currentCycleLocks = levelData.cycleLockBubbles || [];
                          if (!currentCycleLocks.some((c: any) => c.cycleLockWord === wordLabel)) {
                            handleChange('cycleLockBubbles', [...currentCycleLocks, { cycleLockWord: wordLabel, startingPosition: 0 }]);
                          }
                        }
                      }}
                      style={{ 
                        minHeight: '60px', padding: '8px', border: '1px dashed rgba(20,184,166,0.5)', 
                        borderRadius: '6px', background: 'rgba(20,184,166,0.05)', display: 'flex', flexDirection: 'column', gap: '8px'
                      }}
                    >
                      {(!levelData.cycleLockBubbles || levelData.cycleLockBubbles.length === 0) ? (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '44px' }}>
                          Drop words here to add Cycle Locks
                        </span>
                      ) : (
                        levelData.cycleLockBubbles.map((cycleLock: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <RefreshCw size={14} color="#14b8a6" />
                              <span 
                                onClick={() => {
                                  if (onFocusWord) onFocusWord(cycleLock.cycleLockWord);
                                }}
                                style={{ fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}
                                title={cycleLock.cycleLockWord}
                              >
                                {cycleLock.cycleLockWord}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={cycleLock.startingPosition === 1}
                                  onChange={(e) => {
                                    const newCycleLocks = [...levelData.cycleLockBubbles];
                                    newCycleLocks[i].startingPosition = e.target.checked ? 1 : 0;
                                    handleChange('cycleLockBubbles', newCycleLocks);
                                  }}
                                  style={{ accentColor: '#14b8a6', cursor: 'pointer' }}
                                />
                                Locked Init (1)
                              </label>
                              <button
                                onClick={() => {
                                  handleChange('cycleLockBubbles', levelData.cycleLockBubbles.filter((c: any) => c.cycleLockWord !== cycleLock.cycleLockWord));
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                title="Remove"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
        
              
      )
    },
    {
      id: 'soapBubble',
      isActive: () => forceOpen.soapBubble || (levelData.soapBubbles && levelData.soapBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CircleDashed size={20} color="#ec4899" />
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Soap Bubble
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Mechanic: Soap Bubble
                </p>
              </div>
            </div>
            <Toggle 
              checked={forceOpen.soapBubble || (levelData.soapBubbles && levelData.soapBubbles.length > 0)}
              onChange={(checked) => {
                setForceOpen(prev => ({ ...prev, soapBubble: checked }));
                handleChange('soapBubbles', checked ? [] : undefined);
              }}
            />
          </div>
          
          {(forceOpen.soapBubble || (levelData.soapBubbles && levelData.soapBubbles.length > 0)) && (
            <div style={{ background: 'var(--panel-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-main)', fontWeight: 500 }}>
                  Soap Bubble Words (Drag & Drop from left panel):
                </label>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const currentSoaps = levelData.soapBubbles || [];
                        if (!currentSoaps.some((c: any) => c.word.toLowerCase() === wordLabel.toLowerCase())) {
                          handleChange('soapBubbles', [...currentSoaps, { word: wordLabel.toLowerCase(), turnToFill: 2 }]);
                        }
                      }
                    } catch (err) {}
                  }}
                  style={{
                    minHeight: '80px', padding: '8px', border: '1px dashed rgba(236,72,153,0.5)',
                    borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                  }}
                >
                  {(!levelData.soapBubbles || levelData.soapBubbles.length === 0) ? (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      Drop words here to add Soap Bubbles
                    </span>
                  ) : (
                    levelData.soapBubbles.map((soap: any, i: number) => (
                      <div 
                        key={i} 
                        style={{ 
                          display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(236,72,153,0.15)',
                          padding: '6px', borderRadius: '6px', border: '1px solid rgba(236,72,153,0.3)'
                        }}
                      >
                        <span 
                          onClick={() => {
                            if (onFocusWord) onFocusWord(soap.word);
                          }}
                          style={{ 
                            fontSize: '13px', fontWeight: 600, color: 'white', 
                            cursor: 'pointer', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                          }}
                          title={soap.word}
                        >
                          {soap.word}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Turns:</span>
                          <input 
                            type="number" 
                            value={soap.turnToFill ?? 2}
                            onChange={(e) => {
                              const newSoaps = [...levelData.soapBubbles];
                              newSoaps[i] = { ...newSoaps[i], turnToFill: parseInt(e.target.value) || 1 };
                              handleChange('soapBubbles', newSoaps);
                            }}
                            style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                          />
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChange('soapBubbles', levelData.soapBubbles.filter((c: any) => c.word !== soap.word));
                          }}
                          style={{ 
                            background: 'transparent', border: 'none', 
                            color: '#fca5a5', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'cycleFadeOut',
      isActive: () => forceOpen.cycleFadeOut || (levelData.cycleFadeOutBubbles && levelData.cycleFadeOutBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Ghost size={16} color="#64748b" />
                    Mechanic: Cycle Fade Out
                  </h3>
                  <Toggle 
                    checked={forceOpen.cycleFadeOut || (levelData.cycleFadeOutBubbles && levelData.cycleFadeOutBubbles.length > 0)}
                    onChange={(checked) => {
                      setForceOpen(prev => ({ ...prev, cycleFadeOut: checked }));
                      handleChange('cycleFadeOutBubbles', checked ? [] : undefined);
                    }}
                  />
                </div>
                
                {(forceOpen.cycleFadeOut || (levelData.cycleFadeOutBubbles && levelData.cycleFadeOutBubbles.length > 0)) && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      Cycle Fade Out Words (Drag & Drop from left panel):
                    </div>
                    
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                        if (wordLabel) {
                          const currentCycleFadeOuts = levelData.cycleFadeOutBubbles || [];
                          if (!currentCycleFadeOuts.some((c: any) => c.fadeWord === wordLabel)) {
                            handleChange('cycleFadeOutBubbles', [...currentCycleFadeOuts, { fadeWord: wordLabel, startingPosition: 0 }]);
                          }
                        }
                      }}
                      style={{ 
                        minHeight: '60px', padding: '8px', border: '1px dashed rgba(100,116,139,0.5)', 
                        borderRadius: '6px', background: 'rgba(100,116,139,0.05)', display: 'flex', flexDirection: 'column', gap: '8px'
                      }}
                    >
                      {(!levelData.cycleFadeOutBubbles || levelData.cycleFadeOutBubbles.length === 0) ? (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '44px' }}>
                          Drop words here to add Cycle Fade Outs
                        </span>
                      ) : (
                        levelData.cycleFadeOutBubbles.map((cycleFadeOut: any, i: number) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '6px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Ghost size={14} color="#64748b" />
                              <span 
                                onClick={() => {
                                  if (onFocusWord) onFocusWord(cycleFadeOut.fadeWord);
                                }}
                                style={{ fontSize: '13px', fontWeight: 600, color: 'white', cursor: 'pointer' }}
                                title={cycleFadeOut.fadeWord}
                              >
                                {cycleFadeOut.fadeWord}
                              </span>
                            </div>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <input 
                                  type="checkbox" 
                                  checked={cycleFadeOut.startingPosition === 1}
                                  onChange={(e) => {
                                    const newCycleFadeOuts = [...levelData.cycleFadeOutBubbles];
                                    newCycleFadeOuts[i].startingPosition = e.target.checked ? 1 : 0;
                                    handleChange('cycleFadeOutBubbles', newCycleFadeOuts);
                                  }}
                                  style={{ accentColor: '#64748b', cursor: 'pointer' }}
                                />
                                Faded Init (1)
                              </label>
                              <button
                                onClick={() => {
                                  handleChange('cycleFadeOutBubbles', levelData.cycleFadeOutBubbles.filter((c: any) => c.fadeWord !== cycleFadeOut.fadeWord));
                                }}
                                style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}
                                title="Remove"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
      )
    },
    {
      id: 'cryptic',
      isActive: () => forceOpen.cryptic || (levelData.crypticBubbles && levelData.crypticBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Eye size={16} color="#c084fc" />
                    Mechanic: Cryptic Bubbles
                  </h3>
                  <Toggle 
                    checked={forceOpen.cryptic || (levelData.crypticBubbles && levelData.crypticBubbles.length > 0)}
                    onChange={(checked) => {
                      setForceOpen(prev => ({ ...prev, cryptic: checked }));
                      handleChange('crypticBubbles', checked ? [] : undefined);
                    }}
                  />
                </div>
                {(forceOpen.cryptic || (levelData.crypticBubbles && levelData.crypticBubbles.length > 0)) && (
                  <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Cryptic Words (Drag & Drop from left panel):
                  </div>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const currentCryptic = levelData.crypticBubbles || [];
                        if (!currentCryptic.some((c: any) => c.word === wordLabel)) {
                          handleChange('crypticBubbles', [...currentCryptic, { word: wordLabel, revealAtMerge: new Array(wordLabel.length).fill(0) }]);
                        }
                      }
                    }}
                    style={{ 
                      minHeight: '80px', padding: '8px', border: '1px dashed rgba(192,132,252,0.5)', 
                      borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}
                  >
                    {(!levelData.crypticBubbles || levelData.crypticBubbles.length === 0) ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        Drop words here to add Cryptic Bubbles
                      </span>
                    ) : (
                      levelData.crypticBubbles.map((crypticItem: any, i: number) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(192,132,252,0.15)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(192,132,252,0.3)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span 
                              onClick={() => {
                                if (onFocusWord) onFocusWord(crypticItem.word);
                              }}
                              style={{ 
                                fontSize: '14px', fontWeight: 600, color: 'white', 
                                cursor: 'pointer'
                              }}
                            >
                              {crypticItem.word}
                            </span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChange('crypticBubbles', levelData.crypticBubbles.filter((c: any) => c.word !== crypticItem.word));
                              }}
                              style={{ 
                                background: 'transparent', border: 'none', 
                                color: '#fca5a5', cursor: 'pointer', padding: '0 4px', fontSize: '18px', lineHeight: 1
                              }}
                            >
                              &times;
                            </button>
                          </div>
                          
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {crypticItem.revealAtMerge && crypticItem.revealAtMerge.map((val: number, charIdx: number) => (
                              <div key={charIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>{crypticItem.word[charIdx]}</span>
                                <input 
                                  type="number" 
                                  min="0"
                                  value={val}
                                  onChange={(e) => {
                                    const newCryptic = [...levelData.crypticBubbles];
                                    newCryptic[i].revealAtMerge[charIdx] = parseInt(e.target.value) || 0;
                                    handleChange('crypticBubbles', newCryptic);
                                  }}
                                  style={{ width: '32px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px', textAlign: 'center' }}
                                  title={`Reveal at merge for letter ${crypticItem.word[charIdx]}`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  </div>
                )}
              </div>
        
              
      )
    },
    {
      id: 'spike',
      isActive: () => forceOpen.spike || (levelData.spikeBubbles && levelData.spikeBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Asterisk size={16} color="#dc2626" />
              Mechanic: Spike
            </h3>
            <Toggle 
              checked={forceOpen.spike || (levelData.spikeBubbles && levelData.spikeBubbles.length > 0)}
              onChange={(checked) => {
                setForceOpen(prev => ({ ...prev, spike: checked }));
                handleChange('spikeBubbles', checked ? [] : undefined);
              }}
            />
          </div>
          {(forceOpen.spike || (levelData.spikeBubbles && levelData.spikeBubbles.length > 0)) && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Spike Words (Drag & Drop from left panel):
              </div>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const wordLabel = e.dataTransfer.getData('application/reactflow-node') || e.dataTransfer.getData('text/plain');
                  if (wordLabel) {
                    const currentSpike = levelData.spikeBubbles || [];
                    if (!currentSpike.some((f: any) => (typeof f === 'string' ? f : f.word) === wordLabel)) {
                      handleChange('spikeBubbles', [...currentSpike, wordLabel]);
                    }
                  }
                }}
                style={{ 
                  minHeight: '80px', padding: '8px', border: '1px dashed rgba(220,38,38,0.5)', 
                  borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                }}
              >
                {(!levelData.spikeBubbles || levelData.spikeBubbles.length === 0) ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    Drop words here to add Spike
                  </span>
                ) : (
                  levelData.spikeBubbles.map((sb: any, i: number) => {
                    const wordStr = typeof sb === 'string' ? sb : sb.word;
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(220,38,38,0.15)', padding: '8px', borderRadius: '6px', border: '1px solid rgba(220,38,38,0.3)' }}>
                        <span 
                          onClick={() => onFocusWord?.(wordStr)}
                          style={{ fontSize: '14px', fontWeight: 600, color: 'white', cursor: 'pointer' }}
                        >
                          {wordStr}
                        </span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleChange('spikeBubbles', levelData.spikeBubbles.filter((w: any) => (typeof w === 'string' ? w : w.word) !== wordStr));
                          }}
                          style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '0 4px', fontSize: '18px', lineHeight: 1 }}
                        >
                          &times;
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'immovable',
      isActive: () => forceOpen.immovable || (levelData.immovableBubbles && levelData.immovableBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Pin size={16} color="#9ca3af" />
                    Mechanic: Immovable Bubbles
                  </h3>
                  <Toggle 
                    checked={forceOpen.immovable || (levelData.immovableBubbles && levelData.immovableBubbles.length > 0)}
                    onChange={(checked) => {
                      setForceOpen(prev => ({ ...prev, immovable: checked }));
                      handleChange('immovableBubbles', checked ? [] : undefined);
                    }}
                  />
                </div>
                {(forceOpen.immovable || (levelData.immovableBubbles && levelData.immovableBubbles.length > 0)) && (
                  <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Immovable Words (Drag & Drop from left panel):
                  </div>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const currentImmovable = levelData.immovableBubbles || [];
                        if (!currentImmovable.some((f: any) => (typeof f === 'string' ? f : f.word) === wordLabel)) {
                          handleChange('immovableBubbles', [...currentImmovable, wordLabel]);
                        }
                      }
                    }}
                    style={{ 
                      minHeight: '80px', padding: '8px', border: '1px dashed rgba(156,163,175,0.5)', 
                      borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}
                  >
                    {(!levelData.immovableBubbles || levelData.immovableBubbles.length === 0) ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        Drop words here
                      </span>
                    ) : (
                      levelData.immovableBubbles.map((ib: any, i: number) => {
                        const wordLabel = typeof ib === 'string' ? ib : ib.word;
                        return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(156,163,175,0.15)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(156,163,175,0.3)' }}>
                          <span 
                            onClick={() => {
                              if (onFocusWord) onFocusWord(wordLabel);
                            }}
                            style={{ 
                              fontSize: '13px', fontWeight: 600, color: 'white', 
                              cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'
                            }}
                          >
                            {wordLabel}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChange('immovableBubbles', levelData.immovableBubbles.filter((w: any) => (typeof w === 'string' ? w : w.word) !== wordLabel));
                            }}
                            style={{ 
                              background: 'transparent', border: 'none', 
                              color: '#fca5a5', cursor: 'pointer', padding: '0 4px', fontSize: '18px', lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      )})
                    )}
                  </div>
                  </div>
                )}
              </div>
      )
    },
    {
      id: 'countdown',
      isActive: () => forceOpen.countdown || (levelData.countdownBubbles && levelData.countdownBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Timer size={16} color="#ec4899" />
                    Mechanic: Countdown Bubbles
                  </h3>
                  <Toggle 
                    checked={forceOpen.countdown || (levelData.countdownBubbles && levelData.countdownBubbles.length > 0)}
                    onChange={(checked) => {
                      setForceOpen(prev => ({ ...prev, countdown: checked }));
                      handleChange('countdownBubbles', checked ? [] : undefined);
                    }}
                  />
                </div>
                {(forceOpen.countdown || (levelData.countdownBubbles && levelData.countdownBubbles.length > 0)) && (
                  <div style={{ marginTop: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Drag words from the left panel and drop them here to add a countdown.
                  </div>
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const currentCountdown = levelData.countdownBubbles || [];
                        if (!currentCountdown.some((w: any) => (typeof w === 'string' ? w : w.word) === wordLabel)) {
                          handleChange('countdownBubbles', [...currentCountdown, { word: wordLabel, countdownValue: [5, 0] }]);
                        }
                      }
                    }}
                    style={{ 
                      minHeight: '80px', padding: '8px', border: '1px dashed rgba(236, 72, 153, 0.5)', 
                      borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}
                  >
                    {(!levelData.countdownBubbles || levelData.countdownBubbles.length === 0) ? (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                        Drop words here
                      </span>
                    ) : (
                      levelData.countdownBubbles.map((cb: any, i: number) => {
                        const wordLabel = typeof cb === 'string' ? cb : cb.word;
                        const initialValue = cb.countdownValue ? cb.countdownValue[0] : 5;
                        const minValue = cb.countdownValue ? cb.countdownValue[1] : 0;
                        return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(236, 72, 153, 0.15)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(236, 72, 153, 0.3)' }}>
                          <span 
                            onClick={() => {
                              if (onFocusWord) onFocusWord(wordLabel);
                            }}
                            style={{ 
                              fontSize: '13px', fontWeight: 600, color: 'white', 
                              cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'
                            }}
                          >
                            {wordLabel}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Initial:</span>
                            <input 
                              type="number" 
                              value={initialValue}
                              onChange={(e) => {
                                const newCountdown = [...levelData.countdownBubbles];
                                const val = parseInt(e.target.value) || 0;
                                newCountdown[i] = { word: wordLabel, countdownValue: [val, minValue] };
                                handleChange('countdownBubbles', newCountdown);
                              }}
                              style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Min:</span>
                            <input 
                              type="number" 
                              value={minValue}
                              onChange={(e) => {
                                const newCountdown = [...levelData.countdownBubbles];
                                const val = parseInt(e.target.value) || 0;
                                newCountdown[i] = { word: wordLabel, countdownValue: [initialValue, val] };
                                handleChange('countdownBubbles', newCountdown);
                              }}
                              style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                            />
                          </div>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChange('countdownBubbles', levelData.countdownBubbles.filter((w: any) => (typeof w === 'string' ? w : w.word) !== wordLabel));
                            }}
                            style={{ 
                              background: 'transparent', border: 'none', 
                              color: '#fca5a5', cursor: 'pointer', padding: '0 4px', fontSize: '18px', lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                      )})
                    )}
                  </div>
                  </div>
                )}
              </div>
      )
    },
    {
      id: 'linked',
      isActive: () => forceOpen.linked || (levelData.linkedBubbles && levelData.linkedBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Magnet size={16} color="#0ea5e9" />
              Mechanic: Linked Bubbles
            </h3>
            <Toggle 
              checked={forceOpen.linked || (levelData.linkedBubbles && levelData.linkedBubbles.length > 0)}
              onChange={(checked) => {
                setForceOpen(prev => ({ ...prev, linked: checked }));
                handleChange('linkedBubbles', checked ? [] : undefined);
              }}
            />
          </div>
          {(forceOpen.linked || (levelData.linkedBubbles && levelData.linkedBubbles.length > 0)) && (
            <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              Drag a word here to act as the Main Word (locked), then drag chunks into its linked list.
            </div>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                if (wordLabel) {
                  const currentLinked = levelData.linkedBubbles || [];
                  if (!currentLinked.some((w: any) => w.word === wordLabel)) {
                    handleChange('linkedBubbles', [...currentLinked, { word: wordLabel, linkedChunks: [] }]);
                  }
                }
              }}
              style={{ 
                minHeight: '80px', padding: '8px', border: '1px dashed rgba(14, 165, 233, 0.5)', 
                borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
              }}
            >
              {(!levelData.linkedBubbles || levelData.linkedBubbles.length === 0) ? (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                  Drop Main Word here
                </span>
              ) : (
                levelData.linkedBubbles.map((lb: any, i: number) => {
                  const wordLabel = lb.word;
                  return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(14, 165, 233, 0.15)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(14, 165, 233, 0.3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Magnet size={14} color="#0ea5e9" />
                      <span 
                        onClick={() => {
                          if (onFocusWord) onFocusWord(wordLabel);
                        }}
                        style={{ 
                          fontSize: '13px', fontWeight: 600, color: 'white', 
                          cursor: 'pointer', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis'
                        }}
                      >
                        {wordLabel}
                      </span>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChange('linkedBubbles', levelData.linkedBubbles.filter((w: any) => w.word !== wordLabel));
                        }}
                        style={{ 
                          background: 'transparent', border: 'none', 
                          color: '#fca5a5', cursor: 'pointer', padding: '0 4px', fontSize: '18px', lineHeight: 1
                        }}
                      >
                        &times;
                      </button>
                    </div>
                    
                    <div 
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const chunkLabel = e.dataTransfer.getData('application/reactflow-node');
                        if (chunkLabel && chunkLabel !== wordLabel) {
                          const newLinked = [...levelData.linkedBubbles];
                          if (!newLinked[i].linkedChunks) newLinked[i].linkedChunks = [];
                          if (!newLinked[i].linkedChunks.includes(chunkLabel)) {
                            newLinked[i].linkedChunks.push(chunkLabel);
                            handleChange('linkedBubbles', newLinked);
                          }
                        }
                      }}
                      style={{ minHeight: '40px', padding: '4px', border: '1px dashed rgba(14, 165, 233, 0.4)', borderRadius: '4px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexWrap: 'wrap', gap: '4px' }}
                    >
                       {(!lb.linkedChunks || lb.linkedChunks.length === 0) ? (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px' }}>Drop Linked Chunks here</span>
                       ) : (
                          lb.linkedChunks.map((chunk: string, cIdx: number) => (
                             <div key={cIdx} style={{ display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--panel-border)' }}>
                               <span 
                                 onClick={(e) => { e.stopPropagation(); if(onFocusWord) onFocusWord(chunk); }}
                                 style={{ fontSize: '11px', color: '#e2e8f0', cursor: 'pointer', marginRight: '4px' }}
                               >
                                 {chunk}
                               </span>
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   const newLinked = [...levelData.linkedBubbles];
                                   newLinked[i].linkedChunks = newLinked[i].linkedChunks.filter((c: string) => c !== chunk);
                                   handleChange('linkedBubbles', newLinked);
                                 }}
                                 style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: '0', fontSize: '14px', lineHeight: 1 }}
                               >&times;</button>
                             </div>
                          ))
                       )}
                    </div>
                  </div>
                )})
              )}
            </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'requirementLock',
      isActive: () => forceOpen.requirementLock || (levelData.requirementLockBubbles && levelData.requirementLockBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Dumbbell size={16} color="#f97316" />
              Mechanic: Requirement Lock
            </h3>
            <Toggle 
              checked={forceOpen.requirementLock || (levelData.requirementLockBubbles && levelData.requirementLockBubbles.length > 0)}
              onChange={(checked) => {
                setForceOpen(prev => ({ ...prev, requirementLock: checked }));
                if (!checked) handleChange('requirementLockBubbles', undefined);
              }}
            />
          </div>
          {(forceOpen.requirementLock || (levelData.requirementLockBubbles && levelData.requirementLockBubbles.length > 0)) && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Drag a word here to lock it with a weight requirement.
              </div>
              <div 
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                  if (wordLabel) {
                    const currentReqLocks = levelData.requirementLockBubbles || [];
                    if (!currentReqLocks.some((w: any) => w.requirementLockWord === wordLabel)) {
                      handleChange('requirementLockBubbles', [...currentReqLocks, { requirementLockWord: wordLabel, requireWeight: 2 }]);
                    }
                  }
                }}
                style={{ 
                  minHeight: '80px', padding: '8px', border: '1px dashed rgba(249, 115, 22, 0.5)', 
                  borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                }}
              >
                {(!levelData.requirementLockBubbles || levelData.requirementLockBubbles.length === 0) ? (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                    Drop word here
                  </span>
                ) : (
                  levelData.requirementLockBubbles.map((rlItem: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(249, 115, 22, 0.15)', padding: '6px', borderRadius: '6px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}>
                        <Dumbbell size={14} color="#f97316" />
                        <span 
                          onClick={() => {
                            if (onFocusWord) onFocusWord(rlItem.requirementLockWord);
                          }}
                          style={{ 
                            fontSize: '13px', fontWeight: 600, color: 'white', 
                            cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis'
                          }}
                        >
                          {rlItem.requirementLockWord}
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Require weight:</span>
                        <input 
                          type="number" 
                          min={2}
                          max={3}
                          value={rlItem.requireWeight}
                          onKeyDown={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const newReqLocks = [...levelData.requirementLockBubbles];
                            newReqLocks[i].requireWeight = Math.max(2, Math.min(3, parseInt(e.target.value) || 2));
                            handleChange('requirementLockBubbles', newReqLocks);
                          }}
                          style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                        />
                        <button 
                          onClick={() => {
                            handleChange('requirementLockBubbles', levelData.requirementLockBubbles.filter((w: any) => w.requirementLockWord !== rlItem.requirementLockWord));
                          }}
                          style={{ 
                            background: 'transparent', border: 'none', marginLeft: '4px',
                            color: '#fca5a5', cursor: 'pointer', padding: '0', fontSize: '16px', lineHeight: 1
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'bombCracking',
      isActive: () => forceOpen.bombCracking || (levelData.bombCrackingBubbles && levelData.bombCrackingBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={20} color="#f97316" />
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Bomb Cracking Bubble
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Mechanic: Bomb Cracking Bubble
                </p>
              </div>
            </div>
            <Toggle 
              checked={forceOpen.bombCracking || (levelData.bombCrackingBubbles && levelData.bombCrackingBubbles.length > 0)}
              onChange={(checked) => {
                setForceOpen(prev => ({ ...prev, bombCracking: checked }));
                handleChange('bombCrackingBubbles', checked ? [] : undefined);
              }}
            />
          </div>
          
          {(forceOpen.bombCracking || (levelData.bombCrackingBubbles && levelData.bombCrackingBubbles.length > 0)) && (
            <div style={{ background: 'var(--panel-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-main)', fontWeight: 500 }}>
                  Bomb Cracking Bubbles (Drag & Drop from left panel):
                </label>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const currentBombs = levelData.bombCrackingBubbles || [];
                        if (!currentBombs.some((c: any) => c?.word?.toLowerCase() === wordLabel.toLowerCase())) {
                          handleChange('bombCrackingBubbles', [...currentBombs, { word: wordLabel.toLowerCase(), mergeRemain: 5, chainCount: 3 }]);
                        }
                      }
                    } catch (err) {}
                  }}
                  style={{
                    minHeight: '80px', padding: '8px', border: '1px dashed rgba(249, 115, 22, 0.5)',
                    borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                  }}
                >
                  {(!levelData.bombCrackingBubbles || levelData.bombCrackingBubbles.length === 0) ? (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      Drop words here to add Bomb Cracking Bubbles
                    </span>
                  ) : (
                    levelData.bombCrackingBubbles.map((bomb: any, i: number) => (
                      <div 
                        key={i} 
                        style={{ 
                          display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(249, 115, 22, 0.15)',
                          padding: '8px', borderRadius: '6px', border: '1px solid rgba(249, 115, 22, 0.3)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span 
                            onClick={() => {
                              if (onFocusWord) onFocusWord(bomb.word);
                            }}
                            style={{ 
                              fontSize: '13px', fontWeight: 600, color: 'white', 
                              cursor: 'pointer', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                            }}
                            title={bomb.word}
                          >
                            {bomb.word}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChange('bombCrackingBubbles', levelData.bombCrackingBubbles.filter((c: any) => c.word !== bomb.word));
                            }}
                            style={{ 
                              background: 'transparent', border: 'none', 
                              color: '#fca5a5', cursor: 'pointer', padding: '0 4px', fontSize: '16px', lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Merges:</span>
                            <input 
                              type="number" 
                              value={bomb.mergeRemain ?? 5}
                              onChange={(e) => {
                                const newBombs = [...levelData.bombCrackingBubbles];
                                newBombs[i] = { ...newBombs[i], mergeRemain: parseInt(e.target.value) || 1 };
                                handleChange('bombCrackingBubbles', newBombs);
                              }}
                              style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                            />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chain:</span>
                            <input 
                              type="number" 
                              value={bomb.chainCount ?? 3}
                              onChange={(e) => {
                                const newBombs = [...levelData.bombCrackingBubbles];
                                newBombs[i] = { ...newBombs[i], chainCount: parseInt(e.target.value) || 1 };
                                handleChange('bombCrackingBubbles', newBombs);
                              }}
                              style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'floatBubble',
      isActive: () => forceOpen.floatBubble || (levelData.floatBubbles && levelData.floatBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cloud size={20} color="#60a5fa" />
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Float Bubble
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Mechanic: Float Bubble (Goes to drop queue after N merges)
                </p>
              </div>
            </div>
            <Toggle 
              checked={forceOpen.floatBubble || (levelData.floatBubbles && levelData.floatBubbles.length > 0)}
              onChange={(checked) => {
                setForceOpen(prev => ({ ...prev, floatBubble: checked }));
                handleChange('floatBubbles', checked ? [] : undefined);
              }}
            />
          </div>
          
          {(forceOpen.floatBubble || (levelData.floatBubbles && levelData.floatBubbles.length > 0)) && (
            <div style={{ background: 'var(--panel-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-main)', fontWeight: 500 }}>
                  Float Bubbles (Drag & Drop from left panel):
                </label>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const wordLower = wordLabel.toLowerCase();
                        const isChained = levelData.bubbleSeparatorData?.linkedWords?.some((w: string) => w.toLowerCase() === wordLower);
                        if (isChained) {
                          alert("Không thể thêm bong bóng đã bị Chain vào Float Bubble!");
                          return;
                        }
                        
                        const currentFloat = levelData.floatBubbles || [];
                        if (!currentFloat.some((c: any) => c?.word?.toLowerCase() === wordLower)) {
                          handleChange('floatBubbles', [...currentFloat, { word: wordLower, mergesToFloat: 3 }]);
                        }
                      }
                    } catch (err) {}
                  }}
                  style={{
                    minHeight: '80px', padding: '8px', border: '1px dashed rgba(96, 165, 250, 0.5)',
                    borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                  }}
                >
                  {(!levelData.floatBubbles || levelData.floatBubbles.length === 0) ? (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      Drop words here to add Float Bubbles
                    </span>
                  ) : (
                    levelData.floatBubbles.map((floatItem: any, i: number) => (
                      <div 
                        key={i} 
                        style={{ 
                          display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(96, 165, 250, 0.15)',
                          padding: '8px', borderRadius: '6px', border: '1px solid rgba(96, 165, 250, 0.3)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span 
                            onClick={() => {
                              if (onFocusWord) onFocusWord(floatItem.word);
                            }}
                            style={{ 
                              fontSize: '13px', fontWeight: 600, color: 'white', 
                              cursor: 'pointer', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                            }}
                            title={floatItem.word}
                          >
                            {floatItem.word}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChange('floatBubbles', levelData.floatBubbles.filter((c: any) => c.word !== floatItem.word));
                            }}
                            style={{ 
                              background: 'transparent', border: 'none', 
                              color: '#93c5fd', cursor: 'pointer', padding: '0 4px', fontSize: '16px', lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Merges To Float:</span>
                            <input 
                              type="number" 
                              value={floatItem.mergesToFloat ?? 3}
                              onChange={(e) => {
                                const newFloat = [...levelData.floatBubbles];
                                newFloat[i] = { ...newFloat[i], mergesToFloat: parseInt(e.target.value) || 1 };
                                handleChange('floatBubbles', newFloat);
                              }}
                              style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      id: 'teleportBubble',
      isActive: () => forceOpen.teleportBubble || (levelData.teleportBubbles && levelData.teleportBubbles.length > 0),
      render: () => (
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={20} color="#eab308" />
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Teleport Bubble
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  Mechanic: Teleport Bubble (Changes position after N merges)
                </p>
              </div>
            </div>
            <Toggle 
              checked={forceOpen.teleportBubble || (levelData.teleportBubbles && levelData.teleportBubbles.length > 0)}
              onChange={(checked) => {
                setForceOpen(prev => ({ ...prev, teleportBubble: checked }));
                handleChange('teleportBubbles', checked ? [] : undefined);
              }}
            />
          </div>
          
          {(forceOpen.teleportBubble || (levelData.teleportBubbles && levelData.teleportBubbles.length > 0)) && (
            <div style={{ background: 'var(--panel-bg)', padding: '12px', borderRadius: '6px', border: '1px solid var(--panel-border)' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', color: 'var(--text-main)', fontWeight: 500 }}>
                  Teleport Bubbles (Drag & Drop from left panel):
                </label>
                <div 
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    try {
                      const wordLabel = e.dataTransfer.getData('application/reactflow-node');
                      if (wordLabel) {
                        const wordLower = wordLabel.toLowerCase();
                        const isChained = levelData.bubbleSeparatorData?.linkedWords?.some((w: string) => w.toLowerCase() === wordLower);
                        if (isChained) {
                          alert("Không thể thêm bong bóng đã bị Chain vào Teleport Bubble!");
                          return;
                        }
                        
                        const currentTeleport = levelData.teleportBubbles || [];
                        if (!currentTeleport.some((c: any) => c?.word?.toLowerCase() === wordLower)) {
                          handleChange('teleportBubbles', [...currentTeleport, { word: wordLower, mergesToTeleport: 4 }]);
                        }
                      }
                    } catch (err) {}
                  }}
                  style={{
                    minHeight: '80px', padding: '8px', border: '1px dashed rgba(234, 179, 8, 0.5)',
                    borderRadius: '6px', background: 'rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', gap: '6px'
                  }}
                >
                  {(!levelData.teleportBubbles || levelData.teleportBubbles.length === 0) ? (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
                      Drop words here to add Teleport Bubbles
                    </span>
                  ) : (
                    levelData.teleportBubbles.map((teleportItem: any, i: number) => (
                      <div 
                        key={i} 
                        style={{ 
                          display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(234, 179, 8, 0.15)',
                          padding: '8px', borderRadius: '6px', border: '1px solid rgba(234, 179, 8, 0.3)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span 
                            onClick={() => {
                              if (onFocusWord) onFocusWord(teleportItem.word);
                            }}
                            style={{ 
                              fontSize: '13px', fontWeight: 600, color: 'white', 
                              cursor: 'pointer', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                            }}
                            title={teleportItem.word}
                          >
                            {teleportItem.word}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleChange('teleportBubbles', levelData.teleportBubbles.filter((c: any) => c.word !== teleportItem.word));
                            }}
                            style={{ 
                              background: 'transparent', border: 'none', 
                              color: '#fef08a', cursor: 'pointer', padding: '0 4px', fontSize: '16px', lineHeight: 1
                            }}
                          >
                            &times;
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Merges To Teleport:</span>
                            <input 
                              type="number" 
                              value={teleportItem.mergesToTeleport ?? 4}
                              onChange={(e) => {
                                const newTeleport = [...levelData.teleportBubbles];
                                newTeleport[i] = { ...newTeleport[i], mergesToTeleport: parseInt(e.target.value) || 1 };
                                handleChange('teleportBubbles', newTeleport);
                              }}
                              style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '12px' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )
    }
  ];

  const mechanicsOrder = [
    'chain', 'frozen', 'keyLock', 'burst', 'cryptic', 'screwLock',
    'backward', 'cycleLock', 'immovable', 'countdown', 'linked',
    'crack', 'requirementLock', 'cycleFadeOut', 'icebomb', 'soapBubble', 'spike', 'bombCracking', 'floatBubble', 'teleportBubble'
  ];

  useEffect(() => {
    if (isOpen && levelData) {
      const sorted = [...mechanicsConfig].sort((a, b) => {
        const aActive = a.isActive() ? 1 : 0;
        const bActive = b.isActive() ? 1 : 0;
        if (aActive !== bActive) {
          return bActive - aActive; // Active items float to the top
        }
        // Secondary sort: by document order
        const aIndex = mechanicsOrder.indexOf(a.id);
        const bIndex = mechanicsOrder.indexOf(b.id);
        
        const finalAIndex = aIndex === -1 ? 999 : aIndex;
        const finalBIndex = bIndex === -1 ? 999 : bIndex;
        
        return finalAIndex - finalBIndex;
      });
      setSortedMechanicIds(sorted.map(m => m.id));
    }
  }, [isOpen, levelName]); // Do not include levelData/forceOpen to avoid live jumping


  useEffect(() => {
    setForceOpen({});
  }, [levelName]);

  if (!isOpen || !levelData) return null;

  const handleChange = (key: string, value: any) => {
    onSave({ ...levelData, [key]: value });
  };

  const handleDeepChange = (parentKey: string, key: string, value: any) => {
    onSave({
      ...levelData,
      [parentKey]: {
        ...(levelData[parentKey] || {}),
        [key]: value
      }
    });
  };

  return (
    <div className="glass-panel" style={{
      position: 'absolute', top: '100px', right: '20px', bottom: '20px', width: '360px',
      overflow: 'hidden', borderRadius: '16px', zIndex: 10,
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', border: '1px solid var(--panel-border)'
    }}>
      <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--panel-border)', flexShrink: 0 }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: 'var(--accent)' }}>
          Level Settings
        </h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onCalculateSolution && (
            <button 
              onClick={onCalculateSolution}
              title="Calculate minimum moves and check difficulty"
              style={{ 
                background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '6px', 
                padding: '6px 10px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', 
                display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' 
              }}
            >
              <Calculator size={14} /> Calculate
            </button>
          )}
          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div style={{ padding: '20px', overflowY: 'auto', flex: 1, scrollbarGutter: 'stable' }}>
        {/* General Settings */}
        <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>General</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <LabelInput label="Move Limit" value={levelData.moveLimit} onChange={(val: string) => handleChange('moveLimit', parseInt(val))} type="number" />
            <LabelInput label="Difficulty" value={levelData.levelDifficulty} onChange={(val: string) => handleChange('levelDifficulty', Math.max(0, Math.min(2, parseInt(val) || 0)))} type="number" />
            <LabelInput label="Max Bubbles" value={levelData.maxBubblesInScene} onChange={(val: string) => handleChange('maxBubblesInScene', parseInt(val))} type="number" />
        </div>
      </div>



      
        <div style={{ marginBottom: '16px', background: 'rgba(0,0,0,0.1)', padding: '10px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mechanics Toggle</h3>
            <button
              onClick={() => {
                const newData = { ...levelData };
                newData.useBubbleSeparator = 0;
                delete newData.bubbleSeparatorData;
                delete newData.frozenBubbles;
                delete newData.crackBubbles;
                delete newData.iceBombBubbles;
                delete newData.burstBubbles;
                delete newData.backwardBubbles;
                delete newData.keyLockBubbles;
                delete newData.screwLockBubbles;
                delete newData.cycleLockBubbles;
                delete newData.soapBubbles;
                delete newData.cycleFadeOutBubbles;
                delete newData.crypticBubbles;
                delete newData.immovableBubbles;
                delete newData.spikeBubbles;
                delete newData.countdownBubbles;
                delete newData.linkedBubbles;
                delete newData.requirementLockBubbles;
                delete newData.bombCrackingBubbles;
                delete newData.floatBubbles;
                delete newData.teleportBubbles;
                
                setForceOpen({});
                setSortedMechanicIds([]);
                onSave(newData);
              }}
              style={{
                background: 'transparent', border: '1px solid var(--panel-border)', borderRadius: '4px',
                color: 'var(--text-muted)', fontSize: '9px', padding: '2px 6px', cursor: 'pointer',
                transition: 'all 0.2s', textTransform: 'uppercase', fontWeight: 600
              }}
              onMouseOver={(e) => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'; e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--panel-border)'; e.currentTarget.style.background = 'transparent'; }}
            >
              Clear
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {mechanicsOrder.map(id => mechanicsConfig.find(c => c.id === id)).filter(Boolean).map(m => {
              if (!m) return null;
              const active = m.isActive();
              
              const meta: Record<string, {name: string, icon: React.ReactNode, color: string}> = {
                chain: { name: 'Chain', icon: <Link size={10} />, color: '#818cf8' },
                frozen: { name: 'Frozen', icon: <Snowflake size={10} />, color: '#38bdf8' },
                crack: { name: 'Crack', icon: <Zap size={10} />, color: '#fbbf24' },
                icebomb: { name: 'Ice Bomb', icon: <Radiation size={10} />, color: '#38bdf8' },
                burst: { name: 'Burst', icon: <Bomb size={10} />, color: '#ef4444' },
                backward: { name: 'Backward', icon: <ArrowLeftRight size={10} />, color: '#a855f7' },
                keyLock: { name: 'Key Lock', icon: <Key size={10} />, color: '#eab308' },
                screwLock: { name: 'Screw Lock', icon: <Wrench size={10} />, color: '#f97316' },
                cycleLock: { name: 'Cycle Lock', icon: <RefreshCw size={10} />, color: '#14b8a6' },
                soapBubble: { name: 'Soap', icon: <CircleDashed size={10} />, color: '#ec4899' },
                cycleFadeOut: { name: 'Cycle Fade', icon: <Ghost size={10} />, color: '#64748b' },
                cryptic: { name: 'Cryptic', icon: <Eye size={10} />, color: '#c084fc' },
                immovable: { name: 'Immovable', icon: <Pin size={10} />, color: '#9ca3af' },
                spike: { name: 'Spike', icon: <Asterisk size={10} />, color: '#dc2626' },
                countdown: { name: 'Countdown', icon: <Timer size={10} />, color: '#ec4899' },
                linked: { name: 'Linked', icon: <Magnet size={10} />, color: '#0ea5e9' },
                requirementLock: { name: 'Req Lock', icon: <Dumbbell size={10} />, color: '#f97316' },
                bombCracking: { name: 'Bomb Crack', icon: <Flame size={10} />, color: '#f97316' },
                floatBubble: { name: 'Float', icon: <Cloud size={10} />, color: '#60a5fa' },
                teleportBubble: { name: 'Teleport', icon: <Zap size={10} />, color: '#eab308' }
              };
              
              const mMeta = meta[m.id] || { name: m.id, icon: <Zap size={10} />, color: '#ffffff' };
              
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    const willBeActive = !active;
                    setForceOpen(prev => ({ ...prev, [m.id]: willBeActive }));
                    if (m.id === 'chain') {
                      if (willBeActive) {
                        handleChange('useBubbleSeparator', 1);
                      } else {
                        onSave({ ...levelData, useBubbleSeparator: 0, bubbleSeparatorData: undefined });
                      }
                    }
                    else if (m.id === 'frozen') handleChange('frozenBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'crack') handleChange('crackBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'icebomb') handleChange('iceBombBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'burst') handleChange('burstBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'backward') handleChange('backwardBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'keyLock') handleChange('keyLockBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'screwLock') handleChange('screwLockBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'cycleLock') handleChange('cycleLockBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'soapBubble') handleChange('soapBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'cycleFadeOut') handleChange('cycleFadeOutBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'cryptic') handleChange('crypticBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'immovable') handleChange('immovableBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'spike') handleChange('spikeBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'countdown') handleChange('countdownBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'linked') handleChange('linkedBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'requirementLock') handleChange('requirementLockBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'bombCracking') handleChange('bombCrackingBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'floatBubble') handleChange('floatBubbles', willBeActive ? [] : undefined);
                    else if (m.id === 'teleportBubble') handleChange('teleportBubbles', willBeActive ? [] : undefined);
                    
                    if (willBeActive) {
                      setSortedMechanicIds(prev => {
                        const newSorted = prev.filter(id => id !== m.id);
                        return [m.id, ...newSorted];
                      });
                    }
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '3px',
                    padding: '3px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600,
                    background: active ? `${mMeta.color}20` : 'rgba(0,0,0,0.2)',
                    color: active ? mMeta.color : 'var(--text-muted)',
                    border: `1px solid ${active ? mMeta.color : 'var(--panel-border)'}`,
                    cursor: 'pointer', transition: 'all 0.2s', boxSizing: 'border-box'
                  }}
                  title={`Toggle ${mMeta.name}`}
                >
                  <span style={{ color: active ? mMeta.color : 'inherit', display: 'flex' }}>{mMeta.icon}</span>
                  {mMeta.name}
                </button>
              );
            })}
          </div>
        </div>

        {sortedMechanicIds.length > 0 
          ? sortedMechanicIds.map(id => {
              const mechanic = mechanicsConfig.find(m => m.id === id);
              return mechanic && mechanic.isActive() ? <div key={id}>{mechanic.render()}</div> : null;
            })
          : mechanicsConfig.filter(m => m.isActive()).map(m => <div key={m.id}>{m.render()}</div>) // Fallback if effect hasn't run yet
        }
      </div>
    </div>
  );
}



function LabelInput({ label, value, onChange, type = "text" }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
      <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '10px 12px', borderRadius: '8px', fontSize: '14px',
          background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)',
          color: 'white', outline: 'none', transition: 'border-color 0.2s',
          width: '100%', boxSizing: 'border-box'
        }}
        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
        onBlur={(e) => e.target.style.borderColor = 'var(--panel-border)'}
      />
    </div>
  );
}
