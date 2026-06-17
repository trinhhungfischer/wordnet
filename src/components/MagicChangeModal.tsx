import { useState } from 'react';
import { X, Sparkles, AlertCircle } from 'lucide-react';

interface MagicChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecute: (popularWords: string, minPopularity: number, maxPopularity: number) => void;
}

export default function MagicChangeModal({ isOpen, onClose, onExecute }: MagicChangeModalProps) {
  const [popularWords, setPopularWords] = useState('');
  const [minPopularity, setMinPopularity] = useState<number>(0);
  const [maxPopularity, setMaxPopularity] = useState<number>(1);

  // Handle overlapping sliders
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(parseFloat(e.target.value), maxPopularity);
    setMinPopularity(value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(parseFloat(e.target.value), minPopularity);
    setMaxPopularity(value);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'var(--panel-bg)', border: '1px solid var(--panel-border)',
        borderRadius: '12px', width: '90%', maxWidth: '500px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
      }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--panel-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
            <Sparkles size={18} color="#a855f7" /> Magic Change
          </h2>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px' }}>
          <div style={{ marginBottom: '16px', fontSize: '13px', color: '#ccc', lineHeight: 1.5 }}>
            Magic Change will automatically replace ALL trees in the current level with new, randomly selected trees from the dictionary that have the exact same structure. It guarantees no duplicate trees.
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
              Word Popularity Range (Độ phổ biến)
            </label>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', lineHeight: 1.4 }}>
              Set popularity score range for words to be picked (0 = extremely rare, 1 = extremely popular).
            </div>
            
            <div style={{ position: 'relative', height: '30px', marginTop: '16px', display: 'flex', alignItems: 'center' }}>
              <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                <div style={{
                  position: 'absolute',
                  left: `${minPopularity * 100}%`,
                  right: `${100 - maxPopularity * 100}%`,
                  height: '100%',
                  background: 'var(--accent)',
                  borderRadius: '2px'
                }} />
              </div>
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={minPopularity} 
                onChange={handleMinChange}
                style={{ 
                  position: 'absolute', width: '100%', appearance: 'none', background: 'transparent', pointerEvents: 'none', zIndex: 3
                }}
                className="dual-slider"
              />
              <input 
                type="range" 
                min="0" max="1" step="0.01" 
                value={maxPopularity} 
                onChange={handleMaxChange}
                style={{ 
                  position: 'absolute', width: '100%', appearance: 'none', background: 'transparent', pointerEvents: 'none', zIndex: 4
                }}
                className="dual-slider"
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'white', fontWeight: 600, marginTop: '8px' }}>
              <span>{minPopularity.toFixed(2)}</span>
              <span>{maxPopularity.toFixed(2)}</span>
            </div>
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#a855f7', fontWeight: 500, marginTop: '8px', background: 'rgba(168, 85, 247, 0.1)', padding: '6px', borderRadius: '6px' }}>
              Khoảng Độ hiếm (Rarity Range): <strong>{(1 - maxPopularity).toFixed(2)}</strong> tới <strong>{(1 - minPopularity).toFixed(2)}</strong>
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
              Custom Priority Words (Tùy chỉnh từ ưu tiên)
            </label>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', lineHeight: 1.4 }}>
              Enter words separated by commas or newlines. The system will prioritize picking these words when generating new trees. Leave blank if you don't care.
            </div>
            <textarea 
              value={popularWords}
              onChange={e => setPopularWords(e.target.value)}
              placeholder="apple, banana, cat, dog..."
              style={{
                width: '100%', height: '100px', padding: '12px', borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)',
                color: 'white', fontSize: '13px', outline: 'none', resize: 'vertical'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertCircle size={16} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '12px', color: '#fca5a5', lineHeight: 1.4 }}>
              <strong>Warning:</strong> This action cannot be undone. All existing trees and chunks in this level will be completely replaced.
            </span>
          </div>
        </div>

        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--panel-border)',
          display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0,0,0,0.2)',
          borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px'
        }}>
          <button 
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'transparent', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
          >
            Cancel
          </button>
          <button 
            onClick={() => onExecute(popularWords, minPopularity, maxPopularity)}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--accent)', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Sparkles size={16} /> Execute Magic Change
          </button>
        </div>
        
        {/* Style for dual slider thumbs */}
        <style dangerouslySetInnerHTML={{__html: `
          .dual-slider::-webkit-slider-thumb {
            appearance: none;
            pointer-events: all;
            width: 16px;
            height: 16px;
            background: #fff;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid var(--accent);
          }
          .dual-slider::-moz-range-thumb {
            pointer-events: all;
            width: 16px;
            height: 16px;
            background: #fff;
            border-radius: 50%;
            cursor: pointer;
            border: 2px solid var(--accent);
          }
        `}} />
      </div>
    </div>
  );
}

