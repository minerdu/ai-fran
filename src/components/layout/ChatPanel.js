'use client';

import { useState, useRef, useEffect } from 'react';
import useStore from '@/lib/store';
import { useToast } from '@/components/common/Toast';
import { apiFetch } from '@/lib/basePath';
import styles from './ChatPanel.module.css';
import MaterialSelector from '@/components/common/MaterialSelector';

const STAGE_COLORS = {
  pool: '#999',
  qualified: '#2563eb',
  negotiating: '#f59e0b',
  signed: '#07C160',
  rejected: '#ff4d4f',
};

const COMMAND_HISTORY_STORAGE_KEY = 'fran-command-center-history-v3';

const THINKING_STEPS = [
  {
    key: 'intent',
    icon: '◎',
    title: '识别招商意图',
    detail: '解析自然语言里的动作目标、线索类型和业务边界',
  },
  {
    key: 'audience',
    icon: '◌',
    title: '筛选目标线索',
    detail: '匹配高意向人群、沉默线索与当前阶段的可执行对象',
  },
  {
    key: 'rules',
    icon: '◈',
    title: '校验规则与审批',
    detail: '检查红线、资料外发、审批要求与可用 Skill / CRM 配置',
  },
  {
    key: 'workflow',
    icon: '▷',
    title: '编排执行工作流',
    detail: '生成任务、安排触达节奏，并返回可追踪的执行结果',
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatMessageTime(value) {
  const d = new Date(value);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const isSameYear = d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `今天 ${time}`;
  if (isYesterday) return `昨天 ${time}`;
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  if (isSameYear) return `${month}/${day} ${time}`;
  return `${d.getFullYear()}/${month}/${day} ${time}`;
}

function buildCommandHistoryRecord(userMessage, systemMessage) {
  return {
    id: userMessage.id,
    createdAt: userMessage.time,
    command: userMessage.content,
    summary: systemMessage?.data?.summary || systemMessage?.content || '等待 AI 返回执行结果',
    status: systemMessage?.type === 'error'
      ? '异常'
      : systemMessage?.data?.plan?.needApproval
        ? '待审批'
        : systemMessage
          ? '已生成'
          : '处理中',
    statusTone: systemMessage?.type === 'error'
      ? 'danger'
      : systemMessage?.data?.plan?.needApproval
        ? 'warning'
        : systemMessage
          ? 'success'
          : 'neutral',
    messages: [userMessage, ...(systemMessage ? [systemMessage] : [])],
  };
}

async function parseApiResponse(res, fallbackMessage) {
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(text ? `${fallbackMessage}（服务返回异常页面）` : fallbackMessage);
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || fallbackMessage);
  }

  return data;
}

