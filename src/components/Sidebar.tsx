import React, { useState, useEffect } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { Plus, X, Trash2, BookOpen, Layers, Globe, Search as SearchIcon } from 'lucide-react';
import { fetchSpecificTypes, fetchRelatedWords, fetchWikipediaSuggestions, type WordSuggestion } from '../lib/api';

interface Signature {
  numWords: number;
  subcats: Signature[];
}

const getSelectionSignature = (rootId: string, selNodes: Node[], allEdges: Edge[]): Signature => {
  const childrenEdges = allEdges.filter(e => e.source === rootId && selNodes.some(n => n.id === e.target));
  const childNodes = childrenEdges.map(e => selNodes.find(n => n.id === e.target)!);
  
  const words = childNodes.filter(n => !n.data.isCategory && !n.data.isChunk);
  const subcats = childNodes.filter(n => n.data.isCategory);
  
  return {
    numWords: words.length,
    subcats: subcats.map(c => getSelectionSignature(c.id, selNodes, allEdges))
  };
};

const getDictSignature = (catName: string, dict: any[]): Signature | null => {
  const entry = dict.find(e => e.name.toLowerCase() === catName.toLowerCase());
  if (!entry) return null;
  return {
    numWords: entry.words.length,
    subcats: entry.subcategories.map((sub: string) => getDictSignature(sub, dict)).filter(Boolean) as Signature[]
  };
};

const sortSignature = (sig: Signature): Signature => {
  return {
    numWords: sig.numWords,
    subcats: sig.subcats.map(sortSignature).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  };
};

const isStructureFulfilled = (req: Signature | null, avail: Signature | null): boolean => {
  if (!req || !avail) return false;
  if (avail.numWords < req.numWords) return false;
  
  if (req.subcats.length > avail.subcats.length) return false;
  
  let availSubs = [...avail.subcats];
  for (const reqSub of req.subcats) {
    const matchIdx = availSubs.findIndex(aSub => isStructureFulfilled(reqSub, aSub));
    if (matchIdx === -1) return false;
    availSubs.splice(matchIdx, 1);
  }
  return true;
};

interface SidebarProps {
  selectedNode: Node | null;
  selectedNodes?: Node[];
  edges?: Edge[];
  nodes?: Node[];
  contextChildLabel?: string;
  onClose: () => void;
  onAddChild: (parent: Node, childLabel: string, isChunk?: boolean) => void;
  onDeleteNode: () => void;
  onRenameNode: (nodeId: string, newLabel: string) => void;
  onToggleNodeIcon?: (nodeId: string, currentIcon: string | null) => void;
  onUpdateNodeIndex?: (nodeId: string, newIndex: number | undefined) => void;
  onImportDictionary: (categoryName: string, dictionary: any[], targetParentId?: string, options?: any) => void;
}

type TabType = 'dict' | 'specific' | 'related' | 'wiki';

