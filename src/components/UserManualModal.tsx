import React, { useState } from 'react';
import { X, ArrowRight, MousePointer2, Settings, Puzzle, Link, Image as ImageIcon } from 'lucide-react';

interface UserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserManualModal: React.FC<UserManualModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'magic' | 'mechanics' | 'calculate'>('basics');

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 10000, padding: '20px'
    }}>
      <div style={{
        background: 'var(--panel-bg)', borderRadius: '16px', border: '1px solid var(--panel-border)',
        width: '900px', height: '80vh', maxWidth: '100%',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--panel-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={24} color="#818cf8" /> Hướng dẫn sử dụng Wordnet Tool
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Tài liệu hướng dẫn thiết kế màn chơi chuyên dụng
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Sidebar Tabs */}
          <div style={{
            width: '240px', borderRight: '1px solid var(--panel-border)',
            background: 'rgba(0,0,0,0.1)', padding: '16px 12px',
            display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            <TabButton 
              active={activeTab === 'basics'} 
              icon={<MousePointer2 size={16} />} 
              label="1. Thao tác cơ bản" 
              onClick={() => setActiveTab('basics')} 
            />
            <TabButton 
              active={activeTab === 'magic'} 
              icon={<Puzzle size={16} />} 
              label="2. Công cụ thông minh" 
              onClick={() => setActiveTab('magic')} 
            />
            <TabButton 
              active={activeTab === 'mechanics'} 
              icon={<Settings size={16} />} 
              label="3. Chướng ngại vật" 
              onClick={() => setActiveTab('mechanics')} 
            />
            <TabButton 
              active={activeTab === 'calculate'} 
              icon={<Link size={16} />} 
              label="4. Phân tích & Xuất File" 
              onClick={() => setActiveTab('calculate')} 
            />
          </div>

          {/* Main Tab Content */}
          <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            {activeTab === 'basics' && (
              <div className="manual-section">
                <h3 style={{ marginTop: 0, color: 'white', fontSize: '24px' }}>1. Giao diện & Thao tác cơ bản</h3>
                
                <div style={{ 
                  width: '100%', height: '240px', borderRadius: '12px', marginBottom: '24px',
                  background: 'url(/manual/basic_ops.png) center/cover', border: '1px solid var(--panel-border)'
                }} />

                <div className="instruction-block">
                  <h4 style={{ color: '#fbbf24', marginTop: 0 }}>📍 Các loại Node</h4>
                  <ul style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    <li><strong style={{color: 'white'}}>Category (Màu Vàng):</strong> Đại diện cho chủ đề.</li>
                    <li><strong style={{color: 'white'}}>Word (Màu Xanh):</strong> Từ hoàn chỉnh.</li>
                    <li><strong style={{color: 'white'}}>Chunk (Màu Tím):</strong> Mảnh ghép nhỏ của từ.</li>
                  </ul>
                </div>

                <div className="instruction-block" style={{ marginTop: '20px' }}>
                  <h4 style={{ color: '#60a5fa', marginTop: 0 }}>🖱️ Thao tác nối dây (Link)</h4>
                  <ul style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    <li>Kéo từ chấm tròn của <strong>Chunk</strong> sang <strong>Word</strong> để định nghĩa cấu tạo từ.</li>
                    <li>Kéo từ <strong>Word</strong> sang <strong>Category</strong> để xếp từ vào đúng chủ đề.</li>
                    <li>Click vào đường nối và bấm phím <code>Delete</code> để xóa.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'magic' && (
              <div className="manual-section">
                <h3 style={{ marginTop: 0, color: 'white', fontSize: '24px' }}>2. Các công cụ thông minh</h3>
                
                <div style={{ 
                  width: '100%', height: '240px', borderRadius: '12px', marginBottom: '24px',
                  background: 'url(/manual/magic_wand.png) center/cover', border: '1px solid var(--panel-border)'
                }} />

                <div className="instruction-block">
                  <h4 style={{ color: '#a855f7', marginTop: 0 }}>✨ Magic Change</h4>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    Đây là công cụ tự động hóa mạnh mẽ nhất. Sau khi xếp các từ lên bàn, bạn bấm vào icon đũa thần ở góc trên.
                  </p>
                  <ul style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    <li><strong>Tự động cắt Chunk:</strong> Tool sẽ phân tích và băm nhỏ các từ thành mảnh ghép tối ưu nhất.</li>
                    <li><strong>Tự động gom Category:</strong> Nhận diện các từ và gom vào đúng chủ đề theo Dictionary.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'mechanics' && (
              <div className="manual-section">
                <h3 style={{ marginTop: 0, color: 'white', fontSize: '24px' }}>3. Chướng ngại vật (Mechanics)</h3>
                
                <div style={{ 
                  width: '100%', height: '240px', borderRadius: '12px', marginBottom: '24px',
                  background: 'url(/manual/mechanics.png) center/cover', border: '1px solid var(--panel-border)'
                }} />

                <div className="instruction-block">
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    Để gắn chướng ngại vật cho một từ, hãy <strong>chọn (click) vào Node chữ đó trên bàn làm việc</strong>, sau đó nhìn sang bảng Sidebar bên phải để thiết lập thông số.
                  </p>
                  <ul style={{ color: 'var(--text-muted)', lineHeight: '1.6', marginTop: '12px' }}>
                    <li><strong style={{color: '#818cf8'}}>🔗 Xích (Chain):</strong> Liên kết thứ tự các từ. Nền node sẽ chuyển màu tím nhạt.</li>
                    <li><strong style={{color: '#38bdf8'}}>🧊 Băng (Frozen):</strong> Đóng băng quả bóng, yêu cầu số lần ghép nhất định để vỡ.</li>
                    <li><strong style={{color: '#fbbf24'}}>🔑 Khóa & Chìa:</strong> Ghép chìa với khóa cùng ID để mở.</li>
                    <li><strong style={{color: '#f43f5e'}}>💣 Bom nổ:</strong> Quả bóng sẽ phát nổ nếu quá số lượt (moves) giới hạn.</li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === 'calculate' && (
              <div className="manual-section">
                <h3 style={{ marginTop: 0, color: 'white', fontSize: '24px' }}>4. Phân tích & Xuất JSON</h3>
                
                <div className="instruction-block">
                  <h4 style={{ color: '#4ade80', marginTop: 0 }}>🧮 Calculator</h4>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    Sau khi xếp màn xong, mở bảng Level Settings (Icon răng cưa góc phải) và bấm <strong>Calculate</strong>.
                  </p>
                  <ul style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    <li>Tính toán đường đi hoàn hảo nhất.</li>
                    <li>Phát hiện lỗi kẹt bóng (Deadlock) do setup xích hoặc băng sai.</li>
                    <li>Chấm điểm độ khó của màn chơi (Dễ, Khó, Siêu Khó).</li>
                  </ul>
                </div>

                <div className="instruction-block" style={{ marginTop: '20px' }}>
                  <h4 style={{ color: '#2dd4bf', marginTop: 0 }}>💾 Save JSON</h4>
                  <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>
                    Bấm <strong>Save JSON</strong> để lưu file xuống máy. Tool sẽ tự động chuẩn hóa dữ liệu, xóa rác và đóng gói thành định dạng chuẩn cho Unity Game Engine.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, icon, label, onClick }: any) => (
  <button
    onClick={onClick}
    style={{
      padding: '12px 16px', background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
      border: 'none', borderRadius: '8px', cursor: 'pointer',
      color: active ? '#818cf8' : 'var(--text-muted)',
      display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px',
      fontWeight: active ? 600 : 400, textAlign: 'left', transition: 'all 0.2s'
    }}
  >
    {icon} {label}
  </button>
);

// We need BookOpen icon
import { BookOpen } from 'lucide-react';

export default UserManualModal;
