import { Handle, Position } from '@xyflow/react';
import { Link, Snowflake, Lock, Key, Bomb, Eye, Wrench, PenTool } from 'lucide-react';

import { lockKeyColors } from './GraphEditor';

const CustomNode = ({ data, selected }: any) => {
  const isChunk = data.isChunk === true;
  const isChained = data.isChained === true;
  const isFrozen = data.isFrozen === true;
  const isBurst = data.isBurst === true;
  const burstMovesRemaining = data.burstMovesRemaining !== undefined ? data.burstMovesRemaining : 0;
  const lockIndex = data.lockIndex !== undefined ? data.lockIndex : -1;
  const keyIndex = data.keyIndex !== undefined ? data.keyIndex : -1;
  const isCryptic = data.isCryptic === true;
  const screwLockIndex = data.screwLockIndex !== undefined ? data.screwLockIndex : -1;
  const screwDriverIndex = data.screwDriverIndex !== undefined ? data.screwDriverIndex : -1;
  const screwCount = data.screwCount !== undefined ? data.screwCount : 0;

  const lockColor = lockIndex !== -1 ? lockKeyColors[lockIndex % lockKeyColors.length] : '#a1a1aa';
  const keyColor = keyIndex !== -1 ? lockKeyColors[keyIndex % lockKeyColors.length] : '#f59e0b';
  const screwLockColor = screwLockIndex !== -1 ? lockKeyColors[screwLockIndex % lockKeyColors.length] : '#f97316';
  const screwDriverColor = screwDriverIndex !== -1 ? lockKeyColors[screwDriverIndex % lockKeyColors.length] : '#fb923c';

  return (
    <div 
      className={`custom-node glass-panel ${selected ? 'selected' : ''}`} 
      style={{
      position: 'relative',
      padding: isChunk ? '6px 16px' : '12px 24px',
      borderRadius: '50px',
      minWidth: isChunk ? '80px' : '120px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: isChunk ? 'rgba(0,0,0,0.4)' : (keyIndex !== -1 ? 'rgba(250, 204, 21, 0.15)' : (lockIndex !== -1 ? 'rgba(161, 161, 170, 0.15)' : (screwDriverIndex !== -1 ? 'rgba(249, 115, 22, 0.1)' : (screwLockIndex !== -1 ? 'rgba(249, 115, 22, 0.15)' : (isBurst ? (burstMovesRemaining <= 3 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)') : (isCryptic ? 'rgba(192, 132, 252, 0.15)' : (isFrozen ? 'rgba(56, 189, 248, 0.15)' : (isChained ? 'rgba(99,102,241,0.15)' : 'var(--node-bg)')))))))),
      border: selected ? '1px solid var(--node-selected-border)' : (isChunk ? '1px dashed rgba(99,102,241,0.7)' : (keyIndex !== -1 ? '2px solid rgba(250, 204, 21, 0.8)' : (lockIndex !== -1 ? '2px solid rgba(161, 161, 170, 0.8)' : (screwDriverIndex !== -1 ? '2px solid rgba(249, 115, 22, 0.4)' : (screwLockIndex !== -1 ? '2px solid rgba(249, 115, 22, 0.8)' : (isBurst ? (burstMovesRemaining <= 3 ? '2px solid rgba(239, 68, 68, 0.8)' : '2px solid rgba(249, 115, 22, 0.8)') : (isCryptic ? '2px solid rgba(192, 132, 252, 0.8)' : (isFrozen ? '2px solid rgba(56, 189, 248, 0.8)' : (isChained ? '2px solid rgba(99,102,241,0.8)' : '1px solid var(--node-border)'))))))))),
      boxShadow: selected ? '0 0 15px rgba(99,102,241,0.5)' : (keyIndex !== -1 ? '0 0 15px rgba(250, 204, 21, 0.3)' : (lockIndex !== -1 ? '0 0 15px rgba(161, 161, 170, 0.3)' : (screwDriverIndex !== -1 ? '0 0 15px rgba(249, 115, 22, 0.2)' : (screwLockIndex !== -1 ? '0 0 15px rgba(249, 115, 22, 0.3)' : (isBurst ? (burstMovesRemaining <= 3 ? '0 0 15px rgba(239, 68, 68, 0.3)' : '0 0 15px rgba(249, 115, 22, 0.3)') : (isCryptic ? '0 0 15px rgba(192, 132, 252, 0.3)' : (isFrozen ? '0 0 15px rgba(56, 189, 248, 0.3)' : (isChained ? '0 0 15px rgba(99,102,241,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'))))))))
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: '12px', height: '12px', background: 'var(--accent)', border: 'none' }}
      />
      
      <div style={{ fontWeight: 600, color: isChunk ? '#a5b4fc' : 'var(--text-main)', fontSize: isChunk ? '13px' : '16px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {data.icon && !isChunk && (
          <img src={`/word_icon/${data.icon.endsWith('.png') ? data.icon : data.icon + '.png'}`} alt={String(data.label)} title={`Missing File: ${data.icon}`} style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PC9jaXJjbGU+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48bGluZSB4MT0iMyIgeTE9IjMiIHgyPSIyMSIgeTI9IjIxIj48L2xpbmU+PC9zdmc+'; }} />
        )}
        <span>{String(data.label)}</span>
        {keyIndex !== -1 && <Key size={14} style={{ color: keyColor, marginLeft: '4px' }} />}
        {lockIndex !== -1 && <Lock size={14} style={{ color: lockColor, marginLeft: '4px' }} />}
        {screwDriverIndex !== -1 && <PenTool size={14} style={{ color: screwDriverColor, marginLeft: '4px' }} />}
        {screwLockIndex !== -1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: screwLockColor, marginLeft: '4px' }}>
            <Wrench size={14} />
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{screwCount}</span>
          </div>
        )}
        {isChained && <Link size={14} style={{ color: '#818cf8', marginLeft: '4px' }} />}
        {isCryptic && <Eye size={14} style={{ color: '#c084fc', marginLeft: '4px' }} />}
        {isFrozen && <Snowflake size={14} style={{ color: '#38bdf8', marginLeft: '4px' }} />}
        {isBurst && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: burstMovesRemaining <= 3 ? '#ef4444' : '#f97316', marginLeft: '4px' }}>
            <Bomb size={14} />
            <span style={{ fontSize: '11px' }}>{burstMovesRemaining}</span>
          </div>
        )}
      </div>
      
      {data.isRoot && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: 'var(--accent)',
          fontSize: '10px',
          padding: '2px 8px',
          borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
        }}>
          Root
        </div>
      )}

      {data.dropIndex !== undefined && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: 'calc(100% - 6px)',
          transform: 'translateY(-50%)',
          background: 'rgba(56, 189, 248, 0.15)',
          color: '#7dd3fc',
          fontSize: '11px',
          padding: '2px 6px',
          borderRadius: '0 6px 6px 0',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderLeft: 'none',
          fontWeight: 'bold',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: -1
        }}>
          #{data.dropIndex}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: '12px', height: '12px', background: 'var(--accent)', border: 'none' }}
      />
    </div>
  );
};

export default CustomNode;
