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
import SolutionModal from './SolutionModal';
import UserManualModal from './UserManualModal';
import { Save, BookOpen, Settings, Plus, RefreshCw, Puzzle, Sparkles, Link, Search, X, HelpCircle } from 'lucide-react';

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: Node[] = [
  { id: '1', type: 'custom', position: { x: 400, y: 100 }, data: { label: 'animal', isRoot: true } },
];
const initialEdges: Edge[] = [];

const isNodeChained = (node: Node, linkedWordsList: string[], edges: Edge[], nodes: Node[]) => {
  if (!linkedWordsList || linkedWordsList.length === 0) return false;
  const label = String(node.data.label).toLowerCase();
  
  if (linkedWordsList.some((w: string) => w.toLowerCase() === label)) return true;
  
  if (node.data.isChunk) {
    const parentEdge = edges.find(e => e.target === node.id);
    if (parentEdge) {
      const parentNode = nodes.find(n => n.id === parentEdge.source);
      if (parentNode && linkedWordsList.some((w: string) => w.toLowerCase() === String(parentNode.data.label).toLowerCase())) {
        return true;
      }
    }
  } else if (!node.data.isCategory) {
    const childEdges = edges.filter(e => e.source === node.id);
    const chunkLabels = childEdges
      .map(e => nodes.find(child => child.id === e.target))
      .filter(child => child && child.data.isChunk)
      .map(child => String(child!.data.label).toLowerCase());
    if (chunkLabels.some(cLabel => linkedWordsList.some((w: string) => w.toLowerCase() === cLabel))) {
      return true;
    }
  }
  return false;
};

