import { useState } from 'react'
import Layout from '../components/Layout'
import type { MaterialRow, LaborRow, ExpenseRow, OverheadSetting } from '../services/api'

type CostTab = 'materials' | 'labor' | 'expenses' | 'overhead'

function CostSimulationPage() {
  const [step, setStep] = useState<'input' | 'costs' | 'result'>('input')
  const [activeTab, setActiveTab] = useState<CostTab>('materials')
  
  // 基本情報
  const [formData, setFormData] = useState({
    productName: '',
    customerName: '',
    quantity: 1,
    customerPrice: 0
  })
  
  // 材料費
  const [materials, setMaterials] = useState<MaterialRow[]>([
    { id: '1', materialName: '', unitPrice: 0, quantity: 0, unit: '個', subtotal: 0 }
  ])

  // 労務費
  const [labors, setLabors] = useState<LaborRow[]>([
    { id: '1', processName: '', workTime: 0, hourlyRate: 0, subtotal: 0 }
  ])

  // 経費
  const [expenses, setExpenseRows] = useState<ExpenseRow[]>([
    { id: '1', expenseName: '', amount: 0 }
  ])

  // 間接費設定
  const [overhead, setOverhead] = useState<OverheadSetting>({
    manufacturingRate: 30,  // デフォルト30%
    adminRate: 10           // デフォルト10%
  })

  // ===== 材料費関連 =====
  const addMaterialRow = () => {
    const newId = (Math.max(...materials.map(m => parseInt(m.id)), 0) + 1).toString()
    setMaterials([...materials, { id: newId, materialName: '', unitPrice: 0, quantity: 0, unit: '個', subtotal: 0 }])
  }

  const removeMaterialRow = (id: string) => {
    if (materials.length === 1) return
    setMaterials(materials.filter(m => m.id !== id))
  }

  const updateMaterialRow = (id: string, field: keyof MaterialRow, value: any) => {
    setMaterials(materials.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value }
        if (field === 'unitPrice' || field === 'quantity') {
          updated.subtotal = updated.unitPrice * updated.quantity
        }
        return updated
      }
      return m
    }))
  }

  // ===== 労務費関連 =====
  const addLaborRow = () => {
    const newId = (Math.max(...labors.map(l => parseInt(l.id)), 0) + 1).toString()
    setLabors([...labors, { id: newId, processName: '', workTime: 0, hourlyRate: 0, subtotal: 0 }])
  }

  const removeLaborRow = (id: string) => {
    if (labors.length === 1) return
    setLabors(labors.filter(l => l.id !== id))
  }

  const updateLaborRow = (id: string, field: keyof LaborRow, value: any) => {
    setLabors(labors.map(l => {
      if (l.id === id) {
        const updated = { ...l, [field]: value }
        if (field === 'workTime' || field === 'hourlyRate') {
          // 作業時間（分）を時間に変換して時間単価をかける
          updated.subtotal = (updated.workTime / 60) * updated.hourlyRate
        }
        return updated
      }
      return l
    }))
  }

  // ===== 経費関連 =====
  const addExpenseRow = () => {
    const newId = (Math.max(...expenses.map(e => parseInt(e.id)), 0) + 1).toString()
    setExpenseRows([...expenses, { id: newId, expenseName: '', amount: 0 }])
  }

  const removeExpenseRow = (id: string) => {
    if (expenses.length === 1) return
    setExpenseRows(expenses.filter(e => e.id !== id))
  }

  const updateExpenseRow = (id: string, field: keyof ExpenseRow, value: any) => {
    setExpenseRows(expenses.map(e => {
      if (e.id === id) {
        return { ...e, [field]: value }
      }
      return e
    }))
  }

  // ===== 原価計算 =====
  const totalMaterialCost = materials.reduce((sum, m) => sum + m.subtotal, 0)
  const totalLaborCost = labors.reduce((sum, l) => sum + l.subtotal, 0)
  const totalExpenseCost = expenses.reduce((sum, e) => sum + e.amount, 0)
  const directCost = totalMaterialCost + totalLaborCost + totalExpenseCost
  
  // 製造間接費 = 直接費 × 製造間接費配賦率
  const manufacturingOverhead = directCost * (overhead.manufacturingRate / 100)
  
  // 製造原価 = 直接費 + 製造間接費
  const manufacturingCost = directCost + manufacturingOverhead
  
  // 販売管理費 = 製造原価 × 販売管理費配賦率
  const adminCost = manufacturingCost * (overhead.adminRate / 100)
  
  // 総原価 = 製造原価 + 販売管理費
  const totalCost = manufacturingCost + adminCost
  
  // 単位あたり原価
  const unitCost = formData.quantity > 0 ? totalCost / formData.quantity : 0
  
  // 利益計算
  const profit = formData.customerPrice - unitCost
  const profitRate = formData.customerPrice > 0 ? (profit / formData.customerPrice) * 100 : 0
  const isProfit = profit > 0

  // バリデーション
  const handleCalculate = () => {
    if (!formData.productName) {
      alert('商品名を入力してください')
      return
    }
    if (formData.quantity <= 0) {
      alert('数量を入力してください')
      return
    }
    if (formData.customerPrice <= 0) {
      alert('顧客指定単価を入力してください')
      return
    }
    setStep('result')
  }

  // リセット
  const handleReset = () => {
    setStep('input')
    setActiveTab('materials')
    setFormData({ productName: '', customerName: '', quantity: 1, customerPrice: 0 })
    setMaterials([{ id: '1', materialName: '', unitPrice: 0, quantity: 0, unit: '個', subtotal: 0 }])
    setLabors([{ id: '1', processName: '', workTime: 0, hourlyRate: 0, subtotal: 0 }])
    setExpenseRows([{ id: '1', expenseName: '', amount: 0 }])
    setOverhead({ manufacturingRate: 30, adminRate: 10 })
  }

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '2rem' }}>💰 原価シミュレーション</h1>

        {/* ステップインジケーター */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem', gap: '1rem' }}>
          <div style={{
            padding: '0.5rem 1.5rem', borderRadius: '20px',
            backgroundColor: step === 'input' ? '#3498db' : '#ecf0f1',
            color: step === 'input' ? 'white' : '#7f8c8d',
            fontWeight: 'bold'
          }}>1. 基本情報</div>
          <div style={{
            padding: '0.5rem 1.5rem', borderRadius: '20px',
            backgroundColor: step === 'costs' ? '#3498db' : '#ecf0f1',
            color: step === 'costs' ? 'white' : '#7f8c8d',
            fontWeight: 'bold'
          }}>2. 原価入力</div>
          <div style={{
            padding: '0.5rem 1.5rem', borderRadius: '20px',
            backgroundColor: step === 'result' ? '#3498db' : '#ecf0f1',
            color: step === 'result' ? 'white' : '#7f8c8d',
            fontWeight: 'bold'
          }}>3. 結果表示</div>
        </div>

        {/* Step 1: 基本情報入力 */}
        {step === 'input' && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0 }}>基本情報を入力してください</h2>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                商品名 <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.productName}
                onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                placeholder="例: ステンレス部品A"
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>顧客名</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="例: 株式会社○○"
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                製造数量 <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
              />
              <small style={{ color: '#7f8c8d' }}>総原価をこの数量で割って1個あたりの原価を計算します</small>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                顧客指定単価（円 / 1個） <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.customerPrice}
                onChange={(e) => setFormData({ ...formData, customerPrice: parseFloat(e.target.value) || 0 })}
                placeholder="例: 1500"
                style={{ width: '100%', padding: '0.75rem', border: '2px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>

            <button
              onClick={() => setStep('costs')}
              disabled={!formData.productName || formData.quantity <= 0 || formData.customerPrice <= 0}
              style={{
                width: '100%', padding: '1rem', backgroundColor: '#3498db', color: 'white',
                border: 'none', borderRadius: '4px',
                cursor: !formData.productName || formData.quantity <= 0 || formData.customerPrice <= 0 ? 'not-allowed' : 'pointer',
                fontWeight: 'bold', fontSize: '1.1rem',
                opacity: !formData.productName || formData.quantity <= 0 || formData.customerPrice <= 0 ? 0.5 : 1
              }}
            >
              次へ →
            </button>
          </div>
        )}

        {/* Step 2: 原価入力（タブ切り替え） */}
        {step === 'costs' && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0 }}>原価を入力してください</h2>

            <div style={{ backgroundColor: '#e8f5e9', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
              <div><strong>商品名:</strong> {formData.productName}</div>
              <div><strong>製造数量:</strong> {formData.quantity}個</div>
              <div><strong>顧客指定単価:</strong> ¥{formData.customerPrice.toLocaleString()} / 1個</div>
            </div>

            {/* タブ */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #ecf0f1' }}>
              {[
                { key: 'materials', label: '📦 材料費', color: '#3498db' },
                { key: 'labor', label: '👷 労務費', color: '#e67e22' },
                { key: 'expenses', label: '💵 経費', color: '#9b59b6' },
                { key: 'overhead', label: '⚙️ 間接費', color: '#16a085' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as CostTab)}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    backgroundColor: activeTab === tab.key ? tab.color : 'transparent',
                    color: activeTab === tab.key ? 'white' : '#7f8c8d',
                    border: 'none',
                    borderBottom: activeTab === tab.key ? `3px solid ${tab.color}` : 'none',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    transition: 'all 0.3s'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 材料費タブ */}
            {activeTab === 'materials' && (
              <div>
                <h3 style={{ color: '#3498db' }}>📦 材料費</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '200px' }}>材料名</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', width: '120px' }}>単価（円）</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', width: '100px' }}>使用量</th>
                      <th style={{ padding: '0.75rem', textAlign: 'left', width: '100px' }}>単位</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', width: '120px' }}>小計（円）</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', width: '80px' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material, index) => (
                      <tr key={material.id} style={{ borderBottom: '1px solid #ecf0f1', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="text" value={material.materialName} onChange={(e) => updateMaterialRow(material.id, 'materialName', e.target.value)}
                            placeholder="例: ステンレス板" style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px' }} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="number" min="0" value={material.unitPrice} onChange={(e) => updateMaterialRow(material.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="number" min="0" step="0.1" value={material.quantity} onChange={(e) => updateMaterialRow(material.id, 'quantity', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <select value={material.unit} onChange={(e) => updateMaterialRow(material.id, 'unit', e.target.value)}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px' }}>
                            <option value="個">個</option>
                            <option value="本">本</option>
                            <option value="枚">枚</option>
                            <option value="kg">kg</option>
                            <option value="g">g</option>
                            <option value="m">m</option>
                            <option value="L">L</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>¥{material.subtotal.toLocaleString()}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <button onClick={() => removeMaterialRow(material.id)}
                            style={{ padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#ecf0f1', fontWeight: 'bold' }}>
                      <td colSpan={4} style={{ padding: '1rem', textAlign: 'right' }}>材料費合計:</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.2rem', color: '#3498db' }}>¥{totalMaterialCost.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
                <button onClick={addMaterialRow}
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ➕ 材料行を追加
                </button>
              </div>
            )}

            {/* 労務費タブ */}
            {activeTab === 'labor' && (
              <div>
                <h3 style={{ color: '#e67e22' }}>👷 労務費（工数）</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left', minWidth: '200px' }}>工程名</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', width: '150px' }}>作業時間（分）</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', width: '150px' }}>時間単価（円/h）</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', width: '120px' }}>小計（円）</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', width: '80px' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labors.map((labor, index) => (
                      <tr key={labor.id} style={{ borderBottom: '1px solid #ecf0f1', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="text" value={labor.processName} onChange={(e) => updateLaborRow(labor.id, 'processName', e.target.value)}
                            placeholder="例: 切断工程" style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px' }} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="number" min="0" step="1" value={labor.workTime} onChange={(e) => updateLaborRow(labor.id, 'workTime', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="number" min="0" value={labor.hourlyRate} onChange={(e) => updateLaborRow(labor.id, 'hourlyRate', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>¥{labor.subtotal.toLocaleString()}</td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <button onClick={() => removeLaborRow(labor.id)}
                            style={{ padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#ecf0f1', fontWeight: 'bold' }}>
                      <td colSpan={3} style={{ padding: '1rem', textAlign: 'right' }}>労務費合計:</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.2rem', color: '#e67e22' }}>¥{totalLaborCost.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
                <button onClick={addLaborRow}
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ➕ 工程を追加
                </button>
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                  <small><strong>💡 ヒント:</strong> 作業時間は分単位で入力してください。システムが自動的に時間に変換して計算します。<br/>
                  例: 15分の作業を時給1,200円で行う場合 → 15分 ÷ 60 × 1,200円 = 300円</small>
                </div>
              </div>
            )}

            {/* 経費タブ */}
            {activeTab === 'expenses' && (
              <div>
                <h3 style={{ color: '#9b59b6' }}>💵 経費</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                      <th style={{ padding: '0.75rem', textAlign: 'left' }}>経費名</th>
                      <th style={{ padding: '0.75rem', textAlign: 'right', width: '200px' }}>金額（円）</th>
                      <th style={{ padding: '0.75rem', textAlign: 'center', width: '80px' }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense, index) => (
                      <tr key={expense.id} style={{ borderBottom: '1px solid #ecf0f1', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="text" value={expense.expenseName} onChange={(e) => updateExpenseRow(expense.id, 'expenseName', e.target.value)}
                            placeholder="例: 外注費、運送費" style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px' }} />
                        </td>
                        <td style={{ padding: '0.5rem' }}>
                          <input type="number" min="0" value={expense.amount} onChange={(e) => updateExpenseRow(expense.id, 'amount', parseFloat(e.target.value) || 0)}
                            style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', textAlign: 'right' }} />
                        </td>
                        <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                          <button onClick={() => removeExpenseRow(expense.id)}
                            style={{ padding: '0.5rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: '#ecf0f1', fontWeight: 'bold' }}>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>経費合計:</td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.2rem', color: '#9b59b6' }}>¥{totalExpenseCost.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
                <button onClick={addExpenseRow}
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                  ➕ 経費項目を追加
                </button>
                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                  <small><strong>💡 経費の例:</strong> 外注費、運送費、梱包費、金型費、特許使用料、検査費用など</small>
                </div>
              </div>
            )}

            {/* 間接費タブ */}
            {activeTab === 'overhead' && (
              <div>
                <h3 style={{ color: '#16a085' }}>⚙️ 間接費設定</h3>
                
                <div style={{ backgroundColor: '#e8f5e9', padding: '1.5rem', borderRadius: '4px', marginBottom: '1.5rem' }}>
                  <h4 style={{ marginTop: 0 }}>現在の直接費</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>材料費: <strong>¥{totalMaterialCost.toLocaleString()}</strong></div>
                    <div>労務費: <strong>¥{totalLaborCost.toLocaleString()}</strong></div>
                    <div>経費: <strong>¥{totalExpenseCost.toLocaleString()}</strong></div>
                    <div style={{ fontSize: '1.2rem', color: '#16a085' }}>
                      直接費合計: <strong>¥{directCost.toLocaleString()}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    製造間接費 配賦率（%）
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={overhead.manufacturingRate}
                    onChange={(e) => setOverhead({ ...overhead, manufacturingRate: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.75rem', border: '2px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
                  />
                  <small style={{ color: '#7f8c8d' }}>
                    直接費に対する製造間接費の配賦率を設定します（工場の電気代、減価償却費、間接人件費など）
                  </small>
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                    計算: ¥{directCost.toLocaleString()} × {overhead.manufacturingRate}% = 
                    <strong style={{ color: '#e67e22' }}> ¥{manufacturingOverhead.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    販売管理費 配賦率（%）
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={overhead.adminRate}
                    onChange={(e) => setOverhead({ ...overhead, adminRate: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.75rem', border: '2px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
                  />
                  <small style={{ color: '#7f8c8d' }}>
                    製造原価に対する販売管理費の配賦率を設定します（営業人件費、広告宣伝費、本社経費など）
                  </small>
                  <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                    計算: ¥{manufacturingCost.toLocaleString()} × {overhead.adminRate}% = 
                    <strong style={{ color: '#e67e22' }}> ¥{adminCost.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ backgroundColor: '#d5f4e6', padding: '1.5rem', borderRadius: '4px', border: '2px solid #27ae60' }}>
                  <h4 style={{ marginTop: 0, color: '#27ae60' }}>総原価の内訳</h4>
                  <div style={{ marginBottom: '0.5rem' }}>直接費: ¥{directCost.toLocaleString()}</div>
                  <div style={{ marginBottom: '0.5rem' }}>製造間接費: ¥{manufacturingOverhead.toLocaleString()}</div>
                  <div style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #27ae60' }}>
                    販売管理費: ¥{adminCost.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: '#27ae60', marginTop: '0.5rem' }}>
                    総原価: ¥{totalCost.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '1.1rem', marginTop: '0.5rem' }}>
                    1個あたり原価: ¥{unitCost.toLocaleString()}
                  </div>
                </div>
              </div>
            )}

            {/* 計算プレビュー */}
            <div style={{ marginTop: '2rem', padding: '1.5rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
              <h4 style={{ marginTop: 0 }}>💡 計算プレビュー</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>材料費:</div><div style={{ textAlign: 'right' }}>¥{totalMaterialCost.toLocaleString()}</div>
                <div>労務費:</div><div style={{ textAlign: 'right' }}>¥{totalLaborCost.toLocaleString()}</div>
                <div>経費:</div><div style={{ textAlign: 'right' }}>¥{totalExpenseCost.toLocaleString()}</div>
                <div style={{ fontWeight: 'bold', paddingTop: '0.5rem', borderTop: '1px solid #f39c12' }}>直接費:</div>
                <div style={{ textAlign: 'right', fontWeight: 'bold', paddingTop: '0.5rem', borderTop: '1px solid #f39c12' }}>¥{directCost.toLocaleString()}</div>
                <div>製造間接費 ({overhead.manufacturingRate}%):</div><div style={{ textAlign: 'right' }}>¥{manufacturingOverhead.toLocaleString()}</div>
                <div>販売管理費 ({overhead.adminRate}%):</div><div style={{ textAlign: 'right' }}>¥{adminCost.toLocaleString()}</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#e67e22', paddingTop: '0.5rem', borderTop: '2px solid #e67e22' }}>総原価:</div>
                <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: '#e67e22', paddingTop: '0.5rem', borderTop: '2px solid #e67e22' }}>¥{totalCost.toLocaleString()}</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#3498db' }}>1個あたり原価:</div>
                <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: '#3498db' }}>¥{unitCost.toLocaleString()}</div>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: isProfit ? '#27ae60' : '#e74c3c' }}>1個あたり利益:</div>
                <div style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.2rem', color: isProfit ? '#27ae60' : '#e74c3c' }}>
                  {isProfit ? '+' : ''}¥{profit.toLocaleString()} ({profitRate.toFixed(1)}%)
                </div>
              </div>
            </div>

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              <button onClick={() => setStep('input')}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                ← 戻る
              </button>
              <button onClick={handleCalculate}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#e67e22', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem' }}>
                💰 結果を表示
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 結果表示 */}
        {step === 'result' && (
          <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginTop: 0 }}>シミュレーション結果</h2>

            {/* 商品情報 */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '4px', marginBottom: '2rem' }}>
              <div><strong>商品名:</strong> {formData.productName}</div>
              {formData.customerName && <div><strong>顧客名:</strong> {formData.customerName}</div>}
              <div><strong>製造数量:</strong> {formData.quantity}個</div>
            </div>

            {/* 利益判定 */}
            <div style={{
              padding: '2rem', borderRadius: '8px', marginBottom: '2rem',
              backgroundColor: isProfit ? '#d5f4e6' : '#fadbd8',
              border: `3px solid ${isProfit ? '#27ae60' : '#e74c3c'}`
            }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: isProfit ? '#27ae60' : '#e74c3c', marginBottom: '0.5rem' }}>
                {isProfit ? '✅ 利益が出ます！' : '⚠️ 損失が発生します'}
              </div>
              <div style={{ fontSize: '1.3rem' }}>
                1個あたり利益: <strong style={{ fontSize: '1.8rem' }}>{isProfit ? '+' : ''}{profit.toLocaleString()}円</strong>
              </div>
              <div style={{ fontSize: '1.2rem', marginTop: '0.5rem' }}>
                利益率: <strong>{profitRate.toFixed(1)}%</strong>
              </div>
            </div>

            {/* サマリーカード */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ backgroundColor: '#3498db', color: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>顧客指定単価</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>¥{formData.customerPrice.toLocaleString()}</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>/ 1個</div>
              </div>
              <div style={{ backgroundColor: '#e67e22', color: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>1個あたり原価</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>¥{unitCost.toLocaleString()}</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>総原価 ÷ {formData.quantity}個</div>
              </div>
              <div style={{ backgroundColor: isProfit ? '#27ae60' : '#e74c3c', color: 'white', padding: '1.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>1個あたり利益</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{isProfit ? '+' : ''}¥{profit.toLocaleString()}</div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>{profitRate.toFixed(1)}%</div>
              </div>
            </div>

            {/* 原価内訳 */}
            <div style={{ backgroundColor: '#f8f9fa', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
              <h3 style={{ marginTop: 0 }}>原価内訳（総額）</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '0.75rem' }}>📦 材料費</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', color: '#3498db' }}>
                      ¥{totalMaterialCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '0.75rem' }}>👷 労務費</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', color: '#e67e22' }}>
                      ¥{totalLaborCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '0.75rem' }}>💵 経費</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', color: '#9b59b6' }}>
                      ¥{totalExpenseCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '2px solid #34495e', backgroundColor: '#ecf0f1', fontWeight: 'bold' }}>
                    <td style={{ padding: '0.75rem' }}>直接費合計</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      ¥{directCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '0.75rem' }}>⚙️ 製造間接費 ({overhead.manufacturingRate}%)</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', color: '#16a085' }}>
                      ¥{manufacturingOverhead.toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '2px solid #34495e', backgroundColor: '#ecf0f1', fontWeight: 'bold' }}>
                    <td style={{ padding: '0.75rem' }}>製造原価</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      ¥{manufacturingCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '2px solid #34495e' }}>
                    <td style={{ padding: '0.75rem' }}>📊 販売管理費 ({overhead.adminRate}%)</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold', color: '#16a085' }}>
                      ¥{adminCost.toLocaleString()}
                    </td>
                  </tr>
                  <tr style={{ backgroundColor: '#fff3cd', fontWeight: 'bold' }}>
                    <td style={{ padding: '1rem', fontSize: '1.2rem' }}>総原価</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontSize: '1.4rem', color: '#e67e22' }}>
                      ¥{totalCost.toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 詳細内訳（折りたたみ可能） */}
            <details style={{ marginBottom: '2rem' }}>
              <summary style={{ cursor: 'pointer', padding: '1rem', backgroundColor: '#ecf0f1', borderRadius: '4px', fontWeight: 'bold' }}>
                📋 詳細内訳を表示
              </summary>
              <div style={{ padding: '1rem', border: '1px solid #ecf0f1', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
                {/* 材料費詳細 */}
                {materials.filter(m => m.materialName).length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: '#3498db' }}>📦 材料費詳細</h4>
                    <table style={{ width: '100%', fontSize: '0.9rem' }}>
                      <tbody>
                        {materials.filter(m => m.materialName).map(m => (
                          <tr key={m.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                            <td style={{ padding: '0.5rem' }}>{m.materialName}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                              ¥{m.unitPrice.toLocaleString()} × {m.quantity}{m.unit}
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                              ¥{m.subtotal.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 労務費詳細 */}
                {labors.filter(l => l.processName).length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <h4 style={{ color: '#e67e22' }}>👷 労務費詳細</h4>
                    <table style={{ width: '100%', fontSize: '0.9rem' }}>
                      <tbody>
                        {labors.filter(l => l.processName).map(l => (
                          <tr key={l.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                            <td style={{ padding: '0.5rem' }}>{l.processName}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right' }}>
                              {l.workTime}分 × ¥{l.hourlyRate.toLocaleString()}/h
                            </td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                              ¥{l.subtotal.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 経費詳細 */}
                {expenses.filter(e => e.expenseName).length > 0 && (
                  <div>
                    <h4 style={{ color: '#9b59b6' }}>💵 経費詳細</h4>
                    <table style={{ width: '100%', fontSize: '0.9rem' }}>
                      <tbody>
                        {expenses.filter(e => e.expenseName).map(e => (
                          <tr key={e.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                            <td style={{ padding: '0.5rem' }}>{e.expenseName}</td>
                            <td style={{ padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                              ¥{e.amount.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setStep('costs')}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                ← 原価を修正
              </button>
              <button onClick={handleReset}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                🔄 新規シミュレーション
              </button>
              <button onClick={() => window.print()}
                style={{ flex: 1, padding: '0.75rem', backgroundColor: '#34495e', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                🖨️ 印刷
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default CostSimulationPage