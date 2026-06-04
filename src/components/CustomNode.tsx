import { Handle, Position } from '@xyflow/react';

const CustomNode = ({ data, selected }: any) => {
  return (
    <div className={`custom-node glass-panel ${selected ? 'selected' : ''}`} style={{
      position: 'relative',
      padding: '12px 24px',
      borderRadius: '50px',
      minWidth: '120px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: 'var(--node-bg)',
      border: selected ? '1px solid var(--node-selected-border)' : '1px solid var(--node-border)',
      boxShadow: selected ? '0 0 15px rgba(99,102,241,0.5)' : '0 4px 6px rgba(0,0,0,0.1)'
    }}>
      <Handle
        type="target"
        position={Position.Top}
        style={{ width: '12px', height: '12px', background: 'var(--accent)', border: 'none' }}
      />
      
      <div style={{ fontWeight: 600, color: 'var(--text-main)', letterSpacing: '0.5px' }}>
        {String(data.label)}
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

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ width: '12px', height: '12px', background: 'var(--accent)', border: 'none' }}
      />
    </div>
  );
};

export default CustomNode;
