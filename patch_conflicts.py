import os, re

def patch_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    for search, replace in replacements:
        if isinstance(search, re.Pattern):
            content = search.sub(replace, content)
        else:
            content = content.replace(search, replace)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# GraphEditor.tsx replacements
ge_rep = [
    # 1. Imports
    (re.compile(r'<<<<<<< HEAD\nimport ChangelogModal.*?\n=======\nimport LevelsDashboardModal.*?\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''import ChangelogModal from './ChangelogModal';
import LevelSelectorModal from './LevelSelectorModal';
import LoginModal from './LoginModal';
import LevelsDashboardModal from './LevelsDashboardModal';
import AnalyticsDashboard from './AnalyticsDashboard';
import { Save, BookOpen, Settings, Plus, RefreshCw, Puzzle, Sparkles, Link, Search, X, HelpCircle, History, Snowflake, Calculator, Lock, Key, Bomb, Pin, Eye, Wrench, PenTool, ArrowLeftRight, ChevronDown, ChevronLeft, ChevronRight, UploadCloud, Timer, Magnet, Zap, User, UserCheck, Database, Layers, BarChart2 } from 'lucide-react';
'''),
    
    # 2. dirHandle (Keep HEAD)
    (re.compile(r'<<<<<<< HEAD\n  const \[levelDir, setLevelDir\].*?\n=======\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''  const [levelDir, setLevelDir] = useState<string>('real_levels');
  const [dirHandle, setDirHandle] = useState<any>(null);
'''),

    # 3. Modals state variables
    (re.compile(r'<<<<<<< HEAD\n  const \[isChangelogModalOpen.*?\n=======\n  const \[isDashboardOpen.*?\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''  const [isChangelogModalOpen, setIsChangelogModalOpen] = useState(false);
  const [isLevelSelectorOpen, setIsLevelSelectorOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('wordnet_isAdmin') === 'true');
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
'''),

    # 4. fetchLevelsList effect
    (re.compile(r'<<<<<<< HEAD\n  \}, \[selectedLevelName, levels, levelDir\]\);\n\n  useEffect\(\(\) => \{.*?\n=======\n  \}, \[selectedLevelName, levels\]\);\n\n  const fetchLevelsList.*?\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''  }, [selectedLevelName, levels, levelDir]);

  const fetchLevelsList = async () => {
    if (dirHandle) return;
    try {
      const res = await fetch(`/levels_index.json?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setLevels(data);
        return;
      }
    } catch (err) {}
    try {
      const res = await fetch(`/api/list-levels?dir=${levelDir}`);
      if (res.ok) {
        const data = await res.json();
        setLevels(data);
      }
    } catch (err) {
      console.error('Failed to fetch levels list:', err);
    }
  };

  useEffect(() => {
    fetchLevelsList();
  }, [levelDir, dirHandle]);
'''),

    # 5. loadLevel
    (re.compile(r'<<<<<<< HEAD\n      let data;\n      if \(dirHandle\).*?\n=======\n      const res = await fetch\(`\/api\/load-level.*?\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''      let data;
      if (dirHandle) {
        const fileHandle = await dirHandle.getFileHandle(`${levelName}.json`);
        const file = await fileHandle.getFile();
        const text = await file.text();
        data = JSON.parse(text);
      } else {
        const res = await fetch(`/${levelDir}/${levelName}.json`);
        if (!res.ok) throw new Error('Not found');
        data = await res.json();
      }
'''),

    # 6. Shortcuts
    (re.compile(r'<<<<<<< HEAD\n  useEffect\(\(\) => \{\n    handleShuffleRangeRef.*?\n=======\n\n  useEffect\(\(\) => \{\n    const handleSaveShortcut.*?\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''  useEffect(() => {
    handleShuffleRangeRef.current = handleShuffleRange;
  });

  const shortcutStateRef = useRef({ levels, selectedLevelName, loadLevel, isLevelSelectorOpen, isManualModalOpen, isChangelogModalOpen, isSolutionModalOpen, isDictOpen, isMagicChangeOpen, isSettingsOpen, isLoginModalOpen });
  useEffect(() => {
    shortcutStateRef.current = { levels, selectedLevelName, loadLevel, isLevelSelectorOpen, isManualModalOpen, isChangelogModalOpen, isSolutionModalOpen, isDictOpen, isMagicChangeOpen, isSettingsOpen, isLoginModalOpen };
  });

  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      const s = shortcutStateRef.current;
      if (e.key === 'Escape') {
        if (s.isLoginModalOpen) setIsLoginModalOpen(false);
        else if (s.isLevelSelectorOpen) setIsLevelSelectorOpen(false);
        else if (s.isManualModalOpen) setIsManualModalOpen(false);
        else if (s.isChangelogModalOpen) setIsChangelogModalOpen(false);
        else if (s.isSolutionModalOpen) setIsSolutionModalOpen(false);
        else if (s.isDictOpen) setIsDictOpen(false);
        else if (s.isMagicChangeOpen) setIsMagicChangeOpen(false);
        else if (s.isSettingsOpen) setIsSettingsOpen(false);
        return;
      }
      
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 's') {
          e.preventDefault();
          handleExportJsonRef.current();
        } else if (key === 'q') {
          e.preventDefault();
          handleShuffleRangeRef.current();
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (s.levels.length > 0 && s.selectedLevelName) {
          const idx = s.levels.indexOf(s.selectedLevelName);
          if (idx < s.levels.length - 1 && idx !== -1) s.loadLevel(s.levels[idx + 1]);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (s.levels.length > 0 && s.selectedLevelName) {
          const idx = s.levels.indexOf(s.selectedLevelName);
          if (idx > 0) s.loadLevel(s.levels[idx - 1]);
        }
      } else if (e.key === '1') {
        e.preventDefault();
        setIsSolutionModalOpen(true);
      } else if (e.key === '2') {
        e.preventDefault();
        setIsDictOpen(true);
      }
'''),

    # 7. Dict Word Update
    (re.compile(r'<<<<<<< HEAD\n          catAddedItems\.push.*?=======\n          catAddedItems\.push.*?\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''          catAddedItems.push(`  + ${rawWord} (Word)`);
        } else {
          const existingWordObj = dictCat.words[existingWordIndex];
          if (existingWordObj.word.toLowerCase() !== rawWord.toLowerCase()) {
            const oldWord = existingWordObj.word;
            existingWordObj.word = rawWord;
            updatedCount++;
            catUpdatedItems.push(`  ~ ${oldWord} -> ${rawWord}`);
          }
'''),

    # 8. Dict Subcategory Update
    (re.compile(r'<<<<<<< HEAD\n          catAddedItems\.push.*?=======\n          catAddedItems\.push.*?\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''          catAddedItems.push(`  + ${rawSubcat} (Subcategory)`);
        } else {
          const oldSubcat = dictCat.subcategories[existingIdx];
          if (oldSubcat.toLowerCase() !== rawSubcat.toLowerCase()) {
            dictCat.subcategories[existingIdx] = rawSubcat;
            updatedCount++;
            catUpdatedItems.push(`  ~ ${oldSubcat} -> ${rawSubcat} (Subcategory)`);
          }
'''),

    # 9. Folder UI
    (re.compile(r'<<<<<<< HEAD\n          <div style=\{\{ display: \'flex\', alignItems: \'center\'.*?=======\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>Folder:</span>
            <button 
              onClick={async () => {
                 if ('showDirectoryPicker' in window) {
                   try {
                     const handle = await (window as any).showDirectoryPicker();
                     setDirHandle(handle);
                     const files = [];
                     for await (const entry of handle.values()) {
                       if (entry.kind === 'file' && entry.name.endsWith('.json') && entry.name !== 'index.json') {
                         files.push(entry.name.replace('.json', ''));
                       }
                     }
                     files.sort((a, b) => {
                       const numA = parseInt(a.replace(/[^0-9]/g, ''));
                       const numB = parseInt(b.replace(/[^0-9]/g, ''));
                       if (!isNaN(numA) && !isNaN(numB)) {
                         return numA - numB;
                       }
                       return a.localeCompare(b);
                     });
                     setLevels(files);
                     setSelectedLevelName('');
                     setLevelDir(handle.name);
                   } catch (err) {
                     console.error(err);
                   }
                 } else {
                   alert("Trình duyệt không hỗ trợ chọn thư mục (File System Access API).");
                 }
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)',
                color: 'white', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px'
              }}
            >
              <BookOpen size={14} /> {dirHandle ? dirHandle.name : levelDir}
            </button>
          </div>
''')
]
patch_file('src/components/GraphEditor.tsx', ge_rep)

# LevelSettings.tsx
ls_rep = [
    (re.compile(r'<<<<<<< HEAD\n                          <span\n                            style=\{\{ cursor: \'pointer\', display: \'flex\' \}\}.*?=======\n                          <span title=.*?\/>\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''                          <span
                            style={{ cursor: 'pointer', display: 'flex' }}
                            onClick={() => {
                              if (onFocusWord) onFocusWord(crackItem.word);
                            }}
                            title={`Focus on ${crackItem.word}`}
                          >
                            <Zap size={14} color="#fbbf24" />
''')
]
patch_file('src/components/LevelSettings.tsx', ls_rep)

# LevelsDashboardModal.tsx
ldm_rep = [
    # 1. Imports
    (re.compile(r'<<<<<<< HEAD\nimport \{ X, Search, Play, ArrowUpDown.*?\n=======\nimport \{ X, Search, Play, ArrowUpDown.*?\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''import { X, Search, Play, ArrowUpDown, ChevronDown, ChevronUp, Loader2, Sparkles, HelpCircle, Layers, CheckCircle2, ShieldAlert, Activity } from 'lucide-react';
'''),
    
    # 2. markers only (Keep main)
    (re.compile(r'<<<<<<< HEAD\n=======\n(.*?)\n>>>>>>> gitlab/main', re.DOTALL), r'\1'),
    
    # 3. combined: true
    (re.compile(r'<<<<<<< HEAD\n    combined: true\n=======\n    combined: true,\n    realChurn: true,\n    realFail: true\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''    combined: true,
    realChurn: true,
    realFail: true
'''),
    
    # 4. pointsCombined
    (re.compile(r'<<<<<<< HEAD\n      pointsCombined: pCombined.trim\(\)\n=======\n      pointsCombined: pCombined.trim\(\),\n      pointsRealChurn: pRealChurn.trim\(\),\n      pointsRealFail: pRealFail.trim\(\)\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''      pointsCombined: pCombined.trim(),
      pointsRealChurn: pRealChurn.trim(),
      pointsRealFail: pRealFail.trim()
'''),
    
    # 5. combined score
    (re.compile(r'<<<<<<< HEAD\n          combined: solution\.difficulty\n=======\n          combined: solution\.difficulty,\n          telemetry\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''          combined: solution.difficulty,
          telemetry
'''),
    
    # 6. array length
    (re.compile(r'<<<<<<< HEAD\n          if \(w\.chunks && Array\.isArray\(w\.chunks\)\) \{\n=======\n          if \(w\.chunks && Array\.isArray\(w\.chunks\) && w\.chunks\.length > 0\) \{\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''          if (w.chunks && Array.isArray(w.chunks) && w.chunks.length > 0) {
'''),
    
    # 7. Use main UI parts
    (re.compile(r'<<<<<<< HEAD\n                            <div style=\{\{ display: \'flex\', justifyContent: \'space-between\', fontSize: \'11px\', borderTop: \'1px dashed rgba.*?\n=======\n                            <div style=\{\{ display: \'flex\', justifyContent: \'space-between\', fontSize: \'11px\', borderBottom: \'1px dashed rgba.*?\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '4px' }}>
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
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                                  <span style={{ color: '#10b981' }}>Real Ads/User:</span>
                                  <span style={{ color: '#10b981', fontWeight: 'bold' }}>{hLvl.telemetry.avg_ads_per_user ?? 0}</span>
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
'''),
    
    # 8. Points destructure
    (re.compile(r'<<<<<<< HEAD\n  const \{ pointsVocab, pointsMove, pointsLearning, pointsCombined \} = useMemo\(\(\) => \{\n=======\n  const \{ pointsVocab, pointsMove, pointsLearning, pointsCombined, pointsRealChurn, pointsRealFail \} = useMemo\(\(\) => \{\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''  const { pointsVocab, pointsMove, pointsLearning, pointsCombined, pointsRealChurn, pointsRealFail } = useMemo(() => {
'''),
    
    # 9. grid template
    (re.compile(r'<<<<<<< HEAD\n                                <div style=\{\{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: \'24px\' \}\}>\n=======\n                                 <div style=\{\{ display: \'grid\', gridTemplateColumns: \'1fr 1fr 1fr\', gap: \'24px\' \}\}>\n>>>>>>> gitlab/main\n', re.DOTALL),
     '''                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
'''),
    
    # 10. remove any remaining markers
    (re.compile(r'<<<<<<< HEAD\n', re.DOTALL), ''),
    (re.compile(r'=======\n', re.DOTALL), ''),
    (re.compile(r'>>>>>>> gitlab/main\n', re.DOTALL), '')
]
patch_file('src/components/LevelsDashboardModal.tsx', ldm_rep)
