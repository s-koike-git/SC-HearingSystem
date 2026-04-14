
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/sc-hearing/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
  getById: (id: number) => api.get<Condition>(`/conditions/${id}`),
  getByQuestion: (businessType: string, questionNo: string) =>
    api.get<Condition[]>('/conditions/by-question', {
      params: { businessType, questionNo },
    }),
  create: (condition: Condition) => api.post<Condition>('/conditions', condition),
  update: (id: number, condition: Condition) => api.put(`/conditions/${id}`, condition),
  delete: (id: number) => api.delete(`/conditions/${id}`),
};

// Judgments API
export const judgmentsApi = {
  getByProject: (projectId: number) => api.get<Judgment[]>(`/judgments/project/${projectId}`),
  reExecute: (projectId: number) => api.post(`/judgments/project/${projectId}/re-execute`),
};

export const businessesApi = {
  getAll: () => api.get<Business[]>('/businesses'),
  create: (b: Business) => api.post<Business>('/businesses', b),
  update: (id: number, b: Business) => api.put(`/businesses/${id}`, b),
  delete: (id: number) => api.delete(`/businesses/${id}`),
  saveBulk: (list: Business[]) => api.post('/businesses/bulk', list),
}

export const questionsApi = {
  // 質問マスタ用（全件取得）
  getAll: () => api.get<Question[]>('/questions/all'),

  // ヒアリング用（業務別）
  getByBusiness: (businessType: string) =>
    api.get<Question[]>('/questions', { params: { businessType } }),

  // 質問削除
  delete: (id: number) => api.delete(`/questions/${id}`),

  // ✅ CSVインポート用（一括保存）
  saveBulk: (list: Question[]) =>
    api.post('/questions/bulk', list),
}

export const programsApi = {
  getAll: () => api.get<Program[]>('/programs'),
  create: (p: Program) => api.post<Program>('/programs', p),
  update: (id: number, p: Program) => api.put(`/programs/${id}`, p),
  delete: (id: number) => api.delete(`/programs/${id}`),
  saveBulk: (list: Program[]) => api.post('/programs/bulk', list),
}
// 商品マスタAPI
export const productsApi = {
  getAll: () => api.get('/products'),
  getById: (id: number) => api.get(`/products/${id}`),
  getByCode: (code: string) => api.get(`/products/code/${code}`),
  create: (data: Omit<Product, 'id'>) => api.post('/products', data),
  update: (id: number, data: Partial<Product>) => api.put(`/products/${id}`, data),
  delete: (id: number) => api.delete(`/products/${id}`)
}

// 材料マスタAPI
export const materialsApi = {
  getAll: () => api.get('/materials'),
  getById: (id: number) => api.get(`/materials/${id}`),
  create: (data: Omit<Material, 'id'>) => api.post('/materials', data),
  update: (id: number, data: Partial<Material>) => api.put(`/materials/${id}`, data),
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
  /**
   * 有効なお知らせ一覧を取得（メニュー画面用）
   */
  getActive: async (): Promise<Announcement[]> => {
    const response = await fetch(`${API_BASE_URL}/announcements/active`)
    if (!response.ok) {
      throw new Error('お知らせの取得に失敗しました')
    }
    return response.json()
  },

  /**
   * すべてのお知らせを取得（管理画面用）
   */
  getAll: async (): Promise<Announcement[]> => {
    const response = await fetch(`${API_BASE_URL}/announcements`)
    if (!response.ok) {
      throw new Error('お知らせの取得に失敗しました')
    }
    return response.json()
  },

  /**
   * お知らせを新規作成
   */
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

  /**
   * お知らせを更新
   */
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

  /**
   * お知らせを削除
   */
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
  /**
   * ユーザーの見積もり一覧を取得
   */
  getAll: async (userId: number): Promise<ProgramEstimate[]> => {
    const response = await fetch(`${API_BASE_URL}/programestimates?userId=${userId}`)
    if (!response.ok) {
      throw new Error('見積もり一覧の取得に失敗しました')
    }
    return response.json()
  },
 
  /**
   * 特定の見積もりを取得
   */
  getById: async (id: number, userId: number): Promise<ProgramEstimate> => {
    const response = await fetch(`${API_BASE_URL}/programestimates/${id}?userId=${userId}`)
    if (!response.ok) {
      throw new Error('見積もりの取得に失敗しました')
    }
    return response.json()
  },
 
  /**
   * 見積もりを新規作成
   */
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
 
  /**
   * 見積もりを更新
   */
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
 
  /**
   * 見積もりを削除
   */
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
  getAll: async () => { /* ... */ },
  getByBusinessType: async (businessType: string) => { /* ... */ },
  // ...
}

export default api;
