import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  useReactFlow,
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
import MagicChangeModal from './MagicChangeModal';
import { Save, BookOpen, Settings, Plus, RefreshCw, Puzzle, Sparkles, Link } from 'lucide-react';

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
  
  const [leftPanelTab, setLeftPanelTab] = useState<'words'|'chunks'|'settings'>('words');
  const [autoCutWords, setAutoCutWords] = useState<boolean>(false);
  const [globalDict, setGlobalDict] = useState<any[]>([]);
  const [misleadingWords, setMisleadingWords] = useState<string[]>([]);
  
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedLevelName, setSelectedLevelName] = useState<string>('');
  
  const [rawLevelData, setRawLevelData] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMagicChangeOpen, setIsMagicChangeOpen] = useState(false);
  const [isDictOpen, setIsDictOpen] = useState(false);
  
  const [copiedTreeConfig, setCopiedTreeConfig] = useState<any | null>(null);
  
  const { setCenter, fitView } = useReactFlow();

  const handleFocusNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 60, node.position.y + 30, { zoom: 1.2, duration: 800 });
      setSelectedNodeId(nodeId);
    }
  };

  // Mutual exclusion: if any node is selected, close settings
  useEffect(() => {
    if (selectedNodeId !== null || nodes.some(n => n.selected)) {
      setIsSettingsOpen(false);
    }
  }, [selectedNodeId, nodes]);
  
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

    fetch(`/global_dictionary.json?t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setGlobalDict(data))
      .catch(console.error);

    // Load from autosave
    const saved = localStorage.getItem('wordnet_autosave');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.nodes && parsed.nodes.length > 0) {
          setNodes(parsed.nodes);
          setEdges(parsed.edges);
          setRawLevelData(parsed.rawLevelData);
          setSelectedLevelName(parsed.selectedLevelName);
        }
      } catch (e) {
        console.error('Failed to load autosave', e);
      }
    }
  }, []);

  // Save to autosave whenever critical state changes
  useEffect(() => {
    if (!selectedLevelName && nodes.length === 0) return;
    const timeout = setTimeout(() => {
      const saveData = {
        selectedLevelName,
        nodes,
        edges,
        rawLevelData
      };
      localStorage.setItem('wordnet_autosave', JSON.stringify(saveData));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [nodes, edges, rawLevelData, selectedLevelName]);

  useEffect(() => {
    if (globalDict.length === 0 || nodes.length === 0) return;
    
    // Gather level words
    const wordListNodes = nodes.filter(n => !n.data.isCategory && !n.data.isChunk);
    const levelWords = new Set(wordListNodes.map(n => String(n.data.label).toLowerCase()));
    
    // Gather chunks
    const chunkNodes = nodes.filter(n => n.data.isChunk);
    const availableChunks = chunkNodes.map(n => String(n.data.label).toLowerCase());
    
    if (availableChunks.length === 0) {
      setMisleadingWords([]);
      return;
    }

    // Flatten dictionary words
    const flatDict = new Set<string>();
    globalDict.forEach(cat => {
      cat.words?.forEach((w: any) => flatDict.add(w.word.toLowerCase()));
    });

    const canFormWord = (word: string, chunks: string[], usedCount: number = 0): boolean => {
      if (word.length === 0) return usedCount > 1;
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (word.startsWith(chunk)) {
          const nextChunks = [...chunks];
          nextChunks.splice(i, 1);
          if (canFormWord(word.substring(chunk.length), nextChunks, usedCount + 1)) return true;
        }
      }
      return false;
    };

    const misleading: string[] = [];
    for (const word of flatDict) {
      if (levelWords.has(word)) continue;
      // Filter out words that are too short to be formed by combining multiple chunks? 
      // We assume if a word is formed, it's misleading.
      if (canFormWord(word, availableChunks)) {
        misleading.push(word);
      }
    }
    
    setMisleadingWords(misleading.sort());
  }, [nodes, globalDict]);

  const createChunksForWord = (wordId: string, word: string, targetNodes: Node[], targetEdges: Edge[], parentX: number, parentY: number) => {
    const cleanWord = String(word).trim().toLowerCase();
    if (cleanWord.length <= 1) return;
    const half = Math.ceil(cleanWord.length / 2);
    const chunk1 = cleanWord.slice(0, half);
    const chunk2 = cleanWord.slice(half);
    
    const c1Id = uuidv4();
    targetNodes.push({
      id: c1Id, type: 'custom', position: { x: parentX - 60, y: parentY + 80 },
      data: { label: chunk1, isChunk: true, isCategory: false }
    });
    targetEdges.push({
      id: `e-${wordId}-${c1Id}`, source: wordId, target: c1Id, animated: true,
      style: { stroke: 'rgba(99,102,241,0.5)', strokeDasharray: '5,5' }
    });
    
    const c2Id = uuidv4();
    targetNodes.push({
      id: c2Id, type: 'custom', position: { x: parentX + 60, y: parentY + 80 },
      data: { label: chunk2, isChunk: true, isCategory: false }
    });
    targetEdges.push({
      id: `e-${wordId}-${c2Id}`, source: wordId, target: c2Id, animated: true,
      style: { stroke: 'rgba(99,102,241,0.5)', strokeDasharray: '5,5' }
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadDataIntoGraph = (data: any, levelName: string) => {
    setSelectedLevelName(levelName);
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
            data: { label: cat.category.toLowerCase(), isRoot, isCategory: true, icon: cat.icon }
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

              let gIndex = undefined;
              if (data.allWordEntries && Array.isArray(data.allWordEntries)) {
                const arrIdx = data.allWordEntries.findIndex((e: any) => e.fullWord.toLowerCase() === wordLower);
                if (arrIdx !== -1) gIndex = arrIdx + 1;
              }

              const wordNode: Node = {
                id: uuidv4(),
                type: 'custom',
                position: { x: 0, y: 0 },
                data: { label: wordLower, isCategory: false, icon: w.icon, globalIndex: gIndex }
              };
              newNodes.push(wordNode);
              newEdges.push({
                id: `e-${parentCatNode.id}-${wordNode.id}`,
                source: parentCatNode.id,
                target: wordNode.id,
                animated: true,
                style: { stroke: 'var(--accent)' }
              });

              if (w.chunks && Array.isArray(w.chunks)) {
                w.chunks.forEach((chunkStr: string) => {
                  const chunkNode: Node = {
                    id: uuidv4(),
                    type: 'custom',
                    position: { x: 0, y: 0 },
                    data: { label: chunkStr.toLowerCase(), isCategory: false, isChunk: true }
                  };
                  newNodes.push(chunkNode);
                  newEdges.push({
                    id: `e-${wordNode.id}-${chunkNode.id}-${uuidv4()}`,
                    source: wordNode.id,
                    target: chunkNode.id,
                    animated: true,
                    style: { stroke: 'rgba(99,102,241,0.5)', strokeDasharray: '5,5' }
                  });
                });
              }
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
  };

  const loadLevel = async (levelName: string) => {
    if (!levelName) return;
    try {
      const res = await fetch(`/levels/${levelName}.json`);
      const data = await res.json();
      loadDataIntoGraph(data, levelName);
    } catch (err) {
      console.error("Failed to load level:", err);
      alert("Error loading level JSON.");
    }
  };

  const handleLoadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const data = JSON.parse(text);
        const levelName = file.name.replace(/\.[^/.]+$/, "");
        loadDataIntoGraph(data, levelName);
      } catch (err) {
        alert("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportJson = async () => {
    if (!rawLevelData) {
      alert("Please load a level first.");
      return;
    }
    
    const newData = JSON.parse(JSON.stringify(rawLevelData));
    
    // Scrub legacy garbage keys
    const garbageKeys = [
      'hasSeperator',
      'hasCrypticBubbles', 'minMaxCrypticBubbles',
      'hasBurstBubbles', 'minMaxBurstBubbles',
      'hasBackwardBubbles', 'minMaxBackwardBubbles',
      'hasFrozenBubbles', 'minMaxFrozenBubbles',
      'hasKeyLockBubbles', 'minMaxKeyLockBubbles',
      'hasScrewLockBubbles', 'minMaxScrewLockBubbles',
      'hasCrackBubbles', 'minMaxCrackBubbles',
      'hasLinkedBubbles', 'minMaxLinkedBubbles'
    ];
    garbageKeys.forEach(k => delete newData[k]);
    
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

      // Find children (words or sub-categories, excluding chunks)
      const childEdges = edges.filter(e => e.source === catNode.id);
      const childNodes = childEdges.map(e => nodes.find(n => n.id === e.target)).filter(n => n && !n.data.isChunk) as Node[];
      
      const existingCat = (rawLevelData.categories || []).find(
        (c: any) => c.category.toLowerCase() === String(catNode.data.label).toLowerCase()
      );
      
      // We include ALL children in the words array, including sub-categories.
      // In Unity, a sub-category is still spawned as a bubble (a word) in the parent category!
      const words = childNodes.map(childNode => {
        const childLabel = String(childNode.data.label);
        const existingWord = existingCat?.words?.find((w: any) => w.fullWord.toLowerCase() === childLabel.toLowerCase());
        
        const chunkEdges = edges.filter(e => e.source === childNode.id);
        const chunkNodes = chunkEdges.map(e => nodes.find(n => n.id === e.target)).filter(n => n && n.data.isChunk) as Node[];
        const chunks = chunkNodes.map(n => String(n.data.label));
        
        const wordObj = existingWord ? { ...existingWord } : {
          fullWord: childLabel.charAt(0).toUpperCase() + childLabel.slice(1),
          chunks: [],
          icon: null,
          IsCracked: 0,
          crackBreakNum: 0,
          IsLinked: 0,
          linkedChunkWords: []
        };
        
        wordObj.chunks = chunks;
        wordObj.icon = childNode.data.icon || null;
        return wordObj;
      });
      
      const catObj = {
        category: String(catNode.data.label).charAt(0).toUpperCase() + String(catNode.data.label).slice(1),
        parentCategory: parentCategoryName,
        icon: catNode.data.icon || null,
        words: words
      };
      newCategories.push(catObj);
    });
    
    newData.categories = newCategories;

    const allWordNodes = nodes.filter(n => !n.data.isCategory && !n.data.isChunk);
    const newAllWordEntries: any[] = [];
    
    allWordNodes.forEach(childNode => {
      const idx = childNode.data.globalIndex as number | undefined;
      if (idx !== undefined) {
         const arrayIndex = idx - 1;
         const childLabel = String(childNode.data.label);
         
         const chunkEdges = edges.filter(e => e.source === childNode.id);
         const chunkNodes = chunkEdges.map(e => nodes.find(n => n.id === e.target)).filter(n => n && n.data.isChunk);
         const chunks = chunkNodes.map((n: any) => String(n.data.label));

         const existingEntry = rawLevelData?.allWordEntries?.[arrayIndex];

         const wordObj = existingEntry ? { ...existingEntry } : {
           fullWord: childLabel.charAt(0).toUpperCase() + childLabel.slice(1),
           chunks: [],
           icon: childNode.data.icon || null,
           IsCracked: 0,
           crackBreakNum: 0,
           IsLinked: 0,
           linkedChunkWords: []
         };
         
         wordObj.fullWord = childLabel.charAt(0).toUpperCase() + childLabel.slice(1);
         wordObj.chunks = chunks;
         wordObj.icon = childNode.data.icon || null;
         
         newAllWordEntries[arrayIndex] = wordObj;
      }
    });

    newData.allWordEntries = newAllWordEntries.filter(Boolean);

    const jsonStr = JSON.stringify(newData, null, 2);
    const fileName = selectedLevelName ? `${selectedLevelName}.json` : "level_config.json";
    
    if ('showSaveFilePicker' in window) {
      try {
        const fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: 'JSON File',
            accept: { 'application/json': ['.json'] },
          }],
        });
        
        const writable = await fileHandle.createWritable();
        await writable.write(jsonStr);
        await writable.close();
        
        setRawLevelData(newData); // Refresh rawData so indices update
        return; // Success
      } catch (err: any) {
        // User might have cancelled the picker, or permission denied.
        if (err.name === 'AbortError') return;
        console.warn("File System Access failed, falling back to standard download:", err);
      }
    }
    
    // Fallback standard download
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(jsonStr);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", fileName);
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
    const newNodeId = uuidv4();
    const pos = { x: Math.random() * 400 + 100, y: Math.random() * 200 + 100 };
    const newNode: Node = {
      id: newNodeId,
      type: 'custom',
      position: pos,
      data: { label: word.toLowerCase(), isRoot: true, isCategory: true }
    };
    
    setNodes((nds) => nds.map(n => ({...n, selected: false})).concat({...newNode, selected: true}));
    
    setTimeout(() => {
      setSelectedNodeId(newNodeId);
      setCenter(pos.x + 60, pos.y + 30, { zoom: 1.2, duration: 800 });
    }, 50);
  };

  const handleAddChild = (parentNode: Node, childLabel: string, isChunk: boolean = false) => {
    saveHistory();
    // Chunks are unique nodes to preserve order and duplicate names (e.g. "na", "na" for "banana")
    let childNode = isChunk ? undefined : nodes.find(n => n.data.label === childLabel && !n.data.isChunk);
    
    const newNodesToAppend: Node[] = [];
    const newEdgesToAppend: Edge[] = [];
    
    if (!childNode) {
      const existingChildren = edges.filter(e => e.source === parentNode.id).length;
      const siblingIndex = existingChildren + newNodesToAppend.length;
      const xOffset = siblingIndex === 0 ? 0 : (siblingIndex % 2 === 0 ? 1 : -1) * Math.ceil(siblingIndex / 2) * 150;
      childNode = {
        id: uuidv4(),
        type: 'custom',
        position: { x: parentNode.position.x + xOffset, y: parentNode.position.y + 120 },
        data: { label: childLabel, isCategory: false, isChunk }
      };
      newNodesToAppend.push(childNode);
    }
    
    newEdgesToAppend.push({
      id: `e-${parentNode.id}-${childNode.id}-${uuidv4()}`,
      source: parentNode.id,
      target: childNode.id,
      animated: true,
      style: { stroke: isChunk ? 'rgba(99,102,241,0.5)' : 'var(--accent)', strokeDasharray: isChunk ? '5,5' : 'none' }
    });

    if (!isChunk && autoCutWords) {
      createChunksForWord(childNode.id, childLabel, newNodesToAppend, newEdgesToAppend, childNode.position.x, childNode.position.y);
    }
    
    if (newNodesToAppend.length > 0) setNodes((nds) => [...nds, ...newNodesToAppend]);
    if (newEdgesToAppend.length > 0) setEdges((eds) => [...eds, ...newEdgesToAppend]);
  };

  const handleDeleteSelected = () => {
    saveHistory();
    const selectedNodeIds = nodes.filter(n => n.selected || n.id === selectedNodeId).map(n => n.id);
    const selectedEdgeIds = edges.filter(e => e.selected).map(e => e.id);
    
    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;
    
    setNodes((nds) => nds.filter((n) => !selectedNodeIds.includes(n.id)));
    setEdges((eds) => eds.filter((e) => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target) && !selectedEdgeIds.includes(e.id)));
    setSelectedNodeId(null);
  };

  const handleRenameNode = (nodeId: string, newLabel: string) => {
    saveHistory();
    setNodes((nds) => 
      nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, label: newLabel } } : n)
    );
  };

  const handleToggleNodeIcon = (nodeId: string, currentIcon: string | null) => {
    saveHistory();
    setNodes((nds) => 
      nds.map(n => {
        if (n.id === nodeId) {
          const newIcon = currentIcon ? null : String(n.data.label);
          return { ...n, data: { ...n.data, icon: newIcon } };
        }
        return n;
      })
    );
  };

  const handleUpdateNodeIndex = (nodeId: string, newIndex: number | undefined) => {
    setNodes((nds) => nds.map((n) => {
      if (n.id === nodeId) {
        return { ...n, data: { ...n.data, globalIndex: newIndex } };
      }
      return n;
    }));
  };

  const handlePasteTreeConfig = useCallback((categoryId: string, config: any) => {
    saveHistory();
    setNodes(nds => {
      const newNds = [...nds];
      const catIdx = newNds.findIndex(n => n.id === categoryId);
      if (catIdx !== -1) {
        newNds[catIdx] = { ...newNds[catIdx], data: { ...newNds[catIdx].data, icon: config.categoryIcon } };
      }
      
      const childEdges = edges.filter(e => e.source === categoryId);
      const childIds = childEdges.map(e => e.target);
      
      let wordConfigIdx = 0;
      for (const cid of childIds) {
        if (wordConfigIdx >= config.wordsConfig.length) break;
        const cNodeIdx = newNds.findIndex(n => n.id === cid && !n.data.isCategory && !n.data.isChunk);
        if (cNodeIdx !== -1) {
          const wConf = config.wordsConfig[wordConfigIdx];
          newNds[cNodeIdx] = {
            ...newNds[cNodeIdx],
            data: {
              ...newNds[cNodeIdx].data,
              globalIndex: wConf.globalIndex,
              icon: wConf.icon
            }
          };
          wordConfigIdx++;
        }
      }
      return newNds;
    });
  }, [edges, saveHistory, setNodes]);

  const handleImportDictionary = (categoryName: string, dictionary: any[], targetParentId?: string, options?: any) => {
    saveHistory();
    const singleNodeOnly = typeof options === 'boolean' ? options : options?.singleNodeOnly;
    const reqSig = options?.requiredSig;
    const searchQuery = options?.searchQuery;
    const replaceNodes: Node[] = options?.replaceNodes || [];
    const keepOldTreeAnchor: Node[] = options?.keepOldTreeAnchor || [];
    const exactMatch = options?.exactMatch || false;

    const importedNodes: Node[] = [];
    const importedEdges: Edge[] = [];
    const createdCats = new Set<string>();

    let actualTargetParentId = targetParentId;
    let oldRootNodeId: string | null = null;
    let keepRootNodeId: string | null = null;

    if (replaceNodes.length > 0) {
      const oldRoot = replaceNodes.find(n => !edges.some(e => e.target === n.id && replaceNodes.some(sn => sn.id === e.source)));
      if (oldRoot) {
        oldRootNodeId = oldRoot.id;
        const incomingEdge = edges.find(e => e.target === oldRoot.id && !replaceNodes.some(sn => sn.id === e.source));
        if (incomingEdge) actualTargetParentId = incomingEdge.source;
      }
    } else if (keepOldTreeAnchor.length > 0) {
      const keepRoot = keepOldTreeAnchor.find(n => !edges.some(e => e.target === n.id && keepOldTreeAnchor.some(sn => sn.id === e.source)));
      if (keepRoot) {
        keepRootNodeId = keepRoot.id;
        const incomingEdge = edges.find(e => e.target === keepRoot.id && !keepOldTreeAnchor.some(sn => sn.id === e.source));
        if (incomingEdge) actualTargetParentId = incomingEdge.source;
      }
    }

    const getDictSig = (catName: string): any => {
      const entry = dictionary.find((e: any) => e.name.toLowerCase() === catName.toLowerCase());
      if (!entry) return { numWords: 0, subcats: [] };
      const subSig = entry.subcategories.map((sub: string) => getDictSig(sub));
      return { numWords: entry.words.length, subcats: subSig };
    };

    const isFulfilled = (req: any, avail: any): boolean => {
      if (avail.numWords < req.numWords) return false;
      if (req.subcats.length > avail.subcats.length) return false;
      let availSubs = [...avail.subcats];
      for (const reqSub of req.subcats) {
        const matchIdx = availSubs.findIndex(aSub => isFulfilled(reqSub, aSub));
        if (matchIdx === -1) return false;
        availSubs.splice(matchIdx, 1);
      }
      return true;
    };

    const importBranch = (catName: string, parentId: string | null, depth: number, currentReqSig?: any) => {
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

      if (!singleNodeOnly) {
        let chosenSubcategories: string[] = [];

        if (currentReqSig) {
          let availSubs = [...entry.subcategories];
          if (searchQuery) {
            const terms = searchQuery.split('&').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
            availSubs.sort((a: string, b: string) => {
              const aMatch = terms.some((t: string) => exactMatch ? a.toLowerCase() === t : a.toLowerCase().includes(t)) ? 1 : 0;
              const bMatch = terms.some((t: string) => exactMatch ? b.toLowerCase() === t : b.toLowerCase().includes(t)) ? 1 : 0;
              return bMatch - aMatch;
            });
          }
          currentReqSig.subcats.forEach((rSub: any) => {
            const matchIdx = availSubs.findIndex(subName => {
              const availSig = getDictSig(subName);
              return isFulfilled(rSub, availSig);
            });
            if (matchIdx !== -1) {
              const chosenSub = availSubs[matchIdx];
              availSubs.splice(matchIdx, 1);
              chosenSubcategories.push(chosenSub);
              importBranch(chosenSub, nodeId, depth + 1, rSub);
            }
          });
        } else {
          entry.subcategories.forEach((sub: string) => {
            chosenSubcategories.push(sub);
            importBranch(sub, nodeId, depth + 1);
          });
        }

        let wordsToImport = entry.words.filter((w: any) => 
          !chosenSubcategories.some((sub: string) => sub.toLowerCase() === w.word.toLowerCase())
        );

        if (currentReqSig) {
          if (searchQuery) {
            const terms = searchQuery.split('&').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
            wordsToImport.sort((a: any, b: any) => {
              const aMatch = terms.some((t: string) => exactMatch ? a.word.toLowerCase() === t : a.word.toLowerCase().includes(t)) ? 1 : 0;
              const bMatch = terms.some((t: string) => exactMatch ? b.word.toLowerCase() === t : b.word.toLowerCase().includes(t)) ? 1 : 0;
              return bMatch - aMatch;
            });
          } else if (wordsToImport.length > currentReqSig.numWords) {
            // Smart Cohesive Sub-clustering: Try to pick words that belong to the same specific type
            const clusterMap = new Map<string, any[]>();
            for (const w of wordsToImport) {
              const otherCats = dictionary.filter((c: any) => c.name !== entry.name && c.words.some((cw: any) => cw.word === w.word));
              for (const c of otherCats) {
                if (!clusterMap.has(c.name)) clusterMap.set(c.name, []);
                clusterMap.get(c.name)!.push(w);
              }
            }
            
            const validClusters = Array.from(clusterMap.values()).filter(arr => arr.length >= currentReqSig.numWords);
            if (validClusters.length > 0) {
              // Pick a random valid cluster for magical variety
              wordsToImport = validClusters[Math.floor(Math.random() * validClusters.length)];
            }
          }
          wordsToImport = wordsToImport.slice(0, currentReqSig.numWords);
        }

        wordsToImport.forEach((w: any) => {
          const wordId = uuidv4();
          importedNodes.push({
            id: wordId,
            type: 'custom',
            position: { x: 0, y: 0 },
            data: { label: w.word.toLowerCase(), isCategory: false, icon: w.icon }
          });
          importedEdges.push({
            id: `e-${nodeId}-${wordId}`,
            source: nodeId,
            target: wordId,
            animated: true,
            style: { stroke: 'var(--accent)' }
          });
        });
      }
    };

    importBranch(categoryName, actualTargetParentId || null, actualTargetParentId ? 1 : 0, reqSig);

    // Run layoutTree on this specific imported branch so it looks nice
    // If targetParentId exists, we should layout from the newly created category node (the first child added)
    const rootNodes = targetParentId ? [importedNodes[0]] : importedNodes.filter(n => n.data.isRoot);
    
    const rightmostX = nodes.length > 0 ? Math.max(...nodes.map(n => n.position.x)) : 0;
    
    // If we are replacing, spawn at the exact same location as the old root
    const oldRootPos = (oldRootNodeId && replaceNodes.find(n => n.id === oldRootNodeId)?.position) || null;
    const keepRootPos = (keepRootNodeId && nodes.find(n => n.id === keepRootNodeId)?.position) || null;
    
    const startX = oldRootPos ? oldRootPos.x : (keepRootPos ? keepRootPos.x : (actualTargetParentId 
      ? (nodes.find(n => n.id === actualTargetParentId)?.position.x || 0) 
      : rightmostX + 400 + Math.random() * 100));
    const startY = oldRootPos ? oldRootPos.y : (keepRootPos ? keepRootPos.y + 600 : 100);

    const layoutTree = (nodeId: string, currentX: number, depth: number): number => {
      const childrenIds = importedEdges.filter(e => e.source === nodeId).map(e => e.target);
      if (childrenIds.length === 0) {
        const node = importedNodes.find(n => n.id === nodeId);
        if (node) node.position = { x: currentX, y: startY + depth * 150 };
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
        node.position = { x: currentX + (totalWidth / 2) - 90, y: startY + depth * 150 };
      }
      return totalWidth;
    };

    rootNodes.forEach(root => {
      if (root) {
        layoutTree(root.id, startX, 0);
      }
    });

    // 4. Overwrite allWordEntries with exact original indices if this is a replacement
    let updatedRawLevelData = rawLevelData;
    const nodeIdsToRemove = new Set(replaceNodes.map(n => n.id));

    const newWordNodes = importedNodes.filter(n => !n.data.isCategory && !n.data.isChunk);

    if (replaceNodes.length > 0) {
      const oldWordNodes = replaceNodes.filter(n => !n.data.isCategory && !n.data.isChunk);
      const oldIndices = oldWordNodes.map(n => n.data.globalIndex).filter(idx => idx !== undefined).sort((a:any,b:any)=>a-b);
      
      if (oldIndices.length > 0 && newWordNodes.length === oldIndices.length && rawLevelData && Array.isArray(rawLevelData.allWordEntries)) {
        const newEntries = [...rawLevelData.allWordEntries];
        oldIndices.forEach((idx, i) => {
          const newWordNode = newWordNodes[i];
          const oldWordNode = oldWordNodes[i];
          newWordNode.data.globalIndex = idx;
          
          const arrayIndex = newEntries.findIndex(e => e.idx === idx);
          if (arrayIndex !== -1) {
            const childLabel = String(newWordNode.data.label);
            const oldHasIcon = !!oldWordNode.data.icon;
            if (!oldHasIcon) {
              newWordNode.data.icon = null;
            } else if (!newWordNode.data.icon) {
              newWordNode.data.icon = childLabel.toLowerCase();
            }

            newEntries[arrayIndex] = {
              ...newEntries[arrayIndex], // preserve other properties if any
              fullWord: childLabel.charAt(0).toUpperCase() + childLabel.slice(1),
              chunks: [],
              icon: newWordNode.data.icon,
              IsCracked: 0,
              crackBreakNum: 0,
              IsLinked: 0,
              linkedChunkWords: []
            };
          }
        });
        updatedRawLevelData = { ...rawLevelData, allWordEntries: newEntries };
      }

      // Also remove chunks attached to the replaced nodes
      const chunkEdgesToRemove = edges.filter(e => nodeIdsToRemove.has(e.source));
      const chunkNodesToRemove = chunkEdgesToRemove.map(e => nodes.find(n => n.id === e.target)).filter(n => n && n.data.isChunk);
      chunkNodesToRemove.forEach(n => { if (n) nodeIdsToRemove.add(n.id); });

      if (autoCutWords && oldIndices.length > 0 && newWordNodes.length === oldIndices.length) {
        oldWordNodes.forEach((oldNode, i) => {
          const hasChunks = edges.some(e => e.source === oldNode.id && nodes.find(n => n.id === e.target)?.data.isChunk);
          if (hasChunks) {
            createChunksForWord(newWordNodes[i].id, String(newWordNodes[i].data.label), importedNodes, importedEdges, newWordNodes[i].position.x, newWordNodes[i].position.y);
          }
        });
      }
    } else if (keepOldTreeAnchor.length > 0) {
      // If we keep the old tree but want to copy indices
      const oldWordNodes = keepOldTreeAnchor.filter(n => !n.data.isCategory && !n.data.isChunk);
      const oldIndices = oldWordNodes.map(n => n.data.globalIndex).filter(idx => idx !== undefined).sort((a:any,b:any)=>a-b);
      
      if (oldIndices.length > 0 && newWordNodes.length === oldIndices.length) {
        oldIndices.forEach((idx, i) => {
          const newWordNode = newWordNodes[i];
          const oldWordNode = oldWordNodes[i];
          newWordNode.data.globalIndex = idx;
          
          const oldHasIcon = !!oldWordNode.data.icon;
          if (!oldHasIcon) {
            newWordNode.data.icon = null;
          } else if (!newWordNode.data.icon) {
            newWordNode.data.icon = String(newWordNode.data.label).toLowerCase();
          }
        });
        
        if (autoCutWords) {
          oldWordNodes.forEach((oldNode, i) => {
            const hasChunks = edges.some(e => e.source === oldNode.id && nodes.find(n => n.id === e.target)?.data.isChunk);
            if (hasChunks) {
              createChunksForWord(newWordNodes[i].id, String(newWordNodes[i].data.label), importedNodes, importedEdges, newWordNodes[i].position.x, newWordNodes[i].position.y);
            }
          });
        }
      }
    } else {
      // Fresh import, cut all if autoCutWords is enabled
      if (autoCutWords) {
        newWordNodes.forEach(wNode => {
          createChunksForWord(wNode.id, String(wNode.data.label), importedNodes, importedEdges, wNode.position.x, wNode.position.y);
        });
      }
    }

    setNodes(nds => [...nds.filter(n => !nodeIdsToRemove.has(n.id)).map(n => ({...n, selected: false})), ...importedNodes.map(n => ({...n, selected: true}))]);
    setEdges(eds => [...eds.filter(e => !nodeIdsToRemove.has(e.source) && !nodeIdsToRemove.has(e.target)), ...importedEdges]);
    if (updatedRawLevelData !== rawLevelData) setRawLevelData(updatedRawLevelData);
    saveHistory();

    setTimeout(() => {
      fitView({ nodes: importedNodes, duration: 800, padding: 0.2 });
      if (importedNodes.length > 0) {
        const rootNode = targetParentId ? importedNodes[0] : importedNodes.find(n => n.data.isRoot) || importedNodes[0];
        setSelectedNodeId(rootNode.id);
      }
    }, 50);
  };

  const handleMagicChange = (popularWords: string, minPopularity: number = 0) => {
    saveHistory();
    const usedCategories = new Set<string>();
    
    // Helper to get signature
    const getTreeSig = (nodeId: string): any => {
      const outgoingEdges = edges.filter(e => e.source === nodeId);
      const childNodes = outgoingEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean) as Node[];
      
      const subcatNodes = childNodes.filter(n => n.data.isCategory);
      const wordNodes = childNodes.filter(n => !n.data.isCategory && !n.data.isChunk);
      
      const subcats = subcatNodes.map(n => getTreeSig(n.id));
      return { nodeId, numWords: wordNodes.length, wordNodeIds: wordNodes.map(n => n.id), subcats };
    };

    const getDictSig = (catName: string): any => {
      const entry = globalDict.find((e: any) => e.name.toLowerCase() === catName.toLowerCase());
      if (!entry) return { numWords: 0, subcats: [] };
      const subSig = entry.subcategories.map((sub: string) => getDictSig(sub));
      return { numWords: entry.words.length, subcats: subSig };
    };

    const isFulfilled = (req: any, avail: any): boolean => {
      if (avail.numWords < req.numWords) return false;
      let availSubs = [...avail.subcats];
      for (const rSub of req.subcats) {
        const matchIdx = availSubs.findIndex(aSub => isFulfilled(rSub, aSub));
        if (matchIdx === -1) return false;
        availSubs.splice(matchIdx, 1);
      }
      return true;
    };

    const getAllDescendants = (nodeId: string): Node[] => {
      const outgoing = edges.filter(e => e.source === nodeId);
      let desc: Node[] = [];
      outgoing.forEach(e => {
        const tgt = nodes.find(n => n.id === e.target);
        if (tgt) {
          desc.push(tgt);
          desc = desc.concat(getAllDescendants(tgt.id));
        }
      });
      return desc;
    };

    const rootNodes = nodes.filter(n => n.data.isCategory && !edges.some(e => e.target === n.id));
    if (rootNodes.length === 0) {
      alert('No independent trees found to replace.');
      return;
    }

    let clonedNodes = [...nodes];
    let clonedEdges = [...edges];
    let clonedRawData = rawLevelData ? { ...rawLevelData, allWordEntries: [...rawLevelData.allWordEntries] } : null;

    for (const root of rootNodes) {
      const sig = getTreeSig(root.id);
      const allOldNodes = [root, ...getAllDescendants(root.id)];
      
      const matches = globalDict.filter((cat: any) => {
        if (usedCategories.has(cat.name)) return false;
        return isFulfilled(sig, getDictSig(cat.name));
      });

      if (matches.length === 0) {
        console.warn(`No matching dictionary category found for tree ${root.data.label}`);
        continue;
      }

      // Shuffle matches to prevent alphabetical bias on ties
      matches.sort(() => Math.random() - 0.5);

      if (minPopularity > 0) {
        matches.sort((a: any, b: any) => {
          const aCount = a.words.filter((w: any) => (w.popularity || 0) >= minPopularity).length;
          const bCount = b.words.filter((w: any) => (w.popularity || 0) >= minPopularity).length;
          return bCount - aCount;
        });
      }

      let chosenCat = matches[0];

      if (popularWords) {
        const terms = popularWords.split(/[\n,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
        if (terms.length > 0) {
          matches.sort((a: any, b: any) => {
            const aMatch = terms.some(t => a.name.toLowerCase().includes(t) || a.words.some((w:any) => w.word.toLowerCase().includes(t))) ? 1 : 0;
            const bMatch = terms.some(t => b.name.toLowerCase().includes(t) || b.words.some((w:any) => w.word.toLowerCase().includes(t))) ? 1 : 0;
            return bMatch - aMatch;
          });
          chosenCat = matches[0];
        }
      }
      
      usedCategories.add(chosenCat.name);

      const newImportedNodes: Node[] = [];
      const newImportedEdges: Edge[] = [];
      const createdCats = new Set<string>();

      const importBranch = (catName: string, parentId: string | null, depth: number, currentReqSig: any) => {
        const entry = globalDict.find((e: any) => e.name.toLowerCase() === catName.toLowerCase());
        if (!entry) return;

        const oldCatNode = nodes.find(n => n.id === currentReqSig.nodeId);
        const nodeId = uuidv4();
        
        if (!createdCats.has(catName.toLowerCase())) {
          let newIcon = entry.icon;
          if (oldCatNode) {
            const oldHasIcon = !!oldCatNode.data.icon;
            if (!oldHasIcon) {
              newIcon = null;
            } else if (!newIcon) {
              newIcon = entry.name.toLowerCase();
            }
          }

          newImportedNodes.push({
            id: nodeId,
            type: 'custom',
            position: oldCatNode?.position || { x: 0, y: 0 },
            data: { label: entry.name, isCategory: true, icon: newIcon }
          });
          createdCats.add(catName.toLowerCase());
        }

        if (parentId) {
          newImportedEdges.push({
            id: `e-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            animated: true,
            style: { stroke: 'var(--accent)' }
          });
        }

        let chosenSubcategories: string[] = [];
        let availSubs = [...entry.subcategories];
        availSubs.sort(() => Math.random() - 0.5);
        
        if (popularWords) {
          const terms = popularWords.split(/[\n,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
          availSubs.sort((a: string, b: string) => {
            const aMatch = terms.some(t => a.toLowerCase().includes(t)) ? 1 : 0;
            const bMatch = terms.some(t => b.toLowerCase().includes(t)) ? 1 : 0;
            return bMatch - aMatch;
          });
        }

        currentReqSig.subcats.forEach((rSub: any) => {
          const matchIdx = availSubs.findIndex(subName => isFulfilled(rSub, getDictSig(subName)));
          if (matchIdx !== -1) {
            const chosenSub = availSubs[matchIdx];
            availSubs.splice(matchIdx, 1);
            chosenSubcategories.push(chosenSub);
            importBranch(chosenSub, nodeId, depth + 1, rSub);
          }
        });

        let wordsToImport = entry.words.filter((w: any) => 
          !chosenSubcategories.some((sub: string) => sub.toLowerCase() === w.word.toLowerCase())
        );

        wordsToImport.sort(() => Math.random() - 0.5);

        if (minPopularity > 0) {
          wordsToImport.sort((a: any, b: any) => {
            const aPop = a.popularity || 0;
            const bPop = b.popularity || 0;
            const aMet = aPop >= minPopularity ? 1 : 0;
            const bMet = bPop >= minPopularity ? 1 : 0;
            if (aMet !== bMet) return bMet - aMet;
            if (aMet && bMet) return 0;
            return bPop - aPop;
          });
        }

        if (popularWords) {
          const terms = popularWords.split(/[\n,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
          wordsToImport.sort((a: any, b: any) => {
            const aMatch = terms.some(t => a.word.toLowerCase().includes(t)) ? 1 : 0;
            const bMatch = terms.some(t => b.word.toLowerCase().includes(t)) ? 1 : 0;
            return bMatch - aMatch;
          });
        }
        wordsToImport = wordsToImport.slice(0, currentReqSig.numWords);

        wordsToImport.forEach((w: any, index: number) => {
          const oldWordNode = nodes.find(n => n.id === currentReqSig.wordNodeIds[index]);
          const wordId = uuidv4();
          
          let newIcon = w.icon;
          if (oldWordNode) {
            const oldHasIcon = !!oldWordNode.data.icon;
            if (!oldHasIcon) {
              newIcon = null;
            } else if (!newIcon) {
              newIcon = w.word.toLowerCase();
            }
          }

          newImportedNodes.push({
            id: wordId,
            type: 'custom',
            position: oldWordNode?.position || { x: 0, y: 0 },
            data: { label: w.word.toLowerCase(), isCategory: false, icon: newIcon, globalIndex: oldWordNode?.data.globalIndex }
          });
          newImportedEdges.push({
            id: `e-${nodeId}-${wordId}`,
            source: nodeId,
            target: wordId,
            animated: true,
            style: { stroke: 'var(--accent)' }
          });

          // Sync rawLevelData
          if (oldWordNode && clonedRawData && Array.isArray(clonedRawData.allWordEntries)) {
            const arrayIndex = clonedRawData.allWordEntries.findIndex((e:any) => e.idx === oldWordNode.data.globalIndex);
            if (arrayIndex !== -1) {
              clonedRawData.allWordEntries[arrayIndex] = {
                ...clonedRawData.allWordEntries[arrayIndex],
                fullWord: w.word.charAt(0).toUpperCase() + w.word.slice(1),
                chunks: [],
                icon: newIcon,
                IsCracked: 0,
                crackBreakNum: 0,
                IsLinked: 0,
                linkedChunkWords: []
              };
            }
          }

          // Chunk preservation (regardless of autoCutWords)
          if (oldWordNode) {
            const hasChunks = edges.some(e => e.source === oldWordNode.id && nodes.find(n => n.id === e.target)?.data.isChunk);
            if (hasChunks) {
              const wordStr = w.word.toLowerCase();
              const chunkLen = Math.floor(wordStr.length / 2) || 1;
              const c1 = wordStr.substring(0, chunkLen);
              const c2 = wordStr.substring(chunkLen);
              const c1Id = uuidv4();
              const c2Id = uuidv4();
              const baseX = oldWordNode.position.x;
              const baseY = oldWordNode.position.y;
              newImportedNodes.push({ id: c1Id, type: 'custom', position: { x: baseX - 40, y: baseY + 60 }, data: { label: c1, isCategory: false, isChunk: true }});
              newImportedNodes.push({ id: c2Id, type: 'custom', position: { x: baseX + 40, y: baseY + 60 }, data: { label: c2, isCategory: false, isChunk: true }});
              newImportedEdges.push({ id: `e-${wordId}-${c1Id}`, source: wordId, target: c1Id, animated: true, style: { stroke: 'var(--accent)' }});
              newImportedEdges.push({ id: `e-${wordId}-${c2Id}`, source: wordId, target: c2Id, animated: true, style: { stroke: 'var(--accent)' }});
              
              if (clonedRawData && Array.isArray(clonedRawData.allWordEntries)) {
                const arrayIndex = clonedRawData.allWordEntries.findIndex((e:any) => e.idx === oldWordNode.data.globalIndex);
                if (arrayIndex !== -1) {
                  clonedRawData.allWordEntries[arrayIndex].chunks = [c1, c2];
                }
              }
            }
          }
        });
      };

      importBranch(chosenCat.name, null, 0, sig);

      // Remove old tree nodes & edges
      const allOldIds = new Set(allOldNodes.map(n => n.id));
      const chunkEdgesToRemove = clonedEdges.filter(e => allOldIds.has(e.source));
      const chunkNodesToRemove = chunkEdgesToRemove.map(e => clonedNodes.find(n => n.id === e.target)).filter(n => n && n.data.isChunk);
      chunkNodesToRemove.forEach(n => { if (n) allOldIds.add(n.id); });

      clonedNodes = clonedNodes.filter(n => !allOldIds.has(n.id));
      clonedEdges = clonedEdges.filter(e => !allOldIds.has(e.source) && !allOldIds.has(e.target));

      // Add new tree
      clonedNodes.push(...newImportedNodes);
      clonedEdges.push(...newImportedEdges);
    }

    setNodes(clonedNodes);
    setEdges(clonedEdges);
    if (clonedRawData) setRawLevelData(clonedRawData);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const wordListNodes = useMemo(() => {
    const getIsChained = (n: Node) => rawLevelData?.useBubbleSeparator === 1 && rawLevelData?.bubbleSeparatorData?.linkedWords?.includes(String(n.data.label));

    return nodes.filter((n: any) => !n.data.isCategory && !n.data.isChunk).sort((a: any, b: any) => {
      const chainedA = getIsChained(a);
      const chainedB = getIsChained(b);
      
      if (chainedA && !chainedB) return -1;
      if (!chainedA && chainedB) return 1;

      const idxA = a.data.globalIndex ?? Infinity;
      const idxB = b.data.globalIndex ?? Infinity;
      return idxA - idxB;
    });
  }, [nodes, rawLevelData]);

  const [dragOverNodeId, setDragOverNodeId] = useState<string | null>(null);
  
  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData('text/plain', nodeId);
    const draggedNode = nodes.find(n => n.id === nodeId);
    if (draggedNode) {
      e.dataTransfer.setData('application/reactflow-node', String(draggedNode.data.label));
    }
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    setDragOverNodeId(nodeId);
  };

  const handleDragLeave = (e: React.DragEvent, nodeId: string) => {
    e.preventDefault();
    if (dragOverNodeId === nodeId) {
      setDragOverNodeId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
    setDragOverNodeId(null);
    const draggedNodeId = e.dataTransfer.getData('text/plain');
    if (draggedNodeId === targetNodeId) return;
    
    const draggedIndex = wordListNodes.findIndex((n: any) => n.id === draggedNodeId);
    const targetIndex = wordListNodes.findIndex((n: any) => n.id === targetNodeId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    const newList = [...wordListNodes];
    const [draggedNode] = newList.splice(draggedIndex, 1);
    newList.splice(targetIndex, 0, draggedNode);
    
    const indexUpdates: Record<string, number> = {};
    newList.forEach((node: any, idx) => {
      indexUpdates[node.id] = idx + 1;
    });
    
    setNodes(nds => nds.map(n => {
      if (indexUpdates[n.id] !== undefined) {
        return { ...n, data: { ...n.data, globalIndex: indexUpdates[n.id] } };
      }
      return n;
    }));
  };

  const handleAutoRenumber = () => {
    const indexUpdates: Record<string, number> = {};
    wordListNodes.forEach((node: any, idx) => {
      indexUpdates[node.id] = idx + 1;
    });
    
    setNodes(nds => nds.map(n => {
      if (indexUpdates[n.id] !== undefined) {
        return { ...n, data: { ...n.data, globalIndex: indexUpdates[n.id] } };
      }
      return n;
    }));
  };

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
          <button 
            onClick={() => {
              if (confirm('Create a new empty level? Unsaved progress will be lost.')) {
                setNodes([]);
                setEdges([]);
                setRawLevelData({
                  theme: "New Theme",
                  categories: [],
                  allWordEntries: []
                });
                setSelectedLevelName('New_Level');
                localStorage.removeItem('wordnet_autosave');
              }
            }}
            style={{ 
              padding: '6px 12px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.15)', 
              color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', cursor: 'pointer', 
              fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' 
            }}
          >
            <Plus size={14} /> New Level
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => setIsDictOpen(true)}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--accent)',
              background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <BookOpen size={14} /> Dictionary
          </button>
          
          <button 
            onClick={() => setIsMagicChangeOpen(true)}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid #a855f7',
              background: 'rgba(168, 85, 247, 0.1)', color: '#d8b4fe', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <Sparkles size={14} /> Magic Change
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={() => {
              const nextState = !isSettingsOpen;
              setIsSettingsOpen(nextState);
              if (nextState) {
                setSelectedNodeId(null);
                setNodes(nds => nds.map(n => ({...n, selected: false})));
              }
            }}
            disabled={!rawLevelData}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)',
              background: isSettingsOpen ? 'var(--accent)' : 'transparent', 
              color: isSettingsOpen ? 'white' : 'var(--text-main)', 
              cursor: rawLevelData ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, opacity: rawLevelData ? 1 : 0.5
            }}
          >
            <Settings size={14} /> Config
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
          
          <input 
            type="file" 
            accept=".json"
            ref={fileInputRef}
            onChange={handleLoadJson}
            style={{ display: 'none' }}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: 'none',
              background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500
            }}
          >
            <RefreshCw size={14} /> Load JSON
          </button>
        </div>
      </div>

      {/* Word List Panel on the Left */}
      <div style={{ 
        position: 'absolute', top: '100px', left: '20px', bottom: '20px', width: '220px', 
        background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--panel-border)', 
        zIndex: 10, display: 'flex', flexDirection: 'column', padding: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px' }}>
          <button 
            onClick={() => setLeftPanelTab('words')}
            style={{ 
              flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: leftPanelTab === 'words' ? 'var(--accent)' : 'transparent',
              color: leftPanelTab === 'words' ? 'white' : 'var(--text-muted)'
            }}
          >
            Word Index
          </button>
          <button 
            onClick={() => setLeftPanelTab('chunks')}
            style={{ 
              flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
              background: leftPanelTab === 'chunks' ? 'var(--accent)' : 'transparent',
              color: leftPanelTab === 'chunks' ? 'white' : 'var(--text-muted)'
            }}
          >
            Chunk Index
          </button>
        </div>

        {leftPanelTab === 'words' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{wordListNodes.length} Words</span>
              <button 
                onClick={handleAutoRenumber}
                title="Auto Renumber"
                style={{ 
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px'
                }}
              >
                <RefreshCw size={12} /> Renumber
              </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
              {wordListNodes.map((node: any) => {
                const chunkEdges = edges.filter(e => e.source === node.id);
                const chunks = chunkEdges.map(e => nodes.find(n => n.id === e.target)).filter(n => n && n.data.isChunk).map(n => String(n?.data.label));
                const isChained = rawLevelData?.useBubbleSeparator === 1 && rawLevelData?.bubbleSeparatorData?.linkedWords?.includes(String(node.data.label));
                
                return (
                  <div 
                    key={node.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/reactflow-node', node.data.label);
                      handleDragStart(e, node.id);
                    }}
                    onDragOver={handleDragOver}
                    onDragEnter={(e) => handleDragEnter(e, node.id)}
                    onDragLeave={(e) => handleDragLeave(e, node.id)}
                    onDrop={(e) => handleDrop(e, node.id)}
                    onClick={() => handleFocusNode(node.id)}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                      background: dragOverNodeId === node.id ? 'rgba(56, 189, 248, 0.1)' : (selectedNodeId === node.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)'),
                      border: dragOverNodeId === node.id ? '2px dashed var(--accent)' : (selectedNodeId === node.id ? '1px solid var(--accent)' : '1px solid var(--panel-border)'),
                      transform: dragOverNodeId === node.id ? 'scale(1.02)' : 'none',
                      transition: 'all 0.2s', color: selectedNodeId === node.id ? 'white' : 'var(--text-main)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {node.data.icon && (
                          <img src={`/word_icon/${node.data.icon}.png`} alt="" title={`Missing File: ${node.data.icon}.png`} style={{ width: 14, height: 14 }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PC9jaXJjbGU+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48bGluZSB4MT0iMyIgeTE9IjMiIHgyPSIyMSIgeTI9IjIxIj48L2xpbmU+PC9zdmc+'; }} />
                        )}
                        {String(node.data.label)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isChained && <Link size={14} color="#818cf8" />}
                        {node.data.globalIndex !== undefined ? (
                          <span style={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.7 }}>#{node.data.globalIndex}</span>
                        ) : (
                          <span style={{ fontSize: '11px', fontStyle: 'italic', opacity: 0.5 }}>New</span>
                        )}
                      </div>
                    </div>
                    {chunks.length > 0 && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {chunks.map((c, i) => (
                          <span key={i} style={{ fontSize: '10px', background: selectedNodeId === node.id ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.2)', color: selectedNodeId === node.id ? 'white' : '#818cf8', padding: '2px 6px', borderRadius: '4px' }}>
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              {wordListNodes.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>
                  No words in level.
                </div>
              )}
            </div>
          </>
        )}

        {leftPanelTab === 'chunks' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Puzzle size={14} /> Available Chunks
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '150px', overflowY: 'auto', paddingRight: '4px' }}>
                {Array.from(new Set(nodes.filter(n => n.data.isChunk).map(n => String(n.data.label).toLowerCase()))).sort().map((chunk, i) => (
                  <span key={i} style={{ 
                    fontSize: '11px', background: 'rgba(99,102,241,0.1)', color: '#818cf8', 
                    border: '1px solid rgba(99,102,241,0.3)', padding: '4px 8px', borderRadius: '6px' 
                  }}>
                    {chunk}
                  </span>
                ))}
                {nodes.filter(n => n.data.isChunk).length === 0 && (
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No chunks in level.</span>
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', borderTop: '1px solid var(--panel-border)', paddingTop: '12px' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Analysis</h4>
              
              {nodes.filter(n => n.data.isChunk).length > 0 ? (
                misleadingWords.length === 0 ? (
                  <div style={{ padding: '12px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#4ade80', display: 'block', lineHeight: 1.4 }}>
                      ✅ <strong>Perfect Match!</strong><br />
                      No unintended words from the dictionary can be formed using these chunks.
                    </span>
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#f87171', display: 'block', lineHeight: 1.4, marginBottom: '8px' }}>
                      ⚠️ <strong>Warning!</strong><br />
                      The following unintended dictionary words can be formed from these chunks:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {misleadingWords.map((mw, i) => (
                        <span key={i} style={{ fontSize: '11px', background: 'rgba(239,68,68,0.2)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px' }}>
                          {mw}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Add chunks to see analysis.</span>
              )}
            </div>
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes.map(n => ({
          ...n,
          data: {
            ...n.data,
            isChained: rawLevelData?.useBubbleSeparator === 1 && rawLevelData?.bubbleSeparatorData?.linkedWords?.includes(String(n.data.label))
          }
        }))}
        edges={edges.map(e => ({
          ...e,
          animated: !!e.selected,
          style: {
            ...e.style,
            stroke: e.selected ? '#818cf8' : (e.data?.isSynonym ? '#fca5a5' : '#4b5563')
          }
        }))}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        colorMode="dark"
        defaultEdgeOptions={{ style: { stroke: 'var(--accent)' } }}
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
        
        {/* Floating Action Button for New Node */}
        <button
          onClick={handleAddRoot}
          title="Add New Root Node"
          style={{
            position: 'absolute',
            bottom: '180px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <Plus size={28} />
        </button>

        <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="var(--panel-border)" />
      </ReactFlow>

      <DictionaryBrowser 
        isOpen={isDictOpen} 
        onClose={() => setIsDictOpen(false)} 
        onImport={(categoryName, dictionary, singleNodeOnly) => handleImportDictionary(categoryName, dictionary, undefined, singleNodeOnly)}
      />

      <LevelSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        levelData={rawLevelData} 
        onSave={setRawLevelData}
        onFocusWord={(word) => {
          const node = nodes.find(n => n.data.label === word);
          if (node) handleFocusNode(node.id);
        }}
      />

      <MagicChangeModal
        isOpen={isMagicChangeOpen}
        onClose={() => setIsMagicChangeOpen(false)}
        onExecute={(popularWords, minPopularity) => {
          setIsMagicChangeOpen(false);
          handleMagicChange(popularWords, minPopularity);
        }}
      />

      <Sidebar 
        selectedNode={selectedNode}
        selectedNodes={nodes.filter(n => n.selected)}
        edges={edges}
        nodes={nodes}
        onClose={() => {
          setSelectedNodeId(null);
          setNodes(nds => nds.map(n => ({ ...n, selected: false })));
        }}
        onAddChild={handleAddChild}
        onDeleteNode={handleDeleteSelected}
        onRenameNode={handleRenameNode}
        onToggleNodeIcon={handleToggleNodeIcon}
        onUpdateNodeIndex={handleUpdateNodeIndex}
        onImportDictionary={handleImportDictionary}
        copiedTreeConfig={copiedTreeConfig}
        setCopiedTreeConfig={setCopiedTreeConfig}
        onPasteTreeConfig={handlePasteTreeConfig}
        autoCutWords={autoCutWords}
        setAutoCutWords={setAutoCutWords}
      />
    </div>
  );
}