export default function ChatPanel({ leadName, leadId, initialMessages, ...legacyProps }) {
  const resolvedLeadName = leadName || legacyProps.customerName;
  const resolvedLeadId = leadId || legacyProps.customerId;
  const [messages, setMessages] = useState(initialMessages || []);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);
  const [showTaskCreator, setShowTaskCreator] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ taskType: 'text', content: '', scheduledAt: '', needApproval: true });
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  // Command center mode (when no lead selected)
  const [commandMessages, setCommandMessages] = useState([]);
  const [isProcessingCommand, setIsProcessingCommand] = useState(false);
  const [thinkingStepIndex, setThinkingStepIndex] = useState(0);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [commandHistoryRecords, setCommandHistoryRecords] = useState([]);
  const messagesEndRef = useRef(null);
  const prevLeadIdRef = useRef(resolvedLeadId);
  const toast = useToast();
  
  const lead = useStore(s => s.leads.find(l => l.id === resolvedLeadId));
  const allLeads = useStore(s => s.leads);
  const [isLoadingAll, setIsLoadingAll] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);

  const handleLoadFullHistory = async () => {
    setIsLoadingAll(true);
    try {
      const res = await apiFetch(`/api/messages?leadId=${resolvedLeadId}&all=true`);
      const data = await parseApiResponse(res, '加载完整沟通记录失败');
      setMessages(data);
      setIsAllLoaded(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAll(false);
    }
  };

  useEffect(() => {
    if (prevLeadIdRef.current !== resolvedLeadId) {
      setMessages(initialMessages || []);
      prevLeadIdRef.current = resolvedLeadId;
      setShowToolbar(false);
      setShowMaterialPicker(false);
      setShowTaskCreator(false);
      setShowTransferModal(false);
    } else if (initialMessages && initialMessages.length > 0) {
      // Messages arrived async after lead was already selected
      setMessages(initialMessages);
    }
  }, [resolvedLeadId, initialMessages]);

  useEffect(() => {
    if (resolvedLeadId || typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem(COMMAND_HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCommandHistoryRecords(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to restore command history:', error);
    }
  }, [resolvedLeadId]);

  useEffect(() => {
    if (resolvedLeadId || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(COMMAND_HISTORY_STORAGE_KEY, JSON.stringify(commandHistoryRecords));
    } catch (error) {
      console.error('Failed to persist command history:', error);
    }
  }, [resolvedLeadId, commandHistoryRecords]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, commandMessages, isProcessingCommand, thinkingStepIndex]);

  useEffect(() => {
    if (!isProcessingCommand) {
      setThinkingStepIndex(0);
      return undefined;
    }

    setThinkingStepIndex(0);
    const timer = window.setInterval(() => {
      setThinkingStepIndex((current) => (current < THINKING_STEPS.length - 1 ? current + 1 : current));
    }, 700);

    return () => window.clearInterval(timer);
  }, [isProcessingCommand]);

  // Poll for new messages (to pick up AI replies)
  const pollForReplies = async (leadId, knownCount) => {
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const res = await apiFetch(`/api/messages?leadId=${leadId}&all=true`);
        const data = await parseApiResponse(res, '轮询消息失败');
        if (Array.isArray(data) && data.length > knownCount) {
          setMessages(data);
          setIsTyping(false);
          return;
        }
      } catch (e) { /* retry */ }
    }
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    const content = inputValue;
    const userMsg = {
      id: `msg-optimistic-${Date.now()}`,
      direction: 'inbound',
      senderType: 'customer',
      contentType: 'text',
      content: content,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);
    if (resolvedLeadId) {
      try {
        const res = await apiFetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: resolvedLeadId, content, senderType: 'customer' }),
        });
        await parseApiResponse(res, '发送消息失败');
        const currentCount = messages.length + 1;
        pollForReplies(resolvedLeadId, currentCount);
      } catch (e) {
        console.error('Failed to send message:', e);
        setIsTyping(false);
      }
    }
  };

  // 运营指挥中心模式：自然语言指令发送
  const handleCommandSend = async () => {
    if (!inputValue.trim()) return;
    const command = inputValue;
    const commandTime = new Date().toISOString();
    const userMessage = {
      id: `cmd-${Date.now()}`,
      role: 'user',
      content: command,
      time: commandTime,
    };
    setCommandMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessingCommand(true);
    const startedAt = Date.now();
    try {
      const res = await apiFetch('/api/ai-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await parseApiResponse(res, 'AI 指令执行失败');
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1800) {
        await sleep(1800 - elapsed);
      }
      if (data.success && (data.type === 'workflow' || data.type === 'sop_workflow')) {
        const systemMessage = {
          id: `result-${Date.now()}`,
          role: 'system',
          type: data.type === 'sop_workflow' ? 'sop_workflow' : 'workflow',
          data: data,
          time: new Date().toISOString(),
        };
        setCommandMessages(prev => [...prev, systemMessage]);
        setCommandHistoryRecords(prev => [buildCommandHistoryRecord(userMessage, systemMessage), ...prev.filter((item) => item.id !== userMessage.id)]);
        toast.success(data.summary);
      } else if (data.success && data.type === 'text') {
        const systemMessage = {
          id: `text-${Date.now()}`,
          role: 'system',
          type: 'text',
          content: data.message,
          time: new Date().toISOString(),
        };
        setCommandMessages(prev => [...prev, systemMessage]);
        setCommandHistoryRecords(prev => [buildCommandHistoryRecord(userMessage, systemMessage), ...prev.filter((item) => item.id !== userMessage.id)]);
      } else {
        const systemMessage = {
          id: `err-${Date.now()}`,
          role: 'system',
          type: 'error',
          content: data.message || '执行失败',
          time: new Date().toISOString(),
        };
        setCommandMessages(prev => [...prev, systemMessage]);
        setCommandHistoryRecords(prev => [buildCommandHistoryRecord(userMessage, systemMessage), ...prev.filter((item) => item.id !== userMessage.id)]);
      }
    } catch (e) {
      const elapsed = Date.now() - startedAt;
      if (elapsed < 1200) {
        await sleep(1200 - elapsed);
      }
      const systemMessage = {
        id: `err-${Date.now()}`,
        role: 'system',
        type: 'error',
        content: `网络错误: ${e.message}`,
        time: new Date().toISOString(),
      };
      setCommandMessages(prev => [...prev, systemMessage]);
      setCommandHistoryRecords(prev => [buildCommandHistoryRecord(userMessage, systemMessage), ...prev.filter((item) => item.id !== userMessage.id)]);
    } finally {
      setIsProcessingCommand(false);
    }
  };

  const viewCommandRecord = (recordId) => {
    setShowHistoryPanel(false);
    const record = commandHistoryRecords.find((item) => item.id === recordId);
    if (record?.messages?.length) {
      setCommandMessages(record.messages);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      resolvedLeadId ? handleSend() : handleCommandSend();
    }
  };

  const handleInsertMaterial = async (material) => {
    const finalContent = material.type === 'text' ? material.content : `[${material.type === 'image' ? '图片' : material.type === 'video' ? '视频' : '链接'}] ${material.title}`;
    const materialMsg = {
      id: `msg-optimistic-${Date.now()}`,
      direction: 'outbound',
      senderType: 'human',
      contentType: material.type,
      content: finalContent,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, materialMsg]);
    setShowMaterialPicker(false);
    if (resolvedLeadId) {
      try {
        const res = await apiFetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leadId: resolvedLeadId, content: finalContent, senderType: 'human' }),
        });
        await parseApiResponse(res, '发送素材失败');
      } catch (e) { console.error(e); }
    }
    toast.success('素材已发送');
  };

  const handleCreateTask = async () => {
    if (!taskForm.content.trim()) {
      toast.warning('请输入消息内容');
      return;
    }
    setIsCreatingTask(true);
    try {
      const res = await apiFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: resolvedLeadId,
          title: `招商跟进任务 - ${resolvedLeadName || '线索'}`,
          taskType: taskForm.taskType,
          content: taskForm.content,
          scheduledAt: taskForm.scheduledAt || null,
          triggerSource: 'manual',
          triggerReason: '手动创建招商跟进任务',
          needApproval: taskForm.needApproval,
        })
      });
      await parseApiResponse(res, '创建任务失败');
      toast.success('跟进任务已创建，等待审批');
      setShowTaskCreator(false);
      setTaskForm({ taskType: 'text', content: '', scheduledAt: '', needApproval: true });
    } catch (e) {
      console.error('Failed to create task:', e);
      toast.error(e.message || '网络错误，请重试');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleAddToKnowledge = (content) => {
    toast.success('已将此回复存入全局素材库，帮助AI学习！');
  };

  const handleTransferToHuman = () => {
    setShowTransferModal(false);
    toast.success('已转接人工，AI 已暂停回复');
  };

  const [journeyExpanded, setJourneyExpanded] = useState(false);
  const [journeyStats, setJourneyStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  useEffect(() => {
    if (!resolvedLeadId) {
      setIsLoadingStats(true);
      apiFetch('/api/tasks')
        .then(r => parseApiResponse(r, '加载任务统计失败'))
        .then(data => {
          const tasks = Array.isArray(data) ? data : [];
          const today = new Date();
          today.setHours(0,0,0,0);
      const todayTasks = tasks.filter(t => new Date(t.scheduledAt || t.createdAt) >= today);
          const journeyTasks = tasks.filter(t => t.triggerSource === 'journey');
          
          const stages = [
            { key: 'first_contact', label: '线索首联', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1890ff" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>, count: 0 },
            { key: 'intent_confirm', label: '意向确认', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#52c41a" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>, count: 0 },
            { key: 'invite_event', label: '邀约到会', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fa8c16" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, count: 0 },
            { key: 'sign_push', label: '签约催签', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f5222d" strokeWidth="2"><path d="M20 19.5v.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h5.5l5.5 5.5"/><path d="m11 11.5 5 5-2.5 2.5-5-5-2-4 4 2z"/><path d="M14 2 14 8 20 8"/></svg>, count: 0 },
            { key: 'hq_visit', label: '总部考察', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#722ed1" strokeWidth="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>, count: 0 },
            { key: 'sign_care', label: '签约关怀', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#eb2f96" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>, count: 0 },
            { key: 'franchise_upgrade', label: '加盟升级', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#faad14" strokeWidth="2"><path d="M12 20V10"/><path d="m18 14-6-6-6 6"/></svg>, count: 0 },
            { key: 'followup', label: '跟进提醒', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#13c2c2" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>, count: 0 },
            { key: 'reactivate', label: '沉默激活', icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a0d911" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, count: 0 },
          ];
          journeyTasks.forEach(t => {
            const reason = t.triggerReason || '';
            if (reason.includes('首联') || reason.includes('线索')) stages[0].count++;
            else if (reason.includes('意向') || reason.includes('确认')) stages[1].count++;
            else if (reason.includes('邀约') || reason.includes('到会')) stages[2].count++;
            else if (reason.includes('签约') || reason.includes('催签')) stages[3].count++;
            else if (reason.includes('考察') || reason.includes('总部')) stages[4].count++;
            else if (reason.includes('关怀')) stages[5].count++;
            else if (reason.includes('升级') || reason.includes('加盟')) stages[6].count++;
            else if (reason.includes('跟进')) stages[7].count++;
            else if (reason.includes('激活') || reason.includes('沉默')) stages[8].count++;
            else stages[1].count++;
          });
          
          setJourneyStats({
            totalJourney: journeyTasks.length,
            todayCount: todayTasks.filter(t => t.triggerSource === 'journey').length,
            stages,
            executedRate: journeyTasks.length > 0 ? Math.round(journeyTasks.filter(t => t.executeStatus === 'success').length / journeyTasks.length * 100) : 0,
          });
        })
        .catch(console.error)
        .finally(() => setIsLoadingStats(false));
    }
  }, [resolvedLeadId]);

  const commandHistory = commandHistoryRecords;

  // ==========================================
  // 招商指挥中心模式（未选择线索时）— 统一布局
  // ==========================================
  if (!resolvedLeadId) {
    return (
      <div className={styles.chatPanel}>
        {/* ===== TOP: Collapsible Journey Status Bar ===== */}
        <div
          onClick={() => setJourneyExpanded(!journeyExpanded)}
          style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)',
            borderBottom: '1px solid #93C5FD',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2563EB', display: 'inline-block', boxShadow: '0 0 6px #2563EB' }} />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#2563EB' }}>
              AI 自主招商引擎运行中
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {journeyStats && (
              <span style={{ fontSize: '12px', color: '#3B82F6' }}>
                今日 {journeyStats.todayCount} 条 · 总计 {journeyStats.totalJourney}
              </span>
            )}
            <span style={{ fontSize: '16px', color: '#3B82F6', transition: 'transform 0.3s', transform: journeyExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
          </div>
        </div>

        {/* Expanded Journey Details */}
        {journeyExpanded && journeyStats && (
          <div className={styles.journeyPanel}>
            <div className={styles.journeyStatsGrid}>
              <div className={`${styles.journeyStatCard} ${styles.journeyStatBlue}`}>
                <div className={styles.journeyStatValue}>{journeyStats.totalJourney}</div>
                <div className={styles.journeyStatLabel}>招商任务</div>
              </div>
              <div className={`${styles.journeyStatCard} ${styles.journeyStatCyan}`}>
                <div className={styles.journeyStatValue}>{journeyStats.todayCount}</div>
                <div className={styles.journeyStatLabel}>今日触达</div>
              </div>
              <div className={`${styles.journeyStatCard} ${styles.journeyStatAmber}`}>
                <div className={styles.journeyStatValue}>{journeyStats.executedRate}%</div>
                <div className={styles.journeyStatLabel}>推进完成率</div>
              </div>
            </div>
            <div className={styles.journeyStageGrid}>
              {journeyStats.stages.map((stage, i) => (
                <div key={i} className={styles.journeyStageCard}>
                  <div className={styles.journeyStageIcon}>{stage.icon}</div>
                  <div className={styles.journeyStageLabel}>{stage.label}</div>
                  <div
                    className={styles.journeyStageValue}
                    style={{ color: stage.count > 0 ? '#2563EB' : 'var(--color-text-tertiary)' }}
                  >
                    {stage.count}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== MIDDLE: Command Messages Area ===== */}
        <div className={styles.messagesArea}>
          {commandMessages.length === 0 ? (
            <div className={styles.emptyChat}>
              <div className={styles.emptyChatIcon}>🎯</div>
              <h3 className={styles.emptyChatTitle}>AI智能招商中心</h3>
              <p className={styles.emptyChatDesc}>用自然语言下达招商指令，AI 将自动解析并执行</p>
              <div className={styles.commandQuickActions}>
                <button
                  type="button"
                  className={styles.historyPreviewBtn}
                  onClick={() => setShowHistoryPanel(true)}
                  disabled={commandHistory.length === 0}
                >
                  查看历史指令记录
                </button>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
                {[
                  '📑 给高意向线索发送品牌招商手册',
                  '📣 发起本周线上招商说明会邀约',
                  '🎯 筛选A级线索安排总部考察',
                  '🔄 给沉默线索发起3轮破冰触达',
                ].map((hint, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => { setInputValue(hint.substring(2).trim()); }}
                    style={{
                      padding: '10px 14px', background: 'var(--color-bg-card)',
                      border: '1px solid var(--color-border)', borderRadius: '10px',
                      fontSize: '13px', color: 'var(--color-text-secondary)',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => { e.target.style.borderColor = 'var(--color-primary)'; e.target.style.color = 'var(--color-primary)'; }}
                    onMouseLeave={e => { e.target.style.borderColor = 'var(--color-border)'; e.target.style.color = 'var(--color-text-secondary)'; }}
                  >{hint}</button>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.messagesList}>
              <div className={styles.commandMessageActions}>
                <button type="button" className={styles.commandGhostBtn} onClick={() => setShowHistoryPanel(true)}>
                  历史指令
                </button>
                <button type="button" className={styles.commandGhostBtn} onClick={() => setCommandMessages([])}>
                  返回推荐指令
                </button>
              </div>
              {commandMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`${styles.messageWrapper} ${msg.role === 'user' ? styles.outbound : styles.inbound} animate-fadeInUp`}
                >
                  {msg.role === 'system' && (
                    <div className={styles.msgAvatar} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>🤖</div>
                  )}
                  <div className={styles.messageBubble}>
                    {msg.role === 'system' && (msg.type === 'workflow' || msg.type === 'sop_workflow') ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div className={styles.aiLabel}>
                          <span className={styles.aiIcon}>{msg.type === 'sop_workflow' ? '📋' : '⚡'}</span>
                          <span>{msg.type === 'sop_workflow' ? 'SOP 工作流已编排' : '工作流已生成'}</span>
                        </div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--color-text-primary)' }}>
                        🎯 {msg.data.plan?.intent}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.6' }}>
                          <div>🔍 筛选条件：{msg.data.plan?.filterDesc}</div>
                          <div>📌 命中线索：{msg.data.execution?.targetCount} 位</div>
                          {msg.type === 'sop_workflow' && <div>📊 编排步数：{msg.data.plan?.steps} 步</div>}
                          {msg.type !== 'sop_workflow' && <div>📝 任务名：{msg.data.plan?.actionTitle}</div>}
                        </div>
                        {msg.data.execution?.targetNames?.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {(msg.data.execution.targetLeadNames || msg.data.execution.targetNames || []).map((name, i) => (
                              <span key={i} style={{ padding: '2px 8px', background: '#EFF6FF', color: '#2563EB', borderRadius: '10px', fontSize: '11px', fontWeight: '500' }}>{name}</span>
                            ))}
                          </div>
                        )}
                        {msg.type === 'sop_workflow' && msg.data.execution?.tasks?.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Group tasks by step */}
                            {(() => {
                              const steps = {};
                              msg.data.execution.tasks.forEach(t => {
                                const key = `第${t.step}步`;
                                if (!steps[key]) steps[key] = { ...t, count: 0 };
                                steps[key].count++;
                              });
                              return Object.entries(steps).map(([stepName, info], idx) => (
                                <div key={idx} style={{ padding: '8px 12px', background: idx % 2 === 0 ? '#F0F9FF' : '#FFFBEB', borderRadius: '8px', fontSize: '12px', borderLeft: `3px solid ${idx % 2 === 0 ? '#3B82F6' : '#F59E0B'}` }}>
                                  <div style={{ fontWeight: '600', color: idx % 2 === 0 ? '#1D4ED8' : '#D97706' }}>{stepName}：{info.leadName && `${info.count} 条任务`}</div>
                                  <div style={{ color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                                    排期：{new Date(info.scheduledAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    {' · '}{info.status}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                        {msg.type !== 'sop_workflow' && (
                          <div style={{ padding: '10px', background: 'var(--color-bg-page)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: '1.5', borderLeft: '3px solid var(--color-primary)' }}>
                            📨 发送内容：{msg.data.plan?.actionContent}
                          </div>
                        )}
                        <div style={{ padding: '8px 12px', background: msg.data.plan?.needApproval ? '#FFF7E6' : '#EFF6FF', borderRadius: '8px', fontSize: '12px', fontWeight: '600', color: msg.data.plan?.needApproval ? '#FA8C16' : '#2563EB' }}>
                          {msg.data.plan?.needApproval
                            ? `⚠️ 涉及财务，已提交审批中心等待确认 (${msg.data.execution?.tasksCreated} 条)`
                            : `✅ 已自动排期执行 ${msg.data.execution?.tasksCreated} 条任务`}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
                          💬 {msg.data.summary}
                        </div>
                      </div>
                    ) : msg.role === 'system' && msg.type === 'error' ? (
                      <div style={{ color: '#FF4D4F', fontSize: '13px' }}>❌ {msg.content}</div>
                    ) : msg.role === 'system' ? (
                      <div className={styles.messageContent}>
                        <div className={styles.aiLabel}>
                          <span className={styles.aiIcon}>🤖</span>
                          <span>AI 回复</span>
                        </div>
                        {msg.content}
                        {msg.execution?.pendingManual ? (
                          <div className={styles.aggregateStatusRow}>
                            <span className={styles.aggregateStatusChip}>待审批 {msg.execution.pendingManual}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className={styles.messageContent}>{msg.content}</div>
                    )}
                    <div className={styles.messageTime}>
                      {formatMessageTime(msg.time)}
                    </div>
                  </div>
                  {msg.role === 'user' && (
                    <div className={`${styles.msgAvatar} ${styles.myAvatar}`}>招</div>
                  )}
                </div>
              ))}
              {isProcessingCommand && (
                <div className={`${styles.messageWrapper} ${styles.inbound} animate-fadeIn`}>
                  <div className={styles.msgAvatar} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>🤖</div>
                  <div className={`${styles.messageBubble} ${styles.thinkingBubble}`}>
                    <div className={styles.thinkingHeader}>
                      <div className={styles.aiLabel}>
                        <span className={styles.aiIcon}>⚡</span>
                        <span>AI 正在思考并编排招商动作</span>
                      </div>
                      <span className={styles.thinkingSignal}>运行中</span>
                    </div>
                    <div className={styles.thinkingProgress}>
                      <span
                        className={styles.thinkingProgressBar}
                        style={{ width: `${((thinkingStepIndex + 1) / THINKING_STEPS.length) * 100}%` }}
                      />
                    </div>
                    <div className={styles.thinkingTimeline}>
                      {THINKING_STEPS.map((step, index) => {
                        const isDone = index < thinkingStepIndex;
                        const isActive = index === thinkingStepIndex;
                        return (
                          <div
                            key={step.key}
                            className={`${styles.thinkingStep} ${isDone ? styles.thinkingStepDone : ''} ${isActive ? styles.thinkingStepActive : ''}`}
                          >
                            <div className={styles.thinkingStepIcon}>{isDone ? '✓' : step.icon}</div>
                            <div className={styles.thinkingStepBody}>
                              <div className={styles.thinkingStepTitle}>{step.title}</div>
                              <div className={styles.thinkingStepDetail}>{step.detail}</div>
                            </div>
                            {isActive ? <div className={styles.thinkingPulse} /> : null}
                          </div>
                        );
                      })}
                    </div>
                    <div className={styles.thinkingFooter}>
                      <div className={styles.typingDots}>
                        <span></span><span></span><span></span>
                      </div>
                      <span>正在生成可审批、可执行、可追踪的招商工作流</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        {showHistoryPanel && (
          <div className={styles.historyOverlay} onClick={() => setShowHistoryPanel(false)}>
            <div className={styles.historyDrawer} onClick={(e) => e.stopPropagation()}>
              <div className={styles.historyDrawerHeader}>
                <div>
                  <div className={styles.historyDrawerTitle}>历史指令记录</div>
                  <div className={styles.historyDrawerDesc}>点击任一指令即可跳回对应对话位置</div>
                </div>
                <button type="button" className={styles.modalClose} onClick={() => setShowHistoryPanel(false)}>✕</button>
              </div>
              <div className={styles.historyList}>
                {commandHistory.length === 0 ? (
                  <div className={styles.historyEmpty}>还没有历史指令，先发起一条自然语言招商指令。</div>
                ) : commandHistory.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={styles.historyItem}
                    onClick={() => viewCommandRecord(entry.id)}
                  >
                    <div className={styles.historyItemTop}>
                      <span className={styles.historyItemCommand}>{entry.command}</span>
                      <span className={`${styles.historyStatus} ${styles[`historyStatus${entry.statusTone.charAt(0).toUpperCase()}${entry.statusTone.slice(1)}`]}`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className={styles.historyItemSummary}>{entry.summary}</div>
                    <div className={styles.historyItemTime}>{formatMessageTime(entry.time)}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== BOTTOM: Command Input (always visible) ===== */}
        <div className={styles.inputAreaWrapper}>
          <div className={styles.inputArea}>
            <div className={styles.inputWrapper}>
              <input
                className={styles.chatInput}
                type="text"
                placeholder="输入招商指令，如：给高意向线索发送招商手册..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isProcessingCommand}
              />
              <button
                className={styles.sendBtn}
                onClick={handleCommandSend}
                disabled={!inputValue.trim() || isProcessingCommand}
                title="执行指令"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 线索对话监控模式（已选择线索时）
  // ==========================================
  return (
    <div className={styles.chatPanel}>
      {/* Messages Area */}
      <div className={styles.messagesArea}>
        {messages.length === 0 ? (
          <div className={styles.emptyChat}>
            <div className={styles.emptyChatIcon}>⚙️</div>
            <h3 className={styles.emptyChatTitle}>
              AI 招商顾问 正在自动接洽 {resolvedLeadName}
            </h3>
            <p className={styles.emptyChatDesc}>
              招商对话系统自动运转中，暂无更新消息
            </p>
          </div>
        ) : (
          <div className={styles.messagesList}>
            {!isAllLoaded && messages.length >= 40 && (
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <button
                  onClick={handleLoadFullHistory}
                  disabled={isLoadingAll}
                  style={{ padding: '6px 16px', fontSize: '12px', background: '#e6f7ff', color: '#1890ff', border: '1px solid #91d5ff', borderRadius: '14px', cursor: 'pointer', transition: 'all 0.3s' }}
                >
                  {isLoadingAll ? '加载中...' : '↑ 点击查看完整沟通记录'}
                </button>
              </div>
            )}
            {messages.map((msg, index) => {
              let avatarName = resolvedLeadName;
              let avatarColor = STAGE_COLORS[lead?.stage] || '#2563eb';
              let displayContent = msg.content;

              if (lead?.isGroup && msg.direction === 'inbound' && typeof msg.content === 'string') {
                const parts = msg.content.split(/[:：]/);
                if (parts.length > 1) {
                  const parsedName = parts[0].trim();
                  if (parsedName) {
                    avatarName = parsedName;
                    displayContent = parts.slice(1).join(':').trim();
                    const senderLead = allLeads.find(l => l.name === parsedName);
                    if (senderLead && STAGE_COLORS[senderLead.stage]) {
                      avatarColor = STAGE_COLORS[senderLead.stage];
                    } else {
                      avatarColor = '#2563eb';
                    }
                  }
                }
              }

              return (
              <div
                key={msg.id}
                className={`${styles.messageWrapper} ${
                  msg.direction === 'inbound' ? styles.inbound : styles.outbound
                } animate-fadeInUp`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {msg.direction === 'inbound' && (
                  <div className={styles.msgAvatar} style={{ background: `linear-gradient(135deg, ${avatarColor}, #0f172a)`, color: '#fff' }}>
                    {avatarName ? avatarName.slice(-2) : '线'}
                  </div>
                )}
                <div className={styles.messageBubble}>
                  {msg.senderType === 'ai' && (
                    <div className={styles.aiLabel}>
                      <span className={styles.aiIcon}>🤖</span>
                      <span>专家AI自动回复</span>
                    </div>
                  )}
                  <div className={styles.messageContent}>
                    {((typeof displayContent === 'string' ? displayContent : (displayContent ? JSON.stringify(displayContent) : ''))).split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < ((typeof msg.content === 'string' ? msg.content : (msg.content ? JSON.stringify(msg.content) : ''))).split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </div>
                  <div className={styles.messageTime}>
                    {(() => {
                      const d = new Date(msg.createdAt);
                      const now = new Date();
                      const isToday = d.toDateString() === now.toDateString();
                      const yesterday = new Date(now);
                      yesterday.setDate(yesterday.getDate() - 1);
                      const isYesterday = d.toDateString() === yesterday.toDateString();
                      const isSameYear = d.getFullYear() === now.getFullYear();
                      const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
                      if (isToday) return `今天 ${time}`;
                      if (isYesterday) return `昨天 ${time}`;
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      if (isSameYear) return `${month}/${day} ${time}`;
                      return `${d.getFullYear()}/${month}/${day} ${time}`;
                    })()}
                  </div>
                </div>
                {msg.direction === 'outbound' && (
                  <div className={`${styles.msgAvatar} ${styles.myAvatar}`}>
                    {msg.senderType === 'ai' ? '🤖' : '顾'}
                  </div>
                )}
                {/* 加入知识库 Hover Button for Human Messages */}
                {msg.direction === 'outbound' && msg.senderType === 'human' && msg.contentType === 'text' && (
                  <button 
                    className={styles.addKnowledgeBtn}
                    title="沉淀为优质话术资产"
                    onClick={() => handleAddToKnowledge(msg.content)}
                  >
                    ⭐
                  </button>
                )}
              </div>
            )})}
            {isTyping && (
              <div className={`${styles.messageWrapper} ${styles.outbound} animate-fadeIn`}>
                <div className={styles.messageBubble}>
                  <div className={styles.aiLabel}>
                    <span className={styles.aiIcon}>🤖</span>
                    <span>AI自主编撰中</span>
                  </div>
                  <div className={styles.typingDots}>
                    <span></span><span></span><span></span>
                  </div>
                </div>
                <div className={`${styles.msgAvatar} ${styles.myAvatar}`}>🤖</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Material Picker Modal */}
      {showMaterialPicker && (
        <MaterialSelector 
          onClose={() => setShowMaterialPicker(false)} 
          onSelect={(m) => {
             handleInsertMaterial(m);
             setShowMaterialPicker(false);
          }}
        />
      )}

      {/* Create Task Modal */}
      {showTaskCreator && resolvedLeadId && (
        <div className={styles.modalOverlay} onClick={() => setShowTaskCreator(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>📋 创建招商跟进任务</h3>
              <button className={styles.modalClose} onClick={() => setShowTaskCreator(false)}>✕</button>
            </div>
            <div className={styles.taskForm}>
              <div className={styles.formGroup}>
                <label>线索</label>
                <div className={styles.formValue}>{resolvedLeadName || '未选择'}</div>
              </div>
              <div className={styles.formGroup}>
                <label>任务类型</label>
                <select 
                  className={styles.formSelect}
                  value={taskForm.taskType}
                  onChange={e => setTaskForm(prev => ({ ...prev, taskType: e.target.value }))}
                >
                  <option value="text">文本消息</option>
                  <option value="image">图片消息</option>
                  <option value="video">视频消息</option>
                  <option value="combo">组合消息</option>
                  <option value="call">人工跟进提醒</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label>跟进内容</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="输入对代理商负责人的跟进内容..."
                  rows={3}
                  value={taskForm.content}
                  onChange={e => setTaskForm(prev => ({ ...prev, content: e.target.value }))}
                ></textarea>
              </div>
              <div className={styles.formGroup}>
                <label>发送时间</label>
                <input 
                  className={styles.formInput} 
                  type="datetime-local" 
                  value={taskForm.scheduledAt}
                  onChange={e => setTaskForm(prev => ({ ...prev, scheduledAt: e.target.value }))}
                />
              </div>
              <div className={styles.formGroup}>
                <label>需要审批</label>
                <div className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={taskForm.needApproval} 
                    onChange={e => setTaskForm(prev => ({ ...prev, needApproval: e.target.checked }))}
                    id="needApproval" 
                  />
                  <label htmlFor="needApproval"></label>
                </div>
              </div>
              <button
                className={styles.formSubmit}
                onClick={handleCreateTask}
                disabled={isCreatingTask}
              >
                {isCreatingTask ? '创建中...' : '创建任务'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer to Human Modal */}
      {showTransferModal && resolvedLeadId && (
        <div className={styles.modalOverlay} onClick={() => setShowTransferModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>👤 转接人工</h3>
              <button className={styles.modalClose} onClick={() => setShowTransferModal(false)}>✕</button>
            </div>
            <div style={{ padding: '0 0 16px 0', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
              确定暂停 AI 的自动回复并由招商顾问人工接管此对话吗？
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button 
                style={{ padding: '6px 16px', background: 'var(--color-bg-section)', border: '1px solid var(--color-border)', borderRadius: '4px', cursor: 'pointer' }}
                onClick={() => setShowTransferModal(false)}
              >
                取消
              </button>
              <button 
                style={{ padding: '6px 16px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                onClick={handleTransferToHuman}
              >
                立即转接
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Toolbar */}
      {showToolbar && resolvedLeadId && (
        <div className={styles.toolbar}>
          <button className={styles.toolbarItem} onClick={() => { setShowMaterialPicker(true); setShowToolbar(false); }}>
            <span>🖼️</span> 素材库
          </button>
          <button className={styles.toolbarItem} onClick={() => { setShowTaskCreator(true); setShowToolbar(false); }}>
            <span>📋</span> 跟进任务
          </button>
          <button className={styles.toolbarItem} onClick={() => { setShowTransferModal(true); setShowToolbar(false); }}>
            <span>👤</span> 转人工
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className={styles.inputAreaWrapper}>
        <div className={styles.inputArea}>
        <div className={styles.inputWrapper}>
          <button
            className={styles.inputIcon}
            title="更多功能"
            onClick={() => setShowToolbar(!showToolbar)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="16"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
          </button>
          <input
            className={styles.chatInput}
            type="text"
            placeholder="强制人工介入回复..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {inputValue.trim() ? (
            <button className={styles.sendBtn} onClick={handleSend} title="发送">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          ) : (
            <button className={styles.inputIcon} title="语音">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
              </svg>
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

