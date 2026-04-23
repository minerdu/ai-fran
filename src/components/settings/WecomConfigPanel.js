'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/components/common/Toast';
import styles from './YouzanConfigPanel.module.css';

export default function WecomConfigPanel() {
  const toast = useToast();
  const [config, setConfig] = useState({
    gateway: '',
    clientId: '',
    clientSecret: '',
    bridgeWxId: '',
    bridgeAuth: '',
    testTargetWxId: '',
    wxType: 2,
    enabled: false,
    hasSecret: false,
    hasBridgeAuth: false,
    lastTestAt: null,
    lastTestStatus: '',
    lastTestMessage: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/wecom');
      if (!res.ok) return;
      const data = await res.json();
      setConfig((prev) => ({
        ...prev,
        gateway: data.gateway || '',
        clientId: data.clientId || '',
        clientSecret: '',
        bridgeWxId: data.bridgeWxId || '',
        bridgeAuth: '',
        testTargetWxId: data.testTargetWxId || '',
        wxType: data.wxType || 2,
        enabled: data.enabled ?? false,
        hasSecret: data.hasSecret || false,
        hasBridgeAuth: data.hasBridgeAuth || false,
        lastTestAt: data.lastTestAt || null,
        lastTestStatus: data.lastTestStatus || '',
        lastTestMessage: data.lastTestMessage || '',
      }));
    } catch (error) {
      toast.error('读取企业微信配置失败');
    }
  }, [toast]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  const saveConfig = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...config,
        clientSecret: config.clientSecret || (config.hasSecret ? '••••••••' : ''),
        bridgeAuth: config.bridgeAuth || (config.hasBridgeAuth ? '••••••••' : ''),
      };
      const res = await fetch('/api/wecom', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '保存失败');
      }
      toast.success('企业微信配置已保存');
      await loadConfig();
    } catch (error) {
      toast.error(error.message || '保存失败');
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/wecom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'connection' }),
      });
      const data = await res.json();
      setTestResult(data);
      if (!res.ok || !data.success) {
        throw new Error(data.message || '连接失败');
      }
      toast.success(data.message || '企业微信连接成功');
      await loadConfig();
    } catch (error) {
      setTestResult({ success: false, message: error.message || '连接失败' });
      toast.error(error.message || '连接失败');
    } finally {
      setIsTesting(false);
    }
  };

  const sendTestMessage = async () => {
    setIsSending(true);
    try {
      const res = await fetch('/api/wecom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'send',
          wechatId: config.testTargetWxId,
          content: 'AI-Franchise 企业微信联调测试消息',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || '发送失败');
      }
      toast.success('测试消息发送成功');
      await loadConfig();
    } catch (error) {
      toast.error(error.message || '发送失败');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon} style={{ display: 'flex', color: 'var(--color-primary)', alignItems: 'center' }}>💬</span>
        <div>
          <h3 className={styles.headerTitle}>企业微信接入</h3>
          <p className={styles.headerDesc}>复用 AI-SALES 的 OpenAPI Bridge 方式，完成企微消息发送与 webhook 对接。</p>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.toggleRow}>
          <div>
            <span className={styles.toggleLabel}>启用企业微信桥接</span>
            <span className={styles.toggleDesc}>用于线索私聊、群聊和外呼后回执链路。</span>
          </div>
          <div className={styles.toggleSwitch}>
            <input
              type="checkbox"
              id="toggleWecom"
              checked={config.enabled}
              onChange={(event) => setConfig((prev) => ({ ...prev, enabled: event.target.checked }))}
            />
            <label htmlFor="toggleWecom"></label>
          </div>
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <div className={styles.field} style={{ padding: '16px', backgroundColor: '#F0F9FF', borderRadius: '8px', marginBottom: '8px' }}>
          <label className={styles.label} style={{ color: '#0284C7' }}>Gateway</label>
          <input className={styles.input} value={config.gateway} onChange={(e) => setConfig((prev) => ({ ...prev, gateway: e.target.value }))} placeholder="https://gateway.bilinl.com" />
        </div>
        <div className={styles.field} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '8px' }}>
          <label className={styles.label} style={{ color: '#059669' }}>OpenAPI Client ID</label>
          <input className={styles.input} value={config.clientId} onChange={(e) => setConfig((prev) => ({ ...prev, clientId: e.target.value }))} placeholder="请输入 Client ID" />
        </div>
        <div className={styles.field} style={{ padding: '16px', backgroundColor: '#FDF2F8', borderRadius: '8px', marginBottom: '8px' }}>
          <label className={styles.label} style={{ color: '#BE185D' }}>
            OpenAPI Client Secret
            {config.hasSecret && !config.clientSecret ? <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>（已配置，留空则保持不变）</span> : null}
          </label>
          <input type="password" className={styles.input} value={config.clientSecret} onChange={(e) => setConfig((prev) => ({ ...prev, clientSecret: e.target.value }))} placeholder={config.hasSecret ? '已配置，输入新密钥可更改' : '请输入 Client Secret'} />
        </div>
        <div className={styles.field} style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '8px', marginBottom: '8px' }}>
          <label className={styles.label} style={{ color: '#D97706' }}>Bridge 主账号 Wx ID</label>
          <input className={styles.input} value={config.bridgeWxId} onChange={(e) => setConfig((prev) => ({ ...prev, bridgeWxId: e.target.value }))} placeholder="请输入桥接主账号 Wx ID" />
        </div>
        <div className={styles.field} style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', marginBottom: '8px' }}>
          <label className={styles.label}>Webhook Auth Token</label>
          <input type="password" className={styles.input} value={config.bridgeAuth} onChange={(e) => setConfig((prev) => ({ ...prev, bridgeAuth: e.target.value }))} placeholder={config.hasBridgeAuth ? '已配置，输入新 Token 可更改' : '可选，Bridge 回调鉴权'} />
        </div>
        <div className={styles.field} style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', marginBottom: '8px' }}>
          <label className={styles.label}>测试目标微信 ID</label>
          <input className={styles.input} value={config.testTargetWxId} onChange={(e) => setConfig((prev) => ({ ...prev, testTargetWxId: e.target.value }))} placeholder="用于发送联调测试消息" />
        </div>
      </div>

      <div className={styles.actionRow}>
        <button className={styles.testBtn} onClick={testConnection} disabled={isTesting}>
          {isTesting ? '连接测试中...' : '测试连接'}
        </button>
        <button className={styles.syncBtn} onClick={sendTestMessage} disabled={isSending || !config.testTargetWxId}>
          {isSending ? '发送中...' : '发送测试消息'}
        </button>
      </div>

      {testResult ? (
        <div className={`${styles.testResult} ${testResult.success ? styles.resultSuccess : styles.resultError}`} style={{ marginTop: 8 }}>
          {testResult.message}
        </div>
      ) : null}

      {config.lastTestAt ? (
        <div className={styles.lastSync}>最近测试: {new Date(config.lastTestAt).toLocaleString('zh-CN')} · {config.lastTestStatus || 'unknown'} · {config.lastTestMessage || '无说明'}</div>
      ) : null}

      <div className={styles.divider} />

      <button className={styles.saveBtn} onClick={saveConfig} disabled={isSaving}>
        {isSaving ? '保存中...' : '保存企业微信配置'}
      </button>
    </div>
  );
}
