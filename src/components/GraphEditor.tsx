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
import { Save, BookOpen, Settings, Plus, RefreshCw, Puzzle, Sparkles, Link, Search, X, HelpCircle, Snowflake, Calculator, Lock, Key, Bomb, Pin } from 'lucide-react';
import nlp from 'compromise';

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

const isNodeFrozen = (node: Node, frozenBubblesList: any[], edges: Edge[], nodes: Node[]) => {
  if (!frozenBubblesList || frozenBubblesList.length === 0) return false;
  const label = String(node.data.label).toLowerCase();
  
  if (frozenBubblesList.some((f: any) => f.word.toLowerCase() === label)) return true;
  
  if (node.data.isChunk) {
    const parentEdge = edges.find(e => e.target === node.id);
    if (parentEdge) {
      const parentNode = nodes.find(n => n.id === parentEdge.source);
      if (parentNode && frozenBubblesList.some((f: any) => f.word.toLowerCase() === String(parentNode.data.label).toLowerCase())) {
        return true;
      }
    }
  } else if (!node.data.isCategory) {
    const childEdges = edges.filter(e => e.source === node.id);
    const chunkLabels = childEdges
      .map(e => nodes.find(child => child.id === e.target))
      .filter(child => child && child.data.isChunk)
      .map(child => String(child!.data.label).toLowerCase());
    if (chunkLabels.some(cLabel => frozenBubblesList.some((f: any) => f.word.toLowerCase() === cLabel))) {
      return true;
    }
  }
  return false;
};

const isNodeBurst = (node: Node, burstBubblesList: any[], edges: Edge[], nodes: Node[]) => {
  if (!burstBubblesList || burstBubblesList.length === 0) return { isBurst: false, movesRemaining: 0 };
  const label = String(node.data.label).toLowerCase();
  
  let burstRule = burstBubblesList.find((b: any) => b.word.toLowerCase() === label);
  if (burstRule) return { isBurst: true, movesRemaining: burstRule.movesRemaining };
  
  if (node.data.isChunk) {
    const parentEdge = edges.find(e => e.target === node.id);
    if (parentEdge) {
      const parentNode = nodes.find(n => n.id === parentEdge.source);
      if (parentNode) {
        burstRule = burstBubblesList.find((b: any) => b.word.toLowerCase() === String(parentNode.data.label).toLowerCase());
        if (burstRule) return { isBurst: true, movesRemaining: burstRule.movesRemaining };
      }
    }
  } else if (!node.data.isCategory) {
    const childEdges = edges.filter(e => e.source === node.id);
    const chunkLabels = childEdges
      .map(e => nodes.find(child => child.id === e.target))
      .filter(child => child && child.data.isChunk)
      .map(child => String(child!.data.label).toLowerCase());
      
    for (const cLabel of chunkLabels) {
      burstRule = burstBubblesList.find((b: any) => b.word.toLowerCase() === cLabel);
      if (burstRule) return { isBurst: true, movesRemaining: burstRule.movesRemaining };
    }
  }
  return { isBurst: false, movesRemaining: 0 };
};

export const lockKeyColors = [
  '#eab308', // yellow
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#14b8a6', // teal
  '#f97316', // orange
  '#3b82f6', // blue
  '#10b981'  // emerald
];

const isNodeLock = (node: Node, locks: any[], edges: Edge[], nodes: Node[]) => {
  if (!locks || locks.length === 0) return -1;
  const label = String(node.data.label).toLowerCase();
  
  let idx = locks.findIndex((l: any) => l.lockWord.toLowerCase() === label);
  if (idx !== -1) return idx;
  
  if (node.data.isChunk) {
    const parentEdge = edges.find(e => e.target === node.id);
    if (parentEdge) {
      const parentNode = nodes.find(n => n.id === parentEdge.source);
      if (parentNode) {
        idx = locks.findIndex((l: any) => l.lockWord.toLowerCase() === String(parentNode.data.label).toLowerCase());
        if (idx !== -1) return idx;
      }
    }
  } else if (!node.data.isCategory) {
    const childEdges = edges.filter(e => e.source === node.id);
    const chunkLabels = childEdges
      .map(e => nodes.find(child => child.id === e.target))
      .filter(child => child && child.data.isChunk)
      .map(child => String(child!.data.label).toLowerCase());
      
    for (const cLabel of chunkLabels) {
      idx = locks.findIndex((l: any) => l.lockWord.toLowerCase() === cLabel);
      if (idx !== -1) return idx;
    }
  }
  return -1;
};

const isNodeKey = (node: Node, locks: any[], edges: Edge[], nodes: Node[]) => {
  if (!locks || locks.length === 0) return -1;
  const label = String(node.data.label).toLowerCase();
  
  let idx = locks.findIndex((l: any) => l.keyWord.toLowerCase() === label);
  if (idx !== -1) return idx;
  
  if (node.data.isChunk) {
    const parentEdge = edges.find(e => e.target === node.id);
    if (parentEdge) {
      const parentNode = nodes.find(n => n.id === parentEdge.source);
      if (parentNode) {
        idx = locks.findIndex((l: any) => l.keyWord.toLowerCase() === String(parentNode.data.label).toLowerCase());
        if (idx !== -1) return idx;
      }
    }
  } else if (!node.data.isCategory) {
    const childEdges = edges.filter(e => e.source === node.id);
    const chunkLabels = childEdges
      .map(e => nodes.find(child => child.id === e.target))
      .filter(child => child && child.data.isChunk)
      .map(child => String(child!.data.label).toLowerCase());
      
    for (const cLabel of chunkLabels) {
      idx = locks.findIndex((l: any) => l.keyWord.toLowerCase() === cLabel);
      if (idx !== -1) return idx;
    }
  }
  return -1;
};

