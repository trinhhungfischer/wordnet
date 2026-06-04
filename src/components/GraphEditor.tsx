import React, { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  SelectionMode,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';

import CustomNode from './CustomNode';
import Sidebar from './Sidebar';
import LevelSettings from './LevelSettings';
import DictionaryBrowser from './DictionaryBrowser2';
import { exportGraphToCsv } from '../lib/exportCsv';
import { Download, Plus, Settings, Save, BookOpen } from 'lucide-react';

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = [
  { id: '1', type: 'custom', position: { x: 400, y: 100 }, data: { label: 'animal', isRoot: true } },
];
const initialEdges: Edge[] = [];

export default function GraphEditor() {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedLevelName, setSelectedLevelName] = useState<string>('');
  
  const [rawLevelData, setRawLevelData] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDictOpen, setIsDictOpen] = useState(false);
  
  const [, setHistory] = useState<{ past: { nodes: Node[], edges: Edge[] }[], future: { nodes: Node[], edges: Edge[] }[] }>({ past: [], future: [] });

  const saveHistory = useCallback(() => {
    setHistory(h => {
      const newPast = [...h.past, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }].slice(-50);
      return { past: newPast, future: [] };
    });
  }, [nodes, edges]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        setHistory(h => {
          if (h.past.length === 0) return h;
          const prev = h.past[h.past.length - 1];
          setNodes(prev.nodes);
          setEdges(prev.edges);
          return {
            past: h.past.slice(0, -1),
            future: [{ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }, ...h.future]
          };
        });
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        setHistory(h => {
          if (h.future.length === 0) return h;
          const next = h.future[0];
          setNodes(next.nodes);
          setEdges(next.edges);
          return {
            past: [...h.past, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }],
            future: h.future.slice(1)
          };
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, edges, setNodes, setEdges]);

  useEffect(() => {
    fetch('/levels/index.json')
      .then(res => res.json())
      .then(data => setLevels(data))
      .catch(console.error);
  }, []);

  const loadLevel = async (levelName: string) => {
    setSelectedLevelName(levelName);
    if (!levelName) return;

    try {
      const res = await fetch(`/levels/${levelName}.json`);
      const data = await res.json();
      setRawLevelData(data);
      
      const newNodes: Node[] = [];
      const newEdges: Edge[] = [];
      
      if (data.categories) {
        saveHistory();
        const catNodesMap: Record<string, Node> = {};
        
        // Pass 1: Create all Category nodes
        data.categories.forEach((cat: any) => {
          const catId = uuidv4();
          const isRoot = !cat.parentCategory;
          const catNode: Node = {
            id: catId,
            type: 'custom',
            position: { x: 0, y: 0 },
            data: { label: cat.category.toLowerCase(), isRoot, isCategory: true }
          };
          catNodesMap[cat.category.toLowerCase()] = catNode;
          newNodes.push(catNode);
        });

        // Pass 2: Connect nested categories
        data.categories.forEach((cat: any) => {
          if (cat.parentCategory) {
            const parentNode = catNodesMap[cat.parentCategory.toLowerCase()];
            const childNode = catNodesMap[cat.category.toLowerCase()];
            if (parentNode && childNode) {
              newEdges.push({
                id: `e-${parentNode.id}-${childNode.id}`,
                source: parentNode.id,
                target: childNode.id,
                animated: true,
                style: { stroke: 'var(--accent)' }
              });
            }
          }
        });

        // Pass 3: Create Word nodes and connect to their Categories
        data.categories.forEach((cat: any) => {
          const parentCatNode = catNodesMap[cat.category.toLowerCase()];
          if (parentCatNode && cat.words) {
            cat.words.forEach((w: any) => {
              const wordLower = w.fullWord.toLowerCase();
              
              // If this word is actually a sub-category that we already processed, skip creating a duplicate node
              if (catNodesMap[wordLower]) return;

              const wordNode: Node = {
                id: uuidv4(),
                type: 'custom',
                position: { x: 0, y: 0 },
                data: { label: wordLower, isCategory: false }
              };
              newNodes.push(wordNode);
              newEdges.push({
                id: `e-${parentCatNode.id}-${wordNode.id}`,
                source: parentCatNode.id,
                target: wordNode.id,
                animated: true,
                style: { stroke: 'var(--accent)' }
              });
            });
          }
        });

        // Pass 4: Auto-Layout per Disjoint Tree
        const nodeWidth = 160;
        const xSpacing = 20;
        const ySpacing = 150;
        
        const layoutTree = (nodeId: string, currentX: number, depth: number): number => {
          const childrenIds = newEdges.filter(e => e.source === nodeId).map(e => e.target);
          
          if (childrenIds.length === 0) {
            const node = newNodes.find(n => n.id === nodeId);
            if (node) {
              node.position = { x: currentX, y: 100 + depth * ySpacing };
            }
            return nodeWidth + xSpacing;
          }

          let totalWidth = 0;
          let currentChildX = currentX;
          
          childrenIds.forEach(cId => {
             const childW = layoutTree(cId, currentChildX, depth + 1);
             currentChildX += childW;
             totalWidth += childW;
          });

          // Center parent above children
          const node = newNodes.find(n => n.id === nodeId);
          if (node) {
            // totalWidth includes xSpacing for each child, so the bounding box is slightly larger.
            // Center is currentX + totalWidth / 2. Subtract half nodeWidth to align left edge of node.
            node.position = { 
              x: currentX + (totalWidth / 2) - (nodeWidth / 2) - (xSpacing / 2), 
              y: 100 + depth * ySpacing 
            };
          }
          
          return totalWidth;
        };

        const roots = newNodes.filter(n => n.data.isRoot);
        let currentGlobalX = 0;
        
        roots.forEach(root => {
          const treeWidth = layoutTree(root.id, currentGlobalX, 0);
          currentGlobalX += treeWidth + 100; // Padding between disjoint trees
        });
      }
      
      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNodeId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportJson = () => {
    if (!rawLevelData) {
      alert("Please load a level first.");
      return;
    }
    
    const newData = JSON.parse(JSON.stringify(rawLevelData));
    
    const newCategories: any[] = [];
    
    // Identify category nodes: Either explicitly tagged, or any node that has outgoing edges (children)
    const categoryNodes = nodes.filter(n => n.data.isCategory || edges.some(e => e.source === n.id));
    
    categoryNodes.forEach(catNode => {
      // Find parent category
      const parentEdge = edges.find(e => e.target === catNode.id);
      let parentCategoryName = null;
      if (parentEdge) {
        const pNode = nodes.find(n => n.id === parentEdge.source);
        if (pNode && categoryNodes.includes(pNode)) {
          parentCategoryName = String(pNode.data.label);
          // Capitalize first letter
          parentCategoryName = parentCategoryName.charAt(0).toUpperCase() + parentCategoryName.slice(1);
        }
      }

      // Find children (words or sub-categories)
      const childEdges = edges.filter(e => e.source === catNode.id);
      const childNodes = childEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as Node[];
      
      const existingCat = (rawLevelData.categories || []).find(
        (c: any) => c.category.toLowerCase() === String(catNode.data.label).toLowerCase()
      );
      
      // We include ALL children in the words array, including sub-categories.
      // In Unity, a sub-category is still spawned as a bubble (a word) in the parent category!
      const words = childNodes.map(childNode => {
        const childLabel = String(childNode.data.label);
        const existingWord = existingCat?.words?.find((w: any) => w.fullWord.toLowerCase() === childLabel.toLowerCase());
        
        return existingWord ? existingWord : {
          fullWord: childLabel.charAt(0).toUpperCase() + childLabel.slice(1),
          chunks: [],
          icon: null,
          IsCracked: 0,
          crackBreakNum: 0,
          IsLinked: 0,
          linkedChunkWords: []
        };
      });
      
      newCategories.push({
        category: String(catNode.data.label).charAt(0).toUpperCase() + String(catNode.data.label).slice(1),
        parentCategory: parentCategoryName,
        icon: existingCat?.icon || null,
        words: words
      });
    });
    
    newData.categories = newCategories;
    
    // Fix missing words bug by strictly flattening categories to allWordEntries
    const allWordsFlat: any[] = [];
    newCategories.forEach(cat => {
      cat.words.forEach((w: any) => {
        allWordsFlat.push(w);
      });
    });
    
    newData.allWordEntries = allWordsFlat;
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(newData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", selectedLevelName ? `${selectedLevelName}.json` : "level_config.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (changes.some(c => c.type === 'remove')) {
        saveHistory();
      }
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes, saveHistory]
  );
  
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (changes.some(c => c.type === 'remove')) {
        saveHistory();
      }
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges, saveHistory]
  );

  const onConnect = useCallback(
    (params: Connection | Edge) => {
      saveHistory();
      setEdges((eds) => addEdge(params, eds));
    },
    [setEdges, saveHistory],
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const handlePaneClick = () => {
    setSelectedNodeId(null);
  };

  const handleAddRoot = () => {
    const word = prompt("Enter a starting word:");
    if (!word) return;
    
    saveHistory();
    const newNode: Node = {
      id: uuidv4(),
      type: 'custom',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 200 + 100 },
      data: { label: word.toLowerCase(), isRoot: true, isCategory: true }
    };
    
    setNodes((nds) => nds.concat(newNode));
  };

  const handleAddChild = (parentNode: Node, childLabel: string) => {
    saveHistory();
    // Check if child already exists
    let childNode = nodes.find(n => n.data.label === childLabel);
    
    if (!childNode) {
      childNode = {
        id: uuidv4(),
        type: 'custom',
        position: { x: parentNode.position.x + (Math.random() * 200 - 100), y: parentNode.position.y + 150 },
        data: { label: childLabel, isCategory: false }
      };
      setNodes((nds) => nds.concat(childNode!));
    }
    
    const newEdge: Edge = {
      id: `e-${parentNode.id}-${childNode.id}`,
      source: parentNode.id,
      target: childNode.id,
      animated: true,
      style: { stroke: 'var(--accent)' }
    };
    
    setEdges((eds) => addEdge(newEdge, eds));
  };

  const handleDeleteSelected = () => {
    saveHistory();
    const selectedIds = nodes.filter(n => n.selected || n.id === selectedNodeId).map(n => n.id);
    if (selectedIds.length === 0) return;
    
    setNodes((nds) => nds.filter((n) => !selectedIds.includes(n.id)));
    setEdges((eds) => eds.filter((e) => !selectedIds.includes(e.source) && !selectedIds.includes(e.target)));
    setSelectedNodeId(null);
  };

  const handleRenameNode = (nodeId: string, newLabel: string) => {
    saveHistory();
    setNodes((nds) => 
      nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n)
    );
  };

  const handleImportDictionary = (categoryName: string, dictionary: any[], targetParentId?: string) => {
    saveHistory();
    const importedNodes: Node[] = [];
    const importedEdges: Edge[] = [];
    const createdCats = new Set<string>();

    const importBranch = (catName: string, parentId: string | null, depth: number) => {
      if (createdCats.has(catName.toLowerCase())) return;
      createdCats.add(catName.toLowerCase());

      const entry = dictionary.find((e: any) => e.name.toLowerCase() === catName.toLowerCase());
      if (!entry) return;

      const nodeId = uuidv4();
      const isRoot = parentId === null;
      
      importedNodes.push({
        id: nodeId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: { label: entry.name.toLowerCase(), isRoot, isCategory: true }
      });

      if (parentId) {
        importedEdges.push({
          id: `e-${parentId}-${nodeId}`,
          source: parentId,
          target: nodeId,
          animated: true,
          style: { stroke: 'var(--accent)' }
        });
      }

      entry.words.forEach((w: string) => {
        const wordId = uuidv4();
        importedNodes.push({
          id: wordId,
          type: 'custom',
          position: { x: 0, y: 0 },
          data: { label: w.toLowerCase(), isCategory: false }
        });
        importedEdges.push({
          id: `e-${nodeId}-${wordId}`,
          source: nodeId,
          target: wordId,
          animated: true,
          style: { stroke: 'var(--accent)' }
        });
      });

      entry.subcategories.forEach((sub: string) => {
        importBranch(sub, nodeId, depth + 1);
      });
    };

    importBranch(categoryName, targetParentId || null, targetParentId ? 1 : 0);

    // Run layoutTree on this specific imported branch so it looks nice
    // If targetParentId exists, we should layout from the newly created category node (the first child added)
    const rootNodes = targetParentId ? [importedNodes[0]] : importedNodes.filter(n => n.data.isRoot);
    
    const layoutTree = (nodeId: string, currentX: number, depth: number): number => {
      const childrenIds = importedEdges.filter(e => e.source === nodeId).map(e => e.target);
      if (childrenIds.length === 0) {
        const node = importedNodes.find(n => n.id === nodeId);
        if (node) node.position = { x: currentX, y: 100 + depth * 150 };
        return 180;
      }

      let totalWidth = 0;
      let currentChildX = currentX;
      childrenIds.forEach(cId => {
         const childW = layoutTree(cId, currentChildX, depth + 1);
         currentChildX += childW;
         totalWidth += childW;
      });

      const node = importedNodes.find(n => n.id === nodeId);
      if (node) {
        node.position = { x: currentX + (totalWidth / 2) - 90, y: 100 + depth * 150 };
      }
      return totalWidth;
    };

    // Find the root of this imported branch
    rootNodes.forEach(root => {
      if (root) {
        layoutTree(root.id, targetParentId ? (nodes.find(n => n.id === targetParentId)?.position.x || 0) : Math.random() * 500, 0);
      }
    });

    setNodes(nds => [...nds, ...importedNodes]);
    setEdges(eds => [...eds, ...importedEdges]);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      
      {/* Top Navbar */}
      <div className="glass-panel" style={{
        position: 'absolute', top: '20px', left: '20px', right: '360px', 
        height: '60px', borderRadius: '12px', zIndex: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontWeight: 700, fontSize: '20px', letterSpacing: '1px' }}>
            WordNet Builder
          </div>
          <select 
            value={selectedLevelName} 
            onChange={(e) => loadLevel(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--panel-border)', color: 'white', outline: 'none'
            }}
          >
            <option value="">-- Load Level --</option>
            {levels.map(lvl => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setIsDictOpen(true)}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--accent)',
              background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600
            }}
          >
            <BookOpen size={14} /> Global Dictionary
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            disabled={!rawLevelData}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)',
              background: 'transparent', color: 'var(--text-main)', cursor: rawLevelData ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, opacity: rawLevelData ? 1 : 0.5
            }}
          >
            <Settings size={14} /> Config
          </button>
          <button 
            onClick={handleAddRoot}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)',
              background: 'transparent', color: 'var(--text-main)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500
            }}
          >
            <Plus size={14} /> New Root
          </button>
          <button 
            onClick={() => exportGraphToCsv(nodes, edges)}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: 'none',
              background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500
            }}
          >
            <Download size={14} /> CSV
          </button>
          <button 
            onClick={handleExportJson}
            disabled={!rawLevelData}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: 'white', cursor: rawLevelData ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, opacity: rawLevelData ? 1 : 0.5
            }}
          >
            <Save size={14} /> Save JSON
          </button>
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        colorMode="dark"
        fitView
        panOnDrag={[1, 2]} // Middle and Right click
        selectionOnDrag={true}
        panActivationKeyCode="Space"
        deleteKeyCode={['Backspace', 'Delete']}
        selectionMode={SelectionMode.Partial}
        onNodeDragStart={() => saveHistory()}
      >
        <Controls style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', fill: 'var(--text-main)' }} />
        <MiniMap 
          nodeColor="var(--accent)" 
          maskColor="rgba(0,0,0,0.7)"
          style={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)' }} 
        />
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="var(--panel-border)" />
      </ReactFlow>

      <DictionaryBrowser 
        isOpen={isDictOpen} 
        onClose={() => setIsDictOpen(false)} 
        onImport={handleImportDictionary}
      />

      <LevelSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        levelData={rawLevelData} 
        onSave={setRawLevelData}
      />

      <Sidebar 
        selectedNode={selectedNode}
        onClose={() => setSelectedNodeId(null)}
        onAddChild={handleAddChild}
        onDeleteNode={handleDeleteSelected}
        onRenameNode={handleRenameNode}
        onImportDictionary={handleImportDictionary}
      />
    </div>
  );
}
