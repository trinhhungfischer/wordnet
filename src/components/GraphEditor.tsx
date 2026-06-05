import React, { useCallback, useState, useEffect, useMemo } from 'react';
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
import { exportGraphToCsv } from '../lib/exportCsv';
import { Save, BookOpen, Settings, Download, Plus, RefreshCw, Puzzle } from 'lucide-react';

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
  
  const [leftPanelTab, setLeftPanelTab] = useState<'words'|'chunks'>('words');
  const [globalDict, setGlobalDict] = useState<any[]>([]);
  const [misleadingWords, setMisleadingWords] = useState<string[]>([]);
  
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedLevelName, setSelectedLevelName] = useState<string>('');
  
  const [rawLevelData, setRawLevelData] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDictOpen, setIsDictOpen] = useState(false);
  
  const { setCenter } = useReactFlow();

  const handleFocusNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + 60, node.position.y + 30, { zoom: 1.2, duration: 800 });
      setSelectedNodeId(nodeId);
    }
  };
  
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

    fetch('/global_dictionary.json')
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
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportJson = async () => {
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
    const newNode: Node = {
      id: uuidv4(),
      type: 'custom',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 200 + 100 },
      data: { label: word.toLowerCase(), isRoot: true, isCategory: true }
    };
    
    setNodes((nds) => nds.concat(newNode));
  };

  const handleAddChild = (parentNode: Node, childLabel: string, isChunk: boolean = false) => {
    saveHistory();
    // Chunks are unique nodes to preserve order and duplicate names (e.g. "na", "na" for "banana")
    let childNode = isChunk ? undefined : nodes.find(n => n.data.label === childLabel && !n.data.isChunk);
    
    if (!childNode) {
      childNode = {
        id: uuidv4(),
        type: 'custom',
        position: { x: parentNode.position.x + (Math.random() * 200 - 100), y: parentNode.position.y + 100 },
        data: { label: childLabel, isCategory: false, isChunk }
      };
      setNodes((nds) => nds.concat(childNode!));
    }
    
    const newEdge: Edge = {
      id: `e-${parentNode.id}-${childNode.id}-${uuidv4()}`,
      source: parentNode.id,
      target: childNode.id,
      animated: true,
      style: { stroke: isChunk ? 'rgba(99,102,241,0.5)' : 'var(--accent)', strokeDasharray: isChunk ? '5,5' : 'none' }
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

  const handleImportDictionary = (categoryName: string, dictionary: any[], targetParentId?: string, options?: any) => {
    saveHistory();
    const singleNodeOnly = typeof options === 'boolean' ? options : options?.singleNodeOnly;
    const reqSig = options?.requiredSig;
    const searchQuery = options?.searchQuery;
    const replaceNodes: Node[] = options?.replaceNodes || [];
    const keepOldTreeAnchor: Node[] = options?.keepOldTreeAnchor || [];

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
        let wordsToImport = [...entry.words];
        if (currentReqSig) {
          if (searchQuery) {
            const terms = searchQuery.split('&').map((t: string) => t.trim().toLowerCase()).filter(Boolean);
            wordsToImport.sort((a: any, b: any) => {
              const aMatch = terms.some((t: string) => a.word.toLowerCase().includes(t)) ? 1 : 0;
              const bMatch = terms.some((t: string) => b.word.toLowerCase().includes(t)) ? 1 : 0;
              return bMatch - aMatch;
            });
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

        if (currentReqSig) {
          let availSubs = [...entry.subcategories];
          currentReqSig.subcats.forEach((rSub: any) => {
            const matchIdx = availSubs.findIndex(subName => {
              const availSig = getDictSig(subName);
              return isFulfilled(rSub, availSig);
            });
            if (matchIdx !== -1) {
              const chosenSub = availSubs[matchIdx];
              availSubs.splice(matchIdx, 1);
              importBranch(chosenSub, nodeId, depth + 1, rSub);
            }
          });
        } else {
          entry.subcategories.forEach((sub: string) => {
            importBranch(sub, nodeId, depth + 1);
          });
        }
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

    if (replaceNodes.length > 0) {
      const oldWordNodes = replaceNodes.filter(n => !n.data.isCategory && !n.data.isChunk);
      const oldIndices = oldWordNodes.map(n => n.data.globalIndex).filter(idx => idx !== undefined).sort((a:any,b:any)=>a-b);
      const newWordNodes = importedNodes.filter(n => !n.data.isCategory && !n.data.isChunk);
      
      if (oldIndices.length > 0 && newWordNodes.length === oldIndices.length && rawLevelData && Array.isArray(rawLevelData.allWordEntries)) {
        const newEntries = [...rawLevelData.allWordEntries];
        oldIndices.forEach((idx, i) => {
          const newWordNode = newWordNodes[i];
          newWordNode.data.globalIndex = idx;
          const arrayIndex = (idx as number) - 1;
          const childLabel = String(newWordNode.data.label);
          
          if (arrayIndex >= 0 && arrayIndex < newEntries.length) {
            const oldHasIcon = !!newEntries[arrayIndex].icon;
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
    } else if (keepOldTreeAnchor.length > 0) {
      // If we keep the old tree but want to copy indices
      const oldWordNodes = keepOldTreeAnchor.filter(n => !n.data.isCategory && !n.data.isChunk);
      const oldIndices = oldWordNodes.map(n => n.data.globalIndex).filter(idx => idx !== undefined).sort((a:any,b:any)=>a-b);
      const newWordNodes = importedNodes.filter(n => !n.data.isCategory && !n.data.isChunk);
      
      if (oldIndices.length > 0 && newWordNodes.length === oldIndices.length) {
        oldIndices.forEach((idx, i) => {
          newWordNodes[i].data.globalIndex = idx;
        });
      }
    }

    setNodes(nds => [...nds.filter(n => !nodeIdsToRemove.has(n.id)), ...importedNodes]);
    setEdges(eds => [...eds.filter(e => !nodeIdsToRemove.has(e.source) && !nodeIdsToRemove.has(e.target)), ...importedEdges]);
    if (updatedRawLevelData !== rawLevelData) setRawLevelData(updatedRawLevelData);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const wordListNodes = useMemo(() => {
    return nodes.filter((n: any) => !n.data.isCategory && !n.data.isChunk).sort((a: any, b: any) => {
      const idxA = a.data.globalIndex ?? Infinity;
      const idxB = b.data.globalIndex ?? Infinity;
      return idxA - idxB;
    });
  }, [nodes]);

  const handleDragStart = (e: React.DragEvent, nodeId: string) => {
    e.dataTransfer.setData('text/plain', nodeId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetNodeId: string) => {
    e.preventDefault();
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
                
                return (
                  <div 
                    key={node.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, node.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, node.id)}
                    onClick={() => handleFocusNode(node.id)}
                    style={{
                      display: 'flex', flexDirection: 'column',
                      padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                      background: selectedNodeId === node.id ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                      border: selectedNodeId === node.id ? '1px solid var(--accent)' : '1px solid var(--panel-border)',
                      transition: 'all 0.2s', color: selectedNodeId === node.id ? 'white' : 'var(--text-main)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '13px', fontWeight: 500, textTransform: 'capitalize', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {node.data.icon && <img src={`/word_icon/${node.data.icon}.png`} alt="" style={{ width: 14, height: 14 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                        {String(node.data.label)}
                      </span>
                      {node.data.globalIndex !== undefined ? (
                        <span style={{ fontSize: '11px', fontWeight: 'bold', opacity: 0.7 }}>#{node.data.globalIndex}</span>
                      ) : (
                        <span style={{ fontSize: '11px', fontStyle: 'italic', opacity: 0.5 }}>New</span>
                      )}
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
        onImport={(categoryName, dictionary, singleNodeOnly) => handleImportDictionary(categoryName, dictionary, undefined, singleNodeOnly)}
      />

      <LevelSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        levelData={rawLevelData} 
        onSave={setRawLevelData}
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
      />
    </div>
  );
}
