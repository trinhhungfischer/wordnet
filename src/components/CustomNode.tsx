import { useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Magnet, Link, Snowflake, Lock, Key, Bomb, Eye, Wrench, PenTool, ArrowLeftRight, RefreshCw, CircleDashed, Pin, Timer, Rocket, Radiation, Ghost, Asterisk, Flame, Cloud, Zap, Layers, Maximize } from 'lucide-react';

import { lockKeyColors } from './GraphEditor';

export default function CustomNode({ data, selected, id }: any) {
  const { setNodes } = useReactFlow();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(data.label));

  const isChunk = data.isChunk === true;
  const isChained = data.isChained === true;
  const isLinkedMain = data.isLinkedMain === true;
  const isLinkedChunk = data.isLinkedChunk === true;
  const isFrozen = data.isFrozen === true;
  const isStackPipe = data.isStackPipe === true;
  const stackPipeDepth = data.stackPipeDepth !== undefined ? data.stackPipeDepth : 0;
  const stackPipeTotal = data.stackPipeTotal !== undefined ? data.stackPipeTotal : 0;
  const isBackward = data.isBackward === true;
  const isCrackBubble = data.isCrackBubble === true;
  const crackCountRemaining = data.crackCountRemaining !== undefined ? data.crackCountRemaining : 0;
  const isIceBomb = data.isIceBomb === true;
  const isBurst = data.isBurst === true;
  const burstMovesRemaining = data.burstMovesRemaining !== undefined ? data.burstMovesRemaining : 0;
  const lockIndex = data.lockIndex !== undefined ? data.lockIndex : -1;
  const keyIndex = data.keyIndex !== undefined ? data.keyIndex : -1;
  const isCryptic = data.isCryptic === true;
  const screwLockIndex = data.screwLockIndex !== undefined ? data.screwLockIndex : -1;
  const screwDriverIndex = data.screwDriverIndex !== undefined ? data.screwDriverIndex : -1;
  const screwCount = data.screwCount !== undefined ? data.screwCount : 0;
  const isCycleLock = data.isCycleLock === true;
  const isSoapBubble = data.isSoapBubble === true;
  const isCycleFadeOut = data.isCycleFadeOut === true;
  const isBombCrackingBubble = data.isBombCrackingBubble === true;
  const bombMergeRemain = data.bombMergeRemain !== undefined ? data.bombMergeRemain : 0;
  const isImmovable = data.isImmovable === true;
  const isSpikeBubble = data.isSpikeBubble === true;
  const isCountdown = data.isCountdown === true;
  const countdownValue = data.countdownValue;
  const isFloatBubble = data.isFloatBubble === true;
  const mergesToFloat = data.mergesToFloat !== undefined ? data.mergesToFloat : 0;
  const isTeleportBubble = data.isTeleportBubble === true;
  const mergesToTeleport = data.mergesToTeleport !== undefined ? data.mergesToTeleport : 0;
  const isResize = data.isResize === true;

  const lockColor = lockIndex !== -1 ? lockKeyColors[lockIndex % lockKeyColors.length] : '#a1a1aa';
  const keyColor = keyIndex !== -1 ? lockKeyColors[keyIndex % lockKeyColors.length] : '#f59e0b';
  const screwLockColor = screwLockIndex !== -1 ? lockKeyColors[screwLockIndex % lockKeyColors.length] : '#f97316';
  const screwDriverColor = screwDriverIndex !== -1 ? lockKeyColors[screwDriverIndex % lockKeyColors.length] : '#fb923c';

  let bgColor = 'var(--node-bg)';
  let borderColor = '1px solid var(--node-border)';
  let shadow = '0 4px 6px rgba(0,0,0,0.1)';

  if (isChunk) {
    bgColor = 'rgba(0,0,0,0.4)';
    borderColor = '1px dashed rgba(99,102,241,0.7)';
  } else if (keyIndex !== -1) {
    bgColor = 'rgba(250, 204, 21, 0.15)';
    borderColor = '2px solid rgba(250, 204, 21, 0.8)';
    shadow = '0 0 15px rgba(250, 204, 21, 0.3)';
  } else if (lockIndex !== -1) {
    bgColor = 'rgba(161, 161, 170, 0.15)';
    borderColor = '2px solid rgba(161, 161, 170, 0.8)';
    shadow = '0 0 15px rgba(161, 161, 170, 0.3)';
  } else if (screwDriverIndex !== -1) {
    bgColor = 'rgba(249, 115, 22, 0.1)';
    borderColor = '2px solid rgba(249, 115, 22, 0.4)';
    shadow = '0 0 15px rgba(249, 115, 22, 0.2)';
  } else if (screwLockIndex !== -1) {
    bgColor = 'rgba(249, 115, 22, 0.15)';
    borderColor = '2px solid rgba(249, 115, 22, 0.8)';
    shadow = '0 0 15px rgba(249, 115, 22, 0.3)';
  } else if (isBurst) {
    bgColor = burstMovesRemaining <= 3 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(249, 115, 22, 0.15)';
    borderColor = burstMovesRemaining <= 3 ? '2px solid rgba(239, 68, 68, 0.8)' : '2px solid rgba(249, 115, 22, 0.8)';
    shadow = burstMovesRemaining <= 3 ? '0 0 15px rgba(239, 68, 68, 0.3)' : '0 0 15px rgba(249, 115, 22, 0.3)';
  } else if (isCryptic) {
    bgColor = 'rgba(192, 132, 252, 0.15)';
    borderColor = '2px solid rgba(192, 132, 252, 0.8)';
    shadow = '0 0 15px rgba(192, 132, 252, 0.3)';
  } else if (isImmovable) {
    bgColor = 'rgba(107, 114, 128, 0.15)';
    borderColor = '2px solid rgba(107, 114, 128, 0.8)';
    shadow = '0 0 15px rgba(107, 114, 128, 0.3)';
  } else if (isCountdown) {
    bgColor = 'rgba(236, 72, 153, 0.15)';
    borderColor = '2px solid rgba(236, 72, 153, 0.8)';
    shadow = '0 0 15px rgba(236, 72, 153, 0.3)';
  } else if (isStackPipe) {
    bgColor = 'rgba(74, 222, 128, 0.15)';
    borderColor = '2px solid rgba(74, 222, 128, 0.8)';
    shadow = '0 0 15px rgba(74, 222, 128, 0.3)';
  } else if (isFrozen) {
    bgColor = 'rgba(56, 189, 248, 0.15)';
    borderColor = '2px solid rgba(56, 189, 248, 0.8)';
    shadow = '0 0 15px rgba(56, 189, 248, 0.3)';
  } else if (isCrackBubble) {
    bgColor = 'rgba(251, 191, 36, 0.15)';
    borderColor = '2px dashed rgba(251, 191, 36, 0.8)';
    shadow = '0 0 15px rgba(251, 191, 36, 0.3)';
  } else if (isBackward) {
    bgColor = 'rgba(168, 85, 247, 0.15)';
    borderColor = '2px solid rgba(168, 85, 247, 0.8)';
    shadow = '0 0 15px rgba(168, 85, 247, 0.3)';
  } else if (isCycleLock) {
    bgColor = 'rgba(20, 184, 166, 0.15)';
    borderColor = '2px solid rgba(20, 184, 166, 0.8)';
    shadow = '0 0 15px rgba(20, 184, 166, 0.3)';
  } else if (isCycleFadeOut) {
    bgColor = 'rgba(100, 116, 139, 0.15)';
    borderColor = '2px solid rgba(100, 116, 139, 0.8)';
    shadow = '0 0 15px rgba(100, 116, 139, 0.3)';
  } else if (isSoapBubble) {
    bgColor = 'rgba(236, 72, 153, 0.15)';
    borderColor = '2px dashed rgba(236, 72, 153, 0.8)';
    shadow = '0 0 15px rgba(236, 72, 153, 0.3)';
  } else if (isBombCrackingBubble) {
    bgColor = 'rgba(249, 115, 22, 0.15)';
    borderColor = '2px dashed rgba(249, 115, 22, 0.8)';
    shadow = '0 0 15px rgba(249, 115, 22, 0.3)';
  } else if (isSpikeBubble) {
    bgColor = 'rgba(220, 38, 38, 0.15)';
    borderColor = '2px solid rgba(220, 38, 38, 0.8)';
    shadow = '0 0 15px rgba(220, 38, 38, 0.3)';
  } else if (isFloatBubble) {
    bgColor = 'rgba(96, 165, 250, 0.15)';
    borderColor = '2px dashed rgba(96, 165, 250, 0.8)';
    shadow = '0 0 15px rgba(96, 165, 250, 0.3)';
  } else if (isTeleportBubble) {
    bgColor = 'rgba(234, 179, 8, 0.15)';
    borderColor = '2px dashed rgba(234, 179, 8, 0.8)';
    shadow = '0 0 15px rgba(234, 179, 8, 0.3)';
  } else if (isResize) {
    bgColor = 'rgba(245, 158, 11, 0.15)';
    borderColor = '2px dashed rgba(245, 158, 11, 0.8)';
    shadow = '0 0 15px rgba(245, 158, 11, 0.3)';
  } else if (isLinkedMain) {
    bgColor = 'rgba(14, 165, 233, 0.15)';
    borderColor = '2px solid rgba(14, 165, 233, 0.8)';
    shadow = '0 0 15px rgba(14, 165, 233, 0.3)';
  } else if (isLinkedChunk) {
    bgColor = 'rgba(14, 165, 233, 0.05)';
    borderColor = '2px dashed rgba(14, 165, 233, 0.8)';
    shadow = '0 0 10px rgba(14, 165, 233, 0.2)';
  } else if (isChained) {
    bgColor = 'rgba(99,102,241,0.15)';
    borderColor = '2px solid rgba(99,102,241,0.8)';
    shadow = '0 0 15px rgba(99,102,241,0.3)';
  }

  if (selected) {
    borderColor = '1px solid var(--node-selected-border)';
    shadow = '0 0 15px rgba(99,102,241,0.5)';
  }

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
      background: bgColor,
      border: borderColor,
      boxShadow: shadow
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: '12px', height: '12px', background: 'var(--accent)', border: 'none' }}
      />
      
      <div style={{ fontWeight: 600, color: isChunk ? '#a5b4fc' : 'var(--text-main)', fontSize: isChunk ? '13px' : '16px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
        {data.icon && !isChunk && !isEditing && (
          <img src={`/word_icon/${data.icon.endsWith('.png') ? data.icon : data.icon + '.png'}`} alt={String(data.label)} title={`Missing File: ${data.icon}`} style={{ width: '24px', height: '24px', objectFit: 'contain' }} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjOWNhM2FmIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiPjwvcmVjdD48Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSI+PC9jaXJjbGU+PHBvbHlsaW5lIHBvaW50cz0iMjEgMTUgMTYgMTAgNSAyMSI+PC9wb2x5bGluZT48bGluZSB4MT0iMyIgeTE9IjMiIHgyPSIyMSIgeTI9IjIxIj48L2xpbmU+PC9zdmc+'; }} />
        )}
        
        {isEditing ? (
          <input
            className="nodrag"
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              if (editValue.trim()) {
                setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: editValue.trim() } } : n));
              }
              setIsEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (editValue.trim()) {
                  setNodes((nds) => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: editValue.trim() } } : n));
                }
                setIsEditing(false);
              }
            }}
            style={{
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              border: '1px solid var(--accent)',
              borderRadius: '4px',
              padding: '2px 6px',
              outline: 'none',
              width: '100px',
              textAlign: 'center',
              fontFamily: 'inherit',
              fontSize: 'inherit',
              fontWeight: 'inherit'
            }}
          />
        ) : (
          <span 
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditValue(String(data.label));
              setIsEditing(true);
            }}
            style={{ cursor: 'text' }}
          >
            {String(data.label)}
          </span>
        )}
        
        {keyIndex !== -1 && !isEditing && <Key size={14} style={{ color: keyColor, marginLeft: '4px' }} />}
        {lockIndex !== -1 && <Lock size={14} style={{ color: lockColor, marginLeft: '4px' }} />}
        {screwDriverIndex !== -1 && <PenTool size={14} style={{ color: screwDriverColor, marginLeft: '4px' }} />}
        {screwLockIndex !== -1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: screwLockColor, marginLeft: '4px' }}>
            <Wrench size={14} />
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{screwCount}</span>
          </div>
        )}
        {isCycleLock && <RefreshCw size={14} style={{ color: '#14b8a6', marginLeft: '4px' }} />}
        {isSoapBubble && <CircleDashed size={14} style={{ color: '#ec4899', marginLeft: '4px' }} />}
        {isBombCrackingBubble && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#f97316', marginLeft: '4px' }}>
            <Flame size={14} />
            <span style={{ fontSize: '11px' }}>{bombMergeRemain}</span>
          </div>
        )}
        {isFloatBubble && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#60a5fa', marginLeft: '4px' }}>
            <Cloud size={14} />
            <span style={{ fontSize: '11px' }}>{mergesToFloat}</span>
          </div>
        )}
        {isTeleportBubble && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#eab308', marginLeft: '4px' }}>
            <Rocket size={14} />
            <span style={{ fontSize: '11px' }}>{mergesToTeleport}</span>
          </div>
        )}
        {isCycleFadeOut && <Ghost size={14} style={{ color: '#64748b', marginLeft: '4px' }} />}
        {isLinkedMain && <Magnet size={14} style={{ color: '#0ea5e9', marginLeft: '4px' }} />}
        {isLinkedChunk && <Magnet size={14} style={{ color: '#bae6fd', marginLeft: '4px' }} />}
        {isChained && <Link size={14} style={{ color: '#818cf8', marginLeft: '4px' }} />}
        {isImmovable && <Pin size={14} style={{ color: '#9ca3af', marginLeft: '4px' }} />}
        {isIceBomb && <Radiation size={14} style={{ color: '#38bdf8', marginLeft: '4px' }} />}
        {isStackPipe && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#4ade80', marginLeft: '4px' }}>
            <Layers size={14} />
            <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{stackPipeDepth + 1}/{stackPipeTotal}</span>
          </div>
        )}
        {isFrozen && <Snowflake size={14} style={{ color: '#38bdf8', marginLeft: '4px' }} />}
        {isCryptic && <Eye size={14} style={{ color: '#c084fc', marginLeft: '4px' }} />}
        {isCrackBubble && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#fbbf24', marginLeft: '4px' }}>
            <Zap size={14} />
            <span style={{ fontSize: '11px' }}>{crackCountRemaining}</span>
          </div>
        )}
        {isBackward && <ArrowLeftRight size={14} style={{ color: '#a855f7', marginLeft: '4px' }} />}
        {isBurst && burstMovesRemaining > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: burstMovesRemaining <= 3 ? '#ef4444' : '#f97316', marginLeft: '4px' }}>
            <Bomb size={14} />
            <span style={{ fontSize: '11px' }}>{burstMovesRemaining}</span>
          </div>
        )}
        {isCountdown && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: '#ec4899', marginLeft: '4px' }}>
            <Timer size={14} />
            <span style={{ fontSize: '11px' }}>{countdownValue?.[0]}</span>
          </div>
        )}
        {isSpikeBubble && <Asterisk size={14} style={{ color: '#dc2626', marginLeft: '4px' }} />}
        {isResize && <Maximize size={14} style={{ color: '#f59e0b', marginLeft: '4px' }} />}
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

