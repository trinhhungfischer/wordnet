import { Handle, Position } from '@xyflow/react';
import { Link, Snowflake } from 'lucide-react';

const CustomNode = ({ data, selected }: any) => {
  const isChunk = data.isChunk === true;
  const isChained = data.isChained === true;
  const isFrozen = data.isFrozen === true;

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
      background: isChunk ? 'rgba(0,0,0,0.4)' : (isFrozen ? 'rgba(56, 189, 248, 0.15)' : (isChained ? 'rgba(99,102,241,0.15)' : 'var(--node-bg)')),
      border: selected ? '1px solid var(--node-selected-border)' : (isChunk ? '1px dashed rgba(99,102,241,0.7)' : (isFrozen ? '2px solid rgba(56, 189, 248, 0.8)' : (isChained ? '2px solid rgba(99,102,241,0.8)' : '1px solid var(--node-border)'))),
      boxShadow: selected ? '0 0 15px rgba(99,102,241,0.5)' : (isFrozen ? '0 0 15px rgba(56, 189, 248, 0.3)' : (isChained ? '0 0 15px rgba(99,102,241,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'))
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
        {isChained && <Link size={14} style={{ color: '#818cf8', marginLeft: '4px' }} />}
        {isFrozen && <Snowflake size={14} style={{ color: '#38bdf8', marginLeft: isChained ? '2px' : '4px' }} />}
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
