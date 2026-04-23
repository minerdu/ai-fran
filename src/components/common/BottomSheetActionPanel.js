'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * BottomSheetActionPanel — 通用底部动作面板
 * 
 * Props:
 *   open:       boolean — 是否展开
 *   onClose:    function — 关闭回调
 *   title:      string — 面板标题
 *   children:   ReactNode — 面板内容
 *   actions:    Array<{ label, onClick, variant: 'primary' | 'danger' | 'default', disabled? }>
 *   height:     string — 面板最大高度（默认 '60vh'）
 */
export default function BottomSheetActionPanel({ open, onClose, title, children, actions = [], height = '60vh' }) {
  const [visible, setVisible] = useState(false);
  const [animating, setAnimating] = useState(false);
  const sheetRef = useRef(null);

  useEffect(() => {
    let frameId = null;
    let animationFrameId = null;
    let timer = null;

    if (open) {
      frameId = requestAnimationFrame(() => {
        setVisible(true);
        animationFrameId = requestAnimationFrame(() => setAnimating(true));
      });
    } else {
      frameId = requestAnimationFrame(() => setAnimating(false));
      timer = setTimeout(() => setVisible(false), 300);
    }

    return () => {
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [open]);

  if (!visible) return null;

  const VARIANT_STYLES = {
    primary: { background: 'var(--color-primary)', color: '#fff', border: 'none', fontWeight: 600 },
    danger: { background: '#ef4444', color: '#fff', border: 'none', fontWeight: 600 },
    default: { background: '#f1f5f9', color: 'var(--color-text-primary)', border: '1px solid var(--color-border-light)', fontWeight: 500 },
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.35)',
          opacity: animating ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000,
          background: '#fff',
          borderRadius: '16px 16px 0 0',
          maxHeight: height,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
          transform: animating ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#d1d5db' }} />
        </div>

        {/* Title */}
        {title && (
          <div style={{ padding: '6px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-light)' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{title}</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: '4px' }}>✕</button>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', WebkitOverflowScrolling: 'touch' }}>
          {children}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div style={{ padding: '12px 16px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', borderTop: '1px solid var(--color-border-light)', display: 'flex', gap: '10px' }}>
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                disabled={action.disabled}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', fontSize: '14px', cursor: action.disabled ? 'not-allowed' : 'pointer',
                  opacity: action.disabled ? 0.5 : 1,
                  transition: 'all 0.2s',
                  ...(VARIANT_STYLES[action.variant] || VARIANT_STYLES.default),
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
