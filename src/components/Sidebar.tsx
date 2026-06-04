import React, { useState, useEffect } from 'react';
import type { Node } from '@xyflow/react';
import { Plus, X, Trash2, BookOpen, Layers, Globe } from 'lucide-react';
import { fetchSpecificTypes, fetchRelatedWords, fetchWikipediaSuggestions, type WordSuggestion } from '../lib/api';

interface SidebarProps {
  selectedNode: Node | null;
  contextChildLabel?: string;
  onClose: () => void;
  onAddChild: (parent: Node, childLabel: string) => void;
  onDeleteNode: () => void;
  onRenameNode: (nodeId: string, newLabel: string) => void;
  onImportDictionary: (categoryName: string, dictionary: any[], targetParentId?: string) => void;
}

type TabType = 'dict' | 'specific' | 'related' | 'wiki';

export default function Sidebar({ selectedNode, contextChildLabel, onClose, onAddChild, onDeleteNode, onRenameNode, onImportDictionary }: SidebarProps) {
  const [manualWord, setManualWord] = useState('');
  const [suggestions, setSuggestions] = useState<WordSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dict');
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  
  const [dictionary, setDictionary] = useState<any[]>([]);

  useEffect(() => {
    fetch('/global_dictionary.json')
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

  if (!selectedNode) return null;

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualWord.trim()) {
      onAddChild(selectedNode, manualWord.trim().toLowerCase());
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
        <form onSubmit={handleManualAdd} style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            value={manualWord}
            onChange={(e) => setManualWord(e.target.value)}
            placeholder="Type custom child word..."
            style={{
              flex: 1, padding: '10px 12px', borderRadius: '8px',
              background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)',
              color: 'var(--text-main)', outline: 'none'
            }}
          />
          <button type="submit" style={{
            padding: '10px', borderRadius: '8px',
            background: 'var(--panel-border)', border: 'none', color: 'var(--text-main)', cursor: 'pointer'
          }}>
            <Plus size={18} />
          </button>
        </form>

        {/* Suggestion Tabs */}
        <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
          <TabButton active={activeTab === 'dict'} onClick={() => setActiveTab('dict')} icon={<BookOpen size={14}/>} text="Dict" />
          <TabButton active={activeTab === 'specific'} onClick={() => setActiveTab('specific')} icon={<Layers size={14}/>} text="Specific" />
          <TabButton active={activeTab === 'related'} onClick={() => setActiveTab('related')} icon={<BookOpen size={14}/>} text="Related" />
          <TabButton active={activeTab === 'wiki'} onClick={() => setActiveTab('wiki')} icon={<Globe size={14}/>} text="Wiki" />
        </div>
        
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
                    {dictEntry.words.map((w: string, i: number) => (
                      <button 
                        key={i}
                        onClick={() => onAddChild(selectedNode, w.toLowerCase())}
                        style={{
                          padding: '4px 10px', borderRadius: '12px',
                          background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#ddd', fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                      >
                        <Plus size={10} /> {w}
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
