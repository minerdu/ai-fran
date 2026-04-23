import { create } from 'zustand';
import { mockLeads, mockMessages, mockApprovals, mockAgentRuns, mockEvents, mockPlaybooks, mockSkills, mockAiCommands, mockTimelines, mockFranchiseDocs } from './franchiseData';
import { apiFetch } from './basePath';

const useStore = create((set, get) => ({
  // --- Workspace ---
  activeWorkspace: 'main',
  setActiveWorkspace: (ws) => set({ activeWorkspace: ws }),

  // --- Lead State (B2B 招商线索) ---
  leads: [],
  allMessages: {},
  isLoadingLeads: true,
  isLoadingMessages: false,
  selectedLeadId: null,
  searchTerm: '',
  activeFilter: 'all',
  stageFilter: 'all', // pool/qualified/negotiating/signed/rejected

  fetchLeads: async () => {
    set({ isLoadingLeads: true });
    try {
      const response = await apiFetch('/api/customers', { cache: 'no-store' });
      const data = await response.json();
      set({ leads: Array.isArray(data) ? data : mockLeads, isLoadingLeads: false });
    } catch (error) {
      set({ leads: mockLeads, isLoadingLeads: false });
    }
  },

  fetchMessages: async (leadId) => {
    set({ isLoadingMessages: true });
    try {
      const response = await apiFetch(`/api/messages?leadId=${leadId}&all=true`, { cache: 'no-store' });
      const data = await response.json();
      set((state) => ({
        allMessages: { ...state.allMessages, [leadId]: Array.isArray(data) && data.length > 0 ? data : mockMessages[leadId] || [] },
        isLoadingMessages: false,
      }));
    } catch (error) {
      set((state) => ({
        allMessages: { ...state.allMessages, [leadId]: mockMessages[leadId] || [] },
        isLoadingMessages: false,
      }));
    }
  },

  sendMessage: async (leadId, content, senderType = 'human') => {
    const newMsg = {
      id: `msg_${Date.now()}`,
      direction: 'outbound',
      senderType,
      contentType: 'text',
      content,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      allMessages: {
        ...state.allMessages,
        [leadId]: [...(state.allMessages[leadId] || []), newMsg],
      },
    }));
  },

  selectLead: (id) => {
    set({ selectedLeadId: id });
    if (id) get().fetchMessages(id);
  },
  // Backward-compatible alias while remaining pages migrate to lead naming.
  selectCustomer: (id) => {
    set({ selectedLeadId: id });
    if (id) get().fetchMessages(id);
  },

  clearSelection: () => set({ selectedLeadId: null }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setStageFilter: (stage) => set({ stageFilter: stage }),

  // --- Approval State ---
  approvals: mockApprovals,
  isLoadingApprovals: false,
  fetchApprovals: async () => {
    set({ isLoadingApprovals: true });
    try {
      const response = await apiFetch('/api/approvals', { cache: 'no-store' });
      const data = await response.json();
      set({ approvals: Array.isArray(data) ? data : mockApprovals, isLoadingApprovals: false });
    } catch (error) {
      set({ approvals: mockApprovals, isLoadingApprovals: false });
    }
  },

  // --- Workflow State ---
  agentRuns: mockAgentRuns,
  events: mockEvents,
  playbooks: mockPlaybooks,
  skills: mockSkills,
  workflowTasks: [],
  isLoadingWorkflow: false,
  refreshWorkflow: async () => {
    set({ isLoadingWorkflow: true });
    try {
      const response = await apiFetch('/api/tasks', { cache: 'no-store' });
      const data = await response.json();
      set({ workflowTasks: Array.isArray(data) ? data : [], isLoadingWorkflow: false });
    } catch (error) {
      set({ workflowTasks: [], isLoadingWorkflow: false });
    }
  },

  // --- AI Command State ---
  aiCommandHistory: mockAiCommands,
  addAiCommand: (cmd) => set(s => ({ aiCommandHistory: [...s.aiCommandHistory, cmd] })),

  // --- Timeline State ---
  timelines: mockTimelines,
  getTimeline: (leadId) => mockTimelines[leadId] || [],

  // --- Franchise Docs State ---
  franchiseDocs: mockFranchiseDocs,

  // --- Playbook Selection ---
  selectedPlaybookId: null,
  setSelectedPlaybookId: (id) => set({ selectedPlaybookId: id }),

  // --- AI Typing Status ---
  typingStatus: {},
  setTypingStatus: (id, status) => set(s => ({
    typingStatus: { ...s.typingStatus, [id]: status },
  })),
  clearTypingStatus: (id) => set(s => {
    const next = { ...s.typingStatus };
    delete next[id];
    return { typingStatus: next };
  }),

  // --- UI State ---
  activeMainPanel: 'leads',
  setActiveMainPanel: (panel) => set({ activeMainPanel: panel }),
  sideMenuOpen: false,
  toggleSideMenu: () => set(s => ({ sideMenuOpen: !s.sideMenuOpen })),
  closeSideMenu: () => set({ sideMenuOpen: false }),

  // --- Notifications ---
  notifications: [],
  fetchNotifications: async () => {
    set({ notifications: [
      { id: 'n1', title: '李美琴提交了加盟意向书', isRead: false, createdAt: '2026-04-18T16:20:00Z' },
      { id: 'n2', title: '华南区政策调整审批待处理', isRead: false, createdAt: '2026-04-19T09:00:00Z' },
      { id: 'n3', title: 'Lead Scoring Agent 完成全量评分', isRead: true, createdAt: '2026-04-20T06:30:00Z' },
    ]});
  },
  markNotificationAsRead: (id) => {
    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
    }));
  },
}));

// Derived selectors
export const selectSelectedLead = (state) => {
  if (!state.selectedLeadId) return null;
  return state.leads.find(l => l.id === state.selectedLeadId) || null;
};

export const selectSelectedCustomer = selectSelectedLead;

export const selectSelectedMessages = (state) => {
  if (!state.selectedLeadId) return [];
  return state.allMessages[state.selectedLeadId] || [];
};

export default useStore;
