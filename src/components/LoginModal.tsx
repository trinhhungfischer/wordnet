import React, { useState } from 'react';
import { X, Lock, User, KeyRound } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'hung123456@') {
      onLoginSuccess();
      onClose();
      setUsername('');
      setPassword('');
      setError('');
    } else {
      setError('Tài khoản hoặc mật khẩu không đúng!');
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', zIndex: 10000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        background: '#1e293b', width: '90%', maxWidth: '400px',
        borderRadius: '12px', border: '1px solid var(--panel-border)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', borderBottom: '1px solid var(--panel-border)',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={20} color="#818cf8" /> Admin Login
          </h2>
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

        {/* Content */}
        <form onSubmit={handleLogin} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '14px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tài khoản</label>
            <div style={{ position: 'relative' }}>
              <User size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, color: 'white' }} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 40px',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)',
                  color: 'white', borderRadius: '8px', fontSize: '14px'
                }}
                placeholder="Nhập tài khoản..."
                autoFocus
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mật khẩu</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, color: 'white' }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '10px 12px 10px 40px',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)',
                  color: 'white', borderRadius: '8px', fontSize: '14px'
                }}
                placeholder="Nhập mật khẩu..."
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              marginTop: '8px', padding: '12px', background: 'var(--accent)',
              color: 'white', border: 'none', borderRadius: '8px',
              fontSize: '15px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
          >
            Đăng nhập
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
