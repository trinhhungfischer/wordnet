import { useState, useEffect, useMemo } from 'react';
import { 
  X, Search, Play, Loader2, Layers, CheckCircle2, Activity, AlertTriangle, 
  TrendingUp, RefreshCw, BarChart2, Info
} from 'lucide-react';
import { calculateSolution } from '../lib/solutionCalculator';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  levels: string[];
  loadLevel: (levelName: string) => void;
  globalDict: any[];
}

interface LevelDifficultyData {
  name: string;
  theme: string;
  totalWords: number;
  wordsNotDropped: number;
  moveLimit?: number;
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
    reward_ads?: number;
    avg_ads_per_user?: number;
  };
}

export default function AnalyticsDashboard({ isOpen, onClose, levels, loadLevel, globalDict: _globalDict }: AnalyticsDashboardProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [levelDataList, setLevelDataList] = useState<LevelDifficultyData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active Tab: overview (charts), outliers (bottlenecks), table (detailed listing)
  const [activeTab, setActiveTab] = useState<'overview' | 'outliers' | 'table'>('overview');

  // Interactive slider/range settings
  const [startLevelInput, setStartLevelInput] = useState<number>(100);
  const [endLevelInput, setEndLevelInput] = useState<number>(200);
  
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [chartMetric, setChartMetric] = useState<'avg_ads_per_user' | 'fail_rate' | 'churn_rate'>('avg_ads_per_user');

  // Natural sort helper
  const sortedLevelNames = useMemo(() => {
    return [...levels].sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [levels]);

  // Handle initialization and range loading
  useEffect(() => {
    if (!isOpen) return;
    
    // Auto-detect best defaults based on available levels
    if (levels.length > 0) {
      const numbers = levels.map(name => {
        const match = name.match(/\d+/);
        return match ? parseInt(match[0]) : 0;
      }).filter(n => n > 0);
      
      const minVal = numbers.length > 0 ? Math.min(...numbers) : 1;
      const maxVal = numbers.length > 0 ? Math.max(...numbers) : 100;
      
      // Default to 100-200 if available, otherwise full range
      if (maxVal >= 200 && minVal <= 100) {
        setStartLevelInput(100);
        setEndLevelInput(Math.min(200, maxVal));
        fetchAndProcessRange(100, Math.min(200, maxVal));
      } else {
        setStartLevelInput(minVal);
        setEndLevelInput(maxVal);
        fetchAndProcessRange(minVal, maxVal);
      }
    }
  }, [isOpen, levels]);

  const fetchAndProcessRange = async (start: number, end: number) => {
    if (levels.length === 0) return;
    setLoading(true);
    setProgress(0);
    setLevelDataList([]);

    // Filter level names that fall within start and end range numerically
    const targetLevels = sortedLevelNames.filter(name => {
      const match = name.match(/\d+/);
      if (!match) return false;
      const val = parseInt(match[0]);
      return val >= start && val <= end;
    });

    if (targetLevels.length === 0) {
      setLoading(false);
      return;
    }

    // 1. Fetch ClickHouse Telemetry
    const telemetryMap: Record<number, any> = {};
    try {
      const telRes = await fetch(`/api/level-telemetry?start=${start}&end=${end}`);
      if (telRes.ok) {
        const telData = await telRes.json();
        if (telData.success && Array.isArray(telData.telemetry)) {
          telData.telemetry.forEach((item: any) => {
            telemetryMap[item.level] = item;
          });
        }
      }
    } catch (e) {
      console.error('Failed to fetch telemetry details:', e);
    }

    // 2. Fetch Level Files in Batch
    let levelConfigs: Record<string, any> = {};
    try {
      const batchRes = await fetch(`/api/load-levels-batch?names=${encodeURIComponent(targetLevels.join(','))}`);
      if (batchRes.ok) {
        const batchData = await batchRes.json();
        if (batchData.success) {
          levelConfigs = batchData.levels;
        }
      }
    } catch (e) {
      console.error('Failed to batch load levels:', e);
    }

    // 3. Process and Calculate Solution Difficulty
    const results: LevelDifficultyData[] = [];
    const total = targetLevels.length;

    for (let i = 0; i < total; i++) {
      const lvlName = targetLevels[i];
      const levelData = levelConfigs[lvlName];
      if (!levelData) continue;

      try {
        // Generate Graph Nodes/Edges (same logic as main editor)
        const { nodes, edges } = generateGraph(levelData);
        
        const spawnQueueIds = nodes
          .filter(n => typeof n.data.globalIndex === 'number')
          .sort((a, b) => (a.data.globalIndex as number) - (b.data.globalIndex as number))
          .map(n => n.id);
        
        // Calculate Simulated Difficulty
        const solution = calculateSolution(nodes, edges, levelData, spawnQueueIds);

        const numMatch = lvlName.match(/\d+/);
        const levelNum = numMatch ? parseInt(numMatch[0]) : null;
        const telemetry = levelNum ? telemetryMap[levelNum] : undefined;

        results.push({
          name: lvlName,
          theme: levelData.theme || 'Untitled Theme',
          totalWords: levelData.allWordEntries?.length || 0,
          wordsNotDropped: Math.max(0, (levelData.allWordEntries?.length || 0) - (levelData.maxBubblesInScene || 20)),
          moveLimit: levelData.moveLimit,
          vocab: solution.vocabDifficulty,
          move: solution.moveDifficulty,
          learning: solution.learningDifficulty,
          combined: solution.difficulty,
          telemetry
        });
      } catch (err) {
        console.error(`Error processing level ${lvlName}:`, err);
      }
      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setLevelDataList(results);
    setLoading(false);
  };

  const generateGraph = (levelData: any) => {
    const nodes: any[] = [];
    const edges: any[] = [];
    let idCounter = 1;
    const nextId = () => `analytics-node-${idCounter++}`;
    
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
    
    // Pass 3: Words & Chunks
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
          
          if (w.chunks && Array.isArray(w.chunks) && w.chunks.length > 0) {
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
          } else if (levelData.allWordEntries && Array.isArray(levelData.allWordEntries)) {
            levelData.allWordEntries.forEach((entry: any, arrIdx: number) => {
              if (entry.parentWord && String(entry.parentWord).toLowerCase().trim() === wordLower) {
                const chunkNode = {
                  id: nextId(),
                  type: 'custom',
                  position: { x: 0, y: 0 },
                  data: { label: String(entry.fullWord).toLowerCase(), isCategory: false, isChunk: true, globalIndex: arrIdx + 1 }
                };
                nodes.push(chunkNode);
                edges.push({
                  id: `e-${wordNode.id}-${chunkNode.id}`,
                  source: wordNode.id,
                  target: chunkNode.id
                });
              }
            });
          }
        });
      }
    });
    
    return { nodes, edges };
  };

  // --- Calculations ---

  // Pearson Correlation Coefficient calculation
  const correlations = useMemo(() => {
    const validPairs = levelDataList.filter(item => item.telemetry);
    if (validPairs.length < 2) return { failRate: 0, ads: 0, churnRate: 0 };

    const calculatePearson = (xValues: number[], yValues: number[]) => {
      const n = xValues.length;
      const xMean = xValues.reduce((sum, v) => sum + v, 0) / n;
      const yMean = yValues.reduce((sum, v) => sum + v, 0) / n;

      let num = 0;
      let denX = 0;
      let denY = 0;

      for (let i = 0; i < n; i++) {
        const xDiff = xValues[i] - xMean;
        const yDiff = yValues[i] - yMean;
        num += xDiff * yDiff;
        denX += xDiff * xDiff;
        denY += yDiff * yDiff;
      }

      if (denX === 0 || denY === 0) return 0;
      return num / Math.sqrt(denX * denY);
    };

    const diffScores = validPairs.map(item => item.combined.score);
    const failRates = validPairs.map(item => item.telemetry!.fail_rate);
    const adsPerUser = validPairs.map(item => item.telemetry!.avg_ads_per_user ?? 0);
    const churnRates = validPairs.map(item => item.telemetry!.churn_rate);

    return {
      failRate: calculatePearson(diffScores, failRates),
      ads: calculatePearson(diffScores, adsPerUser),
      churnRate: calculatePearson(diffScores, churnRates)
    };
  }, [levelDataList]);

  // Outlier detection logic
  const outliersList = useMemo(() => {
    const validList = levelDataList.filter(item => item.telemetry);
    
    // Sort outliers by discrepancy severity
    const resultList: Array<{
      item: LevelDifficultyData;
      type: 'tight' | 'loose' | 'churn' | 'ads';
      description: string;
      severity: 'critical' | 'warning' | 'info';
    }> = [];

    validList.forEach(item => {
      const tel = item.telemetry!;
      const diff = item.combined.score;

      // 1. Tuned Too Tight: Solver says Easy/Medium (Diff < 95) but actual Fail Rate is high (> 60%) or Churn is high (> 7%)
      if (diff < 95 && tel.fail_rate > 60 && tel.users_attempted >= 10) {
        resultList.push({
          item,
          type: 'tight',
          description: `Simulated as "${item.combined.label}" (${diff}) but has a high Fail Rate of ${tel.fail_rate}% (Bottleneck candidate).`,
          severity: tel.fail_rate > 75 ? 'critical' : 'warning'
        });
      }

      // 2. Tuned Too Loose: Solver says Expert (Diff > 120) but actual Fail Rate is very low (< 35%)
      else if (diff > 120 && tel.fail_rate < 35 && tel.users_attempted >= 10) {
        resultList.push({
          item,
          type: 'loose',
          description: `Simulated as "Expert" (${diff}) but actual Fail Rate is low (${tel.fail_rate}%). Players bypass easily.`,
          severity: 'warning'
        });
      }

      // 3. High Churn Risk (Direct player leak)
      else if (tel.churn_rate > 8.0 && tel.users_attempted >= 10) {
        resultList.push({
          item,
          type: 'churn',
          description: `High Drop-off! ${tel.churn_rate}% of players quit the game at this level (Attempted by ${tel.users_attempted}).`,
          severity: tel.churn_rate > 12.0 ? 'critical' : 'warning'
        });
      }

      // 4. Excessive Ads (High Ad Friction vs Difficulty)
      else if (tel.avg_ads_per_user && tel.avg_ads_per_user > 5.5 && diff < 110) {
        resultList.push({
          item,
          type: 'ads',
          description: `Excessive ad friction: ${tel.avg_ads_per_user} ads/user on a relatively moderate level (${item.combined.label}).`,
          severity: 'info'
        });
      }
    });

    // Sort: Critical first, then Warning, then Info
    const severityWeight = { critical: 3, warning: 2, info: 1 };
    return resultList.sort((a, b) => severityWeight[b.severity] - severityWeight[a.severity]);
  }, [levelDataList]);

  // Overall statistics
  const summaryStats = useMemo(() => {
    const valid = levelDataList.filter(item => item.telemetry);
    const totalUsers = valid.reduce((sum, item) => sum + (item.telemetry?.users_attempted || 0), 0);
    const totalStarts = valid.reduce((sum, item) => sum + (item.telemetry?.starts || 0), 0);
    const totalAds = valid.reduce((sum, item) => sum + (item.telemetry?.reward_ads || 0), 0);
    const averageFailRate = valid.length > 0
      ? valid.reduce((sum, item) => sum + (item.telemetry?.fail_rate || 0), 0) / valid.length
      : 0;

    return {
      totalUsers,
      totalStarts,
      totalAds,
      averageFailRate: Math.round(averageFailRate * 10) / 10
    };
  }, [levelDataList]);

  // Filtering for table tab
  const filteredList = useMemo(() => {
    if (!searchQuery) return levelDataList;
    const query = searchQuery.toLowerCase().trim();
    return levelDataList.filter(item => {
      return item.name.toLowerCase().includes(query) || item.theme.toLowerCase().includes(query);
    });
  }, [levelDataList, searchQuery]);

  // Get correlation helper formatting
  const getCorrelationBadge = (r: number) => {
    const absR = Math.abs(r);
    if (absR >= 0.5) return { text: 'Strong Correlation', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    if (absR >= 0.3) return { text: 'Moderate Correlation', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    if (absR >= 0.1) return { text: 'Weak Correlation', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)' };
    return { text: 'No Correlation', color: '#8e91a0', bg: 'rgba(255, 255, 255, 0.05)' };
  };

  // --- SVG Chart Calculations ---
  const chartHeight = 240;
  const chartWidth = 720;
  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 25;
  const paddingBottom = 25;

  const chartData = useMemo(() => {
    if (levelDataList.length === 0) return { xScale: (_idx: number) => 0, yScaleDiff: (_val: number) => 0, yScaleMetric: (_val: number) => 0, pointsDiff: '', pointsMetric: '', maxMetricVal: 1, maxDiffVal: 1 };

    const totalPoints = levelDataList.length;
    const maxDiffVal = Math.max(...levelDataList.map(d => d.combined.score), 100);
    
    // Scale for telemetry metric
    const metricVals = levelDataList.map(d => {
      if (!d.telemetry) return 0;
      if (chartMetric === 'avg_ads_per_user') return d.telemetry.avg_ads_per_user ?? 0;
      if (chartMetric === 'fail_rate') return d.telemetry.fail_rate;
      return d.telemetry.churn_rate;
    });
    const maxMetricVal = Math.max(...metricVals, 1);

    const xScale = (idx: number) => {
      if (totalPoints <= 1) return paddingLeft;
      return paddingLeft + ((chartWidth - paddingLeft - paddingRight) / (totalPoints - 1)) * idx;
    };

    const yScaleDiff = (val: number) => {
      return chartHeight - paddingBottom - ((chartHeight - paddingTop - paddingBottom) * (val / maxDiffVal));
    };

    const yScaleMetric = (val: number) => {
      return chartHeight - paddingBottom - ((chartHeight - paddingTop - paddingBottom) * (val / maxMetricVal));
    };

    // Build polyline points
    const pointsDiffArr: string[] = [];
    const pointsMetricArr: string[] = [];

    levelDataList.forEach((d, idx) => {
      const x = xScale(idx);
      const yD = yScaleDiff(d.combined.score);
      pointsDiffArr.push(`${x},${yD}`);

      if (d.telemetry) {
        let val = 0;
        if (chartMetric === 'avg_ads_per_user') val = d.telemetry.avg_ads_per_user ?? 0;
        else if (chartMetric === 'fail_rate') val = d.telemetry.fail_rate;
        else val = d.telemetry.churn_rate;
        const yM = yScaleMetric(val);
        pointsMetricArr.push(`${x},${yM}`);
      }
    });

    return {
      xScale,
      yScaleDiff,
      yScaleMetric,
      pointsDiff: pointsDiffArr.join(' '),
      pointsMetric: pointsMetricArr.join(' '),
      maxMetricVal,
      maxDiffVal
    };
  }, [levelDataList, chartMetric]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(10, 11, 15, 0.96)', backdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, color: 'var(--text-main)', padding: '24px',
      fontFamily: 'var(--font-family)'
    }}>
      <div className="glass-panel" style={{
        width: '100%', maxWidth: '1200px', height: '90vh',
        borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 48px rgba(0, 0, 0, 0.6)', background: '#11131a'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8',
                padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600
              }}>WEB VIEW</span>
              <h2 style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '-0.3px', margin: 0 }}>
                Telemetry & Difficulty Analytics
              </h2>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
              Interactive review of simulator difficulty versus live ClickHouse game performance telemetry.
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            <X size={18} />
          </button>
        </div>

        {/* Range Controller & Navigation Tabs */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 24px', borderBottom: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(255, 255, 255, 0.01)'
        }}>
          {/* Tab switches */}
          <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.25)', padding: '3px', borderRadius: '8px' }}>
            <button
              onClick={() => setActiveTab('overview')}
              style={{
                padding: '6px 14px', fontSize: '12px', fontWeight: 600, border: 'none',
                background: activeTab === 'overview' ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: activeTab === 'overview' ? 'white' : 'var(--text-muted)',
                borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <BarChart2 size={13} /> Charts & Overview
            </button>
            <button
              onClick={() => setActiveTab('outliers')}
              style={{
                padding: '6px 14px', fontSize: '12px', fontWeight: 600, border: 'none',
                background: activeTab === 'outliers' ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: activeTab === 'outliers' ? 'white' : 'var(--text-muted)',
                borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <AlertTriangle size={13} /> Bottlenecks & Outliers
              {outliersList.length > 0 && (
                <span style={{
                  background: '#ef4444', color: 'white', fontSize: '10px',
                  padding: '1px 5px', borderRadius: '10px', fontWeight: 'bold'
                }}>{outliersList.length}</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('table')}
              style={{
                padding: '6px 14px', fontSize: '12px', fontWeight: 600, border: 'none',
                background: activeTab === 'table' ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: activeTab === 'table' ? 'white' : 'var(--text-muted)',
                borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              <Layers size={13} /> Detailed Table
            </button>
          </div>

          {/* Level range selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Analyze Range:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                value={startLevelInput}
                onChange={e => setStartLevelInput(parseInt(e.target.value) || 1)}
                style={{
                  width: '55px', padding: '5px 8px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                  color: 'white', fontSize: '12px', textAlign: 'center', outline: 'none'
                }}
              />
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>to</span>
              <input
                type="number"
                value={endLevelInput}
                onChange={e => setEndLevelInput(parseInt(e.target.value) || 100)}
                style={{
                  width: '55px', padding: '5px 8px', background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                  color: 'white', fontSize: '12px', textAlign: 'center', outline: 'none'
                }}
              />
            </div>
            
            <button
              onClick={() => fetchAndProcessRange(startLevelInput, endLevelInput)}
              disabled={loading}
              style={{
                padding: '6px 12px', borderRadius: '6px', background: 'var(--accent)',
                color: 'white', border: 'none', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
              }}
            >
              {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={12} />}
              Refresh Data
            </button>
          </div>
        </div>

        {/* Loading overlay / state */}
        {loading && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', background: 'rgba(0,0,0,0.4)', gap: '16px'
          }}>
            <Loader2 className="animate-spin text-accent" size={36} style={{ color: 'var(--accent)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Calculating Level Difficulties...</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Progress: {progress}%</div>
            </div>
            <div style={{
              width: '240px', height: '6px', background: 'rgba(255,255,255,0.05)',
              borderRadius: '3px', overflow: 'hidden'
            }}>
              <div style={{
                height: '100%', width: `${progress}%`, background: 'var(--accent)',
                transition: 'width 0.2s'
              }} />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        {!loading && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            
            {/* Overview / Charts Tab */}
            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                
                {/* Metric Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  
                  {/* Card 1: Fail Rate Correlation */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', minHeight: '100px', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#6366f1' }} />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Diff vs Fail Rate Correlation
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: 'white' }}>
                      r = {correlations.failRate ? correlations.failRate.toFixed(4) : '0.0000'}
                    </div>
                    {correlations.failRate !== 0 && (() => {
                      const badge = getCorrelationBadge(correlations.failRate);
                      return (
                        <div style={{
                          alignSelf: 'flex-start', fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                          background: badge.bg, color: badge.color, fontWeight: 600
                        }}>{badge.text}</div>
                      );
                    })()}
                  </div>

                  {/* Card 2: Ads/User Correlation */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', minHeight: '100px', position: 'relative', overflow: 'hidden'
                  }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#f59e0b' }} />
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Diff vs Ads/User Correlation
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: 'white' }}>
                      r = {correlations.ads ? correlations.ads.toFixed(4) : '0.0000'}
                    </div>
                    {correlations.ads !== 0 && (() => {
                      const badge = getCorrelationBadge(correlations.ads);
                      return (
                        <div style={{
                          alignSelf: 'flex-start', fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                          background: badge.bg, color: badge.color, fontWeight: 600
                        }}>{badge.text}</div>
                      );
                    })()}
                  </div>

                  {/* Card 3: Active Players */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', minHeight: '100px'
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Active Players in Cohort
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: 'white' }}>
                      {summaryStats.totalUsers.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '11px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={12} /> {summaryStats.totalStarts.toLocaleString()} total game starts
                    </div>
                  </div>

                  {/* Card 4: Avg Fail Rate */}
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', minHeight: '100px'
                  }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      Average Fail Rate
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 700, margin: '8px 0', color: 'white' }}>
                      {summaryStats.averageFailRate}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <TrendingUp size={12} /> {summaryStats.totalAds.toLocaleString()} total ad views
                    </div>
                  </div>

                </div>

                {/* SVG Curves Chart Frame */}
                <div style={{
                  background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)',
                  borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px'
                }}>
                  
                  {/* Chart Control Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Simulated Difficulty vs Live Metrics</h3>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Green line shows simulation combined score (0-200+). Select secondary metric below.
                      </p>
                    </div>

                    {/* Secondary Metric Selectors */}
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '3px', borderRadius: '6px' }}>
                      <button
                        onClick={() => setChartMetric('avg_ads_per_user')}
                        style={{
                          padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px',
                          background: chartMetric === 'avg_ads_per_user' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                          color: chartMetric === 'avg_ads_per_user' ? '#f59e0b' : 'var(--text-muted)',
                          cursor: 'pointer', fontWeight: 600
                        }}
                      >
                        Avg Ads/User
                      </button>
                      <button
                        onClick={() => setChartMetric('fail_rate')}
                        style={{
                          padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px',
                          background: chartMetric === 'fail_rate' ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
                          color: chartMetric === 'fail_rate' ? '#f87171' : 'var(--text-muted)',
                          cursor: 'pointer', fontWeight: 600
                        }}
                      >
                        Fail Rate %
                      </button>
                      <button
                        onClick={() => setChartMetric('churn_rate')}
                        style={{
                          padding: '4px 10px', fontSize: '11px', border: 'none', borderRadius: '4px',
                          background: chartMetric === 'churn_rate' ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
                          color: chartMetric === 'churn_rate' ? '#f472b6' : 'var(--text-muted)',
                          cursor: 'pointer', fontWeight: 600
                        }}
                      >
                        Churn Rate %
                      </button>
                    </div>
                  </div>

                  {/* Chart and Side Inspector Area */}
                  <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
                    
                    {/* SVG Chart Plot Area */}
                    <div style={{ flex: 1, position: 'relative' }}>
                      {levelDataList.length > 0 ? (
                        <>
                          <svg
                            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                            style={{ width: '100%', height: '240px', display: 'block', overflow: 'visible' }}
                          >
                            {/* Grid Y Lines (Left: Difficulty, Right: Metric) */}
                            {Array.from({ length: 5 }, (_, i) => i).map(i => {
                              const yValDiff = Math.round((chartData.maxDiffVal / 4) * i);
                              const yValMetric = Math.round((chartData.maxMetricVal / 4) * i * 10) / 10;
                              
                              const yD = chartData.yScaleDiff(yValDiff);
                              
                              // We use the Left scale Y coordinates to draw flat lines
                              return (
                                <g key={i}>
                                  <line x1={paddingLeft} y1={yD} x2={chartWidth - paddingRight} y2={yD} stroke="rgba(255,255,255,0.04)" strokeDasharray="3,3" />
                                  <text x={paddingLeft - 8} y={yD + 3} fill="#10b981" fontSize="9" textAnchor="end">{yValDiff}</text>
                                  <text x={chartWidth - paddingRight + 8} y={yD + 3} fill="#f59e0b" fontSize="9" textAnchor="start">
                                    {chartMetric === 'avg_ads_per_user' ? yValMetric : `${yValMetric}%`}
                                  </text>
                                </g>
                              );
                            })}

                            {/* X-axis levels */}
                            {levelDataList.map((lvl, idx) => {
                              const x = chartData.xScale(idx);
                              const skipLabel = levelDataList.length > 20 && idx % Math.ceil(levelDataList.length / 15) !== 0 && idx !== levelDataList.length - 1;
                              const numStr = lvl.name.replace(/\D/g, '');
                              return (
                                <g key={idx}>
                                  {!skipLabel && (
                                    <text x={x} y={chartHeight - 4} fill="rgba(255,255,255,0.3)" fontSize="8.5" textAnchor="middle">{numStr}</text>
                                  )}
                                  <line x1={x} y1={chartHeight - paddingBottom} x2={x} y2={chartHeight - paddingBottom + 3} stroke="rgba(255,255,255,0.12)" />
                                </g>
                              );
                            })}

                            {/* Vertical Line on Hover */}
                            {hoveredIdx !== null && (
                              <line
                                x1={chartData.xScale(hoveredIdx)}
                                y1={paddingTop}
                                x2={chartData.xScale(hoveredIdx)}
                                y2={chartHeight - paddingBottom}
                                stroke="rgba(255,255,255,0.18)"
                                strokeWidth="1"
                              />
                            )}

                            {/* Lines */}
                            {/* Line 1: Simulated Combined Difficulty (Emerald glow) */}
                            <path d={`M ${chartData.pointsDiff}`} fill="none" stroke="#059669" strokeWidth="4" opacity="0.15" />
                            <path d={`M ${chartData.pointsDiff}`} fill="none" stroke="#10b981" strokeWidth="2.2" />

                            {/* Line 2: Selected Metric (Orange/Rose glow) */}
                            {chartData.pointsMetric && (
                              <>
                                <path d={`M ${chartData.pointsMetric}`} fill="none" stroke="#d97706" strokeWidth="4" opacity="0.15" />
                                <path d={`M ${chartData.pointsMetric}`} fill="none" stroke="#f59e0b" strokeWidth="2.2" />
                              </>
                            )}

                            {/* Interactive Hover rectangles */}
                            {levelDataList.map((_, idx) => {
                              const x = chartData.xScale(idx);
                              const colWidth = (chartWidth - paddingLeft - paddingRight) / Math.max(1, levelDataList.length - 1);
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
                                  onClick={() => {
                                    loadLevel(levelDataList[idx].name);
                                    onClose();
                                  }}
                                />
                              );
                            })}

                            {/* Hover highlights */}
                            {hoveredIdx !== null && levelDataList[hoveredIdx] && (
                              (() => {
                                const hLvl = levelDataList[hoveredIdx];
                                const x = chartData.xScale(hoveredIdx);
                                const yD = chartData.yScaleDiff(hLvl.combined.score);
                                
                                let mVal = 0;
                                if (hLvl.telemetry) {
                                  if (chartMetric === 'avg_ads_per_user') mVal = hLvl.telemetry.avg_ads_per_user ?? 0;
                                  else if (chartMetric === 'fail_rate') mVal = hLvl.telemetry.fail_rate;
                                  else mVal = hLvl.telemetry.churn_rate;
                                }
                                const yM = chartData.yScaleMetric(mVal);

                                return (
                                  <g>
                                    <circle cx={x} cy={yD} r="5" fill="#10b981" stroke="white" strokeWidth="1.5" />
                                    {hLvl.telemetry && (
                                      <circle cx={x} cy={yM} r="5" fill="#f59e0b" stroke="white" strokeWidth="1.5" />
                                    )}
                                  </g>
                                );
                              })()
                            )}
                          </svg>

                          {/* Chart Labels */}
                          <div style={{
                            position: 'absolute', top: 0, left: paddingLeft + 10, display: 'flex', gap: '14px',
                            background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.06)',
                            padding: '4px 10px', borderRadius: '6px', fontSize: '10px', pointerEvents: 'none'
                          }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                              Simulated Combined Difficulty (CalcDiff)
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}></span>
                              Actual {chartMetric === 'avg_ads_per_user' ? 'Avg Ads/User' : chartMetric === 'fail_rate' ? 'Fail Rate %' : 'Churn Rate %'}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '60px' }}>
                          No data available for this range.
                        </div>
                      )}
                    </div>

                    {/* Right-side Level Stats Inspector */}
                    <div style={{
                      width: '280px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '10px', padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'center'
                    }}>
                      {hoveredIdx !== null && levelDataList[hoveredIdx] ? (
                        (() => {
                          const hLvl = levelDataList[hoveredIdx];
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px' }}>
                                <div style={{ color: 'white', fontSize: '14px', fontWeight: 700 }}>{hLvl.name}</div>
                                <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  Theme: {hLvl.theme}
                                </div>
                              </div>

                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Simulated Difficulty:</span>
                                  <span style={{ color: hLvl.combined.color, fontWeight: 'bold' }}>
                                    {hLvl.combined.score} ({hLvl.combined.label})
                                  </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Moves Limit:</span>
                                  <span style={{ color: 'white', fontWeight: 600 }}>{hLvl.moveLimit || 'N/A'}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Vocab Score:</span>
                                  <span style={{ color: hLvl.vocab.color, fontWeight: 500 }}>{hLvl.vocab.score}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>Puzzle (Moves) Score:</span>
                                  <span style={{ color: hLvl.move.color, fontWeight: 500 }}>{hLvl.move.score}</span>
                                </div>

                                <div style={{ borderTop: '1px dashed rgba(255,255,255,0.06)', margin: '4px 0' }} />

                                {hLvl.telemetry ? (
                                  <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Live Players:</span>
                                      <span style={{ color: '#60a5fa', fontWeight: 'bold' }}>{hLvl.telemetry.users_attempted.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Live Starts:</span>
                                      <span style={{ color: 'white', fontWeight: 500 }}>{hLvl.telemetry.starts.toLocaleString()}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Actual Fail Rate:</span>
                                      <span style={{ color: '#f87171', fontWeight: 'bold' }}>{hLvl.telemetry.fail_rate}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Actual Churn Rate:</span>
                                      <span style={{ color: '#f472b6', fontWeight: 'bold' }}>{hLvl.telemetry.churn_rate}%</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: 'var(--text-muted)' }}>Avg Ads Viewed:</span>
                                      <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{hLvl.telemetry.avg_ads_per_user ?? 0}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                                    No telemetry data recorded
                                  </div>
                                )}
                              </div>

                              <div style={{
                                marginTop: '10px', background: 'rgba(99, 102, 241, 0.1)',
                                color: '#a5b4fc', fontSize: '10px', padding: '6px',
                                borderRadius: '6px', textAlign: 'center', fontWeight: 500
                              }}>
                                Click chart point to LOAD in editor.
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: '12px', textAlign: 'center', fontStyle: 'italic' }}>
                          <Info size={20} style={{ margin: '0 auto 8px auto', display: 'block', color: 'rgba(255,255,255,0.15)' }} />
                          Hover over any point on the chart to inspect simulated vs live details.
                        </div>
                      )}
                    </div>

                  </div>

                </div>

              </div>
            )}

            {/* Outliers & Bottlenecks Tab */}
            {activeTab === 'outliers' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>Automatic Outlier Detection</h3>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Identifies levels where the player telemetry diverges significantly from the designed difficulty.
                    </p>
                  </div>
                </div>

                {outliersList.length === 0 ? (
                  <div style={{
                    background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '12px', padding: '40px', textAlign: 'center'
                  }}>
                    <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 12px auto' }} />
                    <h4 style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>All levels calibrated correctly!</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                      No significant telemetry discrepancies found in this range.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {outliersList.map((outlier, index) => {
                      const badgeBg = outlier.severity === 'critical' 
                        ? 'rgba(239, 68, 68, 0.15)' 
                        : outlier.severity === 'warning' 
                          ? 'rgba(245, 158, 11, 0.15)' 
                          : 'rgba(96, 165, 250, 0.15)';
                      const badgeColor = outlier.severity === 'critical' ? '#f87171' : outlier.severity === 'warning' ? '#fbbf24' : '#60a5fa';

                      return (
                        <div key={index} style={{
                          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                          borderRadius: '10px', padding: '14px 20px', display: 'flex', alignItems: 'center',
                          justifyContent: 'space-between', transition: 'all 0.2s', position: 'relative', overflow: 'hidden'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                            {/* Severity Indicator Dot */}
                            <span style={{
                              width: '8px', height: '8px', borderRadius: '50%',
                              background: outlier.severity === 'critical' ? '#ef4444' : outlier.severity === 'warning' ? '#f59e0b' : '#3b82f6',
                              boxShadow: `0 0 10px ${outlier.severity === 'critical' ? '#ef4444' : outlier.severity === 'warning' ? '#f59e0b' : '#3b82f6'}`
                            }} />

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 700, color: 'white', fontSize: '14px' }}>{outlier.item.name}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>— {outlier.item.theme}</span>
                                <span style={{
                                  fontSize: '10px', padding: '2px 6px', borderRadius: '4px',
                                  background: badgeBg, color: badgeColor, fontWeight: 700, textTransform: 'uppercase'
                                }}>{outlier.severity}</span>
                              </div>
                              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginTop: '4px', lineHeight: '1.4' }}>
                                {outlier.description}
                              </p>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '24px' }}>
                            <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-muted)' }}>
                              <div>Fail: <b style={{ color: '#f87171' }}>{outlier.item.telemetry?.fail_rate}%</b></div>
                              <div>Churn: <b style={{ color: '#f472b6' }}>{outlier.item.telemetry?.churn_rate}%</b></div>
                            </div>
                            <button
                              onClick={() => {
                                loadLevel(outlier.item.name);
                                onClose();
                              }}
                              style={{
                                background: 'var(--accent)', color: 'white', border: 'none',
                                padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                              }}
                            >
                              <Play size={12} fill="white" /> Edit
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Detailed Table Tab */}
            {activeTab === 'table' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Search Bar */}
                <div style={{ display: 'flex', gap: '12px' }}>
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
                </div>

                <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0, 0, 0, 0.25)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Level</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Theme</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>CalcDiff</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Moves</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Users</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Starts</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Fail Rate</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Churn Rate</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Avg Ads</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredList.length === 0 ? (
                        <tr>
                          <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                            No levels match your criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredList.map((lvl, idx) => {
                          const tel = lvl.telemetry;
                          return (
                            <tr key={idx} style={{
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'
                            }}>
                              <td style={{ padding: '10px 14px', color: 'white', fontWeight: 600 }}>{lvl.name}</td>
                              <td style={{ padding: '10px 14px', color: 'rgba(255,255,255,0.7)' }}>{lvl.theme}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{
                                  background: `${lvl.combined.color}15`, color: lvl.combined.color,
                                  border: `1px solid ${lvl.combined.color}25`,
                                  padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 500
                                }}>{lvl.combined.score} ({lvl.combined.label})</span>
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: 'white' }}>{lvl.moveLimit || 'N/A'}</td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#60a5fa' }}>
                                {tel ? tel.users_attempted.toLocaleString() : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: 'white' }}>
                                {tel ? tel.starts.toLocaleString() : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#f87171', fontWeight: 600 }}>
                                {tel ? `${tel.fail_rate}%` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#f472b6', fontWeight: 600 }}>
                                {tel ? `${tel.churn_rate}%` : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'center', color: '#fbbf24', fontWeight: 600 }}>
                                {tel ? tel.avg_ads_per_user : '—'}
                              </td>
                              <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                <button
                                  onClick={() => {
                                    loadLevel(lvl.name);
                                    onClose();
                                  }}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)', color: 'white',
                                    border: '1px solid rgba(255,255,255,0.1)', padding: '4px 10px',
                                    borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontWeight: 500
                                  }}
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.15)',
          gap: '12px'
        }}>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
              padding: '8px 20px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: 500
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
          >
            Close Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}