export default function GraphEditor() {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [leftPanelTab, setLeftPanelTab] = useState<'words'|'chunks'|'dropQueue'|'settings'>('words');
  const [autoCutWords, setAutoCutWords] = useState<boolean>(false);
  const [globalDict, setGlobalDict] = useState<any[]>([]);
  const [misleadingWords, setMisleadingWords] = useState<string[]>([]);
  
  const [levels, setLevels] = useState<string[]>([]);
  const [selectedLevelName, setSelectedLevelName] = useState<string>('');
  
  const [rawLevelData, setRawLevelData] = useState<any>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMagicChangeOpen, setIsMagicChangeOpen] = useState(false);
  const [isDictOpen, setIsDictOpen] = useState(false);
  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  
  const [copiedTreeConfig, setCopiedTreeConfig] = useState<any | null>(null);
  const [wordIndexSearchQuery, setWordIndexSearchQuery] = useState('');
  const [sortLinksFirst, setSortLinksFirst] = useState(false);
  const [spawnQueueIds, setSpawnQueueIds] = useState<string[]>([]);
  const [shuffleStartIndex, setShuffleStartIndex] = useState<string>('');
  const [shuffleEndIndex, setShuffleEndIndex] = useState<string>('');
  
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
        rawLevelData,
        spawnQueueIds
      };
      localStorage.setItem('wordnet_autosave', JSON.stringify(saveData));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [nodes, edges, globalDict, levels, selectedLevelName, rawLevelData, spawnQueueIds]);

  // Sync spawnQueueIds with nodes/edges
  useEffect(() => {
    const currentDropNodeIds = nodes
      .filter(n => n.data.isChunk || (!n.data.isCategory && !n.data.isChunk && !edges.some(e => e.source === n.id)))
      .map(n => n.id);

    setSpawnQueueIds(prev => {
      const next = prev.filter(id => currentDropNodeIds.includes(id));
      currentDropNodeIds.forEach(id => {
        if (!next.includes(id)) {
          next.push(id);
        }
      });
      // Only update if changed to avoid loop
      if (next.length !== prev.length || next.some((id, i) => id !== prev[i])) {
        return next;
      }
      return prev;
    });
  }, [nodes, edges]);

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
    if (cleanWord.length <= 1) return [];
    const half = Math.ceil(cleanWord.length / 2);
    const chunk1 = cleanWord.slice(0, half);
    const chunk2 = cleanWord.slice(half);
    
    const c1Id = uuidv4();
    const c1Node: Node = {
      id: c1Id, type: 'custom', position: { x: parentX - 60, y: parentY + 80 },
      data: { label: chunk1, isChunk: true, isCategory: false }
    };
    targetNodes.push(c1Node);
    targetEdges.push({
      id: `e-${wordId}-${c1Id}`, source: wordId, target: c1Id, animated: true,
      style: { stroke: 'rgba(99,102,241,0.5)', strokeDasharray: '5,5' }
    });
    
    const c2Id = uuidv4();
    const c2Node: Node = {
      id: c2Id, type: 'custom', position: { x: parentX + 60, y: parentY + 80 },
      data: { label: chunk2, isChunk: true, isCategory: false }
    };
    targetNodes.push(c2Node);
    targetEdges.push({
      id: `e-${wordId}-${c2Id}`, source: wordId, target: c2Id, animated: true,
      style: { stroke: 'rgba(99,102,241,0.5)', strokeDasharray: '5,5' }
    });

    return [c1Node, c2Node];
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

              // Support old JSON format
              if (w.chunks && Array.isArray(w.chunks) && w.chunks.length > 0) {
                w.chunks.forEach((chunkItem: any) => {
                  const chunkStr = typeof chunkItem === 'string' ? chunkItem : Object.keys(chunkItem)[0];
                  if (!chunkStr) return;
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
              } else if (data.allWordEntries && Array.isArray(data.allWordEntries)) {
                // Support new flattened format
                data.allWordEntries.forEach((entry: any) => {
                  if (entry.parentWord && String(entry.parentWord).toLowerCase() === wordLower) {
                    const chunkNode: Node = {
                      id: uuidv4(),
                      type: 'custom',
                      position: { x: 0, y: 0 },
                      data: { label: String(entry.fullWord).toLowerCase(), isCategory: false, isChunk: true }
                    };
                    newNodes.push(chunkNode);
                    newEdges.push({
                      id: `e-${wordNode.id}-${chunkNode.id}-${uuidv4()}`,
                      source: wordNode.id,
                      target: chunkNode.id,
                      animated: true,
                      style: { stroke: 'rgba(99,102,241,0.5)', strokeDasharray: '5,5' }
                    });
                  }
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

      // Initialize spawnQueueIds exactly from the flattened allWordEntries (with backward compatibility for old JSON format)
      const loadedSpawnQueueIds: string[] = [];
      if (data.allWordEntries && Array.isArray(data.allWordEntries)) {
        data.allWordEntries.forEach((entry: any) => {
          const isFlattenedChunk = entry.parentWord ? true : false;
          if (isFlattenedChunk) {
            const chunkNode = newNodes.find(n => 
              n.data.isChunk && 
              String(n.data.label).toLowerCase() === String(entry.fullWord).toLowerCase() &&
              newEdges.some(e => e.target === n.id && String(newNodes.find(pn => pn.id === e.source)?.data.label).toLowerCase() === String(entry.parentWord).toLowerCase()) &&
              !loadedSpawnQueueIds.includes(n.id)
            );
            if (chunkNode) loadedSpawnQueueIds.push(chunkNode.id);
          } else {
            // Uncut word (new format) OR Old format entry (cut or uncut)
            if (entry.chunks && entry.chunks.length > 0) {
              // OLD FORMAT CUT WORD: Replace word with its chunks in the spawn queue
              // We simulate the order by placing the chunks exactly where the parent word was.
              entry.chunks.forEach((chunkItem: any) => {
                const chunkStr = typeof chunkItem === 'string' ? chunkItem : Object.keys(chunkItem)[0];
                if (!chunkStr) return;
                const chunkNode = newNodes.find(n => 
                  n.data.isChunk && 
                  String(n.data.label).toLowerCase() === String(chunkStr).toLowerCase() &&
                  newEdges.some(e => e.target === n.id && String(newNodes.find(pn => pn.id === e.source)?.data.label).toLowerCase() === String(entry.fullWord).toLowerCase()) &&
                  !loadedSpawnQueueIds.includes(n.id)
                );
                if (chunkNode) {
                  loadedSpawnQueueIds.push(chunkNode.id);
                }
              });
            } else {
              // UNCUT WORD (works for both old and new format)
              const wordNode = newNodes.find(n => 
                !n.data.isCategory && !n.data.isChunk &&
                String(n.data.label).toLowerCase() === String(entry.fullWord).toLowerCase() &&
                !loadedSpawnQueueIds.includes(n.id)
              );
              if (wordNode) loadedSpawnQueueIds.push(wordNode.id);
            }
          }
        });
      }

      setSpawnQueueIds(loadedSpawnQueueIds);
      
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
        
        const wordObj = existingWord ? { ...existingWord } : {
          fullWord: childLabel.charAt(0).toUpperCase() + childLabel.slice(1),
          icon: null,
          IsCracked: 0,
          crackBreakNum: 0,
          IsLinked: 0,
          linkedChunkWords: []
        };
        
        delete wordObj.chunks; // Remove redundant chunks field from categories
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

    // Create a map of existing entries from rawLevelData for preserving properties
    const existingEntriesMap = new Map<string, any>();
    if (rawLevelData?.allWordEntries) {
      rawLevelData.allWordEntries.forEach((e: any) => {
        const key = e.parentWord ? `${e.parentWord.toLowerCase()}_${e.fullWord.toLowerCase()}` : `_${e.fullWord.toLowerCase()}`;
        existingEntriesMap.set(key, e);
      });
    }

    const newAllWordEntries: any[] = [];
    
    spawnQueueIds.forEach((id) => {
      const node = nodes.find(n => n.id === id);
      if (!node) return;
      
      const isChunk = Boolean(node.data.isChunk);
      const childLabel = String(node.data.label);
      let parentLabel = "";
      let parentNode = null;
      
      if (isChunk) {
        const parentEdge = edges.find(e => e.target === id);
        if (parentEdge) {
          parentNode = nodes.find(n => n.id === parentEdge.source);
          if (parentNode) parentLabel = String(parentNode.data.label);
        }
      } else {
        parentNode = node;
      }
      
      const key = parentLabel ? `${parentLabel.toLowerCase()}_${childLabel.toLowerCase()}` : `_${childLabel.toLowerCase()}`;
      const existingEntry = existingEntriesMap.get(key);

      const wordObj = existingEntry ? { ...existingEntry } : {
        fullWord: childLabel.charAt(0).toUpperCase() + childLabel.slice(1),
        parentWord: parentLabel ? parentLabel.charAt(0).toUpperCase() + parentLabel.slice(1) : null,
        icon: parentNode?.data.icon || null,
        IsCracked: 0,
        crackBreakNum: 0,
        IsLinked: 0,
        linkedChunkWords: []
      };
      
      wordObj.fullWord = childLabel.charAt(0).toUpperCase() + childLabel.slice(1);
      wordObj.parentWord = parentLabel ? parentLabel.charAt(0).toUpperCase() + parentLabel.slice(1) : null;
      delete wordObj.chunks; // Remove redundant chunks field
      if (!isChunk) {
        wordObj.icon = node.data.icon || null;
      }
      
      newAllWordEntries.push(wordObj);
    });

    newData.allWordEntries = newAllWordEntries;
    delete newData.spawnQueue;

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

    const queueUpdates: { oldIds: string[], newIds: string[] }[] = [];
    const queueInsertions: { oldIds: string[], newIds: string[] }[] = [];

    if (replaceNodes.length > 0) {
      const oldWordNodes = replaceNodes.filter(n => !n.data.isCategory && !n.data.isChunk).sort((a, b) => ((a.data.globalIndex as number) || 0) - ((b.data.globalIndex as number) || 0));
      const oldIndices = oldWordNodes.map(n => n.data.globalIndex).filter(idx => idx !== undefined);
      
      if (oldIndices.length > 0) {
        if (rawLevelData && Array.isArray(rawLevelData.allWordEntries)) {
          const newEntries = [...rawLevelData.allWordEntries];
          oldIndices.forEach((idx, i) => {
            if (i >= newWordNodes.length) return;
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
        } else {
          // Even if no rawLevelData, apply indices
          oldIndices.forEach((idx, i) => {
            if (i < newWordNodes.length) {
              newWordNodes[i].data.globalIndex = idx;
            }
          });
        }
      }

      // Also remove chunks attached to the replaced nodes
      const chunkEdgesToRemove = edges.filter(e => nodeIdsToRemove.has(e.source));
      const chunkNodesToRemove = chunkEdgesToRemove.map(e => nodes.find(n => n.id === e.target)).filter(n => n && n.data.isChunk);
      chunkNodesToRemove.forEach(n => { if (n) nodeIdsToRemove.add(n.id); });

      oldWordNodes.forEach((oldNode, i) => {
        if (i >= newWordNodes.length) return;
        let newIds = [newWordNodes[i].id];
        let oldIds = [oldNode.id];
        
        const oldChunkNodes = nodes.filter(n => n.data.isChunk && edges.some(e => e.source === oldNode.id && e.target === n.id));
        if (oldChunkNodes.length > 0 || autoCutWords) {
          if (oldChunkNodes.length > 0) {
            oldIds.push(...oldChunkNodes.map(c => c.id));
          }
          const newChunks = createChunksForWord(newWordNodes[i].id, String(newWordNodes[i].data.label), importedNodes, importedEdges, newWordNodes[i].position.x, newWordNodes[i].position.y);
          // newChunks are the node objects returned by createChunksForWord
          if (newChunks && newChunks.length > 0) {
            newChunks.forEach(c => c.data.globalIndex = newWordNodes[i].data.globalIndex);
            newIds = newChunks.map(c => c.id);
          }
        }
        queueUpdates.push({ oldIds, newIds });
      });
      
      // If newWordNodes has more items than oldWordNodes, and autoCutWords is true
      for (let i = oldWordNodes.length; i < newWordNodes.length; i++) {
        if (autoCutWords) {
          createChunksForWord(newWordNodes[i].id, String(newWordNodes[i].data.label), importedNodes, importedEdges, newWordNodes[i].position.x, newWordNodes[i].position.y);
        }
      }
    } else if (keepOldTreeAnchor.length > 0) {
      // If we keep the old tree, copy globalIndex and insert nodes right after the old ones in the drop queue
      const oldWordNodes = keepOldTreeAnchor.filter(n => !n.data.isCategory && !n.data.isChunk).sort((a, b) => ((a.data.globalIndex as number) || 0) - ((b.data.globalIndex as number) || 0));
      const oldIndices = oldWordNodes.map(n => n.data.globalIndex).filter(idx => idx !== undefined);
      
      if (oldIndices.length > 0) {
        oldIndices.forEach((idx, i) => {
          if (i >= newWordNodes.length) return;
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
      }
      
      oldWordNodes.forEach((oldNode, i) => {
        if (i >= newWordNodes.length) return;
        let newIds = [newWordNodes[i].id];
        let oldIds = [oldNode.id];
        
        const oldChunkNodes = nodes.filter(n => n.data.isChunk && edges.some(e => e.source === oldNode.id && e.target === n.id));
        if (oldChunkNodes.length > 0 || autoCutWords) {
          if (oldChunkNodes.length > 0) {
            oldIds.push(...oldChunkNodes.map(c => c.id));
          }
          const newChunks = createChunksForWord(newWordNodes[i].id, String(newWordNodes[i].data.label), importedNodes, importedEdges, newWordNodes[i].position.x, newWordNodes[i].position.y);
          if (newChunks && newChunks.length > 0) {
            newChunks.forEach(c => c.data.globalIndex = newWordNodes[i].data.globalIndex);
            newIds = newChunks.map(c => c.id);
          }
        }
        queueInsertions.push({ oldIds, newIds });
      });
      
      for (let i = oldWordNodes.length; i < newWordNodes.length; i++) {
        if (autoCutWords) {
          createChunksForWord(newWordNodes[i].id, String(newWordNodes[i].data.label), importedNodes, importedEdges, newWordNodes[i].position.x, newWordNodes[i].position.y);
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
    
    if (queueUpdates.length > 0 || queueInsertions.length > 0) {
      setSpawnQueueIds(prev => {
        let newQueue = [...prev];
        
        // Use queueUpdates gathered during importBranch
        queueUpdates.forEach((update: { oldIds: string[], newIds: string[] }) => {
          // Find the earliest index of oldIds in the queue
          const indices = update.oldIds.map((id: string) => newQueue.indexOf(id)).filter((idx: number) => idx !== -1);
          if (indices.length > 0) {
            const minIndex = Math.min(...indices);
            // Remove all oldIds
            newQueue = newQueue.filter(id => !update.oldIds.includes(id));
            // Insert newIds at that spot
            newQueue.splice(minIndex, 0, ...update.newIds);
          }
        });
        return newQueue;
      });
    }
    
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
      const queueUpdates: {oldIds: string[], newIds: string[]}[] = [];

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

          const inheritedGlobalIndex = oldWordNode?.data.globalIndex;

          newImportedNodes.push({
            id: wordId,
            type: 'custom',
            position: oldWordNode?.position || { x: 0, y: 0 },
            data: { label: w.word.toLowerCase(), isCategory: false, icon: newIcon, globalIndex: inheritedGlobalIndex }
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
            const arrayIndex = clonedRawData.allWordEntries.findIndex((e:any) => e.idx === inheritedGlobalIndex);
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

          let newIds = [wordId];
          let oldIds = oldWordNode ? [oldWordNode.id] : [];

          // Chunk preservation (regardless of autoCutWords)
          if (oldWordNode) {
            const oldChunkNodes = nodes.filter(n => n.data.isChunk && edges.some(e => e.source === oldWordNode.id && e.target === n.id));
            if (oldChunkNodes.length > 0) {
              oldIds.push(...oldChunkNodes.map(c => c.id));
              
              const wordStr = w.word.toLowerCase();
              const chunkLen = Math.floor(wordStr.length / 2) || 1;
              const c1 = wordStr.substring(0, chunkLen);
              const c2 = wordStr.substring(chunkLen);
              const c1Id = uuidv4();
              const c2Id = uuidv4();
              const baseX = oldWordNode.position.x;
              const baseY = oldWordNode.position.y;
              newImportedNodes.push({ id: c1Id, type: 'custom', position: { x: baseX - 40, y: baseY + 60 }, data: { label: c1, isCategory: false, isChunk: true, globalIndex: inheritedGlobalIndex }});
              newImportedNodes.push({ id: c2Id, type: 'custom', position: { x: baseX + 40, y: baseY + 60 }, data: { label: c2, isCategory: false, isChunk: true, globalIndex: inheritedGlobalIndex }});
              newImportedEdges.push({ id: `e-${wordId}-${c1Id}`, source: wordId, target: c1Id, animated: true, style: { stroke: 'var(--accent)' }});
              newImportedEdges.push({ id: `e-${wordId}-${c2Id}`, source: wordId, target: c2Id, animated: true, style: { stroke: 'var(--accent)' }});
              
              newIds = [c1Id, c2Id];

              if (clonedRawData && Array.isArray(clonedRawData.allWordEntries)) {
                const arrayIndex = clonedRawData.allWordEntries.findIndex((e:any) => e.idx === inheritedGlobalIndex);
                if (arrayIndex !== -1) {
                  clonedRawData.allWordEntries[arrayIndex].chunks = [c1, c2];
                }
              }
            }
          }

          // If autoCutWords is enabled and the old word did NOT have chunks, we generate them now
          if (autoCutWords && (!oldWordNode || !nodes.some(n => n.data.isChunk && edges.some(e => e.source === oldWordNode.id && e.target === n.id)))) {
            const wordStr = w.word.toLowerCase();
            const chunkLen = Math.floor(wordStr.length / 2) || 1;
            const c1 = wordStr.substring(0, chunkLen);
            const c2 = wordStr.substring(chunkLen);
            const c1Id = uuidv4();
            const c2Id = uuidv4();
            const baseX = oldWordNode?.position.x || 0;
            const baseY = oldWordNode?.position.y || 0;
            newImportedNodes.push({ id: c1Id, type: 'custom', position: { x: baseX - 40, y: baseY + 60 }, data: { label: c1, isCategory: false, isChunk: true, globalIndex: inheritedGlobalIndex }});
            newImportedNodes.push({ id: c2Id, type: 'custom', position: { x: baseX + 40, y: baseY + 60 }, data: { label: c2, isCategory: false, isChunk: true, globalIndex: inheritedGlobalIndex }});
            newImportedEdges.push({ id: `e-${wordId}-${c1Id}`, source: wordId, target: c1Id, animated: true, style: { stroke: 'var(--accent)' }});
            newImportedEdges.push({ id: `e-${wordId}-${c2Id}`, source: wordId, target: c2Id, animated: true, style: { stroke: 'var(--accent)' }});
            newIds = [c1Id, c2Id];
          }

          if (oldIds.length > 0) {
            queueUpdates.push({ oldIds, newIds });
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
      
      // Update spawnQueueIds to replace old word IDs with new word/chunk IDs
      setSpawnQueueIds(prev => {
        let newQueue = [...prev];
        
        // Use queueUpdates gathered during importBranch
        queueUpdates.forEach((update: { oldIds: string[], newIds: string[] }) => {
          // Find the earliest index of oldIds in the queue
          const indices = update.oldIds.map((id: string) => newQueue.indexOf(id)).filter((idx: number) => idx !== -1);
          if (indices.length > 0) {
            const minIndex = Math.min(...indices);
            // Remove all oldIds
            newQueue = newQueue.filter(id => !update.oldIds.includes(id));
            // Insert newIds at that position
            newQueue.splice(minIndex, 0, ...update.newIds);
          }
        });
        
        return newQueue;
      });
    }

    setNodes(clonedNodes);
    setEdges(clonedEdges);
    if (clonedRawData) setRawLevelData(clonedRawData);
  };

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || null;

  const wordListNodes = useMemo(() => {
    const linkedWords = rawLevelData?.bubbleSeparatorData?.linkedWords || [];
    const getIsChained = (n: Node) => {
      const label = String(n.data.label).toLowerCase();
      if (linkedWords.some((w: string) => w.toLowerCase() === label)) return true;
      
      const childEdges = edges.filter(e => e.source === n.id);
      const chunkLabels = childEdges
         .map(e => nodes.find(child => child.id === e.target))
         .filter(child => child && child.data.isChunk)
         .map(child => String(child!.data.label).toLowerCase());
      
      return chunkLabels.some(cLabel => linkedWords.some((w: string) => w.toLowerCase() === cLabel));
    };

    return nodes.filter((n: any) => !n.data.isCategory && !n.data.isChunk).sort((a: any, b: any) => {
      const chainedA = getIsChained(a);
      const chainedB = getIsChained(b);
      
      if (chainedA && !chainedB) return -1;
      if (!chainedA && chainedB) return 1;

      const idxA = a.data.globalIndex ?? Infinity;
      const idxB = b.data.globalIndex ?? Infinity;
      return idxA - idxB;
    });
  }, [nodes, edges]);

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
    setNodes(nds => nds.map(n => {
      const dropPos = spawnQueueIds.indexOf(n.id);
      if (dropPos !== -1) {
        return { ...n, data: { ...n.data, globalIndex: dropPos + 1 } };
      }
      return n;
    }));
  };

  const handleShuffleRange = () => {
    const start = parseInt(shuffleStartIndex, 10);
    const end = parseInt(shuffleEndIndex, 10);
    
    if (isNaN(start) || isNaN(end) || start < 1 || end > spawnQueueIds.length || start >= end) {
      alert(`Please enter valid indices between 1 and ${spawnQueueIds.length}, where Start < End.`);
      return;
    }
    
    setSpawnQueueIds(prev => {
      const newQueue = [...prev];
      const sliceToShuffle = newQueue.slice(start - 1, end);
      // shuffle
      for (let i = sliceToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sliceToShuffle[i], sliceToShuffle[j]] = [sliceToShuffle[j], sliceToShuffle[i]];
      }
      newQueue.splice(start - 1, sliceToShuffle.length, ...sliceToShuffle);
      return newQueue;
    });
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
            onClick={() => setIsManualModalOpen(true)}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--accent)',
              background: 'rgba(56, 189, 248, 0.1)', color: 'var(--accent)', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            <HelpCircle size={14} /> Hướng dẫn
          </button>
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
        position: 'absolute', top: '100px', left: '20px', bottom: '20px', width: '280px', 
        background: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--panel-border)', 
        zIndex: 10, display: 'flex', flexDirection: 'column', padding: '16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '12px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '8px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setLeftPanelTab('dropQueue')}
            style={{ 
              flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              background: leftPanelTab === 'dropQueue' || leftPanelTab === 'words' ? 'var(--accent)' : 'transparent',
              color: leftPanelTab === 'dropQueue' || leftPanelTab === 'words' ? 'white' : 'var(--text-muted)'
            }}
          >
            Drop Queue
          </button>
          <button 
            onClick={() => setLeftPanelTab('chunks')}
            style={{ 
              flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              background: leftPanelTab === 'chunks' ? 'var(--accent)' : 'transparent',
              color: leftPanelTab === 'chunks' ? 'white' : 'var(--text-muted)'
            }}
          >
            Chunks
          </button>
        </div>

        {leftPanelTab === 'dropQueue' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{spawnQueueIds.length} Drops in Queue</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setSortLinksFirst(!sortLinksFirst)}
                  style={{
                    background: sortLinksFirst ? 'var(--accent)' : 'transparent', color: sortLinksFirst ? 'white' : 'var(--text-main)', border: '1px solid var(--accent)',
                    padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600
                  }}
                >
                  {sortLinksFirst ? 'Default Order' : 'Sort Links'}
                </button>
                <button
                  onClick={handleAutoRenumber}
                  title="Assign Order (Index) based on the current list order"
                  style={{
                    background: 'var(--accent)', color: 'white', border: 'none',
                    padding: '4px 8px', borderRadius: '6px', cursor: 'pointer',
                    fontSize: '11px', fontWeight: 600
                  }}
                >
                  Renumber
                </button>
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', alignItems: 'center', padding: '8px', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Shuffle from</span>
              <input
                type="number"
                placeholder="Start"
                value={shuffleStartIndex}
                onChange={e => setShuffleStartIndex(e.target.value)}
                style={{ width: '45px', padding: '4px', borderRadius: '4px', fontSize: '11px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none' }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>to</span>
              <input
                type="number"
                placeholder="End"
                value={shuffleEndIndex}
                onChange={e => setShuffleEndIndex(e.target.value)}
                style={{ width: '45px', padding: '4px', borderRadius: '4px', fontSize: '11px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none' }}
              />
              <button
                onClick={handleShuffleRange}
                style={{ marginLeft: 'auto', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', border: '1px solid #a855f7', cursor: 'pointer' }}
              >
                Shuffle
              </button>
            </div>

            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search items..." 
                value={wordIndexSearchQuery}
                onChange={(e) => setWordIndexSearchQuery(e.target.value)}
                style={{ 
                  width: '100%', padding: '6px 10px 6px 30px', borderRadius: '6px', fontSize: '13px',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'white', outline: 'none'
                }}
              />
              {wordIndexSearchQuery && (
                <button 
                  onClick={() => setWordIndexSearchQuery('')}
                  style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.4 }}>
              Drag to reorder exact drop sequence. The JSON output will flatten all items based on this list.
            </div>

            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
              {(sortLinksFirst 
                ? [...spawnQueueIds].sort((a, b) => {
                    const nodeA = nodes.find(n => n.id === a);
                    const nodeB = nodes.find(n => n.id === b);
                    if (!nodeA || !nodeB) return 0;
                    const chainedA = isNodeChained(nodeA, rawLevelData?.bubbleSeparatorData?.linkedWords || [], edges, nodes);
                    const chainedB = isNodeChained(nodeB, rawLevelData?.bubbleSeparatorData?.linkedWords || [], edges, nodes);
                    if (chainedA && !chainedB) return -1;
                    if (!chainedA && chainedB) return 1;
                    return 0;
                  })
                : spawnQueueIds)
                .filter((nodeId: string) => {
                  if (!wordIndexSearchQuery) return true;
                  const node = nodes.find(n => n.id === nodeId);
                  return node && String(node.data.label).toLowerCase().includes(wordIndexSearchQuery.toLowerCase());
                })
                .map((nodeId: string) => {
                  const node = nodes.find(n => n.id === nodeId);
                  if (!node) return null;
                  
                  const isChunk = Boolean(node.data.isChunk);
                  const isChained = isNodeChained(node, rawLevelData?.bubbleSeparatorData?.linkedWords || [], edges, nodes);
                  
                  let parentLabel: string | null = null;
                  if (isChunk) {
                    const parentEdge = edges.find(e => e.target === nodeId);
                    if (parentEdge) {
                      const parentNode = nodes.find(n => n.id === parentEdge.source);
                      if (parentNode) parentLabel = String(parentNode.data.label);
                    }
                  }
                  
                  // Use the actual queue index for display, even if filtered
                  const actualIdx = spawnQueueIds.indexOf(nodeId);

                  return (
                    <div 
                      key={nodeId}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/spawn-queue-id', nodeId);
                        handleDragStart(e, nodeId);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        handleDragOver(e);
                      }}
                      onDragEnter={(e) => handleDragEnter(e, nodeId)}
                      onDragLeave={(e) => handleDragLeave(e, nodeId)}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData('application/spawn-queue-id');
                        if (draggedId && draggedId !== nodeId) {
                          const oldIdx = spawnQueueIds.indexOf(draggedId);
                          const newIdx = spawnQueueIds.indexOf(nodeId);
                          if (oldIdx !== -1 && newIdx !== -1) {
                            setSpawnQueueIds(prev => {
                              const newQueue = [...prev];
                              newQueue.splice(oldIdx, 1);
                              newQueue.splice(newIdx, 0, draggedId);
                              return newQueue;
                            });
                          }
                        }
                        handleDrop(e, nodeId);
                      }}
                      onClick={() => handleFocusNode(nodeId)}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        padding: '8px 12px', borderRadius: '8px', cursor: 'grab',
                        background: dragOverNodeId === nodeId 
                            ? 'rgba(56, 189, 248, 0.1)' 
                            : (selectedNodeId === nodeId 
                              ? 'var(--accent)' 
                              : (isChained ? 'rgba(129, 140, 248, 0.15)' : (isChunk ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.05)'))),
                        border: dragOverNodeId === nodeId 
                            ? '2px dashed var(--accent)' 
                            : (selectedNodeId === nodeId 
                              ? '1px solid var(--accent)' 
                              : (isChained ? '1px solid rgba(129, 140, 248, 0.4)' : (isChunk ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--panel-border)'))),
                        transform: dragOverNodeId === nodeId ? 'scale(1.02)' : 'none',
                        transition: 'all 0.2s', color: selectedNodeId === nodeId ? 'white' : (isChunk ? '#a5b4fc' : 'var(--text-main)')
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', opacity: 0.6, width: '20px' }}>{actualIdx + 1}.</span>
                          {(!isChunk && node.data.icon) ? (
                            <img src={`/word_icon/${String(node.data.icon)}.png`} alt="" title={`Missing File: ${String(node.data.icon)}.png`} style={{ width: 14, height: 14 }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PC9jaXJjbGU+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48bGluZSB4MT0iMyIgeTE9IjMiIHgyPSIyMSIgeTI9IjIxIj48L2xpbmU+PC9zdmc+'; }} />
                          ) : null}
                          <strong style={{ textTransform: isChunk ? 'none' : 'capitalize' }}>{String(node.data.label)}</strong>
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isChained && <Link size={14} color={selectedNodeId === nodeId ? "white" : "#818cf8"} />}
                          <span style={{ fontSize: '10px', opacity: 0.7, padding: '2px 4px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                            {isChunk ? 'Chunk' : 'Word'}
                          </span>
                        </div>
                      </div>
                      
                      {isChunk && parentLabel && (
                        <div style={{ fontSize: '10px', marginTop: '6px', color: selectedNodeId === nodeId ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          └ Chunk of: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{parentLabel}</span>
                        </div>
                      )}
                      
                      {!isChunk && (
                        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.5 }}>
                          Uncut Word
                        </div>
                      )}
                    </div>
                  );
              })}
              {spawnQueueIds.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', marginTop: '20px' }}>
                  No items in drop queue.
                </div>
              )}
            </div>
          </div>
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
            isChained: rawLevelData?.useBubbleSeparator === 1 && isNodeChained(n, rawLevelData?.bubbleSeparatorData?.linkedWords || [], edges, nodes),
            dropIndex: spawnQueueIds.indexOf(n.id) !== -1 ? spawnQueueIds.indexOf(n.id) + 1 : undefined
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

      <UserManualModal 
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
      />

      <LevelSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        levelData={rawLevelData} 
        onSave={setRawLevelData}
        onCalculateSolution={() => setIsSolutionModalOpen(true)}
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

      <SolutionModal
        isOpen={isSolutionModalOpen}
        onClose={() => setIsSolutionModalOpen(false)}
        nodes={nodes}
        edges={edges}
        levelData={rawLevelData}
        spawnQueueIds={spawnQueueIds}
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
