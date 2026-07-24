import React, { useState, useMemo } from 'react';
import { X, Search } from 'lucide-react';

interface LevelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  levels: string[];
  selectedLevelName: string;
  onSelectLevel: (level: string) => void;
}

const LevelSelectorModal: React.FC<LevelSelectorModalProps> = ({ isOpen, onClose, levels, selectedLevelName, onSelectLevel }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAndSortedLevels = useMemo(() => {
    // Filter levels
    const filtered = levels.filter(lvl => lvl.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Sort numerically if possible (e.g., "Level 2" before "Level 10")
    return filtered.sort((a, b) => {
      const getNum = (str: string) => {
        const match = str.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      };
      
      const numA = getNum(a);
      const numB = getNum(b);
      
      if (numA !== 0 && numB !== 0) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
  }, [levels, searchTerm]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', zIndex: 1000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        background: '#1e293b', width: '80%', maxWidth: '800px', height: '80vh',
        borderRadius: '12px', border: '1px solid var(--panel-border)',
        display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--panel-border)'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Select Level
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
              <input
                type="text"
                placeholder="Search level..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)',
                  color: 'white', padding: '6px 12px 6px 32px', borderRadius: '6px',
                  fontSize: '14px', width: '200px'
                }}
              />
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', color: 'white',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                padding: '4px', opacity: 0.7, borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {filteredAndSortedLevels.length === 0 ? (
            <div style={{ textAlign: 'center', opacity: 0.5, padding: '40px' }}>No levels found</div>
          ) : (
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
              gap: '12px' 
            }}>
              {filteredAndSortedLevels.map(lvl => (
                <button
                  key={lvl}
                  onClick={() => {
                    onSelectLevel(lvl);
                    onClose();
                  }}
                  style={{
                    background: lvl === selectedLevelName ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${lvl === selectedLevelName ? 'var(--accent)' : 'var(--panel-border)'}`,
                    color: 'white',
                    padding: '12px 8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: lvl === selectedLevelName ? 'bold' : 'normal',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={lvl}
                  onMouseEnter={(e) => {
                    if (lvl !== selectedLevelName) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (lvl !== selectedLevelName) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }
                  }}
                >
                  {lvl.replace('Level ', '').replace('.json', '')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LevelSelectorModal;
