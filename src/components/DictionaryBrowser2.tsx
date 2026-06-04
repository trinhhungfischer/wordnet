import { useState, useEffect } from 'react';
import { Search, PlusCircle, ChevronRight, ChevronDown, X, BookOpen } from 'lucide-react';

interface DictEntry {
  name: string;
  parents: string[];
  subcategories: string[];
  words: string[];
}

interface DictionaryBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (categoryName: string, dictionary: DictEntry[]) => void;
}

export default function DictionaryBrowser({ isOpen, onClose, onImport }: DictionaryBrowserProps) {
  const [dictionary, setDictionary] = useState<DictEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const loadDict = () => {
    fetch('/global_dictionary.json')
      .then(res => res.json())
      .then(data => setDictionary(data))
      .catch(err => console.error("Failed to load dictionary", err));
  };

  useEffect(() => {
    loadDict();
  }, []);

  useEffect(() => {
    if (isOpen && dictionary.length === 0) {
      loadDict();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleExpand = (name: string) => {
    const next = new Set(expandedCategories);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setExpandedCategories(next);
  };

  const handleImport = (name: string) => {
    onImport(name, dictionary);
    onClose();
  };

  const filteredDict = dictionary.filter(entry => 
    entry.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.words.some(w => w.toLowerCase().includes(searchQuery.toLowerCase())) ||
    entry.subcategories.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        width: '800px', height: '80vh', borderRadius: '16px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{ 
          padding: '20px', borderBottom: '1px solid var(--panel-border)', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
            <BookOpen size={24} color="var(--accent)" />
            Global Dictionary
          </h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--panel-border)' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input 
              type="text" 
              placeholder="Search for categories or words..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px',
                background: 'rgba(0,0,0,0.3)', border: '1px solid var(--panel-border)',
                color: 'white', fontSize: '15px', outline: 'none'
              }}
            />
          </div>
          <div style={{ marginTop: '8px', fontSize: '13px', color: '#888' }}>
            Loaded {dictionary.length} unique categories from 1000 levels.
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDict.slice(0, 100).map(entry => {
            const isExpanded = expandedCategories.has(entry.name);
            return (
              <div key={entry.name} style={{
                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)',
                borderRadius: '8px', overflow: 'hidden', flexShrink: 0
              }}>
                <div 
                  style={{ 
                    padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent'
                  }}
                  onClick={() => toggleExpand(entry.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isExpanded ? <ChevronDown size={18} color="#888" /> : <ChevronRight size={18} color="#888" />}
                    <span style={{ fontWeight: 600, fontSize: '16px', color: 'var(--accent)' }}>
                      {entry.name}
                    </span>
                    <span style={{ fontSize: '12px', color: '#888', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '12px' }}>
                      {entry.subcategories.length} sub, {entry.words.length} words
                    </span>
                  </div>
                  
                  <button
                    onClick={(e) => { e.stopPropagation(); handleImport(entry.name); }}
                    style={{
                      background: 'var(--accent)', color: 'white', border: 'none',
                      padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                    }}
                  >
                    <PlusCircle size={14} /> Import to Graph
                  </button>
                </div>
                
                {isExpanded && (
                  <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '14px' }}>Sub-categories</h4>
                      {entry.subcategories.length === 0 ? <span style={{ color: '#666' }}>None</span> : 
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {entry.subcategories.map(s => (
                            <span key={s} style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                      }
                    </div>
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '14px' }}>Words</h4>
                      {entry.words.length === 0 ? <span style={{ color: '#666' }}>None</span> : 
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {entry.words.map(w => (
                            <span key={w} style={{ background: 'rgba(255,255,255,0.05)', color: '#ddd', padding: '4px 8px', borderRadius: '4px', fontSize: '13px' }}>
                              {w}
                            </span>
                          ))}
                        </div>
                      }
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredDict.length > 100 && (
            <div style={{ textAlign: 'center', color: '#888', padding: '10px' }}>
              Showing 100 of {filteredDict.length} results. Keep typing to refine...
            </div>
          )}
          {filteredDict.length === 0 && (
            <div style={{ textAlign: 'center', color: '#888', padding: '40px' }}>
              <div style={{ marginBottom: '16px' }}>No categories found.</div>
              <button 
                onClick={loadDict}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--panel-border)',
                  background: 'var(--accent)', color: 'white', cursor: 'pointer', fontWeight: 600
                }}
              >
                Retry Loading Dictionary
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
