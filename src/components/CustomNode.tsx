import { Handle, Position } from '@xyflow/react';

const CustomNode = ({ data, selected }: any) => {
  const isChunk = data.isChunk === true;

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
      background: isChunk ? 'rgba(0,0,0,0.4)' : 'var(--node-bg)',
      border: selected ? '1px solid var(--node-selected-border)' : (isChunk ? '1px dashed rgba(99,102,241,0.7)' : '1px solid var(--node-border)'),
      boxShadow: selected ? '0 0 15px rgba(99,102,241,0.5)' : '0 4px 6px rgba(0,0,0,0.1)'
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

      {data.globalIndex !== undefined && (
        <div style={{
          position: 'absolute',
          top: '50%',
          right: '-28px',
          transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.1)',
          color: 'var(--text-muted)',
          fontSize: '11px',
          padding: '2px 6px',
          borderRadius: '6px',
          border: '1px solid var(--panel-border)',
          fontWeight: 'bold',
          backdropFilter: 'blur(4px)',
          pointerEvents: 'none'
        }}>
          #{data.globalIndex}
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
