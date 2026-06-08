import { useMemo } from 'react';
import { X, Calculator, ArrowRight, Zap, Target } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import { calculateSolution } from '../lib/solutionCalculator';

interface SolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node[];
  edges: Edge[];
  levelData: any;
}

export default function SolutionModal({ isOpen, onClose, nodes, edges, levelData }: SolutionModalProps) {
  if (!isOpen) return null;

  const solution = useMemo(() => {
    return calculateSolution(nodes, edges, levelData);
  }, [nodes, edges, levelData]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="glass-panel" style={{
        width: '600px', maxWidth: '90vw', maxHeight: '85vh',
        background: 'var(--bg-main)', borderRadius: '16px',
        border: '1px solid var(--panel-border)', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px', borderBottom: '1px solid var(--panel-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calculator size={20} color="#818cf8" /> Level Solution & Difficulty
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Summary Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Moves & Score */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Performance Metrics
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>Optimal Moves:</span>
                  <span style={{ fontWeight: 'bold' }}>{solution.totalMoves}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                  <span>Bonus Turns Earned:</span>
                  <span style={{ fontWeight: 'bold', color: '#22c55e' }}>+{solution.bonusTurns}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginTop: '4px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.1)' }}>
                  <span>Min Recommended Limit:</span>
                  <span style={{ fontWeight: 'bold', color: '#38bdf8' }}>{solution.recommendedMoveLimit}</span>
                </div>
              </div>
            </div>

            {/* Difficulty */}
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--panel-border)' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Difficulty Rating
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: '8px' }}>
                <span style={{ fontSize: '32px', fontWeight: 'bold', lineHeight: 1, color: solution.difficulty.color }}>
                  {solution.difficulty.score}
                </span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: solution.difficulty.color, marginBottom: '4px' }}>
                  {solution.difficulty.label}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {solution.difficulty.factors.map((factor, i) => (
                  <div key={i} style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                    <span style={{ color: solution.difficulty.color }}>•</span> {factor}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} /> Optimal Merge Sequence
            </h4>
            
            {solution.steps.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                No merges required. Add words and chunks to the level.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {solution.steps.map((step, idx) => (
                  <div key={step.id} style={{ 
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', 
                    background: step.isComboBonus ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.03)', 
                    border: step.isComboBonus ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--panel-border)',
                    borderRadius: '8px'
                  }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '20px', textAlign: 'right' }}>{idx + 1}.</span>
                    
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                        background: step.type === 'chunk' ? 'rgba(99,102,241,0.2)' : 'rgba(244,63,94,0.2)',
                        color: step.type === 'chunk' ? '#a5b4fc' : '#fda4af'
                      }}>{step.left}</span>
                      
                      <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>+</span>
                      
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                        background: step.type === 'chunk' ? 'rgba(99,102,241,0.2)' : 'rgba(244,63,94,0.2)',
                        color: step.type === 'chunk' ? '#a5b4fc' : '#fda4af'
                      }}>{step.right}</span>
                      
                      <ArrowRight size={14} color="var(--text-muted)" style={{ margin: '0 4px' }} />
                      
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold',
                        background: 'rgba(255,255,255,0.1)', color: 'white'
                      }}>{step.result}</span>
                    </div>

                    {step.isComboBonus && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4ade80', fontSize: '12px', fontWeight: 'bold' }}>
                        <Zap size={14} fill="#4ade80" /> +1 Turn
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