export default function Sidebar({ selectedNode, selectedNodes = [], edges = [], nodes = [], contextChildLabel, onClose, onAddChild, onDeleteNode, onRenameNode, onToggleNodeIcon, onUpdateNodeIndex, onImportDictionary }: SidebarProps) {
  const [manualWord, setManualWord] = useState('');
  const [suggestions, setSuggestions] = useState<WordSuggestion[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('dict');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const [matchedCategories, setMatchedCategories] = useState<any[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [matchSearchQuery, setMatchSearchQuery] = useState('');
  const [matchExact, setMatchExact] = useState(false);
  const [matchSortOrder, setMatchSortOrder] = useState<'asc'|'desc'>('asc');
  const [replaceOldTree, setReplaceOldTree] = useState(false);
  
  const [dictionary, setDictionary] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/global_dictionary.json?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setDictionary(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedNode) {
      setEditValue(selectedNode.data.label as string);
      setIsEditing(false);
      loadSuggestions(activeTab);
    }
  }, [selectedNode, activeTab, contextChildLabel]);

  const isMultiSelection = selectedNodes.length > 1;
  const selectionId = selectedNodes.map(n => n.id).sort().join(',');

  useEffect(() => {
    setMatchedCategories([]);
    setHasSearched(false);
    setMatchSearchQuery('');
  }, [selectionId]);

  const handleSearchSimilar = () => {
    if (isMultiSelection && dictionary.length > 0) {
      const rootNodes = selectedNodes.filter(n => 
        !edges.some(e => e.target === n.id && selectedNodes.some(sn => sn.id === e.source))
      );
      
      if (rootNodes.length >= 1) {
        const rootId = rootNodes[0].id;
        const selSig = getSelectionSignature(rootId, selectedNodes, edges);
        
        const matches = dictionary.filter(dictEntry => {
          const dictSig = getDictSignature(dictEntry.name, dictionary);
          return isStructureFulfilled(selSig, dictSig);
        });
        setMatchedCategories(matches);
        setHasSearched(true);
      }
    }
  };

  const checkConflict = (catName: string) => {
    const existingCats = (nodes || [])
      .filter(n => n.data.isCategory && !selectedNodes.some(sn => sn.id === n.id))
      .map(n => String(n.data.label).toLowerCase());
      
    const c1 = catName.toLowerCase();

    for (const c2 of existingCats) {
      if (c1 === c2) return { conflict: true, reason: 'Already in graph' };
      
      // Substring check
      if (c1.includes(c2) || c2.includes(c1)) {
        return { conflict: true, reason: `Too similar to "${c2}"` };
      }
      
      // Word overlap check (Jaccard-like)
      const dictCat1 = dictionary.find(d => d.name.toLowerCase() === c1);
      const dictCat2 = dictionary.find(d => d.name.toLowerCase() === c2);
      if (dictCat1 && dictCat2) {
         const words1 = new Set(dictCat1.words.map((w: any) => w.word.toLowerCase()));
         const words2 = new Set(dictCat2.words.map((w: any) => w.word.toLowerCase()));
         let overlap = 0;
         for(const w of words1) if(words2.has(w)) overlap++;
         
         const minLen = Math.min(words1.size, words2.size);
         if (minLen > 0 && overlap / minLen >= 0.3) { // 30% overlap
            return { conflict: true, reason: `Shares ${overlap} words with "${c2}"` };
         }
      }
    }
    return { conflict: false };
  };

  const filteredMatches = matchedCategories
    .filter(cat => {
      const terms = matchSearchQuery.split('&').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (terms.length === 0) return true;
      
      const catName = cat.name.toLowerCase();
      const catWords = (cat.words || []).map((w: any) => (typeof w === 'string' ? w : (w.word || '')).toLowerCase());
      
      // Every term must be found either in the category name or in its words
      return terms.every(term => 
        matchExact
          ? catName === term || catWords.some((w: string) => w === term)
          : catName.includes(term) || catWords.some((w: string) => w.includes(term))
      );
    })
    .sort((a, b) => {
      if (matchSortOrder === 'asc') return a.name.localeCompare(b.name);
      return b.name.localeCompare(a.name);
    });

  const loadSuggestions = async (tab: TabType) => {
    if (!selectedNode || tab === 'dict') return;
    setLoading(true);
    setSuggestions([]);
    
    const label = selectedNode.data.label as string;
    let words: WordSuggestion[] = [];
    
    if (tab === 'specific') {
      words = await fetchSpecificTypes(label, 30);
    } else if (tab === 'related') {
      words = await fetchRelatedWords(label, contextChildLabel, 30);
    } else if (tab === 'wiki') {
      words = await fetchWikipediaSuggestions(label, 20);
    }
    
    setSuggestions(words);
    setLoading(false);
  };

  const dictEntry = selectedNode ? dictionary.find(d => {
    const searchStr = (selectedNode.data.label as string).toLowerCase();
    const name = d.name.toLowerCase();
    return name === searchStr || 
           name === searchStr + 's' || 
           name === searchStr + 'es' || 
           searchStr === name + 's' || 
           searchStr === name + 'es';
  }) : null;

  if (!selectedNode && selectedNodes.length === 0) return null;

  if (isMultiSelection) {
    return (
      <div className="glass-panel" style={{
        position: 'absolute', right: '20px', top: '20px', width: '360px',
        maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', borderRadius: '16px',
        display: 'flex', flexDirection: 'column', zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>MULTI-SELECTION</div>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--accent)' }}>
              {selectedNodes.length} Nodes Selected
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>
        
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'rgba(99,102,241,0.1)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.3)' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#a5b4fc' }}>Structure Matcher</h4>
            <div style={{ fontSize: '12px', color: '#ddd', marginBottom: '16px' }}>
              Find categories in the dictionary with the exact same structure (excluding chunks).
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input 
                type="text"
                placeholder="Text filter (e.g. apple & fruit)..."
                value={matchSearchQuery}
                onChange={e => setMatchSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none', fontSize: '13px' }}
              />
              <button 
                onClick={() => setMatchSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                title="Sort Alphabetically"
                style={{ padding: '8px 12px', borderRadius: '6px', background: 'var(--panel-border)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
              >
                {matchSortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </button>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#ccc', cursor: 'pointer', marginBottom: '12px' }}>
              <input type="checkbox" checked={matchExact} onChange={e => setMatchExact(e.target.checked)} style={{ cursor: 'pointer' }} />
              Exact Match
            </label>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <input 
                type="checkbox" 
                id="replaceToggle" 
                checked={replaceOldTree} 
                onChange={(e) => setReplaceOldTree(e.target.checked)} 
                style={{ cursor: 'pointer' }}
              />
              <label htmlFor="replaceToggle" style={{ fontSize: '13px', color: 'var(--text-main)', cursor: 'pointer', flex: 1 }}>
                Replace old tree (Delete & inherit indices)
              </label>
            </div>

            <button onClick={handleSearchSimilar} disabled={loading} style={{
              width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--accent)', 
              color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}>
              <SearchIcon size={16} /> Search Dictionary
            </button>
          </div>

          {hasSearched && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {matchSearchQuery.trim() 
                  ? (filteredMatches.find(c => !checkConflict(c.name).conflict) 
                      ? "🎯 Sniper Mode: Best valid tree selected" 
                      : "No valid non-conflicting trees found for this query.")
                  : `Showing ${Math.min(filteredMatches.length, 10)} of ${filteredMatches.length} matching trees`}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(matchSearchQuery.trim() 
                  ? (filteredMatches.find(c => !checkConflict(c.name).conflict) ? [filteredMatches.find(c => !checkConflict(c.name).conflict)!] : []) 
                  : filteredMatches.slice(0, 10)
                ).map(cat => {
                  const { conflict, reason } = checkConflict(cat.name);
                  return (
                    <div key={cat.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: conflict ? 'rgba(239,68,68,0.1)' : 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px', border: conflict ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--panel-border)', opacity: conflict ? 0.6 : 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 500, fontSize: '14px', textTransform: 'capitalize', color: conflict ? '#f87171' : 'white' }}>{cat.name}</span>
                        {conflict && <span style={{ fontSize: '11px', color: '#f87171', marginTop: '2px' }}>{reason}</span>}
                      </div>
                      <button 
                        disabled={conflict}
                        onClick={() => {
                          const rootId = selectedNodes.filter(n => !edges.some(e => e.target === n.id && selectedNodes.some(sn => sn.id === e.source)))[0]?.id;
                          const selSig = rootId ? getSelectionSignature(rootId, selectedNodes, edges) : undefined;
                          onImportDictionary(cat.name, dictionary, undefined, {
                            requiredSig: selSig,
                            searchQuery: matchSearchQuery,
                            exactMatch: matchExact,
                            replaceNodes: replaceOldTree ? selectedNodes : [],
                            keepOldTreeAnchor: !replaceOldTree ? selectedNodes : []
                          });
                        }}
                        style={{ background: conflict ? 'rgba(239,68,68,0.2)' : 'var(--accent)', color: conflict ? '#f87171' : 'white', border: conflict ? '1px solid rgba(239,68,68,0.4)' : 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Insert
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!selectedNode) return null;

  const handleManualAdd = (isChunk: boolean) => {
    if (manualWord.trim()) {
      onAddChild(selectedNode, manualWord.trim().toLowerCase(), isChunk);
      setManualWord('');
    }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editValue.trim()) {
      onRenameNode(selectedNode.id, editValue.trim().toLowerCase());
      setIsEditing(false);
    }
  };

  return (
    <div className="glass-panel" style={{
      position: 'absolute',
      right: '20px',
      top: '20px',
      width: '360px',
      maxHeight: 'calc(100vh - 40px)',
      overflowY: 'auto',
      borderRadius: '16px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 10,
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid var(--panel-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '4px' }}>SELECTED NODE</div>
          {isEditing ? (
            <form onSubmit={handleRenameSubmit} style={{ display: 'flex', gap: '8px' }}>
              <input 
                autoFocus
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => setIsEditing(false)}
                style={{
                  padding: '6px 10px', borderRadius: '6px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--accent)', color: 'white', width: '100%', outline: 'none'
                }}
              />
              <button 
                type="submit"
                style={{
                  background: 'var(--accent)', color: 'white', border: 'none', padding: '8px 16px',
                  borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                Save
              </button>
            </form>
          ) : (
            <h2 
              onDoubleClick={() => setIsEditing(true)}
              title="Double click to edit"
              style={{ fontSize: '22px', fontWeight: 600, color: 'var(--accent)', textTransform: 'capitalize', cursor: 'text' }}
            >
              {String(selectedNode.data.label)}
            </h2>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px'
        }}>
          <X size={20} />
        </button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button 
            onClick={onDeleteNode}
            style={{
              padding: '12px', borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.3)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            title="Delete Node"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {/* Manual Add */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <input 
            type="text" 
            value={manualWord}
            onChange={(e) => setManualWord(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleManualAdd(false);
              }
            }}
            placeholder={selectedNode.data.isChunk ? "Cannot add children to chunk..." : "Type node or chunk name..."}
            disabled={selectedNode.data.isChunk as boolean}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box',
              background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)',
              color: 'var(--text-main)', outline: 'none'
            }}
          />
          {!selectedNode.data.isChunk && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleManualAdd(false)} style={{
                flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px',
                background: 'var(--panel-border)', border: 'none', color: 'var(--text-main)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
              }}>
                <Plus size={16} /> Node
              </button>
              
              {!selectedNode.data.isCategory && (
                <button onClick={() => handleManualAdd(true)} style={{
                  flex: 1, padding: '8px', borderRadius: '8px', fontSize: '13px',
                  background: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                }}>
                  <Plus size={16} /> Chunk
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ marginTop: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Order (Index)</span>
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <input 
              type="number"
              value={(selectedNode.data.globalIndex as number) || ''}
              onChange={(e) => {
                if (onUpdateNodeIndex) {
                  const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                  onUpdateNodeIndex(selectedNode.id, val);
                }
              }}
              placeholder="Auto"
              style={{ flex: 1, padding: '6px', background: 'var(--bg-main)', border: '1px solid var(--panel-border)', borderRadius: '4px', color: 'var(--text-main)' }}
            />
          </div>
        </div>

        {(() => {
          if (selectedNode.data.isChunk || !onToggleNodeIcon) return null;
          
          const label = String(selectedNode.data.label).toLowerCase();
          let dictHasIcon = false;
          
          // Check if it has an icon defined as a Category (just in case global_dictionary adds it later)
          const catEntry = dictionary.find((c:any) => c.name.toLowerCase() === label);
          if (catEntry && catEntry.icon) dictHasIcon = true;
          
          // Also check if it has an icon defined as a Word in any category (e.g. "Pig" is both a Category and a Word)
          if (!dictHasIcon) {
            for (const cat of dictionary) {
              const wordEntry = cat.words?.find((w: any) => w.word.toLowerCase() === label);
              if (wordEntry && wordEntry.icon) {
                dictHasIcon = true;
                break;
              }
            }
          }

          return (
            <div style={{ background: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '8px', border: '1px solid var(--panel-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)' }}>Icon Configuration</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '48px', height: '48px', background: 'var(--panel-bg)', borderRadius: '8px', 
                  border: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                }}>
                  {selectedNode.data.icon && dictHasIcon ? (
                    <img src={`/word_icon/${selectedNode.data.icon}.png`} alt="icon" style={{ maxWidth: '32px', maxHeight: '32px' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>No Icon</span>
                  )}
                </div>
                
                {dictHasIcon ? (
                  <button
                    onClick={() => onToggleNodeIcon(selectedNode.id, selectedNode.data.icon as string | null)}
                    style={{
                      background: selectedNode.data.icon ? 'rgba(239,68,68,0.1)' : 'rgba(56, 189, 248, 0.1)',
                      color: selectedNode.data.icon ? '#f87171' : 'var(--accent)',
                      border: `1px solid ${selectedNode.data.icon ? 'rgba(239,68,68,0.2)' : 'rgba(56, 189, 248, 0.2)'}`,
                      padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {selectedNode.data.icon ? 'Remove Icon' : 'Set Default Icon'}
                  </button>
                ) : (
                  <span style={{ fontSize: '12px', color: '#f87171' }}>Not found in dictionary</span>
                )}
              </div>
            </div>
          );
        })()}

        {/* Suggestion Tabs */}
        {!selectedNode.data.isChunk && (
          <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
            <TabButton active={activeTab === 'dict'} onClick={() => setActiveTab('dict')} icon={<BookOpen size={14}/>} text="Dict" />
            <TabButton active={activeTab === 'specific'} onClick={() => setActiveTab('specific')} icon={<Layers size={14}/>} text="Specific" />
            <TabButton active={activeTab === 'related'} onClick={() => setActiveTab('related')} icon={<BookOpen size={14}/>} text="Related" />
            <TabButton active={activeTab === 'wiki'} onClick={() => setActiveTab('wiki')} icon={<Globe size={14}/>} text="Wiki" />
          </div>
        )}
        
        {/* Context Hint */}
        {activeTab === 'related' && contextChildLabel && (
          <div style={{ fontSize: '11px', color: 'var(--accent)', background: 'rgba(99,102,241,0.1)', padding: '6px 10px', borderRadius: '6px' }}>
            Context Mode: Prioritizing words similar to <strong>"{contextChildLabel}"</strong>.
          </div>
        )}

        {/* Dictionary / Suggestions Content */}
        <div style={{ marginTop: '10px' }}>
          {activeTab === 'dict' ? (
            dictEntry ? (
              <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Found {dictEntry.subcategories.length} sub-categories and {dictEntry.words.length} words.
                </span>
                <button 
                  onClick={() => onImportDictionary(dictEntry.name, dictionary, selectedNode.id)}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', background: 'var(--accent)', 
                    color: 'white', border: 'none', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                  }}
                >
                  Import All
                </button>
              </div>

              {dictEntry.subcategories.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-muted)' }}>SUB-CATEGORIES</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {dictEntry.subcategories.map((sub: string, i: number) => (
                      <button 
                        key={i}
                        onClick={() => onAddChild(selectedNode, sub.toLowerCase())}
                        style={{
                          padding: '4px 10px', borderRadius: '12px',
                          background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)',
                          color: '#38bdf8', fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <Plus size={10} /> {sub}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {dictEntry.words.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '12px', color: 'var(--text-muted)' }}>WORDS</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[...dictEntry.words].sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0)).map((wObj: any, i: number) => (
                      <button 
                        key={i}
                        onClick={() => onAddChild(selectedNode, wObj.word.toLowerCase())}
                        style={{
                          padding: '4px 10px', borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#ddd', fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        {wObj.icon ? (
                          <img src={`/word_icon/${wObj.icon.endsWith('.png') ? wObj.icon : wObj.icon + '.png'}`} alt={wObj.word} style={{ width: '12px', height: '12px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        ) : (
                          <Plus size={10} />
                        )}
                        <span>{wObj.word}</span>
                        {wObj.popularity !== undefined && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.1)', padding: '2px 4px', borderRadius: '4px' }}>{wObj.popularity}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '13px' }}>
              No dictionary entry found for "{String(selectedNode.data.label)}".
            </div>
          )) : (
            <div style={{ minHeight: '150px' }}>
              {loading ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '14px' }}>
                  Searching...
                </div>
              ) : suggestions.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {suggestions.map((s, i) => (
                    <button 
                      key={i}
                      onClick={() => onAddChild(selectedNode, s.word)}
                      style={{
                        padding: '6px 12px', borderRadius: '20px',
                        background: s.source === 'wikipedia' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                        border: `1px solid ${s.source === 'wikipedia' ? 'rgba(255,255,255,0.2)' : 'rgba(99, 102, 241, 0.3)'}`,
                        color: s.source === 'wikipedia' ? '#f0f0f5' : '#a5b4fc', fontSize: '13px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Plus size={12} /> {s.word}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '14px' }}>
                  No suggestions found.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, text }: any) {
  return (
    <button 
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
        border: 'none', borderRadius: '6px', cursor: 'pointer',
        color: active ? 'white' : 'var(--text-muted)',
        fontSize: '12px', fontWeight: active ? 600 : 400
      }}
    >
      {icon} {text}
    </button>
  );
}
