import { useState, useEffect } from 'react';
import { Search, PlusCircle, ChevronRight, ChevronDown, X, BookOpen } from 'lucide-react';

interface DictEntry {
  name: string;
  parents: string[];
  subcategories: string[];
  words: { word: string; icon: string | null; popularity?: number }[];
  popularity?: number;
}

interface DictionaryBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (categoryName: string, dictionary: DictEntry[], singleNodeOnly?: boolean) => void;
}

export default function DictionaryBrowser({ isOpen, onClose, onImport }: DictionaryBrowserProps) {
  const [dictionary, setDictionary] = useState<DictEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [exactMatch, setExactMatch] = useState(false);
  const [sortMode, setSortMode] = useState<'popularity' | 'alpha'>('popularity');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const loadDict = () => {
    fetch(`/global_dictionary.json?t=${Date.now()}`)
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

  const handleImport = (name: string, singleNodeOnly: boolean = false) => {
    onImport(name, dictionary, singleNodeOnly);
    onClose();
  };

  const filteredDict = dictionary.filter(entry => {
    if (!searchQuery) return true;
    
    const checkMatch = (queryPart: string, exact: boolean) => {
      const q = queryPart.trim().toLowerCase();
      if (!q) return true;
      if (exact) {
        return entry.name.toLowerCase() === q ||
          entry.words.some((w: any) => w.word.toLowerCase() === q) ||
          entry.subcategories.some((s: string) => s.toLowerCase() === q);
      }
      return entry.name.toLowerCase().includes(q) ||
        entry.words.some((w: any) => w.word.toLowerCase().includes(q)) ||
        entry.subcategories.some((s: string) => s.toLowerCase().includes(q));
    };

    if (searchQuery.includes('&')) {
      const parts = searchQuery.split('&');
      // All parts separated by '&' must match within this category
      return parts.every(part => checkMatch(part, exactMatch));
    } else {
      return checkMatch(searchQuery, exactMatch);
    }
  }).sort((a, b) => {
    if (sortMode === 'popularity') {
      return (b.popularity || 0) - (a.popularity || 0);
    } else {
      return a.name.localeCompare(b.name);
    }
  });

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
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#aaa', userSelect: 'none', background: 'rgba(255,255,255,0.05)', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <input type="checkbox" checked={exactMatch} onChange={(e) => setExactMatch(e.target.checked)} style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent)' }} />
              Exact Match
            </label>
            <select 
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as any)}
              style={{
                background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid var(--panel-border)',
                padding: '10px 12px', borderRadius: '8px', fontSize: '14px', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="popularity" style={{ background: '#222', color: '#fff' }}>Sort by Popularity (⭐)</option>
              <option value="alpha" style={{ background: '#222', color: '#fff' }}>Sort A-Z</option>
            </select>
          </div>
          <div style={{ marginTop: '12px', fontSize: '13px', color: '#888' }}>
            Loaded {dictionary.length} unique categories.
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
                      {entry.popularity !== undefined && <span style={{fontSize: '12px', color: '#f59e0b', marginLeft: '8px', fontWeight: 500}}>⭐ {entry.popularity < 1 ? entry.popularity.toFixed(2) : Math.round(entry.popularity)}</span>}
                    </span>
                    <span style={{ fontSize: '12px', color: '#888', background: 'rgba(0,0,0,0.3)', padding: '2px 8px', borderRadius: '12px' }}>
                      {entry.subcategories.length} sub, {entry.words.length} words
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleImport(entry.name, true); }}
                      style={{
                        background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)',
                        padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                      }}
                    >
                      <PlusCircle size={14} /> Import Node
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleImport(entry.name, false); }}
                      style={{
                        background: 'var(--accent)', color: 'white', border: 'none',
                        padding: '6px 12px', borderRadius: '6px', fontSize: '13px', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer'
                      }}
                    >
                      <PlusCircle size={14} /> Import Branch
                    </button>
                  </div>
                </div>
                
                {isExpanded && (
                  <div style={{ padding: '16px', borderTop: '1px solid var(--panel-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <h4 style={{ margin: '0 0 10px 0', color: '#aaa', fontSize: '14px' }}>Sub-categories</h4>
                      {entry.subcategories.length === 0 ? <span style={{ color: '#666' }}>None</span> : 
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {entry.subcategories.map(s => (
                            <span 
                              key={s} 
                              onClick={(e) => { e.stopPropagation(); setSearchQuery(s); }}
                              style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                            >
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
                          {[...entry.words].sort((a, b) => {
                            if (sortMode === 'popularity') {
                              return (b.popularity || 0) - (a.popularity || 0);
                            } else {
                              return a.word.localeCompare(b.word);
                            }
                          }).map(w => (
                            <span 
                              key={w.word} 
                              onClick={(e) => { e.stopPropagation(); setSearchQuery(w.word); }}
                              title={w.popularity !== undefined ? `Popularity: ${w.popularity}` : undefined}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', color: '#ddd', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }}
                            >
                              {w.icon && <img src={`/word_icon/${w.icon.endsWith('.png') ? w.icon : w.icon + '.png'}`} alt={w.word} style={{ width: '16px', height: '16px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                              {w.word}
                              {w.popularity !== undefined && (
                                <span style={{ color: '#888', fontSize: '11px', marginLeft: '2px' }}>
                                  ({w.popularity < 1 ? w.popularity.toFixed(1) : Math.round(w.popularity)})
                                </span>
                              )}
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
