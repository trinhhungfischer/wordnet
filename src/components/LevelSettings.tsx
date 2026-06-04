import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

interface LevelSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  levelData: any;
  onSave: (newData: any) => void;
}

const BUBBLE_TYPES = [
  'Cryptic', 'Burst', 'Backward', 'Frozen', 
  'KeyLock', 'ScrewLock', 'Crack', 'Linked'
];

export default function LevelSettings({ isOpen, onClose, levelData, onSave }: LevelSettingsProps) {
  const [formData, setFormData] = useState<any>(null);

  useEffect(() => {
    if (levelData) {
      // deep clone to avoid mutating original state directly before save
      setFormData(JSON.parse(JSON.stringify(levelData)));
    }
  }, [levelData]);

  if (!isOpen || !formData) return null;

  const handleChange = (key: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleMinMaxChange = (type: string, index: number, value: string) => {
    const num = parseInt(value) || 0;
    const key = `minMax${type}Bubbles`;
    setFormData((prev: any) => {
      const arr = prev[key] ? [...prev[key]] : [0, 0];
      arr[index] = num;
      return { ...prev, [key]: arr };
    });
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.5)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div className="glass-panel" style={{
        width: '500px', maxHeight: '80vh', overflowY: 'auto',
        borderRadius: '16px', padding: '24px', position: 'relative'
      }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        
        <h2 style={{ marginTop: 0, color: 'var(--accent)', marginBottom: '24px' }}>
          Level Configuration
        </h2>

        {/* General Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>General</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
            <LabelInput label="Move Limit" value={formData.moveLimit} onChange={(v: string) => handleChange('moveLimit', parseInt(v) || 0)} type="number" />
            <LabelInput label="Difficulty (0-2)" value={formData.levelDifficulty} onChange={(v: string) => handleChange('levelDifficulty', parseInt(v) || 0)} type="number" />
            <LabelInput label="Max Bubbles" value={formData.maxBubblesInScene} onChange={(v: string) => handleChange('maxBubblesInScene', parseInt(v) || 0)} type="number" />
            <LabelInput label="Random Seed" value={formData.randomSeed} onChange={(v: string) => handleChange('randomSeed', parseInt(v) || 0)} type="number" />
          </div>
        </div>

        {/* Bubble Settings */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>Special Bubbles</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
            {BUBBLE_TYPES.map(type => {
              const hasKey = `has${type}Bubbles`;
              const minMaxKey = `minMax${type}Bubbles`;
              const isEnabled = formData[hasKey] === 1 || formData[hasKey] === true;
              const minMax = formData[minMaxKey] || [0, 0];

              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={isEnabled} 
                      onChange={(e) => handleChange(hasKey, e.target.checked ? 1 : 0)} 
                    />
                    {type} Bubbles
                  </label>
                  
                  {isEnabled && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Min:</span>
                      <input type="number" value={minMax[0]} onChange={(e) => handleMinMaxChange(type, 0, e.target.value)} style={inputStyle} />
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Max:</span>
                      <input type="number" value={minMax[1]} onChange={(e) => handleMinMaxChange(type, 1, e.target.value)} style={inputStyle} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button 
          onClick={handleSave}
          style={{
            width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
            background: 'var(--accent)', color: 'white', fontWeight: 'bold', fontSize: '16px',
            cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
          }}
        >
          <Save size={18} /> Apply Changes
        </button>

      </div>
    </div>
  );
}

const inputStyle = {
  width: '50px', padding: '4px 8px', borderRadius: '4px',
  background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)',
  color: 'white', outline: 'none'
};

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