export default function GraphEditor() {
  const [nodes, setNodes] = useNodesState(initialNodes);
  const [edges, setEdges] = useEdgesState(initialEdges);
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  
  const [leftPanelTab, setLeftPanelTab] = useState<'chunks'|'dropQueue'|'settings'|'category'>('dropQueue');
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
  const spawnQueueIds = useMemo(() => {
    return nodes.filter(n => typeof n.data.globalIndex === 'number')
                .sort((a, b) => (a.data.globalIndex as number) - (b.data.globalIndex as number))
                .map(n => n.id);
  }, [nodes]);

  const duplicateQueueWordsSet = useMemo(() => {
    const words: string[] = [];
    const processedParents = new Set<string>();

    nodes.filter(n => n.data.isCategory).forEach(n => {
      words.push(String(n.data.label).toLowerCase());
    });

    spawnQueueIds.forEach(id => {
      const node = nodes.find(n => n.id === id);
      if (!node) return;
      if (node.data.isChunk) {
        const parentEdge = edges.find(e => e.target === id);
        if (parentEdge) {
          const parentNode = nodes.find(n => n.id === parentEdge.source);
          if (parentNode && !processedParents.has(parentNode.id)) {
            processedParents.add(parentNode.id);
            words.push(String(parentNode.data.label).toLowerCase());
          }
        }
      } else {
        words.push(String(node.data.label).toLowerCase());
      }
    });

    return new Set(words.filter((w, i) => words.indexOf(w) !== i));
  }, [spawnQueueIds, nodes, edges]);

  const duplicateQueueChunksSet = useMemo(() => {
    const chunks: string[] = [];
    spawnQueueIds.forEach(id => {
      const node = nodes.find(n => n.id === id);
      if (node && node.data.isChunk) {
        chunks.push(String(node.data.label).toLowerCase());
      }
    });
    return new Set(chunks.filter((c, i) => chunks.indexOf(c) !== i));
  }, [spawnQueueIds, nodes]);
  
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

  const [, setHistory] = useState<{ past: { nodes: Node[], edges: Edge[] }[], future: { nodes: Node[], edges: Edge[] }[] }>({ past: [], future: [] });

  const saveHistory = useCallback(() => {
    setHistory(h => {
      const newPast = [...h.past, { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) }].slice(-50);
      return { past: newPast, future: [] };
    });
  }, [nodes, edges]);

  // Scroll to selected drop queue item
  useEffect(() => {
    if (selectedNodeId && leftPanelTab === 'dropQueue') {
      const el = document.getElementById(`queue-item-${selectedNodeId}`);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      }
    }
  }, [selectedNodeId, leftPanelTab]);

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
          if (parsed.spawnQueueIds) {
            parsed.nodes.forEach((n: Node) => {
              const idx = parsed.spawnQueueIds.indexOf(n.id);
              if (idx !== -1) n.data.globalIndex = idx + 1;
            });
          }
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

  const createChunksForWord = (wordId: string, word: string, targetNodes: Node[], targetEdges: Edge[], parentX: number, parentY: number, parentGlobalIndex?: number) => {
    const cleanWord = String(word).trim().toLowerCase();
    const spaceIndex = cleanWord.indexOf(' ');
    
    // Nếu là từ đơn (không có khoảng trắng) và có độ dài nhỏ hơn 6
    // Thì không cho phép cắt (tránh tạo ra các chunk 1 hoặc 2 chữ cái như cat -> c, at)
    if (spaceIndex === -1 && cleanWord.length < 6) return [];
    
    let chunk1, chunk2;
    if (spaceIndex !== -1) {
      chunk1 = cleanWord.slice(0, spaceIndex + 1); // Giữ lại khoảng trắng ở cuối chunk1
      chunk2 = cleanWord.slice(spaceIndex + 1);
    } else {
      const half = Math.ceil(cleanWord.length / 2);
      chunk1 = cleanWord.slice(0, half);
      chunk2 = cleanWord.slice(half);
    }
    
    const c1Id = uuidv4();
    const c1Node: Node = {
      id: c1Id, type: 'custom', position: { x: parentX - 60, y: parentY + 80 },
      data: { label: chunk1, isChunk: true, isCategory: false, globalIndex: parentGlobalIndex }
    };
    targetNodes.push(c1Node);
    targetEdges.push({
      id: `e-${wordId}-${c1Id}`, source: wordId, target: c1Id, animated: true,
      style: { stroke: 'rgba(99,102,241,0.5)', strokeDasharray: '5,5' }
    });
    
    const c2Id = uuidv4();
    const c2Node: Node = {
      id: c2Id, type: 'custom', position: { x: parentX + 60, y: parentY + 80 },
      data: { label: chunk2, isChunk: true, isCategory: false, globalIndex: parentGlobalIndex !== undefined ? parentGlobalIndex + 0.5 : undefined }
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
              
              let wordNode: Node;
              // If this word is actually a sub-category that we already processed, use it instead of creating a duplicate node
              if (catNodesMap[wordLower]) {
                wordNode = catNodesMap[wordLower];
              } else {
                let gIndex = undefined;
                if (data.allWordEntries && Array.isArray(data.allWordEntries)) {
                  const arrIdx = data.allWordEntries.findIndex((e: any) => e.fullWord.toLowerCase() === wordLower);
                  if (arrIdx !== -1) gIndex = arrIdx + 1;
                }

                wordNode = {
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
              }

              // Support old JSON format
              if (w.chunks && Array.isArray(w.chunks) && w.chunks.length > 0) {
                w.chunks.forEach((chunkItem: any) => {
                  const chunkStr = typeof chunkItem === 'string' ? chunkItem : Object.keys(chunkItem)[0];
                  if (!chunkStr) return;
                  
                  let chunkIndex = undefined;
                  if (data.allWordEntries && Array.isArray(data.allWordEntries)) {
                    const arrIdx = data.allWordEntries.findIndex((e: any) => e.fullWord.toLowerCase() === chunkStr.toLowerCase() && e.parentWord && String(e.parentWord).toLowerCase() === wordLower);
                    if (arrIdx !== -1) chunkIndex = arrIdx + 1;
                  }
                  
                  const chunkNode: Node = {
                    id: uuidv4(),
                    type: 'custom',
                    position: { x: 0, y: 0 },
                    data: { label: chunkStr.toLowerCase(), isCategory: false, isChunk: true, globalIndex: chunkIndex }
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
                data.allWordEntries.forEach((entry: any, arrIdx: number) => {
                  if (entry.parentWord && String(entry.parentWord).toLowerCase() === wordLower) {
                    const chunkNode: Node = {
                      id: uuidv4(),
                      type: 'custom',
                      position: { x: 0, y: 0 },
                      data: { label: String(entry.fullWord).toLowerCase(), isCategory: false, isChunk: true, globalIndex: arrIdx + 1 }
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

      // ---------------------------------------------------------
      // PASS 4: Restore linked words and cracked states
      // ---------------------------------------------------------
      if (data.allWordEntries && Array.isArray(data.allWordEntries)) {
        data.allWordEntries.forEach((entry: any) => {
          if (entry.parentWord) {
            // It's a chunk
            const chunkStr = String(entry.fullWord).toLowerCase();
            newNodes.find(n => 
              n.data.isChunk &&
              String(n.data.label).toLowerCase() === chunkStr &&
              newEdges.some(e => e.target === n.id && String(newNodes.find(pn => pn.id === e.source)?.data.label).toLowerCase() === String(entry.parentWord).toLowerCase())
            );
          } else {
            // Uncut word (new format) OR Old format entry (cut or uncut)
            if (entry.chunks && entry.chunks.length > 0) {
              // Old format with chunks
              entry.chunks.forEach((chunkItem: any) => {
                const chunkStr = typeof chunkItem === 'string' ? chunkItem : Object.keys(chunkItem)[0];
                newNodes.find(n => 
                  n.data.isChunk &&
                  String(n.data.label).toLowerCase() === String(chunkStr).toLowerCase() &&
                  newEdges.some(e => e.target === n.id && String(newNodes.find(pn => pn.id === e.source)?.data.label).toLowerCase() === String(entry.fullWord).toLowerCase())
                );
              });
            } else {
              // Uncut word
              newNodes.find(n => 
                !n.data.isCategory && !n.data.isChunk &&
                String(n.data.label).toLowerCase() === String(entry.fullWord).toLowerCase()
              );
            }
          }
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
    
    if (duplicateQueueWordsSet.size > 0) {
      alert(`Cảnh báo: Các từ sau bị trùng lặp trong Drop Queue hoặc Category: ${Array.from(duplicateQueueWordsSet).join(", ")}`);
    }
    if (duplicateQueueChunksSet.size > 0) {
      alert(`Cảnh báo: Các chunk sau bị trùng lặp trong Drop Queue: ${Array.from(duplicateQueueChunksSet).join(", ")}`);
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
    
    const categoryNodes = nodes.filter(n => {
      const childEdges = edges.filter(e => e.source === n.id);
      const childNodes = childEdges.map(e => nodes.find(node => node.id === e.target)).filter(Boolean) as Node[];
      
      // If a node has ANY chunk children, it is a Word that splits into chunks, NOT a category.
      if (childNodes.length > 0 && childNodes.some(child => child.data.isChunk)) {
        return false;
      }

      if (n.data.isCategory) return true;
      if (childEdges.length === 0) return false;
      return true;
    });
    
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
      const maxGlobalIndex = nodes.reduce((max, n) => Math.max(max, (n.data?.globalIndex as number) || 0), 0);
      childNode = {
        id: uuidv4(),
        type: 'custom',
        position: { x: parentNode.position.x + xOffset, y: parentNode.position.y + 120 },
        data: { label: childLabel, isCategory: false, isChunk, globalIndex: maxGlobalIndex + 1 }
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
      createChunksForWord(childNode.id, childLabel, newNodesToAppend, newEdgesToAppend, childNode.position.x, childNode.position.y, childNode.data.globalIndex as number | undefined);
      childNode.data.globalIndex = undefined;
    }
    
    setNodes((nds) => {
      let updatedNodes = [...nds];
      if (isChunk) {
        const parentIndex = updatedNodes.findIndex(n => n.id === parentNode.id);
        if (parentIndex !== -1) {
          updatedNodes[parentIndex] = {
            ...updatedNodes[parentIndex],
            data: { ...updatedNodes[parentIndex].data, globalIndex: undefined }
          };
        }
      }
      return [...updatedNodes, ...newNodesToAppend];
    });
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

  const handleUpdateNodeIndex = useCallback((nodeId: string, newIndex: number | undefined) => {
    saveHistory();
    setNodes(nds => nds.map(n => {
      if (n.id === nodeId) {
        return { ...n, data: { ...n.data, globalIndex: newIndex } };
      }
      return n;
    }));
  }, [saveHistory]);



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
    let nextGlobalIndex = nodes.reduce((max, n) => Math.max(max, (n.data?.globalIndex as number) || 0), 0) + 1;

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
            data: { label: w.word.toLowerCase(), isCategory: false, icon: w.icon, globalIndex: nextGlobalIndex++ }
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
          const newChunks = createChunksForWord(newWordNodes[i].id, String(newWordNodes[i].data.label), importedNodes, importedEdges, newWordNodes[i].position.x, newWordNodes[i].position.y, newWordNodes[i].data.globalIndex as number | undefined);
          // newChunks are the node objects returned by createChunksForWord
          if (newChunks && newChunks.length > 0) {
            newWordNodes[i].data.globalIndex = undefined;
            newIds = newChunks.map(c => c.id);
          }
        }
        queueUpdates.push({ oldIds, newIds });

        // Update mechanics with new word
        if (updatedRawLevelData) {
          const oldLabel = String(oldNode.data.label).toLowerCase();
          const newLabel = String(newWordNodes[i].data.label).toLowerCase();

          // 1. Chain
          if (updatedRawLevelData.bubbleSeparatorData?.linkedWords) {
            updatedRawLevelData.bubbleSeparatorData.linkedWords = updatedRawLevelData.bubbleSeparatorData.linkedWords.map((lw: string) => 
              lw.toLowerCase() === oldLabel ? newLabel : lw
            );
            // Update chunks in chain if any
            if (oldChunkNodes.length > 0) {
              const oldC1 = oldChunkNodes[0]?.data.label;
              const oldC2 = oldChunkNodes[1]?.data.label;
              if (oldC1 && oldC2) {
                const wordStr = newLabel;
                const chunkLen = Math.floor(wordStr.length / 2) || 1;
                let c1 = wordStr.substring(0, chunkLen);
                let c2 = wordStr.substring(chunkLen);
                if (autoCutWords && wordStr.includes(' ')) {
                  const parts = wordStr.split(' ');
                  c1 = parts[0] + ' ';
                  c2 = parts.slice(1).join(' ');
                }
                updatedRawLevelData.bubbleSeparatorData.linkedChunkWords = updatedRawLevelData.bubbleSeparatorData.linkedChunkWords?.map((lcw: any) => {
                  if (lcw.chunk1?.toLowerCase() === String(oldC1).toLowerCase() && lcw.chunk2?.toLowerCase() === String(oldC2).toLowerCase()) {
                    return { chunk1: c1, chunk2: c2 };
                  }
                  return lcw;
                });
              }
            }
          }

          // 2. Frozen
          if (updatedRawLevelData.frozenBubbles) {
            updatedRawLevelData.frozenBubbles = updatedRawLevelData.frozenBubbles.map((fb: any) => 
              fb.word.toLowerCase() === oldLabel ? { ...fb, word: newLabel } : fb
            );
          }

          // 3. Burst
          if (updatedRawLevelData.burstBubbles) {
            updatedRawLevelData.burstBubbles = updatedRawLevelData.burstBubbles.map((bb: any) => 
              bb.word.toLowerCase() === oldLabel ? { ...bb, word: newLabel } : bb
            );
          }

          // 4. Backward
          if (updatedRawLevelData.backwardBubbles) {
            updatedRawLevelData.backwardBubbles = updatedRawLevelData.backwardBubbles.map((bw: any) => 
              bw.word.toLowerCase() === oldLabel ? { ...bw, word: newLabel } : bw
            );
          }

          // 5. Key Lock
          if (updatedRawLevelData.keyLockBubbles) {
            updatedRawLevelData.keyLockBubbles = updatedRawLevelData.keyLockBubbles.map((kl: any) => ({
              ...kl,
              keyWord: kl.keyWord.toLowerCase() === oldLabel ? newLabel : kl.keyWord,
              lockWord: kl.lockWord.toLowerCase() === oldLabel ? newLabel : kl.lockWord
            }));
          }

          // 6. Screw Lock
          if (updatedRawLevelData.screwLockBubbles) {
            updatedRawLevelData.screwLockBubbles = updatedRawLevelData.screwLockBubbles.map((sl: any) => ({
              ...sl,
              screwLockWord: sl.screwLockWord.toLowerCase() === oldLabel ? newLabel : sl.screwLockWord,
              screwDriverWords: sl.screwDriverWords.map((sdw: string) => sdw.toLowerCase() === oldLabel ? newLabel : sdw)
            }));
          }

          // 7. Cryptic
          if (updatedRawLevelData.crypticBubbles) {
            updatedRawLevelData.crypticBubbles = updatedRawLevelData.crypticBubbles.map((cb: any) => {
              if (cb.word.toLowerCase() === oldLabel) {
                const newLetters = newLabel.split('').map((char: string) => ({
                  letter: char.charCodeAt(0),
                  revealAtMerge: 0
                }));
                return { ...cb, word: newLabel, letters: newLetters };
              }
              return cb;
            });
          }
        }
      });
      
      // If newWordNodes has more items than oldWordNodes, and autoCutWords is true
      for (let i = oldWordNodes.length; i < newWordNodes.length; i++) {
        if (autoCutWords) {
          createChunksForWord(newWordNodes[i].id, String(newWordNodes[i].data.label), importedNodes, importedEdges, newWordNodes[i].position.x, newWordNodes[i].position.y, newWordNodes[i].data.globalIndex as number | undefined);
          newWordNodes[i].data.globalIndex = undefined;
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
          const newChunks = createChunksForWord(newWordNodes[i].id, String(newWordNodes[i].data.label), importedNodes, importedEdges, newWordNodes[i].position.x, newWordNodes[i].position.y, newWordNodes[i].data.globalIndex as number | undefined);
          if (newChunks && newChunks.length > 0) {
            newWordNodes[i].data.globalIndex = undefined;
            newIds = newChunks.map(c => c.id);
          }
        }
        queueInsertions.push({ oldIds, newIds });
      });
      
      for (let i = oldWordNodes.length; i < newWordNodes.length; i++) {
        if (autoCutWords) {
          createChunksForWord(newWordNodes[i].id, String(newWordNodes[i].data.label), importedNodes, importedEdges, newWordNodes[i].position.x, newWordNodes[i].position.y, newWordNodes[i].data.globalIndex as number | undefined);
          newWordNodes[i].data.globalIndex = undefined;
        }
      }
    } else {
      // Fresh import, cut all if autoCutWords is enabled
      if (autoCutWords) {
        newWordNodes.forEach(wNode => {
          createChunksForWord(wNode.id, String(wNode.data.label), importedNodes, importedEdges, wNode.position.x, wNode.position.y, wNode.data.globalIndex as number | undefined);
          wNode.data.globalIndex = undefined;
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

  const handleMagicChange = (popularWords: string, minPopularity: number = 0, maxPopularity: number = 1) => {
    saveHistory();
    const usedCategories = new Set<string>();
    let nextGlobalIndex = nodes.reduce((max, n) => Math.max(max, (n.data?.globalIndex as number) || 0), 0) + 1;
    
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

      // --- 1. Compute Semantic Profile of Old Tree ---
      const oldWordNodes = allOldNodes.filter(n => !n.data.isCategory && !n.data.isChunk);
      let targetPopularity = 50;
      let targetProperNounRatio = 0;

      if (oldWordNodes.length > 0) {
        let totalPop = 0;
        let popCount = 0;
        let properCount = 0;
        
        oldWordNodes.forEach(wn => {
          const wLabel = String(wn.data.label).toLowerCase();
          if (nlp(String(wn.data.label)).has('#ProperNoun')) properCount++;
          
          let foundPop: number | null = null;
          for (const cat of globalDict) {
            const match = cat.words.find((w: any) => w.word.toLowerCase() === wLabel);
            if (match && match.popularity) {
              foundPop = match.popularity;
              break;
            }
          }
          if (foundPop !== null) {
            totalPop += foundPop;
            popCount++;
          }
        });

        if (popCount > 0) targetPopularity = totalPop / popCount;
        targetProperNounRatio = properCount / oldWordNodes.length;
      }
      // ----------------------------------------------
      
      let matches = globalDict.filter((cat: any) => {
        if (usedCategories.has(cat.name)) return false;
        return isFulfilled(sig, getDictSig(cat.name));
      });

      if (matches.length === 0) {
        console.warn(`No matching dictionary category found for tree ${root.data.label}`);
        continue;
      }

      // Shuffle matches to prevent alphabetical bias on ties
      matches.sort(() => Math.random() - 0.5);

      let history: string[] = [];
      try {
        history = JSON.parse(localStorage.getItem('magicChangeHistory') || '[]');
      } catch (e) {}

      // Lọc bỏ hoàn toàn các category đã nằm trong lịch sử (chống trùng lặp tuyệt đối)
      let filteredMatches = matches.filter(cat => !history.includes(cat.name));
      // Trừ khi xui quá không còn category nào mới, ta mới đành dùng lại toàn bộ danh sách
      if (filteredMatches.length > 0) {
        matches = filteredMatches;
      }

      const getHistoryPenalty = (catName: string) => history.includes(catName) ? 1 : 0;

      const categoryScores = new Map<string, number>();
      if (minPopularity === 0 && maxPopularity === 1) {
        matches.forEach((cat: any) => {
           let totalPop = 0;
           let properCount = 0;
           let wCount = 0;
           cat.words.forEach((w: any) => {
              if (w.popularity) { totalPop += w.popularity; wCount++; }
              if (nlp(w.word).has('#ProperNoun')) properCount++;
           });
           const avgPop = wCount > 0 ? totalPop / wCount : 50;
           const properRatio = cat.words.length > 0 ? properCount / cat.words.length : 0;
           const popDist = Math.abs(avgPop - targetPopularity);
           const properDist = Math.abs(properRatio - targetProperNounRatio) * 50;
           categoryScores.set(cat.name, popDist + properDist);
        });
      }

      // Primary sorting logic
      matches.sort((a: any, b: any) => {
        // 1. History penalty (lower is better)
        const aPenalty = getHistoryPenalty(a.name);
        const bPenalty = getHistoryPenalty(b.name);
        if (aPenalty !== bPenalty) return aPenalty - bPenalty;

        // 2. popularity bounds count (higher is better)
        if (minPopularity > 0 || maxPopularity < 1) {
          const countWords = (cat: any) => cat.words.filter((w: any) => {
             const pop = w.popularity || 0;
             return pop >= minPopularity * 100 && pop <= maxPopularity * 100;
          }).length;
          const aCount = countWords(a);
          const bCount = countWords(b);
          if (aCount !== bCount) return bCount - aCount;
        } else {
          // 3. Clone Rarity/Semantic distance (lower is better)
          const scoreA = categoryScores.get(a.name) || 0;
          const scoreB = categoryScores.get(b.name) || 0;
          return scoreA - scoreB;
        }

        return 0; // fallback to random shuffle
      });

      let chosenCat = matches[0];

      // Pool selection to increase variance (if no specific popularWords provided)
      if (!popularWords) {
        let pool = matches.filter(m => getHistoryPenalty(m.name) === getHistoryPenalty(matches[0].name));
        if ((minPopularity > 0 || maxPopularity < 1) && pool.length > 0) {
          const countWords = (cat: any) => cat.words.filter((w: any) => {
             const pop = w.popularity || 0;
             return pop >= minPopularity * 100 && pop <= maxPopularity * 100;
          }).length;
          const maxCount = countWords(pool[0]);
          pool = pool.filter(m => {
            const count = countWords(m);
            return count >= maxCount * 0.7; // allow 30% variance in word count
          });
        } else if (pool.length > 0) {
           // With no minPopularity, pool already consists of penalty-matched items.
           // Since matches are sorted by semantic distance, pool is sorted by semantic distance.
        }
        
        // Tăng sự ngẫu nhiên: Lấy Top 50% pool (tối thiểu 1) để chọn ngẫu nhiên
        const poolSize = Math.max(1, Math.floor(pool.length * 0.5));
        const randIndex = Math.floor(Math.random() * poolSize);
        chosenCat = pool[randIndex] || matches[0];
      }

      if (popularWords) {
        const terms = popularWords.split(/[\\n,]+/).map(t => t.trim().toLowerCase()).filter(Boolean);
        if (terms.length > 0) {
          matches.sort((a: any, b: any) => {
            const aMatch = terms.some(t => a.name.toLowerCase().includes(t) || a.words.some((w:any) => w.word.toLowerCase().includes(t))) ? 1 : 0;
            const bMatch = terms.some(t => b.name.toLowerCase().includes(t) || b.words.some((w:any) => w.word.toLowerCase().includes(t))) ? 1 : 0;
            return bMatch - aMatch; // exact term match overrides everything
          });
          chosenCat = matches[0];
        }
      }
      
      usedCategories.add(chosenCat.name);
      history.push(chosenCat.name);
      // Tăng bộ nhớ lên 50 (nếu số lượng Category nhiều thì 50 là vừa phải để chống lặp lâu)
      if (history.length > 50) history = history.slice(history.length - 50);
      try {
        localStorage.setItem('magicChangeHistory', JSON.stringify(history));
      } catch (e) {}

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

        // 1. Initial random shuffle
        wordsToImport.sort(() => Math.random() - 0.5);

        // 2. Setup priorities
        const terms = popularWords ? popularWords.split(/[\\n,]+/).map(t => t.trim().toLowerCase()).filter(Boolean) : [];

        // 3. Sort to find the BEST anchor (index 0)
        wordsToImport.sort((a: any, b: any) => {
          if (terms.length > 0) {
            const aMatch = terms.some(t => a.word.toLowerCase().includes(t)) ? 1 : 0;
            const bMatch = terms.some(t => b.word.toLowerCase().includes(t)) ? 1 : 0;
            if (aMatch !== bMatch) return bMatch - aMatch;
          }
          if (minPopularity > 0) {
            const aPop = a.popularity || 0;
            const bPop = b.popularity || 0;
            const aMet = aPop >= minPopularity ? 1 : 0;
            const bMet = bPop >= minPopularity ? 1 : 0;
            if (aMet !== bMet) return bMet - aMet;
            if (aMet && bMet) return 0;
            return bPop - aPop;
          }
          
          // Clone Semantic Rarity for anchor
          const aPop = a.popularity || 50;
          const bPop = b.popularity || 50;
          const aProper = nlp(a.word).has('#ProperNoun') ? 1 : 0;
          const bProper = nlp(b.word).has('#ProperNoun') ? 1 : 0;
          
          const wantsProper = targetProperNounRatio >= 0.5 ? 1 : 0;
          const aProperScore = Math.abs(aProper - wantsProper);
          const bProperScore = Math.abs(bProper - wantsProper);
          
          if (aProperScore !== bProperScore) return aProperScore - bProperScore; // lower is better
          return Math.abs(aPop - targetPopularity) - Math.abs(bPop - targetPopularity);
        });

        // 4. The anchor is the first element
        const anchor = wordsToImport[0];
        const anchorPop = anchor?.popularity || 0;

        // 5. Final sort: cluster by popularity distance to anchor, while respecting priorities
        wordsToImport.sort((a: any, b: any) => {
          if (a === anchor) return -1;
          if (b === anchor) return 1;

          if (terms.length > 0) {
            const aMatch = terms.some(t => a.word.toLowerCase().includes(t)) ? 1 : 0;
            const bMatch = terms.some(t => b.word.toLowerCase().includes(t)) ? 1 : 0;
            if (aMatch !== bMatch) return bMatch - aMatch;
          }
          if (minPopularity > 0) {
            const aPop = a.popularity || 0;
            const bPop = b.popularity || 0;
            const aMet = aPop >= minPopularity ? 1 : 0;
            const bMet = bPop >= minPopularity ? 1 : 0;
            if (aMet !== bMet) return bMet - aMet;
            if (!aMet && !bMet) return bPop - aPop;
          }
          
          const aPop = a.popularity || 0;
          const bPop = b.popularity || 0;
          return Math.abs(aPop - anchorPop) - Math.abs(bPop - anchorPop);
        });

        // 6. Lọc loại bỏ các từ trùng gốc (VD: day và days, run và running)
        const getRoot = (w: string) => {
           let r = nlp(w).compute('root').text('root');
           return (r ? r : w).toLowerCase().trim();
        };

        const uniqueWords: any[] = [];
        const duplicateWords: any[] = [];
        const seenRoots = new Set<string>();

        for (const w of wordsToImport) {
           const root = getRoot(w.word);
           // Fallback kiểm tra chuỗi nếu compromise không bắt được (vd: cat vs cats)
           let isDuplicate = seenRoots.has(root);
           if (!isDuplicate) {
              for (const seen of seenRoots) {
                 if ((root.startsWith(seen) || seen.startsWith(root)) && Math.abs(root.length - seen.length) <= 2) {
                    isDuplicate = true;
                    break;
                 }
              }
           }

           if (!isDuplicate) {
               seenRoots.add(root);
               uniqueWords.push(w);
           } else {
               duplicateWords.push(w);
           }
        }
        
        // Fallback: Nếu lọc xong mà không đủ chữ để tạo cây, ta đành lấy lại từ trùng lặp
        const numRequired = currentReqSig.numWords;
        while (uniqueWords.length < numRequired && duplicateWords.length > 0) {
            uniqueWords.push(duplicateWords.shift());
        }
        wordsToImport = uniqueWords;
        
        // Bốc ngẫu nhiên N từ trong khoảng N + 4 từ sát với Anchor nhất để tăng sự ngẫu nhiên (chống lặp tuyệt đối)
        if (numRequired > 1 && wordsToImport.length > numRequired) {
           const expandedSlice = wordsToImport.slice(0, numRequired + 4);
           const anchorWord = expandedSlice[0];
           const remainingExpanded = expandedSlice.slice(1);
           remainingExpanded.sort(() => Math.random() - 0.5);
           wordsToImport = [anchorWord, ...remainingExpanded].slice(0, numRequired);
        } else {
           wordsToImport = wordsToImport.slice(0, numRequired);
        }

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
            data: { label: w.word.toLowerCase(), isCategory: false, icon: newIcon, globalIndex: inheritedGlobalIndex !== undefined ? inheritedGlobalIndex : nextGlobalIndex++ }
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
              const chunkInheritedIndex = oldChunkNodes[0]?.data?.globalIndex ?? inheritedGlobalIndex;
              newImportedNodes.push({ id: c1Id, type: 'custom', position: { x: baseX - 40, y: baseY + 60 }, data: { label: c1, isCategory: false, isChunk: true, globalIndex: chunkInheritedIndex }});
              newImportedNodes.push({ id: c2Id, type: 'custom', position: { x: baseX + 40, y: baseY + 60 }, data: { label: c2, isCategory: false, isChunk: true, globalIndex: chunkInheritedIndex !== undefined && chunkInheritedIndex !== null ? (chunkInheritedIndex as number) + 0.5 : undefined }});
              newImportedEdges.push({ id: `e-${wordId}-${c1Id}`, source: wordId, target: c1Id, animated: true, style: { stroke: 'var(--accent)' }});
              newImportedEdges.push({ id: `e-${wordId}-${c2Id}`, source: wordId, target: c2Id, animated: true, style: { stroke: 'var(--accent)' }});
              
              // Remove globalIndex from parent word so it is not in spawn queue
              const parentNodeIndex = newImportedNodes.findIndex(n => n.id === wordId);
              if (parentNodeIndex !== -1) {
                newImportedNodes[parentNodeIndex].data.globalIndex = undefined;
              }
              
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
            const wordStr = w.word.trim().toLowerCase();
            let c1, c2;
            const spaceIdx = wordStr.indexOf(' ');
            let shouldCut = true;

            if (spaceIdx !== -1) {
              c1 = wordStr.substring(0, spaceIdx + 1); // Giữ lại khoảng trắng ở cuối
              c2 = wordStr.substring(spaceIdx + 1);
            } else if (wordStr.length >= 6) {
              const chunkLen = Math.ceil(wordStr.length / 2);
              c1 = wordStr.substring(0, chunkLen);
              c2 = wordStr.substring(chunkLen);
            } else {
              shouldCut = false;
            }

            if (shouldCut && c1 && c2) {
              const c1Id = uuidv4();
              const c2Id = uuidv4();
              const baseX = oldWordNode?.position.x || 0;
              const baseY = oldWordNode?.position.y || 0;
              newImportedNodes.push({ id: c1Id, type: 'custom', position: { x: baseX - 40, y: baseY + 60 }, data: { label: c1, isCategory: false, isChunk: true, globalIndex: inheritedGlobalIndex }});
              newImportedNodes.push({ id: c2Id, type: 'custom', position: { x: baseX + 40, y: baseY + 60 }, data: { label: c2, isCategory: false, isChunk: true, globalIndex: inheritedGlobalIndex !== undefined && inheritedGlobalIndex !== null ? (inheritedGlobalIndex as number) + 0.5 : undefined }});
              newImportedEdges.push({ id: `e-${wordId}-${c1Id}`, source: wordId, target: c1Id, animated: true, style: { stroke: 'var(--accent)' }});
              newImportedEdges.push({ id: `e-${wordId}-${c2Id}`, source: wordId, target: c2Id, animated: true, style: { stroke: 'var(--accent)' }});
              newIds = [c1Id, c2Id];
              
              // Remove globalIndex from parent word so it is not in spawn queue
              const parentNodeIndex = newImportedNodes.findIndex(n => n.id === wordId);
              if (parentNodeIndex !== -1) {
                newImportedNodes[parentNodeIndex].data.globalIndex = undefined;
              }
            }
          }

          if (oldIds.length > 0) {
            queueUpdates.push({ oldIds, newIds });
          }

          // Update mechanics with new word
          if (oldWordNode && clonedRawData) {
            const oldLabel = String(oldWordNode.data.label).toLowerCase();
            const newLabel = String(w.word).toLowerCase();

            // 1. Chain (bubbleSeparatorData.linkedWords)
            if (clonedRawData.bubbleSeparatorData?.linkedWords) {
              clonedRawData.bubbleSeparatorData.linkedWords = clonedRawData.bubbleSeparatorData.linkedWords.map((lw: string) => 
                lw.toLowerCase() === oldLabel ? newLabel : lw
              );
              // Also update chunks in chain if any
              const oldChunkNodes = nodes.filter(n => n.data.isChunk && edges.some(e => e.source === oldWordNode.id && e.target === n.id));
              if (oldChunkNodes.length > 0) {
                const oldC1 = oldChunkNodes[0]?.data.label;
                const oldC2 = oldChunkNodes[1]?.data.label;
                if (oldC1 && oldC2) {
                  const wordStr = w.word.toLowerCase();
                  const chunkLen = Math.floor(wordStr.length / 2) || 1;
                  const newC1 = wordStr.substring(0, chunkLen);
                  const newC2 = wordStr.substring(chunkLen);
                  clonedRawData.bubbleSeparatorData.linkedWords = clonedRawData.bubbleSeparatorData.linkedWords.map((lw: string) => {
                    if (lw.toLowerCase() === String(oldC1).toLowerCase()) return newC1;
                    if (lw.toLowerCase() === String(oldC2).toLowerCase()) return newC2;
                    return lw;
                  });
                }
              }
            }

            // 2. Frozen Bubbles
            if (clonedRawData.frozenBubbles) {
              clonedRawData.frozenBubbles = clonedRawData.frozenBubbles.map((fb: any) => 
                fb.word.toLowerCase() === oldLabel ? { ...fb, word: w.word } : fb
              );
            }

            // 3. Burst Bubbles
            if (clonedRawData.burstBubbles) {
              clonedRawData.burstBubbles = clonedRawData.burstBubbles.map((bb: any) => 
                bb.word.toLowerCase() === oldLabel ? { ...bb, word: w.word } : bb
              );
            }

            // 4. Backward Bubbles
            if (clonedRawData.backwardBubbles) {
              clonedRawData.backwardBubbles = clonedRawData.backwardBubbles.map((bw: any) => 
                bw.word.toLowerCase() === oldLabel ? { ...bw, word: w.word } : bw
              );
            }

            // 5. Key Lock Bubbles
            if (clonedRawData.keyLockBubbles) {
              clonedRawData.keyLockBubbles = clonedRawData.keyLockBubbles.map((kl: any) => ({
                ...kl,
                keyWord: kl.keyWord.toLowerCase() === oldLabel ? w.word : kl.keyWord,
                lockWord: kl.lockWord.toLowerCase() === oldLabel ? w.word : kl.lockWord
              }));
            }

            // 6. Screw Lock Bubbles
            if (clonedRawData.screwLockBubbles) {
              clonedRawData.screwLockBubbles = clonedRawData.screwLockBubbles.map((sl: any) => ({
                ...sl,
                screwLockWord: sl.screwLockWord.toLowerCase() === oldLabel ? w.word : sl.screwLockWord,
                screwDriverWords: sl.screwDriverWords.map((sdw: string) => sdw.toLowerCase() === oldLabel ? w.word : sdw)
              }));
            }

            // 7. Cryptic Bubbles
            if (clonedRawData.crypticBubbles) {
              clonedRawData.crypticBubbles = clonedRawData.crypticBubbles.map((cb: any) => {
                if (cb.word.toLowerCase() === oldLabel) {
                  const newLetters = w.word.split('').map((char: string) => ({
                    letter: char.charCodeAt(0),
                    revealAtMerge: 0
                  }));
                  return { ...cb, word: w.word, letters: newLetters };
                }
                return cb;
              });
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
    // 1. Default to min (1) and max (length) if inputs are empty
    const rawStart = shuffleStartIndex.trim() === '' ? 1 : parseInt(shuffleStartIndex, 10);
    const rawEnd = shuffleEndIndex.trim() === '' ? spawnQueueIds.length : parseInt(shuffleEndIndex, 10);
    
    if (isNaN(rawStart) || isNaN(rawEnd) || rawStart < 1 || rawEnd > spawnQueueIds.length || rawStart >= rawEnd) {
      alert(`Please enter valid indices between 1 and ${spawnQueueIds.length}, where Start < End.`);
      return;
    }
    
    setNodes(nds => {
      const queue = nds.filter(n => typeof n.data?.globalIndex === 'number')
                       .sort((a,b) => (a.data?.globalIndex as number) - (b.data?.globalIndex as number));
      const sliceToShuffle = queue.slice(rawStart - 1, rawEnd);
      const unlockedSlice = sliceToShuffle.filter(n => !n.data.isPositionLocked);
      const indices = unlockedSlice.map(n => n.data.globalIndex);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      return nds.map(n => {
        const sliceIdx = unlockedSlice.findIndex(sn => sn.id === n.id);
        if (sliceIdx !== -1) {
          return { ...n, data: { ...n.data, globalIndex: indices[sliceIdx] } };
        }
        return n;
      });
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
            onClick={() => setIsSolutionModalOpen(true)}
            disabled={!rawLevelData}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: 'white', cursor: rawLevelData ? 'pointer' : 'not-allowed',
              fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', opacity: rawLevelData ? 1 : 0.5
            }}
          >
            <Calculator size={14} /> Calculate
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
              background: leftPanelTab === 'dropQueue' ? 'var(--accent)' : 'transparent',
              color: leftPanelTab === 'dropQueue' ? 'white' : 'var(--text-muted)'
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
          <button 
            onClick={() => setLeftPanelTab('category')}
            style={{ 
              flex: 1, padding: '6px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
              background: leftPanelTab === 'category' ? 'var(--accent)' : 'transparent',
              color: leftPanelTab === 'category' ? 'white' : 'var(--text-muted)'
            }}
          >
            Categories
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

            {duplicateQueueWordsSet.size > 0 && (
              <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>Duplicated Word Zones</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Array.from(duplicateQueueWordsSet).map(word => (
                    <span key={word} style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {duplicateQueueChunksSet.size > 0 && (
              <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>Duplicated Chunk Zones</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Array.from(duplicateQueueChunksSet).map(chunk => (
                    <span key={chunk} style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', padding: '2px 6px', borderRadius: '4px' }}>
                      {chunk}
                    </span>
                  ))}
                </div>
              </div>
            )}

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
                  const isFrozen = isNodeFrozen(node, rawLevelData?.frozenBubbles || [], edges, nodes);
                  const burstState = isNodeBurst(node, rawLevelData?.burstBubbles || [], edges, nodes);
                  const isBurst = burstState.isBurst;
                  const burstMovesRemaining = burstState.movesRemaining;
                  const lockIndex = isNodeLock(node, rawLevelData?.keyLockBubbles || [], edges, nodes);
                  const keyIndex = isNodeKey(node, rawLevelData?.keyLockBubbles || [], edges, nodes);
                  
                  let parentLabel: string | null = null;
                  if (isChunk) {
                    const parentEdge = edges.find(e => e.target === nodeId);
                    if (parentEdge) {
                      const parentNode = nodes.find(n => n.id === parentEdge.source);
                      if (parentNode) parentLabel = String(parentNode.data.label);
                    }
                  }
                  
                  const representedWord = isChunk && parentLabel ? parentLabel.toLowerCase() : String(node.data.label).toLowerCase();
                  const isDuplicateWord = duplicateQueueWordsSet.has(representedWord);
                  const isDuplicateChunk = isChunk && duplicateQueueChunksSet.has(String(node.data.label).toLowerCase());
                  const isDuplicate = isDuplicateWord || isDuplicateChunk;

                  return (
                    <div 
                      id={`queue-item-${nodeId}`}
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
                          const draggedNode = nodes.find(n => n.id === draggedId);
                          const targetNode = nodes.find(n => n.id === nodeId);
                          if (draggedNode && targetNode && typeof targetNode.data.globalIndex === 'number') {
                            handleUpdateNodeIndex(draggedId, targetNode.data.globalIndex);
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
                              : (isDuplicate ? 'rgba(239, 68, 68, 0.3)' : (keyIndex !== -1 ? 'rgba(250, 204, 21, 0.15)' : (lockIndex !== -1 ? 'rgba(161, 161, 170, 0.15)' : (isBurst ? (burstMovesRemaining <= 3 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)') : (isFrozen ? 'rgba(56, 189, 248, 0.15)' : (isChained ? 'rgba(129, 140, 248, 0.15)' : (isChunk ? 'rgba(99,102,241,0.05)' : 'rgba(255,255,255,0.05)')))))))),
                        border: dragOverNodeId === nodeId 
                            ? '2px dashed var(--accent)' 
                            : (selectedNodeId === nodeId 
                              ? '1px solid var(--accent)' 
                              : (isDuplicate ? '1px solid rgba(239, 68, 68, 0.6)' : (keyIndex !== -1 ? '1px solid rgba(250, 204, 21, 0.4)' : (lockIndex !== -1 ? '1px solid rgba(161, 161, 170, 0.4)' : (isBurst ? (burstMovesRemaining <= 3 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(249, 115, 22, 0.4)') : (isFrozen ? '1px solid rgba(56, 189, 248, 0.4)' : (isChained ? '1px solid rgba(129, 140, 248, 0.4)' : (isChunk ? '1px solid rgba(99,102,241,0.3)' : '1px solid var(--panel-border)')))))))),
                        transform: dragOverNodeId === nodeId ? 'scale(1.02)' : 'none',
                        transition: 'all 0.2s', color: selectedNodeId === nodeId ? 'white' : (isChunk ? '#a5b4fc' : 'var(--text-main)')
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', opacity: 0.6, width: '24px' }}>
                            {`${spawnQueueIds.indexOf(nodeId) + 1}.`}
                          </span>
                          {(!isChunk && node.data.icon) ? (
                            <img src={`/word_icon/${String(node.data.icon)}.png`} alt="" title={`Missing File: ${String(node.data.icon)}.png`} style={{ width: 14, height: 14 }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PC9jaXJjbGU+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48bGluZSB4MT0iMyIgeTE9IjMiIHgyPSIyMSIgeTI9IjIxIj48L2xpbmU+PC9zdmc+'; }} />
                          ) : null}
                          <strong style={{ textTransform: isChunk ? 'none' : 'capitalize' }}>{String(node.data.label)}</strong>
                          {isBurst && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: burstMovesRemaining <= 3 ? '#ef4444' : '#f97316' }}>
                              <Bomb size={12} />
                              <span style={{ fontSize: '10px' }}>{burstMovesRemaining}</span>
                            </div>
                          )}
                          {isFrozen && (
                            <Snowflake size={12} color="#38bdf8" />
                          )}
                          {lockIndex !== -1 && (
                            <Lock size={12} color={lockKeyColors[lockIndex % lockKeyColors.length]} />
                          )}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isPositionLocked: !n.data.isPositionLocked } } : n));
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', display: 'flex', alignItems: 'center', opacity: node.data.isPositionLocked ? 1 : 0.4 }}
                            title="Lock Position"
                          >
                            <Pin size={14} color={node.data.isPositionLocked ? "#ef4444" : "var(--text-main)"} />
                          </button>
                          {keyIndex !== -1 && <Key size={14} color={selectedNodeId === nodeId ? "white" : lockKeyColors[keyIndex % lockKeyColors.length]} />}
                          {lockIndex !== -1 && <Lock size={14} color={selectedNodeId === nodeId ? "white" : lockKeyColors[lockIndex % lockKeyColors.length]} />}
                          {isChained && <Link size={14} color={selectedNodeId === nodeId ? "white" : "#818cf8"} />}
                          {isFrozen && <Snowflake size={14} color={selectedNodeId === nodeId ? "white" : "#38bdf8"} />}
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

        {leftPanelTab === 'category' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>Categories in Level</div>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
              {nodes.filter(n => n.data.isCategory).map(n => (
                <div 
                  key={n.id}
                  onClick={() => handleFocusNode(n.id)}
                  style={{
                    padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                    background: selectedNodeId === n.id ? 'var(--accent)' : 'rgba(0,0,0,0.2)',
                    border: selectedNodeId === n.id ? '1px solid var(--accent)' : '1px solid var(--panel-border)',
                    color: selectedNodeId === n.id ? 'white' : 'var(--text-main)',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  {n.data.icon ? (
                    <img src={`/word_icon/${String(n.data.icon)}.png`} alt="" style={{ width: 16, height: 16 }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  ) : (
                    <div style={{ width: 16, height: 16, borderRadius: '4px', background: 'var(--panel-border)' }} />
                  )}
                  <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{String(n.data.label)}</span>
                </div>
              ))}
              {nodes.filter(n => n.data.isCategory).length === 0 && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>
                  No categories found.
                </div>
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
            isFrozen: isNodeFrozen(n, rawLevelData?.frozenBubbles || [], edges, nodes),
            isBurst: isNodeBurst(n, rawLevelData?.burstBubbles || [], edges, nodes).isBurst,
            burstMovesRemaining: isNodeBurst(n, rawLevelData?.burstBubbles || [], edges, nodes).movesRemaining,
            lockIndex: isNodeLock(n, rawLevelData?.keyLockBubbles || [], edges, nodes),
            keyIndex: isNodeKey(n, rawLevelData?.keyLockBubbles || [], edges, nodes),
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
        
        {/* Floating Action Buttons */}
        <div style={{ position: 'absolute', bottom: '180px', right: '20px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 10 }}>
          <button
            onClick={() => setIsManualModalOpen(true)}
            title="User Manual"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(0,0,0,0.6)',
              color: 'white',
              border: '2px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <HelpCircle size={28} />
          </button>
          
          <button
            onClick={handleAddRoot}
            title="Add New Root Node"
            style={{
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
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <Plus size={28} />
          </button>
        </div>

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
        globalDict={globalDict}
        onClose={() => setIsMagicChangeOpen(false)}
        onExecute={(popularWords, minPopularity, maxPopularity) => {
          setIsMagicChangeOpen(false);
          handleMagicChange(popularWords, minPopularity, maxPopularity);
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
        isSettingsOpen={isSettingsOpen}
      />
    </div>
  );
}
