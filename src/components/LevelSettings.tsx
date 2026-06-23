import { useState, useEffect } from 'react';
import { X, Link, Calculator, Snowflake, Lock, Key, Bomb, Eye, Wrench, PenTool, ArrowLeftRight } from 'lucide-react';
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
      position: 'absolute', top: '20px', right: '20px', bottom: '20px', width: '360px',
      overflowY: 'auto', borderRadius: '16px', padding: '20px', zIndex: 10,
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(10px)', border: '1px solid var(--panel-border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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


      {/* General Settings */}
      <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)' }}>General</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <LabelInput label="Move Limit" value={levelData.moveLimit} onChange={(val: string) => handleChange('moveLimit', parseInt(val))} type="number" />
          <LabelInput label="Difficulty (0-2)" value={levelData.levelDifficulty} onChange={(val: string) => handleChange('levelDifficulty', parseInt(val))} type="number" />
          <LabelInput label="Max Bubbles" value={levelData.maxBubblesInScene} onChange={(val: string) => handleChange('maxBubblesInScene', parseInt(val))} type="number" />
          <LabelInput label="Tutorial ID" value={levelData.tutorialId} onChange={(val: string) => handleChange('tutorialId', parseInt(val))} type="number" />
          <LabelInput label="Max Word Len" value={levelData.maxWordLength} onChange={(val: string) => handleChange('maxWordLength', parseInt(val))} type="number" />
        </div>
      </div>



      <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link size={16} color="#818cf8" />
            Mechanic: Chain
          </h3>
          <Toggle 
            checked={levelData.useBubbleSeparator === 1}
            onChange={(checked) => handleChange('useBubbleSeparator', checked ? 1 : 0)}
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
