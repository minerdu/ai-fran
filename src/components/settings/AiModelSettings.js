'use client';

import { useEffect, useState } from 'react';
import styles from '@/app/(dashboard)/me/page.module.css';

const MODEL_PRESETS = [
  { key: 'openai', name: 'OpenAI', url: 'https://api.openai.com/v1', model: 'gpt-5.4' },
  { key: 'gemini', name: 'Gemini', url: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-2.5-pro' },
  { key: 'kimi', name: 'Kimi', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-128k' },
  { key: 'deepseek', name: 'DeepSeek', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { key: 'custom', name: '自定义', url: '', model: '' },
];

const INITIAL_FORM = {
  enabled: true,
  provider: 'openai',
  apiBaseUrl: '',
  modelName: 'gpt-5.4',
  apiKey: '',
  apiKeyMasked: '',
  contextRounds: 50,
  kbSource: 'zhipu',
  kbId: 'franchise-brand-kb',
  kbApiUrl: 'https://open.bigmodel.cn/api/paas/v4/',
  maxReplyLength: 200,
  allowImages: true,
  allowFiles: true,
  segmentEnabled: true,
  segmentCount: 3,
  segmentTriggerChars: 120,
  segmentModel: 'zhipu',
  segmentModelApiUrl: 'https://open.bigmodel.cn/api/paas/v4/',
  segmentModelApiKey: '',
  sendInterval: 3,
  stopKeywords: '不考虑了,暂停,别联系了,预算冻结',
  smartSkipMode: true,
  imageAnalysis: true,
};

export default function AiModelSettings({ onBack }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const res = await fetch('/api/settings/ai-model', { cache: 'no-store' });
        if (!res.ok) {
          throw new Error('加载配置失败');
        }

        const data = await res.json();
        if (cancelled) return;

        setForm((prev) => ({
          ...prev,
          enabled: data.enabled ?? prev.enabled,
          provider: data.provider || prev.provider,
          apiBaseUrl: data.apiBaseUrl || prev.apiBaseUrl,
          modelName: data.modelName || prev.modelName,
          apiKeyMasked: data.apiKeyMasked || '',
          contextRounds: typeof data.maxTokens === 'number' ? Math.min(100, Math.max(1, data.maxTokens)) : prev.contextRounds,
          kbSource: data.kbSource || prev.kbSource,
          kbId: data.kbId || prev.kbId,
          kbApiUrl: data.kbApiUrl || prev.kbApiUrl,
          segmentEnabled: data.enableSegment ?? prev.segmentEnabled,
          segmentCount: data.segmentCount ?? prev.segmentCount,
          segmentTriggerChars: data.segmentTriggerChars ?? prev.segmentTriggerChars,
          segmentModel: data.segmentModelName || prev.segmentModel,
          segmentModelApiUrl: data.segmentModelApiUrl || prev.segmentModelApiUrl,
          sendInterval: data.sendInterval ?? prev.sendInterval,
          stopKeywords: data.stopKeywords || prev.stopKeywords,
          smartSkipMode: data.smartSkipMode ?? prev.smartSkipMode,
          imageAnalysis: data.imageAnalysis ?? prev.imageAnalysis,
        }));
      } catch (error) {
        if (!cancelled) {
          setTestResult({ success: false, message: error.message || '加载配置失败' });
        }
      } finally {
        if (!cancelled) {
          setIsLoadingConfig(false);
        }
      }
    };

    void loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  const testConnection = async () => {
    setIsTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings/ai-model', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch (error) {
      setTestResult({ success: false, message: error.message });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/settings/ai-model', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: form.enabled,
          provider: form.provider,
          apiBaseUrl: form.apiBaseUrl,
          modelName: form.modelName,
          apiKey: form.apiKey,
          maxTokens: form.contextRounds,
          kbSource: form.kbSource,
          kbId: form.kbId,
          kbApiUrl: form.kbApiUrl,
          enableSegment: form.segmentEnabled,
          segmentCount: form.segmentCount,
          segmentTriggerChars: form.segmentTriggerChars,
          segmentModelName: form.segmentModel,
          segmentModelApiUrl: form.segmentModelApiUrl,
          segmentModelApiKey: form.segmentModelApiKey,
          sendInterval: form.sendInterval,
          stopKeywords: form.stopKeywords,
          smartSkipMode: form.smartSkipMode,
          imageAnalysis: form.imageAnalysis,
        }),
      });

      if (!res.ok) {
        throw new Error('保存配置失败');
      }

      setForm((prev) => ({
        ...prev,
        apiKey: '',
      }));
      setTestResult({ success: true, message: '配置已保存' });
      if (onBack) onBack();
    } catch (error) {
      setTestResult({ success: false, message: error.message || '保存配置失败' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoadingConfig) {
    return <div className={styles.agentFormContainer}>加载配置中...</div>;
  }

  return (
    <>
      <div className={styles.agentFormContainer}>
        <div className={styles.sectionBanner}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
          <span>基础能力配置</span>
        </div>

        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel} style={{ fontWeight: '600' }}><span style={{ color: '#07C160', marginRight: '4px' }}>●</span>启用真实 AI 大模型</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>关闭则使用内置 Mock 回复</div>
          </div>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" id="toggleAiEnabled" checked={form.enabled} onChange={(e) => update('enabled', e.target.checked)} />
            <label htmlFor="toggleAiEnabled"></label>
          </div>
        </div>

        <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '8px', marginBottom: '16px' }}>
          <span className={styles.agentFormLabel} style={{ color: '#3B82F6' }}>指定模型</span>
          <div className={styles.radioGroup} style={{ flexWrap: 'wrap' }}>
            {MODEL_PRESETS.map((preset) => (
              <button
                key={preset.key}
                className={`${styles.radioBtn} ${form.provider === preset.key ? styles.activeFull : ''}`}
                onClick={() => {
                  update('provider', preset.key);
                  update('apiBaseUrl', preset.url || form.apiBaseUrl);
                  update('modelName', preset.model || form.modelName);
                }}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '16px' }}>
          <span className={styles.agentFormLabel} style={{ color: '#10B981' }}>API 接入点</span>
          <input type="text" className={styles.agentFormInput} value={form.apiBaseUrl} onChange={(e) => update('apiBaseUrl', e.target.value)} placeholder="https://api.openai.com/v1" />
        </div>

        <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '8px', marginBottom: '16px' }}>
          <span className={styles.agentFormLabel} style={{ color: '#EF4444' }}>API Key</span>
          <input type="password" className={styles.agentFormInput} value={form.apiKey} onChange={(e) => update('apiKey', e.target.value)} placeholder={form.apiKeyMasked || 'sk-...'} />
          {form.apiKeyMasked ? (
            <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>已存储: {form.apiKeyMasked}（留空保留原密钥）</span>
          ) : null}
        </div>

        <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F5F3FF', borderRadius: '8px', marginBottom: '16px' }}>
          <span className={styles.agentFormLabel} style={{ color: '#8B5CF6' }}>模型名称</span>
          <input type="text" className={styles.agentFormInput} value={form.modelName} onChange={(e) => update('modelName', e.target.value)} placeholder="gpt-5.4 / gemini-2.5-pro / deepseek-chat" />
        </div>

        <div className={styles.agentFormSection}>
          <span className={styles.agentFormLabel}>上下文记忆轮次: {form.contextRounds}</span>
          <input type="range" min="1" max="100" step="1" className={styles.kbRange} value={form.contextRounds} onChange={(e) => update('contextRounds', parseInt(e.target.value, 10))} />
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>记忆最近几轮对话作为上下文，此项仅针对大模型。</span>
        </div>

        <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '8px 0' }}></div>

        <div className={styles.sectionBanner}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          <span>知识库配置</span>
        </div>

        <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '8px', marginBottom: '16px' }}>
          <span className={styles.agentFormLabel} style={{ color: '#F59E0B' }}>知识库来源</span>
          <div className={styles.radioGroup}>
            {[
              { key: 'none', label: '不使用' },
              { key: 'zhipu', label: '智谱知识库' },
              { key: 'dify', label: 'Dify知识库' },
              { key: 'custom', label: '指定知识库' },
            ].map((item) => (
              <button key={item.key} className={`${styles.radioBtn} ${form.kbSource === item.key ? styles.activeFull : ''}`} onClick={() => update('kbSource', item.key)}>{item.label}</button>
            ))}
          </div>
        </div>

        {form.kbSource !== 'none' ? (
          <>
            <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDFA', borderRadius: '8px', marginBottom: '8px' }}>
              <span className={styles.agentFormLabel} style={{ color: '#14B8A6' }}>知识库接入地址</span>
              <input type="text" className={styles.agentFormInput} value={form.kbApiUrl} onChange={(e) => update('kbApiUrl', e.target.value)} placeholder={form.kbSource === 'zhipu' ? 'https://open.bigmodel.cn/api/paas/v4/' : '请输入知识库 API 接口地址...'} />
            </div>
            <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FDF2F8', borderRadius: '8px', marginBottom: '16px' }}>
              <span className={styles.agentFormLabel} style={{ color: '#EC4899' }}>知识库标识 / API KEY</span>
              <input type="password" className={styles.agentFormInput} value={form.kbId} onChange={(e) => update('kbId', e.target.value)} placeholder="请输入知识库 ID 或 API Key..." />
            </div>
          </>
        ) : null}

        <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '8px 0' }}></div>

        <div className={styles.sectionBanner}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>
          <span>内容分段设置</span>
        </div>

        <div className={styles.toggleRow}>
          <span className={styles.toggleLabel}>启用内容分段发送</span>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" id="toggleSeg" checked={form.segmentEnabled} onChange={(e) => update('segmentEnabled', e.target.checked)} />
            <label htmlFor="toggleSeg"></label>
          </div>
        </div>

        {form.segmentEnabled ? (
          <>
            <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F3F4F6', borderRadius: '8px', marginBottom: '8px' }}>
              <span className={styles.agentFormLabel} style={{ color: '#4B5563' }}>分段数量: {form.segmentCount}</span>
              <input type="range" min="2" max="5" step="1" className={styles.kbRange} value={form.segmentCount} onChange={(e) => update('segmentCount', parseInt(e.target.value, 10))} />
            </div>
            <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FDF4FF', borderRadius: '8px', marginBottom: '8px' }}>
              <span className={styles.agentFormLabel} style={{ color: '#C026D3' }}>分段触发字数: {form.segmentTriggerChars}</span>
              <input type="range" min="30" max="200" step="10" className={styles.kbRange} value={form.segmentTriggerChars} onChange={(e) => update('segmentTriggerChars', parseInt(e.target.value, 10))} />
            </div>
            <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0F9FF', borderRadius: '8px', marginBottom: '8px' }}>
              <span className={styles.agentFormLabel} style={{ color: '#0284C7' }}>内容分段大模型名称</span>
              <input type="text" className={styles.agentFormInput} value={form.segmentModel} onChange={(e) => update('segmentModel', e.target.value)} placeholder="例如：GLM-4 / zhipu..." />
            </div>
            <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '8px', marginBottom: '8px' }}>
              <span className={styles.agentFormLabel} style={{ color: '#10B981' }}>内容分段大模型接入地址</span>
              <input type="text" className={styles.agentFormInput} value={form.segmentModelApiUrl} onChange={(e) => update('segmentModelApiUrl', e.target.value)} placeholder="分段专用大模型接入点..." />
            </div>
            <div className={styles.agentFormSection} style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '8px', marginBottom: '16px' }}>
              <span className={styles.agentFormLabel} style={{ color: '#EF4444' }}>内容分段大模型 API KEY</span>
              <input type="password" className={styles.agentFormInput} value={form.segmentModelApiKey} onChange={(e) => update('segmentModelApiKey', e.target.value)} placeholder="分段专用大模型 API Key..." />
            </div>
          </>
        ) : null}

        <div style={{ borderTop: '1px dashed var(--color-border-light)', margin: '8px 0' }}></div>

        <div className={styles.sectionBanner}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ color: 'var(--color-primary)' }}><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          <span>高级设置</span>
        </div>

        <div className={styles.agentFormSection}>
          <span className={styles.agentFormLabel}>发送间隔 (秒): {form.sendInterval}</span>
          <input type="range" min="1" max="10" step="0.5" className={styles.kbRange} value={form.sendInterval} onChange={(e) => update('sendInterval', parseFloat(e.target.value))} />
        </div>

        <div className={styles.agentFormSection}>
          <span className={styles.agentFormLabel}>休止关键字</span>
          <input type="text" className={styles.agentFormInput} value={form.stopKeywords} onChange={(e) => update('stopKeywords', e.target.value)} placeholder="用逗号分隔关键字" />
        </div>

        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>智能纠错模式</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>新消息进入时中断当前回复，重新组织回答</div>
          </div>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" id="toggleSkip" checked={form.smartSkipMode} onChange={(e) => update('smartSkipMode', e.target.checked)} />
            <label htmlFor="toggleSkip"></label>
          </div>
        </div>

        <div className={styles.toggleRow}>
          <div>
            <div className={styles.toggleLabel}>图片分析</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>开启后可处理加盟申请表、名片、渠道截图等</div>
          </div>
          <div className={styles.toggleSwitch}>
            <input type="checkbox" id="toggleImgA" checked={form.imageAnalysis} onChange={(e) => update('imageAnalysis', e.target.checked)} />
            <label htmlFor="toggleImgA"></label>
          </div>
        </div>

        <button className={styles.agentSaveBtn} onClick={testConnection} disabled={isTestingConnection} style={{ background: '#faad14', marginBottom: '12px' }}>
          {isTestingConnection ? '⏳ 测试中...' : '🔌 测试 API 连接'}
        </button>

        {testResult ? (
          <div style={{ padding: '12px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px', background: testResult.success ? '#E6F7EF' : '#FFF1F0', color: testResult.success ? '#07C160' : '#FF4D4F' }}>
            {testResult.success ? '✅' : '❌'} {testResult.message}
          </div>
        ) : null}

        <button className={styles.agentSaveBtn} onClick={handleSave} disabled={isSaving}>
          {isSaving ? '⏳ 保存中...' : '💾 保存配置'}
        </button>
      </div>
    </>
  );
}
