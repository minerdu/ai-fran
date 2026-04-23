'use client';

import { useMemo, useState, useEffect } from 'react';
import styles from '@/app/(dashboard)/workflow/phase2.module.css';

const DAYS_OF_WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function getWeekDays(baseDate) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function getMonthDays(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days = [];
  
  // Pad beginning
  const startDay = firstDay.getDay();
  for (let i = startDay - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }
  
  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const d = new Date(year, month, i);
    days.push({ date: d, isCurrentMonth: true });
  }
  
  // Pad end
  const endDay = lastDay.getDay();
  for (let i = 1; i < 7 - endDay; i++) {
    const d = new Date(year, month + 1, i);
    days.push({ date: d, isCurrentMonth: false });
  }
  
  return days;
}

export default function WorkflowOverviewClient() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('day');
  const [tasks, setTasks] = useState([]);
  const [activeFilter, setActiveFilter] = useState('全部'); // Add active filter state

  useEffect(() => {
    // Load real tasks from API (AI-created, journey engine, manual)
    const loadRealTasks = async () => {
      try {
        const res = await fetch('/api/tasks', { cache: 'no-store' });
        const data = await res.json();
        if (Array.isArray(data)) {
          const realTasks = data.map((t, i) => ({
            id: `real-${t.id}`,
            date: t.scheduledAt ? new Date(t.scheduledAt) : new Date(t.createdAt || Date.now()),
            time: new Date(t.scheduledAt || t.createdAt || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }),
            title: t.title || '招商任务',
            target: t.customerName || t.customerId?.substring(0, 6) || '线索',
            category: t.triggerSource === 'journey' ? '执行跟踪' : t.triggerSource === 'manual_command' ? '招商方案' : t.taskType === 'invite_event' ? '会议邀请' : '执行跟踪',
            status: t.approvalStatus || 'pending',
            icon: t.triggerSource === 'journey' ? '🤖' : '📋',
            isReal: true,
          }));
          return realTasks;
        }
      } catch (e) { /* use mock only */ }
      return [];
    };

    loadRealTasks().then(realTasks => {
      // Generate mock tasks for the selected week/month
      const mockTasks = [];
      const base = new Date(selectedDate);
      base.setDate(base.getDate() - 7);
      
      for (let i = 0; i < 30; i++) {
        const d = new Date(base);
        d.setDate(base.getDate() + i);
        
        const count = isSameDay(d, today) ? 26 : Math.floor(Math.random() * 300) + 10;
        
        for (let j = 0; j < Math.min(count, 10); j++) {
          const h = 10 + Math.floor(Math.random() * 8);
          const m = Math.floor(Math.random() * 60);
          const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          mockTasks.push({
            id: `${i}-${j}`,
            date: new Date(d),
            time,
            title: ['总部考察跟进', '招商会邀约', '老加盟商裂变', '执行提醒', '发送物料', '微信沟通', '发送给', '沉默线索激活'][Math.floor(Math.random() * 8)],
            target: ['沈兰雪', '秦佩', '蒋琳', '朱佩', '何萍兰', '张国栋', '王欣', '陶瑶梦'][Math.floor(Math.random() * 8)],
            category: ['招商方案', '会议邀请', '裂变奖励', '执行跟踪'][Math.floor(Math.random() * 4)],
            status: Math.random() > 0.3 ? 'approved' : 'pending',
            icon: Math.random() > 0.5 ? '🤖' : '📋'
          });
        }
        mockTasks.push({ isCountPlaceholder: true, date: new Date(d), count: count + realTasks.filter(rt => isSameDay(rt.date, d)).length });
      }
      setTasks([...realTasks, ...mockTasks]);
    });
  }, [selectedDate]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => getMonthDays(selectedDate), [selectedDate]);

  const navigatePrev = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    else if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const navigateNext = () => {
    const d = new Date(selectedDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    else if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const getTaskCount = (date) => {
    const ph = tasks.find(t => t.isCountPlaceholder && isSameDay(t.date, date));
    return ph ? ph.count : 0;
  };

  const dayTasks = tasks.filter(t => !t.isCountPlaceholder && isSameDay(t.date, selectedDate) && (activeFilter === '全部' || t.category === activeFilter)).sort((a, b) => a.time.localeCompare(b.time));

  const filtersNode = (
    <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 }}>
      {['全部', '招商方案', '会议邀请', '裂变奖励', '执行跟踪'].map(filter => (
        <button
          key={filter}
          onClick={() => setActiveFilter(filter)}
          style={{
            padding: '4px 12px',
            borderRadius: 99,
            border: activeFilter === filter ? '1px solid #10b981' : '1px solid #e5e7eb',
            background: activeFilter === filter ? '#ecfdf5' : '#f9fafb',
            color: activeFilter === filter ? '#10b981' : '#6b7280',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {filter}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', overflow: 'hidden' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px 12px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 500, color: '#111827' }}>
            {viewMode === 'month' 
              ? `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月`
              : `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月${selectedDate.getDate()}日`}
          </span>
          <span style={{ fontSize: 16, opacity: 0.6 }}>📅</span>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={navigatePrev} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button onClick={() => setSelectedDate(new Date())} style={{ height: 28, padding: '0 12px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            今天
          </button>
          <button onClick={navigateNext} style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, cursor: 'pointer', color: '#6b7280' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>

      {/* View Segment Control */}
      <div style={{ padding: '0 24px 16px 24px' }}>
        <div style={{ display: 'flex', background: '#fff', border: '1px solid #f3f4f6', borderRadius: 8, padding: 2, gap: 2, height: '36px' }}>
          {['day', 'week', 'month'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                flex: 1,
                border: mode === viewMode ? '1px solid #10b981' : '1px solid transparent',
                background: mode === viewMode ? '#10b981' : '#fff',
                color: mode === viewMode ? '#fff' : '#6b7280',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                transition: 'all 0.2s',
              }}
            >
              {mode === 'day' ? '日' : mode === 'week' ? '周' : '月'}
            </button>
          ))}
        </div>
      </div>

    <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px 24px' }}>
        
        {/* Day View */}
        {viewMode === 'day' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 16, textAlign: 'center' }}>
              {weekDays.map((date, i) => {
                const isSelected = isSameDay(date, selectedDate);
                return (
                  <div key={i} onClick={() => setSelectedDate(new Date(date))} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 4px', borderRadius: 8, background: isSelected ? '#10b981' : 'transparent', color: isSelected ? '#fff' : '#4b5563' }}>
                    <span style={{ fontSize: 12, marginBottom: 4, opacity: isSelected ? 0.9 : 0.6 }}>{DAYS_OF_WEEK[date.getDay()]}</span>
                    <span style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{date.getDate()}</span>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: isSelected ? '#fff' : '#10b981', opacity: getTaskCount(date) > 0 ? 1 : 0 }}></span>
                  </div>
                );
              })}
            </div>

            {/* Filters */}
            {filtersNode}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>今天</span>
              <span style={{ fontSize: 12, color: '#9ca3af' }}>共 {dayTasks.length} 条任务</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dayTasks.map(task => (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', background: task.status === 'approved' ? '#f0fdf4' : '#fffbeb', borderRadius: 8, border: '1px solid', borderColor: task.status === 'approved' ? '#dcfce7' : '#fef3c7' }}>
                  <span style={{ width: 44, fontSize: 13, fontWeight: 500, color: '#374151' }}>{task.time}</span>
                  <span style={{ fontSize: 18, marginRight: 12 }}>{task.icon === '🤖' ? <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Felix" width="22" style={{borderRadius: 4}} /> : '📋'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ 
                        padding: '1px 6px', 
                        borderRadius: 4, 
                        fontSize: 10, 
                        fontWeight: 600,
                        background: task.category === '招商方案' ? '#e0e7ff' : task.category === '会议邀请' ? '#fce7f3' : task.category === '裂变奖励' ? '#fef9c3' : '#e0f2fe',
                        color: task.category === '招商方案' ? '#4f46e5' : task.category === '会议邀请' ? '#db2777' : task.category === '裂变奖励' ? '#ca8a04' : '#0284c7'
                      }}>
                        {task.category}
                      </span>
                      <span style={{ color: '#10b981', fontWeight: 500, fontSize: 13 }}>{task.title === '发送给' ? '发送给' : task.title}</span>
                      <span style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>{task.target}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>
                      {task.title === '发送给' ? `跟进提醒 · ${task.target}` : `${task.title} · ${task.target}`}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: task.status === 'approved' ? '#10b981' : '#f59e0b' }}>
                    {task.status === 'approved' ? '已通过' : '待审批'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Month View */}
        {viewMode === 'month' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6', marginBottom: 12 }}>
              {DAYS_OF_WEEK.map(day => (
                <span key={day} style={{ fontSize: 12, color: '#9ca3af' }}>{day}</span>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px 8px' }}>
              {monthDays.map((dayObj, i) => {
                const isSelected = isSameDay(dayObj.date, selectedDate);
                const count = getTaskCount(dayObj.date);
                return (
                  <div key={i} onClick={() => setSelectedDate(dayObj.date)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', padding: isSelected ? '8px 0' : '0', background: isSelected ? '#10b981' : 'transparent', borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: isSelected ? 600 : 400, color: isSelected ? '#fff' : (dayObj.isCurrentMonth ? '#4b5563' : '#d1d5db') }}>
                      {dayObj.date.getDate()}
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 18, padding: '0 6px', borderRadius: 9, background: isSelected ? '#fff' : '#10b981', color: isSelected ? '#10b981' : '#fff', fontSize: 10, fontWeight: 600, opacity: count > 0 ? 1 : 0 }}>
                      {count > 0 ? count : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Week View */}
        {viewMode === 'week' && (
          <div>
            {filtersNode}
            <div style={{ display: 'flex', position: 'relative' }}>
              {/* Left side fixed dates */}
            <div style={{ width: 60, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {weekDays.map((date, i) => {
                const isSelected = isSameDay(date, selectedDate);
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0', background: isSelected ? '#ecfdf5' : 'transparent', borderRadius: '8px 0 0 8px' }}>
                    <span style={{ fontSize: 11, color: isSelected ? '#10b981' : '#6b7280', marginBottom: 4 }}>{DAYS_OF_WEEK[date.getDay()]}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: isSelected ? '#10b981' : '#374151' }}>{date.getDate()}</span>
                  </div>
                );
              })}
            </div>
            
            {/* Right side scrolling timeline */}
            <div style={{ flex: 1, padding: '0 0 0 12px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {weekDays.map((date, i) => {
                const dayTasks = tasks.filter(t => !t.isCountPlaceholder && isSameDay(t.date, date) && (activeFilter === '全部' || t.category === activeFilter)).sort((a, b) => a.time.localeCompare(b.time)).slice(0, 8); // Show up to 8 per day
                return (
                  <div key={i} style={{ minHeight: 46, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    {dayTasks.map(task => (
                      <div key={task.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#e0f2fe', borderRadius: 99, color: '#0369a1', fontSize: 11 }}>
                        <span style={{ fontWeight: 600 }}>{task.time}</span>
                        <span style={{ fontWeight: 600, color: task.category === '招商方案' ? '#4f46e5' : task.category === '会议邀请' ? '#db2777' : task.category === '裂变奖励' ? '#ca8a04' : '#0284c7' }}>[{task.category}]</span>
                        <span>{task.title} · {task.target}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          </div>
        )}

      </div>
    </div>
  );
}


