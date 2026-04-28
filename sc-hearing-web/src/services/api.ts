import axios from 'axios';


const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})


// 型定義
export interface Project {
  id?: number;
  companyName: string;
  industry: string;
  contactPerson: string;
  phoneNumber: string;
  email: string;
  remarks: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Answer {
  id?: number;
  projectId: number;
  businessType: string;
  questionNo: string;
  answerValue: string;
  isCustom?: boolean;  // カスタムフラグ追加
  memo?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 原価シミュレーション関連の型定義
export interface Product {
  id: number
  productCode: string
  productName: string
  category: string
  standardPrice: number
  standardCost: number
  unit: string
  isActive: boolean
}

export interface MaterialRow {
  id: string
  materialName: string
  unitPrice: number
  quantity: number
  unit: string
  subtotal: number
}

export interface BOM {
  id: number
  productCode: string
  materialCode: string
  quantity: number
  unit: string
  wasteRate: number
}

export interface ExpenseRow {
  id: string
  expenseName: string       // 経費名
  amount: number            // 金額
}

export interface OverheadSetting {
  manufacturingRate: number    // 製造間接費配賦率（%）
  adminRate: number            // 販売管理費配賦率（%）
}

export interface CostSimulation {
  id?: number
  productName: string
  customerName: string
  quantity: number
  customerPrice: number
  
  // 原価データ
  materials: MaterialRow[]
  labors: LaborRow[]
  expenses: ExpenseRow[]
  overhead: OverheadSetting
  
  // 計算結果
  materialCost: number         // 材料費合計
  laborCost: number            // 労務費合計
  expenseCost: number          // 経費合計
  directCost: number           // 直接費合計
  manufacturingOverhead: number // 製造間接費
  adminCost: number            // 販売管理費
  totalCost: number            // 総原価
  
  unitCost: number             // 単位あたり原価
  profit: number               // 利益
  profitRate: number           // 利益率
  isProfit: boolean
  
  createdAt?: string
}

export interface Condition {
  id?: number;
  businessType: string;
  questionNo: string;
  questionText: string;
  answerCondition: string;
  programId: string;
  programName: string;
  isStandard: boolean;
  remarks: string;
  displayOrder: number;
}

export interface Judgment {
  id?: number;
  projectId: number;
  programId: string;
  programName: string;
  businessType: string;
  isUsed: boolean;
  isStandard: boolean;
  isCustom?: boolean;  // カスタムフラグ追加
  createdAt?: string;
  updatedAt?: string;
}

export interface Business {
  id?: number
  name: string
  displayOrder: number
  status: '有効' | '無効'
}

export interface Question {
  id?: number
  businessType: string
  questionNo: string
  text: string
  type: 'yesno' | 'choice' | 'text'
  choices?: string[]
  choicePrograms?: Record<string, string>
  yesPrograms?: string[]
  noPrograms?: string[]
  implementation: string
  settings: string
  priority: '高' | '中' | '低'
}

export interface Program {
  id?: number
  programId: string
  programName: string
  workHours: number
  screenId?: string
}

export interface Announcement {
  id: number
  title: string
  content: string
  priority: '重要' | '通常'
  isActive: boolean
  publishedAt: string
  createdAt: string
  updatedAt: string
}

export interface ProgramEstimateItem {
  id?: number
  estimateId?: number
  programId?: string
  programName: string
  designWorkHours: number
  baseWorkHours: number
  factor: number
  isCustomProgram: boolean
  displayOrder: number
}
 
export interface ProgramEstimate {
  id?: number
  userId: number
  title: string
  description?: string
  totalHours: number
  createdAt?: string
  updatedAt?: string
  items: ProgramEstimateItem[]
}

export interface BusinessFlowMapping {
  id: number
  businessType: string
  stepId: string
  nodeId: string
  displayOrder: number
  isActive: number
  createdAt: string
  updatedAt: string
}

export interface BusinessFlowStep {
  id?: number
  /** 業務処理ID (例: 'estimate_create', 'order_receive') */
  stepId: string
  /** 業務処理名 (例: '見積作成', '受注受付') */
  stepName: string
  /** ノードID (StepIdと同じ) */
  nodeId: string
  /** ノードラベル (StepNameと同じ) */
  nodeLabel: string
  nodeType: string
  displayOrder: number
  parentNodeId?: string
  connectionType?: string
  mermaidStyle?: string
  /** 業務プロセス(第1階層) StepIdへの参照 */
  businessProcessStepId?: string
  /** ReactFlow位置X (F5で追加) */
  positionX?: number
  /** ReactFlow位置Y (F5で追加) */
  positionY?: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface SystemFlowStep {
  id?: number
  stepId: string
  stepName: string
  businessType: string
  /** 業務フローStepIdへの参照 (NEW: Phase 0 で追加) */
  businessFlowStepId?: string
  displayOrder: number
  isSubgraph: boolean
  subgraphLabel?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * システムフローノード（NEW: Phase 1で導入）
 * PRGID/データストア/外部エンティティを統一管理
 */
export interface SystemFlowNode {
  id?: number
  /** グローバル一意ノードID (例: SF_ESTET01, SF_DS_受注, SF_EXT_得意先) */
  nodeId: string
  /** 所属するSystemFlowSteps.StepId */
  flowStepId: string
  /** 表示ラベル (例: ESTET01, 受注, 得意先) */
  nodeLabel: string
  /** ノード種別 */
  nodeType: 'process' | 'io' | 'group' | 'start' | 'end' | 'decision'
  /** ソース種別 */
  sourceType: 'program' | 'data_store' | 'external_entity' | 'decision'
  /** programならPRGID、data_storeなら論理テーブル名、external_entityなら取引先種別 */
  sourceRef?: string
  displayOrder: number
  /** standard/new/customize/_data付き/external */
  mermaidStyle?: string
  /** ReactFlow位置X */
  positionX?: number
  /** ReactFlow位置Y */
  positionY?: number
  description?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}


/**
 * 業務プロセスフロー工程 (第1階層)
 */
export interface BusinessProcessFlowStep {
  id?: number
  stepId: string
  stepName: string
  category: string
  displayOrder: number
  description?: string
  positionX?: number
  positionY?: number
  mermaidStyle?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface BusinessProcessFlowConnection {
  id?: number
  fromStepId: string
  toStepId: string
  connectionType: string
  conditionLabel?: string
  displayOrder: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

/**
 * 機能フロー工程 (第3階層、F5で導入)
 * 旧BusinessFlowStepの中身がこちら
 */
export interface FunctionalFlowStep {
  id?: number
  stepId: string
  stepName: string
  nodeId: string
  nodeLabel: string
  nodeType: string
  displayOrder: number
  parentNodeId?: string
  connectionType?: string
  mermaidStyle?: string
  /** 業務フロー(第2階層) StepIdへの参照 */
  businessFlowStepId?: string
  /** 業務プロセス(第1階層) StepIdへの参照 */
  businessProcessStepId?: string
  positionX?: number
  positionY?: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface FlowQuestionMapping {
  id?: number
  businessType: string
  questionNo: string
  answerCondition: string
  flowStepId: string
  flowType: string
  priority: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface FlowProgramMapping {
  id?: number
  flowStepId: string
  programId: string
  displayOrder: number
  isRequired: boolean
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface FlowConnection {
  id?: number
  fromNodeId: string
  toNodeId: string
  connectionType: string
  conditionLabel?: string
  displayOrder: number
  /** 'business' or 'system' (NEW: Phase 0 で追加) */
  flowType?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

// Projects API

export const projectsApi = {
  getAll: () => api.get<Project[]>('/Projects'),
  getById: (id: number) => api.get<Project>(`/Projects/${id}`),
  create: (project: Project) => api.post<Project>('/Projects', project),
  update: (id: number, project: Project) => api.put(`/Projects/${id}`, project),

  // ✅ 追加：ステータス専用更新
  updateStatus: (id: number, status: string) =>
    api.put(`/Projects/${id}/status`, { status }),

  delete: (id: number) => api.delete(`/Projects/${id}`),
};


// Answers API
export const answersApi = {
  getByProject: (projectId: number) => api.get<Answer[]>(`/answers/project/${projectId}`),
  save: (answer: Answer) => api.post<Answer>('/answers', answer),
  saveBulk: (answers: Answer[]) => api.post('/answers/bulk', answers),
  delete: (id: number) => api.delete(`/answers/${id}`),
};

// Conditions API
export const conditionsApi = {
  getAll: () => api.get<Condition[]>('/conditions'),
  getByBusinessType: (businessType: string) => api.get<Condition[]>(`/conditions/business/${businessType}`),
  create: (condition: Condition) => api.post<Condition>('/conditions', condition),
  update: (id: number, condition: Condition) => api.put(`/conditions/${id}`, condition),
  delete: (id: number) => api.delete(`/conditions/${id}`),
};

// Judgments API
export const judgmentsApi = {
  getByProject: (projectId: number) => api.get<Judgment[]>(`/judgments/project/${projectId}`),
  save: (judgment: Judgment) => api.post<Judgment>('/judgments', judgment),
  saveBulk: (judgments: Judgment[]) => api.post('/judgments/bulk', judgments),
  delete: (id: number) => api.delete(`/judgments/${id}`),
  execute: (projectId: number) => api.post(`/judgments/execute/${projectId}`)
};

// Businesses API
export const businessesApi = {
  getAll: () => api.get<Business[]>('/Businesses'),
  getById: (id: number) => api.get<Business>(`/Businesses/${id}`),
  create: (business: Business) => api.post<Business>('/Businesses', business),
  update: (id: number, business: Business) => api.put(`/Businesses/${id}`, business),
  delete: (id: number) => api.delete(`/Businesses/${id}`),
};

// Questions API
export const questionsApi = {
  /** 質問マスタ画面用：全件取得 */
  getAll: () => api.get<Question[]>('/Questions/all'),

  getById: (id: number) => api.get<Question>(`/Questions/${id}`),

  /** ヒアリング用：業務別取得 */
  getByBusinessType: (businessType: string) =>
    api.get<Question[]>(`/Questions?businessType=${encodeURIComponent(businessType)}`),

  create: (question: Question) => api.post<Question>('/Questions', question),
  update: (id: number, question: Question) => api.put(`/Questions/${id}`, question),
  delete: (id: number) => api.delete(`/Questions/${id}`),
};

// Programs API
export const programsApi = {
  getAll: () => api.get<Program[]>('/Programs'),
  getById: (id: number) => api.get<Program>(`/Programs/${id}`),
  create: (program: Program) => api.post<Program>('/Programs', program),
  update: (id: number, program: Program) => api.put(`/Programs/${id}`, program),
  delete: (id: number) => api.delete(`/Programs/${id}`),
};

// 商品マスタAPI
export const productsApi = {
  getAll: () => api.get('/products'),
  getById: (id: number) => api.get(`/products/${id}`),
  create: (data: Omit<Product, 'id'>) => api.post('/products', data),
  update: (id: number, data: Partial<Product>) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`)
}

// 材料マスタAPI（仮）
export const materialsApi = {
  getAll: () => api.get('/materials'),
  getById: (id: number) => api.get(`/materials/${id}`),
  create: (data: any) => api.post('/materials', data),
  update: (id: number, data: any) => api.put(`/materials/${id}`, data),
  delete: (id: number) => api.delete(`/materials/${id}`)
}

// BOM（部品構成表）API
export const bomApi = {
  getByProduct: (productCode: string) => api.get(`/bom/product/${productCode}`),
  create: (data: Omit<BOM, 'id'>) => api.post('/bom', data),
  update: (id: number, data: Partial<BOM>) => api.put(`/bom/${id}`, data),
  delete: (id: number) => api.delete(`/bom/${id}`)
}

// 原価シミュレーションAPI
export const costSimulationApi = {
  save: (data: Omit<CostSimulation, 'id' | 'createdAt'>) => api.post('/cost-simulation', data),
  getHistory: () => api.get('/cost-simulation/history'),
  getById: (id: number) => api.get(`/cost-simulation/${id}`),
  delete: (id: number) => api.delete(`/cost-simulation/${id}`)
}

export const announcementsApi = {
  getActive: async (): Promise<Announcement[]> => {
    const response = await fetch(`${API_BASE_URL}/announcements/active`)
    if (!response.ok) {
      throw new Error('お知らせの取得に失敗しました')
    }
    return response.json()
  },

  getAll: async (): Promise<Announcement[]> => {
    const response = await fetch(`${API_BASE_URL}/announcements`)
    if (!response.ok) {
      throw new Error('お知らせの取得に失敗しました')
    }
    return response.json()
  },

  create: async (announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>): Promise<Announcement> => {
    const response = await fetch(`${API_BASE_URL}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(announcement),
    })
    if (!response.ok) {
      throw new Error('お知らせの作成に失敗しました')
    }
    return response.json()
  },

  update: async (id: number, announcement: Announcement): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/announcements/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(announcement),
    })
    if (!response.ok) {
      throw new Error('お知らせの更新に失敗しました')
    }
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/announcements/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('お知らせの削除に失敗しました')
    }
  },
}

export const programEstimatesApi = {
  getAll: async (userId: number): Promise<ProgramEstimate[]> => {
    const response = await fetch(`${API_BASE_URL}/programestimates?userId=${userId}`)
    if (!response.ok) {
      throw new Error('見積もり一覧の取得に失敗しました')
    }
    return response.json()
  },

  getById: async (id: number, userId: number): Promise<ProgramEstimate> => {
    const response = await fetch(`${API_BASE_URL}/programestimates/${id}?userId=${userId}`)
    if (!response.ok) {
      throw new Error('見積もりの取得に失敗しました')
    }
    return response.json()
  },

  create: async (estimate: ProgramEstimate): Promise<ProgramEstimate> => {
    const response = await fetch(`${API_BASE_URL}/programestimates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(estimate),
    })
    if (!response.ok) {
      throw new Error('見積もりの作成に失敗しました')
    }
    return response.json()
  },

  update: async (id: number, estimate: ProgramEstimate): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/programestimates/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(estimate),
    })
    if (!response.ok) {
      throw new Error('見積もりの更新に失敗しました')
    }
  },

  delete: async (id: number, userId: number): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/programestimates/${id}?userId=${userId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('見積もりの削除に失敗しました')
    }
  },
}

export const businessFlowMappingsApi = {
  getAll: async (): Promise<BusinessFlowMapping[]> => {
    const response = await api.get('/BusinessFlowMappings')
    return response.data
  },

  getByBusinessType: async (businessType: string): Promise<BusinessFlowMapping[]> => {
    const response = await api.get(`/BusinessFlowMappings/business/${businessType}`)
    return response.data
  },

  create: async (mapping: Omit<BusinessFlowMapping, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessFlowMapping> => {
    const response = await api.post('/BusinessFlowMappings', mapping)
    return response.data
  },

  update: async (id: number, mapping: Partial<BusinessFlowMapping>): Promise<void> => {
    await api.put(`/BusinessFlowMappings/${id}`, mapping)
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/BusinessFlowMappings/${id}`)
  },
}

export const businessFlowStepsApi = {
  getAll: (businessProcessStepId?: string) => {
    const qs = businessProcessStepId ? `?businessProcessStepId=${encodeURIComponent(businessProcessStepId)}` : ''
    return api.get<BusinessFlowStep[]>(`/BusinessFlowSteps${qs}`)
  },
  getById: (id: number) => api.get<BusinessFlowStep>(`/BusinessFlowSteps/${id}`),
  getByStepId: (stepId: string) => api.get<BusinessFlowStep>(`/BusinessFlowSteps/by-step-id/${encodeURIComponent(stepId)}`),
  getByProcess: (businessProcessStepId: string) =>
    api.get<BusinessFlowStep[]>(`/BusinessFlowSteps/by-process/${encodeURIComponent(businessProcessStepId)}`),
  create: (step: Omit<BusinessFlowStep, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<BusinessFlowStep>('/BusinessFlowSteps', step),
  update: (id: number, step: Partial<BusinessFlowStep>) =>
    api.put(`/BusinessFlowSteps/${id}`, step),
  updatePosition: (id: number, x: number, y: number) =>
    api.put(`/BusinessFlowSteps/${id}/position`, { x, y }),
  updatePositionsBulk: (positions: Array<{ stepId: string; x: number; y: number }>) =>
    api.post('/BusinessFlowSteps/positions', positions),
  delete: (id: number) => api.delete(`/BusinessFlowSteps/${id}`),
  saveBulk: (steps: BusinessFlowStep[]) =>
    api.post('/BusinessFlowSteps/bulk', steps),
}

export const systemFlowStepsApi = {
  getAll: () => api.get<SystemFlowStep[]>('/SystemFlowSteps'),
  getById: (id: number) => api.get<SystemFlowStep>(`/SystemFlowSteps/${id}`),
  getByBusinessType: (businessType: string) =>
    api.get<SystemFlowStep[]>(`/SystemFlowSteps/business/${businessType}`),
  create: (step: Omit<SystemFlowStep, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<SystemFlowStep>('/SystemFlowSteps', step),
  update: (id: number, step: Partial<SystemFlowStep>) =>
    api.put(`/SystemFlowSteps/${id}`, step),
  delete: (id: number) => api.delete(`/SystemFlowSteps/${id}`),
  saveBulk: (steps: SystemFlowStep[]) =>
    api.post('/SystemFlowSteps/bulk', steps),
}

/**
 * SystemFlowNodes API（NEW: Phase 1で導入）
 * システムフローのノード（PRGID/データストア/外部エンティティ）を統一管理
 */
export const systemFlowNodesApi = {
  /** 全ノード取得（flowStepIdとsourceTypeで絞り込み可） */
  getAll: (params?: { flowStepId?: string; sourceType?: string }) => {
    const qs = params
      ? '?' + Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join('&')
      : ''
    return api.get<SystemFlowNode[]>(`/SystemFlowNodes${qs}`)
  },
  getById: (id: number) => api.get<SystemFlowNode>(`/SystemFlowNodes/${id}`),
  getByNodeId: (nodeId: string) =>
    api.get<SystemFlowNode>(`/SystemFlowNodes/by-node-id/${encodeURIComponent(nodeId)}`),
  getByFlowStep: (flowStepId: string) =>
    api.get<SystemFlowNode[]>(`/SystemFlowNodes/by-flow-step/${encodeURIComponent(flowStepId)}`),
  create: (node: Omit<SystemFlowNode, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<SystemFlowNode>('/SystemFlowNodes', node),
  update: (id: number, node: Partial<SystemFlowNode>) =>
    api.put(`/SystemFlowNodes/${id}`, node),
  /** ドラッグ完了時の単一ノード位置更新 */
  updatePosition: (id: number, x: number, y: number) =>
    api.put(`/SystemFlowNodes/${id}/position`, { x, y }),
  /** ドラッグ完了時の一括位置更新（推奨） */
  updatePositionsBulk: (positions: Array<{ nodeId: string; x: number; y: number }>) =>
    api.post('/SystemFlowNodes/positions', positions),
  delete: (id: number) => api.delete(`/SystemFlowNodes/${id}`),
  saveBulk: (nodes: SystemFlowNode[]) =>
    api.post('/SystemFlowNodes/bulk', nodes),
}

export const flowQuestionMappingsApi = {
  getAll: () => api.get<FlowQuestionMapping[]>('/FlowQuestionMappings'),
  getById: (id: number) => api.get<FlowQuestionMapping>(`/FlowQuestionMappings/${id}`),
  getByQuestion: (businessType: string, questionNo: string) =>
    api.get<FlowQuestionMapping[]>('/FlowQuestionMappings/by-question', {
      params: { businessType, questionNo }
    }),
  getByFlowStep: (flowStepId: string) =>
    api.get<FlowQuestionMapping[]>(`/FlowQuestionMappings/by-flow-step/${flowStepId}`),
  create: (mapping: Omit<FlowQuestionMapping, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<FlowQuestionMapping>('/FlowQuestionMappings', mapping),
  update: (id: number, mapping: Partial<FlowQuestionMapping>) =>
    api.put(`/FlowQuestionMappings/${id}`, mapping),
  delete: (id: number) => api.delete(`/FlowQuestionMappings/${id}`),
  saveBulk: (mappings: FlowQuestionMapping[]) =>
    api.post('/FlowQuestionMappings/bulk', mappings),
}

export const flowProgramMappingsApi = {
  getAll: () => api.get<FlowProgramMapping[]>('/FlowProgramMappings'),
  getById: (id: number) => api.get<FlowProgramMapping>(`/FlowProgramMappings/${id}`),
  getByFlowStep: (flowStepId: string) =>
    api.get<FlowProgramMapping[]>(`/FlowProgramMappings/by-flow-step/${flowStepId}`),
  getByProgram: (programId: string) =>
    api.get<FlowProgramMapping[]>(`/FlowProgramMappings/by-program/${programId}`),
  create: (mapping: Omit<FlowProgramMapping, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<FlowProgramMapping>('/FlowProgramMappings', mapping),
  update: (id: number, mapping: Partial<FlowProgramMapping>) =>
    api.put(`/FlowProgramMappings/${id}`, mapping),
  delete: (id: number) => api.delete(`/FlowProgramMappings/${id}`),
  saveBulk: (mappings: FlowProgramMapping[]) =>
    api.post('/FlowProgramMappings/bulk', mappings),
}


/**
 * BusinessProcessFlowSteps API (第1階層)
 */
export const businessProcessFlowStepsApi = {
  getAll: (category?: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : ''
    return api.get<BusinessProcessFlowStep[]>(`/BusinessProcessFlowSteps${qs}`)
  },
  getById: (id: number) => api.get<BusinessProcessFlowStep>(`/BusinessProcessFlowSteps/${id}`),
  getByStepId: (stepId: string) =>
    api.get<BusinessProcessFlowStep>(`/BusinessProcessFlowSteps/by-step-id/${encodeURIComponent(stepId)}`),
  getByCategory: (category: string) =>
    api.get<BusinessProcessFlowStep[]>(`/BusinessProcessFlowSteps/by-category/${encodeURIComponent(category)}`),
  create: (step: Omit<BusinessProcessFlowStep, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<BusinessProcessFlowStep>('/BusinessProcessFlowSteps', step),
  update: (id: number, step: Partial<BusinessProcessFlowStep>) =>
    api.put(`/BusinessProcessFlowSteps/${id}`, step),
  updatePosition: (id: number, x: number, y: number) =>
    api.put(`/BusinessProcessFlowSteps/${id}/position`, { x, y }),
  updatePositionsBulk: (positions: Array<{ stepId: string; x: number; y: number }>) =>
    api.post('/BusinessProcessFlowSteps/positions', positions),
  delete: (id: number) => api.delete(`/BusinessProcessFlowSteps/${id}`),
  saveBulk: (steps: BusinessProcessFlowStep[]) =>
    api.post('/BusinessProcessFlowSteps/bulk', steps),
}

export const businessProcessFlowConnectionsApi = {
  getAll: () => api.get<BusinessProcessFlowConnection[]>('/BusinessProcessFlowConnections'),
  getById: (id: number) => api.get<BusinessProcessFlowConnection>(`/BusinessProcessFlowConnections/${id}`),
  getByFromStep: (fromStepId: string) =>
    api.get<BusinessProcessFlowConnection[]>(`/BusinessProcessFlowConnections/from/${encodeURIComponent(fromStepId)}`),
  getByToStep: (toStepId: string) =>
    api.get<BusinessProcessFlowConnection[]>(`/BusinessProcessFlowConnections/to/${encodeURIComponent(toStepId)}`),
  create: (connection: Omit<BusinessProcessFlowConnection, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<BusinessProcessFlowConnection>('/BusinessProcessFlowConnections', connection),
  update: (id: number, connection: Partial<BusinessProcessFlowConnection>) =>
    api.put(`/BusinessProcessFlowConnections/${id}`, connection),
  delete: (id: number) => api.delete(`/BusinessProcessFlowConnections/${id}`),
  saveBulk: (connections: BusinessProcessFlowConnection[]) =>
    api.post('/BusinessProcessFlowConnections/bulk', connections),
}

/**
 * FunctionalFlowSteps API (第3階層、F5で導入)
 */
export const functionalFlowStepsApi = {
  getAll: (filter?: { businessFlowStepId?: string; businessProcessStepId?: string }) => {
    const params: string[] = []
    if (filter?.businessFlowStepId) params.push(`businessFlowStepId=${encodeURIComponent(filter.businessFlowStepId)}`)
    if (filter?.businessProcessStepId) params.push(`businessProcessStepId=${encodeURIComponent(filter.businessProcessStepId)}`)
    const qs = params.length ? '?' + params.join('&') : ''
    return api.get<FunctionalFlowStep[]>(`/FunctionalFlowSteps${qs}`)
  },
  getById: (id: number) => api.get<FunctionalFlowStep>(`/FunctionalFlowSteps/${id}`),
  getByStepId: (stepId: string) =>
    api.get<FunctionalFlowStep[]>(`/FunctionalFlowSteps/by-step-id/${encodeURIComponent(stepId)}`),
  create: (step: Omit<FunctionalFlowStep, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<FunctionalFlowStep>('/FunctionalFlowSteps', step),
  update: (id: number, step: Partial<FunctionalFlowStep>) =>
    api.put(`/FunctionalFlowSteps/${id}`, step),
  updatePosition: (id: number, x: number, y: number) =>
    api.put(`/FunctionalFlowSteps/${id}/position`, { x, y }),
  updatePositionsBulk: (positions: Array<{ nodeId: string; x: number; y: number }>) =>
    api.post('/FunctionalFlowSteps/positions', positions),
  delete: (id: number) => api.delete(`/FunctionalFlowSteps/${id}`),
  saveBulk: (steps: FunctionalFlowStep[]) =>
    api.post('/FunctionalFlowSteps/bulk', steps),
}

/**
 * FlowConnections API
 * ★ Phase 0 で flowType ('business' / 'system') によるフィルタに対応
 */
export const flowConnectionsApi = {
  /** 全接続取得（flowTypeで絞り込み可: 'business' | 'system'） */
  getAll: (flowType?: 'business' | 'system') => {
    const qs = flowType ? `?flowType=${flowType}` : ''
    return api.get<FlowConnection[]>(`/FlowConnections${qs}`)
  },
  getById: (id: number) => api.get<FlowConnection>(`/FlowConnections/${id}`),
  getByFromNode: (fromNodeId: string, flowType?: 'business' | 'system') => {
    const qs = flowType ? `?flowType=${flowType}` : ''
    return api.get<FlowConnection[]>(`/FlowConnections/from/${fromNodeId}${qs}`)
  },
  getByToNode: (toNodeId: string, flowType?: 'business' | 'system') => {
    const qs = flowType ? `?flowType=${flowType}` : ''
    return api.get<FlowConnection[]>(`/FlowConnections/to/${toNodeId}${qs}`)
  },
  create: (connection: Omit<FlowConnection, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post<FlowConnection>('/FlowConnections', connection),
  update: (id: number, connection: Partial<FlowConnection>) =>
    api.put(`/FlowConnections/${id}`, connection),
  delete: (id: number) => api.delete(`/FlowConnections/${id}`),
  saveBulk: (connections: FlowConnection[]) =>
    api.post('/FlowConnections/bulk', connections),
}

export default api;

// ─── 問合せAPI ─────────────────────────────────────────────────
export interface Inquiry {
  id: number
  title: string
  content: string
  imageData?: string
  status: '未対応' | '対応中' | '対応済'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const inquiriesApi = {
  getAll: () => api.get<Inquiry[]>('/Inquiries'),

  create: (data: { title: string; content: string; imageData?: string | null; createdBy?: string }) =>
    api.post<Inquiry>('/Inquiries', data),

  update: (id: number, data: { title: string; content: string }) =>
    api.put<Inquiry>(`/Inquiries/${id}`, data),

  updateStatus: (id: number, status: string) =>
    api.put<Inquiry>(`/Inquiries/${id}/status`, { status }),

  delete: (id: number) =>
    api.delete(`/Inquiries/${id}`),
}