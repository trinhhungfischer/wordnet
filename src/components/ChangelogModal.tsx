import React, { useState, useMemo } from 'react';
import { X, History, Calendar, CheckCircle2, Edit2, Trash2, Plus, Layers, Target, Download, Upload, Package, Cloud } from 'lucide-react';
import initialChangelogData from '../data/changelog.json';

interface ChangelogEntry {
  version: string;
  levels: string;
  date: string;
  note: string;
  isBuilt?: boolean;
}

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectLevel: (level: string, customPath?: string) => void;
  selectedLevelName: string;
  isAdmin: boolean;
  levels?: string[];
  stagedLevels?: Record<string, any>;
  onSelectDraftLevel?: (level: string) => void;
  onClearDraft?: (level: string) => void;
  onPublishUpdate?: (note: string, targetVersion: string) => void;
}

const TAG_COLORS = [
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#14b8a6', // teal
  '#f97316', // orange
];

const getTagColor = (version: string) => {
  let hash = 0;
  for (let i = 0; i < version.length; i++) {
    hash = version.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
};

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, onSelectLevel, selectedLevelName, isAdmin, levels = [], stagedLevels = {}, onSelectDraftLevel, onClearDraft, onPublishUpdate }) => {
  const [changelogData, setChangelogData] = useState<ChangelogEntry[]>(initialChangelogData);
  const [selectedVersion, setSelectedVersion] = useState<string>('all');

  // Calculate highest level from the list of all levels
  const highestLevel = useMemo(() => {
    if (!levels || levels.length === 0) return 0;
    const nums = levels.map(l => parseInt(l.replace(/\D/g, ''))).filter(n => !isNaN(n));
    return nums.length > 0 ? Math.max(...nums) : 0;
  }, [levels]);

  // Calculate total number of levels
  const totalLevels = levels.length;

  // Level numbers for 'all' mode
  const allLevelsList = useMemo(() => {
    return levels.map(l => l.replace('Level ', '').replace('.json', '')).sort((a, b) => parseInt(a) - parseInt(b));
  }, [levels]);

  // Map each level to its latest update version
  const levelToLatestVersion = useMemo(() => {
    const map: Record<string, string> = {};
    changelogData.forEach(log => {
      const lvls = log.levels.split(',').map(s => s.trim()).filter(s => s);
      lvls.forEach(l => {
        map[l] = log.version;
      });
    });
    return map;
  }, [changelogData]);

  // CRUD states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ChangelogEntry>({ version: '', levels: '', date: '', note: '' });
  const [editIndex, setEditIndex] = useState<number>(-1);

  const selectedLog = useMemo(() => {
    return selectedVersion === 'all' ? null : (changelogData.find(log => log.version === selectedVersion) || changelogData[0]);
  }, [selectedVersion, changelogData]);

  const levelList = useMemo(() => {
    if (selectedVersion === 'all') return allLevelsList;
    if (!selectedLog || !selectedLog.levels) return [];
    return selectedLog.levels.split(',').map(s => s.trim()).filter(s => s);
  }, [selectedLog, selectedVersion, allLevelsList]);

  if (!isOpen) return null;

  const handleSave = async () => {
    let newData = [...changelogData];
    if (editIndex >= 0) {
      newData[editIndex] = editForm;
    } else {
      newData.push(editForm);
    }
    
    setChangelogData(newData);
    setIsEditing(false);
    setSelectedVersion(editForm.version);
    
    try {
      await fetch('/api/update-changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
    } catch (e) {
      console.error(e);
      alert('Lỗi lưu changelog!');
    }
  };

  const handleDelete = async (index: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa log này?')) return;
    const newData = [...changelogData];
    newData.splice(index, 1);
    
    setChangelogData(newData);
    if (newData.length > 0) {
      setSelectedVersion(newData[newData.length - 1].version);
    }
    
    try {
      await fetch('/api/update-changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleExport = () => {
    const dataToExport = changelogData.map(log => ({
      ...log,
      isBuilt: log.isBuilt || false
    }));
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "changelog.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          setChangelogData(data);
          try {
            await fetch('/api/update-changelog', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data)
            });
            alert('Import changelog thành công!');
          } catch (e) {
            console.error(e);
            alert('Lỗi khi lưu changelog lên server!');
          }
        } else {
          alert('File JSON không đúng định dạng changelog (phải là mảng).');
        }
      } catch (err) {
        alert('Lỗi đọc file JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleGenerateUpdatePack = () => {
    // Lấy các version CHƯA có isBuilt = true
    const unbuiltLogs = changelogData.filter(l => !l.isBuilt);
    
    if (unbuiltLogs.length === 0) {
      alert("Không có phiên bản nào mới trên Cloud chưa được update lên Build!");
      return;
    }

    // Sort versions to process oldest to newest (e.g. v4, v5, v6...)
    const sortedVersions = unbuiltLogs.map(l => l.version).sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    const levelMap = new Map<number, string>(); // level number -> version string (e.g. 16 -> '6')

    sortedVersions.forEach(versionStr => {
      const log = changelogData.find(l => l.version === versionStr);
      if (!log) return;
      
      const vNumStr = versionStr.replace(/\D/g, ''); // Extract '6' from 'v6'
      
      // Parse levels (e.g., 'Level 1, Level 2' or '1, 2')
      const levelsStr = log.levels;
      if (!levelsStr) return;
      
      const parts = levelsStr.split(',').map(s => s.trim()).filter(Boolean);
      parts.forEach(p => {
        const match = p.match(/\d+/);
        if (match) {
          const num = parseInt(match[0], 10);
          levelMap.set(num, vNumStr); // Newer versions overwrite older ones because of the sorting
        }
      });
    });

    // Create the final array sorted by level number
    const resultArr = Array.from(levelMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([levelNum, verNum]) => ({
        level: levelNum.toString(),
        csv: `v${verNum}/Level ${levelNum}.json`,
        ver: verNum
      }));

    const finalJson = { "0": resultArr };

    // Trigger download
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(finalJson, null, 0));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `update_pack_${sortedVersions.join('_')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleToggleBuildStatus = async (version: string) => {
    const newData = changelogData.map(log => {
      if (log.version === version) {
        return { ...log, isBuilt: !log.isBuilt };
      }
      return log;
    });
    setChangelogData(newData);
    try {
      await fetch('/api/update-changelog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newData)
      });
    } catch (e) {
      console.error(e);
      alert('Lỗi lưu trạng thái Build lên server!');
    }
  };

  const renderEditForm = () => (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--panel-bg)', flex: 1, overflowY: 'auto' }}>
      <h3 style={{ margin: 0, color: 'white' }}>{editIndex >= 0 ? 'Sửa Changelog' : 'Thêm Changelog mới'}</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Version (ví dụ: v9)</label>
        <input 
          value={editForm.version} 
          onChange={e => setEditForm({...editForm, version: e.target.value})}
          style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'white' }} 
        />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ngày cập nhật (ví dụ: 10h 25/7)</label>
        <input 
          value={editForm.date} 
          onChange={e => setEditForm({...editForm, date: e.target.value})}
          style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'white' }} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Danh sách Level (phân cách bằng dấu phẩy)</label>
        <textarea 
          value={editForm.levels} 
          onChange={e => setEditForm({...editForm, levels: e.target.value})}
          rows={3}
          style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'white', resize: 'vertical' }} 
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Ghi chú (Note)</label>
        <input 
          value={editForm.note} 
          onChange={e => setEditForm({...editForm, note: e.target.value})}
          style={{ padding: '10px', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', color: 'white' }} 
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
        <input 
          type="checkbox" 
          checked={editForm.isBuilt || false} 
          onChange={e => setEditForm({...editForm, isBuilt: e.target.checked})}
          id="edit-isbuilt-checkbox"
          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
        />
        <label htmlFor="edit-isbuilt-checkbox" style={{ fontSize: '14px', color: 'white', cursor: 'pointer' }}>Đã update lên Build</label>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
        <button onClick={handleSave} style={{ padding: '10px 16px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Lưu</button>
        <button onClick={() => setIsEditing(false)} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Hủy</button>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', zIndex: 10000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        background: '#1e293b', width: '80%', maxWidth: '900px', height: '80vh',
        borderRadius: '12px', border: '1px solid var(--panel-border)',
        display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--panel-border)',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={20} color="#818cf8" /> Lịch sử cập nhật màn chơi
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {isAdmin && !isEditing && (
              <>
                <label
                  title="Nhập (Upload) Changelog"
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', fontSize: '13px',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer',
                    margin: 0
                  }}
                >
                  <Upload size={16} /> Import
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
                </label>
                <button
                  onClick={() => {
                    setEditForm({ version: `v${changelogData.length + 1}`, levels: '', date: '', note: '' });
                    setEditIndex(-1);
                    setIsEditing(true);
                  }}
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', fontSize: '13px',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                  }}
                >
                  <Plus size={16} /> Thêm Log mới
                </button>
              </>
            )}
            {!isEditing && (
              <>
                <button
                  onClick={handleExport}
                  title="Xuất (Download) Changelog"
                  style={{
                    background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', fontSize: '13px',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                  }}
                >
                  <Download size={16} /> Export
                </button>
                <button
                  onClick={handleGenerateUpdatePack}
                  title="Tạo file Update JSON từ các log chưa được đưa lên build"
                  style={{
                    background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981', padding: '6px 12px', borderRadius: '6px', fontSize: '13px',
                    fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer'
                  }}
                >
                  <Package size={16} /> Tạo JSON
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'transparent', border: 'none', color: 'white',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                padding: '4px', opacity: 0.7, borderRadius: '4px'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar - Versions */}
          <div style={{
            width: '260px', borderRight: '1px solid var(--panel-border)',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
            background: 'rgba(0,0,0,0.2)'
          }}>
            
            {/* Overview / All Levels tab */}
            <div
              onClick={() => !isEditing && setSelectedVersion('all')}
              style={{
                padding: '16px', cursor: isEditing ? 'default' : 'pointer',
                background: selectedVersion === 'all' ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
                borderLeft: `3px solid ${selectedVersion === 'all' ? '#818cf8' : 'transparent'}`,
                color: selectedVersion === 'all' ? '#818cf8' : 'white',
                transition: 'all 0.2s',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                opacity: isEditing ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isEditing && selectedVersion !== 'all') e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                if (!isEditing && selectedVersion !== 'all') e.currentTarget.style.background = 'transparent';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                <Layers size={18} /> Tất cả màn chơi
              </div>
              <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                Tổng cộng: {totalLevels} màn chơi
              </div>
            </div>

            {isAdmin && (
              <div
                onClick={() => !isEditing && setSelectedVersion('draft')}
                style={{
                  padding: '16px', cursor: isEditing ? 'default' : 'pointer',
                  background: selectedVersion === 'draft' ? 'rgba(245, 158, 11, 0.1)' : 'transparent',
                  borderLeft: `3px solid ${selectedVersion === 'draft' ? '#f59e0b' : 'transparent'}`,
                  color: selectedVersion === 'draft' ? '#f59e0b' : 'white',
                  transition: 'all 0.2s',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  opacity: isEditing ? 0.5 : 1
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                  <Edit2 size={18} /> Bản Nháp
                </div>
                <div style={{ fontSize: '12px', opacity: 0.6, marginTop: '4px' }}>
                  Đang có {Object.keys(stagedLevels).length} màn thay đổi
                </div>
              </div>
            )}

             {/* Reverse order so newest is at the top */}
            {[...changelogData].reverse().map(log => {
               const lvls = log.levels.split(',').map(s => s.trim()).filter(s => s);
               const originalIndex = changelogData.findIndex(l => l.version === log.version);
               
               return (
                <div
                  key={log.version}
                  onClick={() => !isEditing && setSelectedVersion(log.version)}
                  style={{
                    padding: '16px', cursor: isEditing ? 'default' : 'pointer',
                    background: selectedVersion === log.version ? 'rgba(129, 140, 248, 0.1)' : 'transparent',
                    borderLeft: `3px solid ${selectedVersion === log.version ? '#818cf8' : 'transparent'}`,
                    color: selectedVersion === log.version ? '#818cf8' : 'white',
                    transition: 'all 0.2s',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    opacity: isEditing ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isEditing && selectedVersion !== log.version) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                  onMouseLeave={(e) => {
                    if (!isEditing && selectedVersion !== log.version) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontWeight: 600, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Version {log.version}
                    </div>
                    {!isEditing && (
                      <div 
                        onClick={(e) => { 
                          if (isAdmin) {
                            e.stopPropagation(); 
                            handleToggleBuildStatus(log.version); 
                          }
                        }}
                        style={{ cursor: isAdmin ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        title={log.isBuilt ? "Đã update lên build" + (isAdmin ? " (Click để bỏ đánh dấu)" : "") : "Mới có trên cloud" + (isAdmin ? " (Click để đánh dấu đã update)" : "")}
                      >
                        {log.isBuilt ? <CheckCircle2 size={16} color="#10b981" /> : <Cloud size={16} color="rgba(255,255,255,0.4)" />}
                      </div>
                    )}
                  </div>

                  {isAdmin && !isEditing && selectedVersion === log.version && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditForm({...log}); setEditIndex(originalIndex); setIsEditing(true); }}
                        style={{ background: 'transparent', border: 'none', color: '#fbbf24', cursor: 'pointer', padding: '4px' }}
                        title="Sửa"
                      ><Edit2 size={14} /></button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDelete(originalIndex); }}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Xóa"
                      ><Trash2 size={14} /></button>
                    </div>
                  )}
                  <div style={{ fontSize: '12px', opacity: 0.6, display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                    <span>{lvls.length} levels modified</span>
                    <span>{log.date}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Content */}
          {isEditing ? renderEditForm() : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', overflowY: 'auto', background: 'var(--panel-bg)' }}>
              {selectedVersion === 'all' ? (
                <>
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Layers size={24} /> Tổng quan màn chơi
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      <div style={{
                        background: 'rgba(129, 140, 248, 0.1)', color: '#818cf8', border: '1px solid rgba(129, 140, 248, 0.2)',
                        padding: '12px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px'
                      }}>
                        <Target size={24} />
                        <div>
                          <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Màn cao nhất đang config</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>Level {highestLevel}</div>
                        </div>
                      </div>
                      
                      <div style={{
                        background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)',
                        padding: '12px 20px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px'
                      }}>
                        <Layers size={24} />
                        <div>
                          <div style={{ fontSize: '12px', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng số lượng</div>
                          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{totalLevels} levels</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Tất cả danh sách màn chơi ({levelList.length})
                    </h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', 
                      gap: '12px' 
                    }}>
                      {levelList.map((lvlNumber, i) => {
                        const displayLvlName = `Level ${lvlNumber}`;
                        const exactLvl = `Level ${lvlNumber}.json`; 
                        
                        const isSelected = selectedLevelName === exactLvl || selectedLevelName === displayLvlName;

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              onSelectLevel(exactLvl);
                              onClose();
                            }}
                            style={{
                              background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--panel-border)'}`,
                              color: 'white',
                              padding: '12px 8px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: isSelected ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              display: 'flex',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              }
                            }}
                          >
                            {lvlNumber}
                            {levelToLatestVersion[lvlNumber] && (
                              <div style={{
                                position: 'absolute', top: '-6px', right: '-6px',
                                background: getTagColor(levelToLatestVersion[lvlNumber]), color: 'white', fontSize: '10px',
                                padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                              }}>
                                {levelToLatestVersion[lvlNumber]}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : selectedVersion === 'draft' ? (
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', color: '#f59e0b' }}>
                      Bản Nháp (Chưa Publish)
                    </h3>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <select
                        id="draft-target-version"
                        style={{ padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)', color: 'white', minWidth: '200px' }}
                      >
                        <option value="new">Tạo mới ({changelogData.length > 0 ? 'v' + ((parseInt(changelogData[changelogData.length - 1].version.replace('v', '')) || 0) + 1) : 'v1'})</option>
                        {[...changelogData].reverse().map(log => (
                          <option key={log.version} value={log.version}>Cập nhật vào {log.version}</option>
                        ))}
                      </select>
                      <input 
                        type="text" 
                        placeholder="Nhập ghi chú (nếu cập nhật version cũ sẽ ghi đè ghi chú cũ)..." 
                        style={{ flex: 1, padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
                        id="draft-note-input"
                      />
                      <button 
                        onClick={() => {
                          const note = (document.getElementById('draft-note-input') as HTMLInputElement)?.value || '';
                          const targetVer = (document.getElementById('draft-target-version') as HTMLSelectElement)?.value || 'new';
                          onPublishUpdate?.(note, targetVer);
                        }}
                        style={{ padding: '10px 20px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >
                        Publish Update
                      </button>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'white' }}>Các level đã sửa ({Object.keys(stagedLevels).length})</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                      {Object.keys(stagedLevels).map(lvl => (
                         <div key={lvl} style={{ position: 'relative' }}>
                            <button
                              onClick={() => onSelectDraftLevel?.(lvl)}
                              style={{ width: '100%', padding: '12px 8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', color: '#f59e0b', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              {lvl.replace('.json', '')}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if(window.confirm(`Xóa bản nháp của ${lvl}?`)) {
                                  onClearDraft?.(lvl);
                                }
                              }}
                              style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              title="Xóa nháp"
                            >
                          <Edit2 size={14} /> Sửa
                        </button>
                        <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if(window.confirm(`Xóa bản nháp của ${lvl}?`)) {
                                  onClearDraft?.(lvl);
                                }
                              }}
                              style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              title="Xóa nháp"
                            >
                              <X size={12} />
                            </button>
                         </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : selectedLog ? (
                <>
                  <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', color: '#818cf8' }}>
                      Version {selectedLog.version}
                    </h3>
                    <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Calendar size={16} /> Cập nhật lúc: {selectedLog.date}
                      </div>
                    </div>
                    {selectedLog.note && (
                      <div style={{
                        background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.2)',
                        padding: '12px 16px', borderRadius: '8px', fontSize: '14px',
                        display: 'flex', alignItems: 'center', gap: '8px'
                      }}>
                        <CheckCircle2 size={18} /> {selectedLog.note}
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      Danh sách các level đã chỉnh sửa ({levelList.length})
                    </h4>
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', 
                      gap: '12px' 
                    }}>
                      {levelList.map((lvlNumber, i) => {
                        const displayLvlName = `Level ${lvlNumber}`;
                        const exactLvl = `Level ${lvlNumber}.json`; 
                        
                        const isSelected = selectedLevelName === exactLvl || selectedLevelName === displayLvlName;

                        return (
                          <button
                            key={i}
                            onClick={() => {
                              const path = selectedLog ? `/${selectedLog.version}/Level ${lvlNumber}.json` : undefined;
                              onSelectLevel(exactLvl, path);
                              onClose();
                            }}
                            style={{
                              background: isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--panel-border)'}`,
                              color: 'white',
                              padding: '12px 8px',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: isSelected ? 'bold' : 'normal',
                              transition: 'all 0.2s',
                              justifyContent: 'center',
                              alignItems: 'center',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                              }
                            }}
                          >
                            {lvlNumber}
                            {levelToLatestVersion[lvlNumber] && (
                              <div style={{
                                position: 'absolute', top: '-6px', right: '-6px',
                                background: getTagColor(levelToLatestVersion[lvlNumber]), color: 'white', fontSize: '10px',
                                padding: '2px 4px', borderRadius: '4px', fontWeight: 'bold',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                              }}>
                                {levelToLatestVersion[lvlNumber]}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  Không có phiên bản nào được chọn hoặc dữ liệu trống.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default ChangelogModal;
