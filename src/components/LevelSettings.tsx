import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface LevelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  levelData: any;
  onSave: (newData: any) => void;
  onFocusWord?: (word: string) => void;
}



export default function LevelSettings({ isOpen, onClose, levelData, onSave, onFocusWord }: LevelSettingsProps) {
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
      position: 'absolute', top: '100px', right: '20px', bottom: '20px', width: '320px',
      overflowY: 'auto', borderRadius: '12px', padding: '16px', zIndex: 10,
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', border: '1px solid var(--panel-border)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', color: 'var(--accent)' }}>
          Level Config
        </h2>
        <button 
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
        >
          <X size={16} />
        </button>
      </div>


      {/* General Settings */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>General</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
          <LabelInput label="Move Limit" value={levelData.moveLimit} onChange={(val: string) => handleChange('moveLimit', parseInt(val))} type="number" />
          <LabelInput label="Max Bubbles" value={levelData.maxBubblesInScene} onChange={(val: string) => handleChange('maxBubblesInScene', parseInt(val))} type="number" />
          <LabelInput label="Tutorial ID" value={levelData.tutorialId} onChange={(val: string) => handleChange('tutorialId', parseInt(val))} type="number" />
          <LabelInput label="Max Word Len" value={levelData.maxWordLength} onChange={(val: string) => handleChange('maxWordLength', parseInt(val))} type="number" />
        </div>
      </div>



      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '14px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>Bubble Separator (Chain)</h3>
        <div style={{ marginTop: '12px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', marginBottom: '12px', cursor: 'pointer' }}>
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
    </div>
  );
}



function LabelInput({ label, value, onChange, type = "text" }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{label}</label>
      <input 
        type={type} 
        value={value} 
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '8px', borderRadius: '6px',
          background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)',
          color: 'white', outline: 'none'
        }}
      />
    </div>
  );
}
