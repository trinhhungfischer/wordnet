import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Play, ArrowUpDown, ChevronDown, ChevronUp, Loader2, Sparkles, HelpCircle, Layers, CheckCircle2, ShieldAlert, Activity } from 'lucide-react';
import { calculateSolution } from '../lib/solutionCalculator';

interface LevelsDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  levels: string[];
  loadLevel: (levelName: string) => void;
  globalDict: any[];
  onRefreshLevels?: () => void;
}

interface LevelDifficultyData {
  name: string;
  theme: string;
  totalWords: number;
  wordsNotDropped: number;
  rareWords: Array<{ word: string; pop: number; type: 'ultra' | 'very_rare' | 'rare' }>;
  vocab: { score: number; label: string; color: string; factors: string[] };
  move: { score: number; label: string; color: string; factors: string[] };
  learning: { score: number; label: string; color: string; factors: string[] };
  combined: { score: number; label: string; color: string; factors: string[] };
  telemetry?: {
    starts: number;
    wins: number;
    users_attempted: number;
    users_dropped: number;
    churn_rate: number;
    fail_rate: number;
  };
}

export default function LevelsDashboardModal({ isOpen, onClose, levels, loadLevel, globalDict, onRefreshLevels }: LevelsDashboardModalProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [levelDataList, setLevelDataList] = useState<LevelDifficultyData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null);
  
  // Filters
  const [vocabFilter, setVocabFilter] = useState<string>('all');
  const [moveFilter, setMoveFilter] = useState<string>('all');
  const [combinedFilter, setCombinedFilter] = useState<string>('all');
  
  const [sortField, setSortField] = useState<'name' | 'vocab' | 'move' | 'learning' | 'combined'>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Selection inputs
  const [startLevelIdxInput, setStartLevelIdxInput] = useState<number>(0);
  const [endLevelIdxInput, setEndLevelIdxInput] = useState<number>(19);

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Levels directory states
  const [levelsDir, setLevelsDir] = useState<string>('');
  const [levelsDirInput, setLevelsDirInput] = useState<string>('');
  const [savingDir, setSavingDir] = useState<boolean>(false);
  
  const [sliceLength, setSliceLength] = useState<number>(0);

  const [visibleIndices, setVisibleIndices] = useState({
    vocab: true,
    move: true,
    learning: true,
    combined: true,
    realChurn: true,
    realFail: true
  });

  // Directory browser states
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [browserPath, setBrowserPath] = useState('');
  const [browserDirs, setBrowserDirs] = useState<{ name: string; path: string }[]>([]);
  const [browserParent, setBrowserParent] = useState<string | null>(null);
  const [browserError, setBrowserError] = useState('');

  const loadBrowserDir = async (pathStr: string) => {
    setBrowserError('');
    try {
      const res = await fetch(`/api/list-subdirectories?path=${encodeURIComponent(pathStr)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBrowserPath(data.currentPath);
          setBrowserParent(data.parentPath);
          setBrowserDirs(data.subdirectories);
        } else {
          setBrowserError(data.error || 'Failed to read directory');
        }
      } else {
        setBrowserError('Failed to connect to backend server');
      }
    } catch (e) {
      setBrowserError('Network error');
    }
  };

  // Load levels configuration and first 20 levels by default on open
  useEffect(() => {
    if (!isOpen) return;
    
    // Fetch levels directory configuration
    fetch('/api/config-levels')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.levelsDir) {
          setLevelsDir(data.levelsDir);
          setLevelsDirInput(data.levelsDir);
        }
      })
      .catch(console.error);

    if (levels.length > 0) {
      const defaultEnd = Math.min(19, levels.length - 1);
      setStartLevelIdxInput(0);
      setEndLevelIdxInput(defaultEnd);
      fetchAndCalculateRange(0, defaultEnd);
    }
  }, [isOpen, levels, globalDict]);

  const fetchAndCalculateRange = async (startIdx: number, endIdx: number) => {
    if (levels.length === 0) return;
    setLoading(true);
    setProgress(0);
    setLevelDataList([]);
    
    const slice = levels.slice(startIdx, endIdx + 1);
    const total = slice.length;
    setSliceLength(total);

    const levelNums = slice.map(name => {
      const m = name.match(/\d+/);
      return m ? parseInt(m[0]) : null;
    }).filter((x): x is number => x !== null);
    
    const telemetryMap: Record<number, any> = {};
    if (levelNums.length > 0) {
      const minL = Math.min(...levelNums);
      const maxL = Math.max(...levelNums);
      try {
        const telRes = await fetch(`/api/level-telemetry?start=${minL}&end=${maxL}`);
        if (telRes.ok) {
          const telData = await telRes.json();
          if (telData.success && Array.isArray(telData.telemetry)) {
            telData.telemetry.forEach((item: any) => {
              telemetryMap[item.level] = item;
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch telemetry data:', e);
      }
    }
    
    const results: LevelDifficultyData[] = [];
    
    for (let i = 0; i < total; i++) {
      const lvlName = slice[i];
      try {
        const url = `/api/load-level?name=${encodeURIComponent(lvlName)}`;
        const res = await fetch(`${url}&t=${Date.now()}`);
        if (!res.ok) continue;
        const levelData = await res.json();
        
        // Generate Graph Nodes/Edges (similar to GraphEditor.tsx)
        const { nodes, edges } = generateGraph(levelData);
        
        const spawnQueueIds = nodes
          .filter(n => typeof n.data.globalIndex === 'number')
          .sort((a, b) => (a.data.globalIndex as number) - (b.data.globalIndex as number))
          .map(n => n.id);
        
        // Calculate Difficulty
        const solution = calculateSolution(nodes, edges, levelData, spawnQueueIds);
        
        // Identify rare words
        const rareWords: LevelDifficultyData['rareWords'] = [];
        if (levelData.categories) {
          levelData.categories.forEach((cat: any) => {
            if (!cat.words) return;
            cat.words.forEach((w: any) => {
              const pop = getWordPopularity(w.fullWord);
              if (pop !== null) {
                if (pop < 15) {
                  rareWords.push({ word: w.fullWord, pop, type: 'ultra' });
                } else if (pop < 30) {
                  rareWords.push({ word: w.fullWord, pop, type: 'very_rare' });
                } else if (pop < 50) {
                  rareWords.push({ word: w.fullWord, pop, type: 'rare' });
                }
              }
            });
          });
        }
        
        // Count words not dropped
        const wordsNotDropped = Math.max(0, (levelData.allWordEntries?.length || 0) - (levelData.maxBubblesInScene || 20));

        const numMatch = lvlName.match(/\d+/);
        const levelNum = numMatch ? parseInt(numMatch[0]) : null;
        const telemetry = levelNum ? telemetryMap[levelNum] : undefined;

        results.push({
          name: lvlName,
          theme: levelData.theme || 'Untitled Theme',
          totalWords: levelData.allWordEntries?.length || 0,
          wordsNotDropped,
          rareWords,
          vocab: solution.vocabDifficulty,
          move: solution.moveDifficulty,
          learning: solution.learningDifficulty,
          combined: solution.difficulty,
          telemetry
        });
      } catch (err) {
        console.error(`Error loading level ${lvlName}:`, err);
      }
      setProgress(Math.round(((i + 1) / total) * 100));
    }
    
    setLevelDataList(results);
    setLoading(false);
  };

  const getWordPopularity = (word: string) => {
    if (!globalDict || globalDict.length === 0) return null;
    const lowerWord = word.trim().toLowerCase();
    for (const cat of globalDict) {
      if (!cat.words) continue;
      const match = cat.words.find((w: any) => w.word.toLowerCase() === lowerWord);
      if (match) {
        return match.popularity;
      }
    }
    return null;
  };

  const generateGraph = (levelData: any) => {
    const nodes: any[] = [];
    const edges: any[] = [];
    let idCounter = 1;
    const nextId = () => `dashboard-node-${idCounter++}`;
    
    if (!levelData.categories) return { nodes, edges };
    
    const catNodesMap: Record<string, any> = {};
    
    // Pass 1: Create Categories
    levelData.categories.forEach((cat: any) => {
      const catId = nextId();
      const isRoot = !cat.parentCategory;
      const catNode = {
        id: catId,
        type: 'custom',
        position: { x: 0, y: 0 },
        data: { label: cat.category.toLowerCase(), isRoot, isCategory: true, icon: cat.icon }
      };
      catNodesMap[cat.category.toLowerCase()] = catNode;
      nodes.push(catNode);
    });
    
    // Pass 2: Connect nested categories
    levelData.categories.forEach((cat: any) => {
      if (cat.parentCategory) {
        const parentNode = catNodesMap[cat.parentCategory.toLowerCase()];
        const childNode = catNodesMap[cat.category.toLowerCase()];
        if (parentNode && childNode) {
          edges.push({
            id: `e-${parentNode.id}-${childNode.id}`,
            source: parentNode.id,
            target: childNode.id
          });
        }
      }
    });
    
    // Pass 3: Words
    levelData.categories.forEach((cat: any) => {
      const parentCatNode = catNodesMap[cat.category.toLowerCase()];
      if (parentCatNode && cat.words) {
        cat.words.forEach((w: any) => {
          const wordLower = w.fullWord.toLowerCase().trim();
          let wordNode: any;
          if (catNodesMap[wordLower]) {
            wordNode = catNodesMap[wordLower];
          } else {
            let gIndex = undefined;
            if (levelData.allWordEntries && Array.isArray(levelData.allWordEntries)) {
              const arrIdx = levelData.allWordEntries.findIndex((e: any) => e.fullWord.toLowerCase().trim() === wordLower);
              if (arrIdx !== -1) gIndex = arrIdx + 1;
            }

            wordNode = {
              id: nextId(),
              type: 'custom',
              position: { x: 0, y: 0 },
              data: { label: wordLower, isCategory: false, icon: w.icon, globalIndex: gIndex }
            };
            nodes.push(wordNode);
            edges.push({
              id: `e-${parentCatNode.id}-${wordNode.id}`,
              source: parentCatNode.id,
              target: wordNode.id
            });
          }
          
          if (w.chunks && Array.isArray(w.chunks)) {
            w.chunks.forEach((chunkItem: any) => {
              const chunkStr = typeof chunkItem === 'string' ? chunkItem : Object.keys(chunkItem)[0];
              if (!chunkStr) return;
              
              let chunkIndex = undefined;
              if (levelData.allWordEntries && Array.isArray(levelData.allWordEntries)) {
                const arrIdx = levelData.allWordEntries.findIndex((e: any) => e.fullWord.toLowerCase().trim() === chunkStr.toLowerCase().trim() && e.parentWord && String(e.parentWord).toLowerCase().trim() === wordLower);
                if (arrIdx !== -1) chunkIndex = arrIdx + 1;
              }

              const chunkNode = {
                id: nextId(),
                type: 'custom',
                position: { x: 0, y: 0 },
                data: { label: chunkStr.toLowerCase(), isCategory: false, isChunk: true, globalIndex: chunkIndex }
              };
              nodes.push(chunkNode);
              edges.push({
                id: `e-${wordNode.id}-${chunkNode.id}`,
                source: wordNode.id,
                target: chunkNode.id
              });
            });
          }
        });
      }
    });
    
    return { nodes, edges };
  };

  const stats = useMemo(() => {
    if (levelDataList.length === 0) return { total: 0, avgVocab: 0, avgMove: 0, avgLearning: 0, easyCount: 0, medCount: 0, hardCount: 0, expCount: 0 };
    
    let sumVocab = 0;
    let sumMove = 0;
    let sumLearning = 0;
    let easyCount = 0;
    let medCount = 0;
    let hardCount = 0;
    let expCount = 0;

    levelDataList.forEach(item => {
      sumVocab += item.vocab.score;
      sumMove += item.move.score;
      if (item.learning) {
        sumLearning += item.learning.score;
      }
      
      const label = item.combined.label;
      if (label === 'Easy') easyCount++;
      else if (label === 'Medium') medCount++;
      else if (label === 'Hard') hardCount++;
      else if (label === 'Expert') expCount++;
    });

    return {
      total: levelDataList.length,
      avgVocab: Math.round((sumVocab / levelDataList.length) * 10) / 10,
      avgMove: Math.round((sumMove / levelDataList.length) * 10) / 10,
      avgLearning: Math.round((sumLearning / levelDataList.length) * 10) / 10,
      easyCount,
      medCount,
      hardCount,
      expCount
    };
  }, [levelDataList]);

  const filteredAndSortedList = useMemo(() => {
    let list = [...levelDataList];

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        item.name.toLowerCase().includes(q) || 
        item.theme.toLowerCase().includes(q)
      );
    }

    // Dropdown filters
    if (vocabFilter !== 'all') {
      list = list.filter(item => item.vocab.label.toLowerCase() === vocabFilter.toLowerCase());
    }
    if (moveFilter !== 'all') {
      list = list.filter(item => item.move.label.toLowerCase() === moveFilter.toLowerCase());
    }
    if (combinedFilter !== 'all') {
      list = list.filter(item => item.combined.label.toLowerCase() === combinedFilter.toLowerCase());
    }

    // Sort
    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'vocab') {
        comparison = a.vocab.score - b.vocab.score;
      } else if (sortField === 'move') {
        comparison = a.move.score - b.move.score;
      } else if (sortField === 'learning') {
        comparison = (a.learning?.score || 0) - (b.learning?.score || 0);
      } else if (sortField === 'combined') {
        comparison = a.combined.score - b.combined.score;
      }
      return sortAsc ? comparison : -comparison;
    });

    return list;
  }, [levelDataList, searchQuery, vocabFilter, moveFilter, combinedFilter, sortField, sortAsc]);

  const toggleSort = (field: 'name' | 'vocab' | 'move' | 'learning' | 'combined') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Sorted chronologically by name for chart display
  const sortedForChart = useMemo(() => {
    return [...levelDataList].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
  }, [levelDataList]);

  const visibleList = useMemo(() => {
    return sortedForChart;
  }, [sortedForChart]);

  // Chart coordinate helpers
  const chartWidth = 900;
  const chartHeight = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 25;

  const xScale = (idx: number) => {
    const n = visibleList.length;
    if (n <= 1) return paddingLeft;
    return paddingLeft + (idx / (n - 1)) * (chartWidth - paddingLeft - paddingRight);
  };

  const yMax = useMemo(() => {
    let max = 10;
    if (visibleList.length === 0) return 100;
    
    visibleList.forEach(item => {
      if (visibleIndices.vocab && item.vocab.score > max) max = item.vocab.score;
      if (visibleIndices.move && item.move.score > max) max = item.move.score;
      if (visibleIndices.learning && (item.learning?.score || 0) > max) max = item.learning.score;
      if (visibleIndices.combined && item.combined.score > max) max = item.combined.score;
      if (visibleIndices.realChurn && item.telemetry && item.telemetry.churn_rate > max) max = item.telemetry.churn_rate;
      if (visibleIndices.realFail && item.telemetry && item.telemetry.fail_rate > max) max = item.telemetry.fail_rate;
    });
    
    return Math.ceil(max / 10) * 10;
  }, [visibleList, visibleIndices]);

  const yScale = (score: number) => {
    return chartHeight - paddingBottom - (score / yMax) * (chartHeight - paddingTop - paddingBottom);
  };

  const { pointsVocab, pointsMove, pointsLearning, pointsCombined, pointsRealChurn, pointsRealFail } = useMemo(() => {
    let pVocab = '';
    let pMove = '';
    let pLearning = '';
    let pCombined = '';
    let pRealChurn = '';
    let pRealFail = '';

    visibleList.forEach((lvl, idx) => {
      const x = xScale(idx);
      pVocab += `${x},${yScale(lvl.vocab.score)} `;
      pMove += `${x},${yScale(lvl.move.score)} `;
      pLearning += `${x},${yScale(lvl.learning?.score || 0)} `;
      pCombined += `${x},${yScale(lvl.combined.score)} `;
      if (lvl.telemetry) {
        pRealChurn += `${x},${yScale(lvl.telemetry.churn_rate)} `;
        pRealFail += `${x},${yScale(lvl.telemetry.fail_rate)} `;
      }
    });

    return {
      pointsVocab: pVocab.trim(),
      pointsMove: pMove.trim(),
      pointsLearning: pLearning.trim(),
      pointsCombined: pCombined.trim(),
      pointsRealChurn: pRealChurn.trim(),
      pointsRealFail: pRealFail.trim()
    };
  }, [visibleList, yMax]);

  const getRareWordBadge = (type: 'ultra' | 'very_rare' | 'rare') => {
    switch (type) {
      case 'ultra': return { text: 'Ultra Rare', bg: 'rgba(239, 68, 68, 0.15)', color: '#f87171' };
      case 'very_rare': return { text: 'Very Rare', bg: 'rgba(249, 115, 22, 0.15)', color: '#fb923c' };
      case 'rare': return { text: 'Rare', bg: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' };
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(8, 10, 18, 0.85)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px'
    }}>
      <div style={{
        background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '16px', width: '100%', maxWidth: '1200px', height: '100%', maxHeight: '85vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)'
        }}>
          <div>
            <h2 style={{ color: 'white', margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers className="text-indigo-400" size={24} />
              Levels Difficulty Dashboard
              {levelsDir && (
                <span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '12px', background: 'rgba(99,102,241,0.2)', color: 'var(--accent)', fontWeight: 500 }}>
                  Folder: {levelsDir}
                </span>
              )}
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', margin: '4px 0 0 0', fontSize: '13px' }}>
              Overview and detailed calibration metrics for all game levels.
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)',
              borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Levels Directory Config Bar */}
        <div style={{
          padding: '12px 24px', background: 'rgba(0,0,0,0.15)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap' }}>
              Levels Directory Path:
            </span>
            <input 
              type="text" 
              value={levelsDirInput}
              onChange={e => setLevelsDirInput(e.target.value)}
              placeholder="e.g. public/levels or F:/_Projects/thp-023/Assets/Levels"
              style={{
                flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px', padding: '6px 12px', color: 'white', fontSize: '13px',
                outline: 'none', transition: 'border-color 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
            />
            <button
              onClick={() => {
                setIsBrowserOpen(true);
                loadBrowserDir(levelsDirInput || '');
              }}
              style={{
                marginLeft: '8px',
                padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontWeight: 500,
                fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              Browse...
            </button>
          </div>
          <button
            onClick={async () => {
              if (!levelsDirInput.trim()) return;
              setSavingDir(true);
              try {
                const res = await fetch('/api/config-levels', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ levelsDir: levelsDirInput.trim() })
                });
                if (res.ok) {
                  const data = await res.json();
                  setLevelsDir(data.levelsDir);
                  alert('Đã cập nhật thư mục levels thành công!');
                  if (onRefreshLevels) {
                    onRefreshLevels();
                  }
                } else {
                  alert('Lỗi khi cập nhật thư mục levels.');
                }
              } catch (e) {
                console.error(e);
                alert('Lỗi kết nối.');
              } finally {
                setSavingDir(false);
              }
            }}
            disabled={savingDir || levelsDir === levelsDirInput}
            style={{
              padding: '6px 16px', borderRadius: '6px', background: levelsDir === levelsDirInput ? 'rgba(255,255,255,0.05)' : 'var(--accent)',
              color: levelsDir === levelsDirInput ? 'rgba(255,255,255,0.3)' : 'white', border: 'none',
              fontWeight: 600, fontSize: '13px', cursor: levelsDir === levelsDirInput ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            {savingDir ? <Loader2 className="animate-spin" size={14} /> : 'Save Directory'}
          </button>
        </div>

        {/* Loading Spinner */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px' }}>
            <Loader2 className="animate-spin text-indigo-500" size={48} />
            <div style={{ color: 'white', fontSize: '16px', fontWeight: 500 }}>
              Calculating level configurations...
            </div>
            <div style={{ width: '300px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.1s ease-out' }} />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>
              {progress}% completed ({Math.round(sliceLength * (progress / 100))} / {sliceLength})
            </div>
          </div>
        ) : (
          <>
            {/* Summary Row */}
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '16px',
              padding: '20px 24px', background: 'rgba(255, 255, 255, 0.02)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Levels</div>
                <div style={{ color: 'white', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{stats.total}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Vocab Difficulty</div>
                <div style={{ color: '#60a5fa', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{stats.avgVocab}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Moves Difficulty</div>
                <div style={{ color: '#a78bfa', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{stats.avgMove}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Avg Learning Curve</div>
                <div style={{ color: '#fb7185', fontSize: '24px', fontWeight: 'bold', marginTop: '4px' }}>{stats.avgLearning}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', gridColumn: 'span 2' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Difficulty Distribution</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '8px' }}>Easy: {stats.easyCount}</span>
                  <span style={{ fontSize: '12px', color: '#eab308', background: 'rgba(234, 179, 8, 0.1)', padding: '2px 8px', borderRadius: '8px' }}>Med: {stats.medCount}</span>
                  <span style={{ fontSize: '12px', color: '#f97316', background: 'rgba(249, 115, 22, 0.1)', padding: '2px 8px', borderRadius: '8px' }}>Hard: {stats.hardCount}</span>
                  <span style={{ fontSize: '12px', color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '8px' }}>Exp: {stats.expCount}</span>
                </div>
              </div>
            </div>

            {/* Interactive Difficulty Curves Chart */}
            <div style={{
              display: 'flex', gap: '20px', padding: '16px 24px',
              background: 'rgba(255, 255, 255, 0.01)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
              alignItems: 'stretch'
            }}>
              {/* Controls & Level Inspector Panel */}
              <div style={{ width: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ color: 'white', fontSize: '13px', fontWeight: 600 }}>Interactive Chart Range</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>From</label>
                    <select
                      value={startLevelIdxInput}
                      onChange={e => setStartLevelIdxInput(Number(e.target.value))}
                      style={{
                        width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                        padding: '4px 6px', fontSize: '12px', outline: 'none'
                      }}
                    >
                      {levels.map((lvl, idx) => (
                        <option key={idx} value={idx} disabled={idx > endLevelIdxInput}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>To</label>
                    <select
                      value={endLevelIdxInput}
                      onChange={e => setEndLevelIdxInput(Number(e.target.value))}
                      style={{
                        width: '100%', background: 'rgba(0,0,0,0.3)', color: 'white',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                        padding: '4px 6px', fontSize: '12px', outline: 'none'
                      }}
                    >
                      {levels.map((lvl, idx) => (
                        <option key={idx} value={idx} disabled={idx < startLevelIdxInput}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => fetchAndCalculateRange(startLevelIdxInput, endLevelIdxInput)}
                  disabled={loading || levels.length === 0}
                  style={{
                    width: '100%', padding: '6px 12px', borderRadius: '6px',
                    background: 'var(--accent)', color: 'white', border: 'none',
                    fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                  }}
                >
                  {loading ? <Loader2 className="animate-spin" size={14} /> : 'Apply & Load Range'}
                </button>

                {/* Visibility Toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>Toggle Metrics:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <button
                      onClick={() => setVisibleIndices(v => ({ ...v, vocab: !v.vocab }))}
                      style={{
                        padding: '4px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #60a5fa',
                        background: visibleIndices.vocab ? 'rgba(96,165,250,0.15)' : 'transparent',
                        color: visibleIndices.vocab ? '#60a5fa' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
                      }}
                    >
                      Vocab
                    </button>
                    <button
                      onClick={() => setVisibleIndices(v => ({ ...v, move: !v.move }))}
                      style={{
                        padding: '4px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #a78bfa',
                        background: visibleIndices.move ? 'rgba(167,139,250,0.15)' : 'transparent',
                        color: visibleIndices.move ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
                      }}
                    >
                      Moves
                    </button>
                    <button
                      onClick={() => setVisibleIndices(v => ({ ...v, learning: !v.learning }))}
                      style={{
                        padding: '4px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #fb7185',
                        background: visibleIndices.learning ? 'rgba(251,113,133,0.15)' : 'transparent',
                        color: visibleIndices.learning ? '#fb7185' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
                      }}
                    >
                      Learning
                    </button>
                    <button
                      onClick={() => setVisibleIndices(v => ({ ...v, combined: !v.combined }))}
                      style={{
                        padding: '4px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #34d399',
                        background: visibleIndices.combined ? 'rgba(52,211,153,0.15)' : 'transparent',
                        color: visibleIndices.combined ? '#34d399' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
                      }}
                    >
                      Combined
                    </button>
                    <button
                      onClick={() => setVisibleIndices(v => ({ ...v, realChurn: !v.realChurn }))}
                      style={{
                        padding: '4px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #f59e0b',
                        background: visibleIndices.realChurn ? 'rgba(245,158,11,0.15)' : 'transparent',
                        color: visibleIndices.realChurn ? '#f59e0b' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
                      }}
                    >
                      Real Churn
                    </button>
                    <button
                      onClick={() => setVisibleIndices(v => ({ ...v, realFail: !v.realFail }))}
                      style={{
                        padding: '4px 6px', borderRadius: '4px', fontSize: '11px', border: '1px solid #ec4899',
                        background: visibleIndices.realFail ? 'rgba(236,72,153,0.15)' : 'transparent',
                        color: visibleIndices.realFail ? '#ec4899' : 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', transition: 'all 0.2s', fontWeight: 500
                      }}
                    >
                      Real Fail
                    </button>
                  </div>
                </div>

                {/* Level Detail Inspector */}
                <div style={{
                  background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '8px', padding: '10px', flex: 1, display: 'flex', flexDirection: 'column',
                  justifyContent: 'center', minHeight: '80px'
                }}>
                  {hoveredIdx !== null && visibleList[hoveredIdx] ? (
                    (() => {
                      const hLvl = visibleList[hoveredIdx];
                      return (
                        <>
                          <div style={{ color: 'white', fontSize: '12px', fontWeight: 600, marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {hLvl.name}: {hLvl.theme}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                              <span style={{ color: '#60a5fa' }}>Vocab:</span>
                              <span style={{ color: hLvl.vocab.color, fontWeight: 'bold' }}>{hLvl.vocab.score}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                              <span style={{ color: '#a78bfa' }}>Moves:</span>
                              <span style={{ color: hLvl.move.color, fontWeight: 'bold' }}>{hLvl.move.score}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                              <span style={{ color: '#fb7185' }}>Learning:</span>
                              <span style={{ color: hLvl.learning?.color || '#fff', fontWeight: 'bold' }}>{hLvl.learning?.score ?? 0}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '4px' }}>
                              <span style={{ color: '#34d399', fontWeight: 600 }}>Combined:</span>
                              <span style={{ color: hLvl.combined.color, fontWeight: 'bold' }}>{hLvl.combined.score}</span>
                            </div>
                            {hLvl.telemetry ? (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                  <span style={{ color: '#f59e0b' }}>Real Churn:</span>
                                  <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{hLvl.telemetry.churn_rate}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                  <span style={{ color: '#ec4899' }}>Real Fail:</span>
                                  <span style={{ color: '#ec4899', fontWeight: 'bold' }}>{hLvl.telemetry.fail_rate}%</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                  <span>Starts (CH):</span>
                                  <span>{hLvl.telemetry.starts.toLocaleString()}</span>
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic', textAlign: 'center', marginTop: '4px' }}>
                                No ClickHouse telemetry
                              </div>
                            )}
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', textAlign: 'center', fontStyle: 'italic' }}>
                      Hover over chart points to inspect details
                    </div>
                  )}
                </div>
              </div>

              {/* Chart Plot Area */}
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                {visibleList.length > 0 ? (
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    style={{ width: '100%', height: '100%', display: 'block' }}
                  >
                    {/* Y Axis Grid lines */}
                    {Array.from({ length: 5 }, (_, i) => Math.round((yMax / 4) * i)).map((yVal, i) => {
                      const y = yScale(yVal);
                      return (
                        <g key={i}>
                          <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="3,3" />
                          <text x={paddingLeft - 8} y={y + 4} fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end">{yVal}</text>
                        </g>
                      );
                    })}

                    {/* Level X Labels */}
                    {visibleList.map((lvl, idx) => {
                      const x = xScale(idx);
                      // Skip some labels if too crowded
                      const skipLabel = visibleList.length > 15 && idx % 2 !== 0 && idx !== visibleList.length - 1;
                      return (
                        <g key={idx}>
                          {!skipLabel && (
                            <text x={x} y={chartHeight - 8} fill="rgba(255,255,255,0.4)" fontSize="9" textAnchor="middle">{lvl.name}</text>
                          )}
                          <line x1={x} y1={chartHeight - paddingBottom} x2={x} y2={chartHeight - paddingBottom + 3} stroke="rgba(255,255,255,0.15)" />
                        </g>
                      );
                    })}

                    {/* Hover indicator vertical line */}
                    {hoveredIdx !== null && (
                      <line
                        x1={xScale(hoveredIdx)}
                        y1={paddingTop}
                        x2={xScale(hoveredIdx)}
                        y2={chartHeight - paddingBottom}
                        stroke="rgba(255,255,255,0.15)"
                      />
                    )}

                    {/* Line paths */}
                    {visibleIndices.vocab && pointsVocab && <polyline points={pointsVocab} fill="none" stroke="#60a5fa" strokeWidth="2" />}
                    {visibleIndices.move && pointsMove && <polyline points={pointsMove} fill="none" stroke="#a78bfa" strokeWidth="2" />}
                    {visibleIndices.learning && pointsLearning && <polyline points={pointsLearning} fill="none" stroke="#fb7185" strokeWidth="2" strokeDasharray="3,3" />}
                    {visibleIndices.combined && pointsCombined && <polyline points={pointsCombined} fill="none" stroke="#34d399" strokeWidth="3" />}
                    {visibleIndices.realChurn && pointsRealChurn && <polyline points={pointsRealChurn} fill="none" stroke="#f59e0b" strokeWidth="2" />}
                    {visibleIndices.realFail && pointsRealFail && <polyline points={pointsRealFail} fill="none" stroke="#ec4899" strokeWidth="2" />}

                    {/* Hover trigger rectangles */}
                    {visibleList.map((_, idx) => {
                      const x = xScale(idx);
                      const colWidth = (chartWidth - paddingLeft - paddingRight) / Math.max(1, visibleList.length - 1);
                      return (
                        <rect
                          key={idx}
                          x={x - colWidth / 2}
                          y={paddingTop}
                          width={colWidth}
                          height={chartHeight - paddingTop - paddingBottom}
                          fill="transparent"
                          style={{ cursor: 'pointer' }}
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                        />
                      );
                    })}

                    {/* Circular points for hovered item */}
                    {hoveredIdx !== null && visibleList[hoveredIdx] && (
                      (() => {
                        const hLvl = visibleList[hoveredIdx];
                        const x = xScale(hoveredIdx);
                        return (
                          <g>
                            {visibleIndices.vocab && <circle cx={x} cy={yScale(hLvl.vocab.score)} r="4" fill="#60a5fa" stroke="white" strokeWidth="1" />}
                            {visibleIndices.move && <circle cx={x} cy={yScale(hLvl.move.score)} r="4" fill="#a78bfa" stroke="white" strokeWidth="1" />}
                            {visibleIndices.learning && <circle cx={x} cy={yScale(hLvl.learning?.score || 0)} r="4" fill="#fb7185" stroke="white" strokeWidth="1" />}
                            {visibleIndices.combined && <circle cx={x} cy={yScale(hLvl.combined.score)} r="5.5" fill="#34d399" stroke="white" strokeWidth="1.5" />}
                            {visibleIndices.realChurn && hLvl.telemetry && <circle cx={x} cy={yScale(hLvl.telemetry.churn_rate)} r="4" fill="#f59e0b" stroke="white" strokeWidth="1" />}
                            {visibleIndices.realFail && hLvl.telemetry && <circle cx={x} cy={yScale(hLvl.telemetry.fail_rate)} r="4" fill="#ec4899" stroke="white" strokeWidth="1" />}
                          </g>
                        );
                      })()
                    )}
                  </svg>
                ) : (
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', width: '100%' }}>
                    No levels available in this range.
                  </div>
                )}

                {/* Legend panel */}
                <div style={{
                  position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '10px',
                  background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.08)',
                  padding: '3px 8px', borderRadius: '6px', fontSize: '9px'
                }}>
                  {visibleIndices.vocab && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#60a5fa' }}><span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#60a5fa' }}></span>Vocab</span>}
                  {visibleIndices.move && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#a78bfa' }}><span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#a78bfa' }}></span>Moves</span>}
                  {visibleIndices.learning && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#fb7185' }}><span style={{ display: 'inline-block', width: '5px', height: '2.5px', background: '#fb7185' }}></span>Learning</span>}
                  {visibleIndices.combined && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#34d399' }}><span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#34d399' }}></span>Combined</span>}
                  {visibleIndices.realChurn && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b' }}><span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#f59e0b' }}></span>Real Churn</span>}
                  {visibleIndices.realFail && <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#ec4899' }}><span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', background: '#ec4899' }}></span>Real Fail</span>}
                </div>
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{
              display: 'flex', gap: '12px', padding: '16px 24px', alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              {/* Search */}
              <div style={{ position: 'relative', flex: 1 }}>
                <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} size={16} />
                <input 
                  type="text" 
                  placeholder="Search level or theme name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%', padding: '8px 12px 8px 34px', background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white',
                    fontSize: '13px', outline: 'none'
                  }}
                />
              </div>

              {/* Vocab Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Vocab:</span>
                <select
                  value={vocabFilter}
                  onChange={e => setVocabFilter(e.target.value)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', outline: 'none'
                  }}
                >
                  <option value="all">All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              {/* Move Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Moves:</span>
                <select
                  value={moveFilter}
                  onChange={e => setMoveFilter(e.target.value)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', outline: 'none'
                  }}
                >
                  <option value="all">All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>

              {/* Combined Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>Combined:</span>
                <select
                  value={combinedFilter}
                  onChange={e => setCombinedFilter(e.target.value)}
                  style={{
                    background: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', outline: 'none'
                  }}
                >
                  <option value="all">All</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            {/* Level Grid / Table */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid rgba(255,255,255,0.08)' }}>
                    <th 
                      onClick={() => toggleSort('name')}
                      style={{ padding: '12px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        Level Name {sortField === 'name' ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} />}
                      </div>
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600 }}>Theme</th>
                    <th style={{ padding: '12px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600 }}>Words (Queue)</th>
                    <th 
                      onClick={() => toggleSort('vocab')}
                      style={{ padding: '12px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        Vocab Diff {sortField === 'vocab' ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} />}
                      </div>
                    </th>
                    <th 
                      onClick={() => toggleSort('move')}
                      style={{ padding: '12px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        Moves Diff {sortField === 'move' ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} />}
                      </div>
                    </th>
                    <th 
                      onClick={() => toggleSort('learning')}
                      style={{ padding: '12px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        Learning Curve {sortField === 'learning' ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} />}
                      </div>
                    </th>
                    <th 
                      onClick={() => toggleSort('combined')}
                      style={{ padding: '12px 8px', textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        Combined {sortField === 'combined' ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ArrowUpDown size={12} />}
                      </div>
                    </th>
                    <th style={{ padding: '12px 8px', textAlign: 'right', color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedList.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
                        No levels match your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedList.map((lvl) => {
                      const isExpanded = expandedLevel === lvl.name;
                      
                      return (
                        <React.Fragment key={lvl.name}>
                          <tr 
                            style={{ 
                              borderBottom: '1px solid rgba(255,255,255,0.04)', 
                              cursor: 'pointer',
                              background: isExpanded ? 'rgba(255,255,255,0.02)' : 'transparent'
                            }}
                            onClick={() => setExpandedLevel(isExpanded ? null : lvl.name)}
                          >
                            <td style={{ padding: '14px 8px', color: 'white', fontWeight: 600, fontSize: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                                {lvl.name}
                              </div>
                            </td>
                            <td style={{ padding: '14px 8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
                              {lvl.theme}
                            </td>
                            <td style={{ padding: '14px 8px', color: 'white', textAlign: 'center', fontSize: '13px' }}>
                              {lvl.totalWords} <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>({lvl.wordsNotDropped})</span>
                            </td>
                            <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                              <span style={{
                                background: `${lvl.vocab.color}20`,
                                color: lvl.vocab.color,
                                border: `1px solid ${lvl.vocab.color}40`,
                                padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500
                              }}>
                                {lvl.vocab.label} ({lvl.vocab.score})
                              </span>
                            </td>
                            <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                              <span style={{
                                background: `${lvl.move.color}20`,
                                color: lvl.move.color,
                                border: `1px solid ${lvl.move.color}40`,
                                padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500
                              }}>
                                {lvl.move.label} ({lvl.move.score})
                              </span>
                            </td>
                            <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                              <span style={{
                                background: `${lvl.learning?.color || '#fff'}20`,
                                color: lvl.learning?.color || '#fff',
                                border: `1px solid ${lvl.learning?.color || '#fff'}40`,
                                padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500
                              }}>
                                {lvl.learning?.label || 'N/A'} ({lvl.learning?.score ?? 0})
                              </span>
                            </td>
                            <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                              <span style={{
                                background: `${lvl.combined.color}20`,
                                color: lvl.combined.color,
                                border: `1px solid ${lvl.combined.color}40`,
                                padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 500
                              }}>
                                {lvl.combined.label} ({lvl.combined.score})
                              </span>
                            </td>
                            <td style={{ padding: '14px 8px', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                              <button
                                onClick={() => {
                                  loadLevel(lvl.name);
                                  onClose();
                                }}
                                style={{
                                  background: 'var(--accent)', color: 'white', border: 'none',
                                  padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px'
                                }}
                              >
                                <Play size={12} fill="white" />
                                Edit
                              </button>
                            </td>
                          </tr>
                          
                          {/* Expanded detail row */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} style={{ background: 'rgba(0,0,0,0.15)', padding: '16px 24px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
                                  
                                  {/* Vocab Factors & Rare Words */}
                                  <div>
                                    <h4 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Sparkles size={14} className="text-blue-400" />
                                      Vocabulary Calibration
                                    </h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                      {lvl.vocab.factors.map((f, idx) => (
                                        <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                          {f}
                                        </span>
                                      ))}
                                    </div>
                                    
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                                      Rare Words Detected ({lvl.rareWords.length}):
                                    </div>
                                    {lvl.rareWords.length === 0 ? (
                                      <div style={{ color: '#22c55e', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CheckCircle2 size={12} /> Excellent! No rare/unpopular words in this level.
                                      </div>
                                    ) : (
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                        {lvl.rareWords.map((rw, idx) => {
                                          const badge = getRareWordBadge(rw.type);
                                          return (
                                            <span key={idx} style={{
                                              background: badge?.bg, color: badge?.color,
                                              border: `1px solid ${badge?.color}30`,
                                              padding: '2px 8px', borderRadius: '4px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                                            }}>
                                              {rw.type === 'ultra' && <ShieldAlert size={10} />}
                                              {rw.word} ({rw.pop})
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  {/* Moves Factors */}
                                  <div>
                                    <h4 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <HelpCircle size={14} className="text-purple-400" />
                                      Puzzle / Moves Calibration
                                    </h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                      {lvl.move.factors.map((f, idx) => (
                                        <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                          {f}
                                        </span>
                                      ))}
                                    </div>
                                    
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                                      Learning / Education Curve:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                      {(lvl.learning?.factors || []).map((f, idx) => (
                                        <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                          {f}
                                        </span>
                                      ))}
                                    </div>

                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
                                      Combined Difficulty calculation:
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {lvl.combined.factors.map((f, idx) => (
                                        <span key={idx} style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' }}>
                                          {f}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  {/* ClickHouse Telemetry */}
                                  <div>
                                    <h4 style={{ color: 'white', margin: '0 0 8px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Activity size={14} className="text-amber-400" />
                                      ClickHouse Telemetry Stats
                                    </h4>
                                    {lvl.telemetry ? (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Total Starts</div>
                                            <div style={{ fontSize: '13px', color: 'white', fontWeight: 'bold' }}>{lvl.telemetry.starts.toLocaleString()}</div>
                                          </div>
                                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Total Wins</div>
                                            <div style={{ fontSize: '13px', color: '#22c55e', fontWeight: 'bold' }}>{lvl.telemetry.wins.toLocaleString()}</div>
                                          </div>
                                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Unique Users</div>
                                            <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: 'bold' }}>{lvl.telemetry.users_attempted.toLocaleString()}</div>
                                          </div>
                                          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', textAlign: 'center' }}>
                                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginBottom: '2px' }}>Users Churned</div>
                                            <div style={{ fontSize: '13px', color: '#ef4444', fontWeight: 'bold' }}>{lvl.telemetry.users_dropped.toLocaleString()}</div>
                                          </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '4px' }}>
                                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>Real Churn Rate:</span>
                                          <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>{lvl.telemetry.churn_rate}%</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                          <span style={{ color: '#ec4899', fontWeight: 600 }}>Real Fail Rate:</span>
                                          <span style={{ color: '#ec4899', fontWeight: 'bold' }}>{lvl.telemetry.fail_rate}%</span>
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.1)', padding: '12px', borderRadius: '6px' }}>
                                        <HelpCircle size={14} /> Telemetry data not available.
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.2)'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.15)',
              padding: '8px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          >
            Close Dashboard
          </button>
        </div>
      </div>

      {isBrowserOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1100
        }}>
          <div className="glass-panel" style={{
            width: '500px', height: '450px', borderRadius: '16px',
            display: 'flex', flexDirection: 'column', padding: '20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)',
            background: '#1e293b'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, fontSize: '15px', color: 'white' }}>Select Levels Directory</div>
              <button 
                onClick={() => setIsBrowserOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Path Breadcrumb & Navigation */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
              <button
                disabled={!browserParent}
                onClick={() => browserParent && loadBrowserDir(browserParent)}
                style={{
                  padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', color: browserParent ? 'white' : 'rgba(255,255,255,0.2)',
                  fontSize: '11px', cursor: browserParent ? 'pointer' : 'default'
                }}
              >
                ⬆ Up
              </button>
              <div style={{
                flex: 1, background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '6px',
                fontSize: '12px', color: '#60a5fa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                {browserPath || 'Loading...'}
              </div>
            </div>

            {/* Subdirectories List */}
            <div style={{
              flex: 1, background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '8px', overflowY: 'auto', padding: '6px', marginBottom: '16px',
              display: 'flex', flexDirection: 'column', gap: '2px'
            }}>
              {browserError ? (
                <div style={{ color: '#fb7185', fontSize: '12px', padding: '12px', textAlign: 'center' }}>
                  {browserError}
                </div>
              ) : browserDirs.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', padding: '12px', textAlign: 'center', fontStyle: 'italic' }}>
                  No subdirectories found
                </div>
              ) : (
                browserDirs.map((dir, idx) => (
                  <div
                    key={idx}
                    onClick={() => loadBrowserDir(dir.path)}
                    style={{
                      padding: '8px 12px', borderRadius: '6px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.85)',
                      fontSize: '12px', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>📁</span>
                    <span>{dir.name}</span>
                  </div>
                ))
              )}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsBrowserOpen(false)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
                  fontSize: '13px', cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                disabled={browserPath === 'DRIVES'}
                onClick={() => {
                  setLevelsDirInput(browserPath);
                  setIsBrowserOpen(false);
                }}
                style={{
                  padding: '6px 16px', borderRadius: '6px', background: 'var(--accent)',
                  color: 'white', border: 'none', fontWeight: 600, fontSize: '13px',
                  cursor: browserPath === 'DRIVES' ? 'default' : 'pointer', opacity: browserPath === 'DRIVES' ? 0.5 : 1
                }}
              >
                Select Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
