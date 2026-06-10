import { X, Link, Calculator, Snowflake, Lock, Key } from 'lucide-react';

interface LevelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  levelData: any;
  onSave: (newData: any) => void;
  onFocusWord?: (word: string) => void;
  onCalculateSolution?: () => void;
}



export default function LevelSettings({ isOpen, onClose, levelData, onSave, onFocusWord, onCalculateSolution }: LevelSettingsProps) {
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
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link size={16} color="#818cf8" />
          Mechanic: Chain
        </h3>
        <div style={{ marginTop: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginBottom: '16px', cursor: 'pointer', color: 'white' }}>
            <input 
              type="checkbox" 
              checked={levelData.useBubbleSeparator === 1}
              onChange={(e) => handleChange('useBubbleSeparator', e.target.checked ? 1 : 0)}
            />
            Enable Chain
          </label>

          {levelData.useBubbleSeparator === 1 && (
            <>
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
            </>
          )}
        </div>
      </div>

      <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Snowflake size={16} color="#38bdf8" />
          Mechanic: Frozen Bubbles
        </h3>
        <div style={{ marginTop: '12px' }}>
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
      </div>

      <div style={{ marginBottom: '24px', background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={16} color="#eab308" />
          Mechanic: Locks & Keys
        </h3>
        <div style={{ marginTop: '12px' }}>
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
                  <Lock size={14} color="#eab308" />
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
                    <Key size={14} color="#fcd34d" />
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
