import { useState, useEffect } from 'react'
import Select from 'react-select'
import { questionsApi, programsApi } from "../../services/api";

interface Question {
  id: number
  businessType: string
  questionNo: string
  text: string
  type: 'yesno' | 'choice' | 'text'
  choices?: string[]
  choicePrograms?: Record<string, string> // 選択肢 -> プログラムID
  yesPrograms?: string[] // ○の場合のプログラムID配列
  noPrograms?: string[] // ×の場合のプログラムID配列
  textPrograms?: string[] // テキスト入力の場合のプログラムID配列  // ←追加
  implementation: string
  settings: string
  priority: '高' | '中' | '低'
}

interface Program {
  id: number
  programId: string
  programName: string
  workHours: number
}

function QuestionManagement() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [businesses, setBusinesses] = useState<string[]>(['見積', '受注', '出荷準備', '請求'])
  const [programs, setPrograms] = useState<Program[]>([])
  const [filterBusiness, setFilterBusiness] = useState<string>('すべて')
  const [showModal, setShowModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  
  const [formData, setFormData] = useState<Partial<Question>>({
    businessType: '見積',
    questionNo: '',
    text: '',
    type: 'yesno',
    choices: [],
    choicePrograms: {},
    yesPrograms: [],
    noPrograms: [],
    textPrograms: [],  // ←追加
    implementation: '',
    settings: '',
    priority: '中'
  })


  // 初期ロード
  useEffect(() => {
    loadQuestions()
    loadPrograms()
  }, [])

  
  
    
  const loadQuestions = async () => {
    try {
      const res = await questionsApi.getAll();
      const converted = res.data.map((q: any) => {
        const options = q.optionsJson ? JSON.parse(q.optionsJson) : {}
        return {
          ...q,
          text: q.questionText,
          type: q.answerType,
          yesPrograms: options.yes ?? [],
          noPrograms: options.no ?? [],
          choicePrograms: options.choice ?? {},
          choices: options.choice ? Object.keys(options.choice) : [],
          textPrograms: options.text ?? [],
        }
      });

      setQuestions(converted);

      // ✅ 業務一覧を質問マスタから動的生成
      const businessList = Array.from(
        new Set(converted.map(q => q.businessType))
      );
      setBusinesses(businessList);
    } catch (e) {
      console.error('質問マスタの読み込みエラー:', e);
    }
  };


  
  const loadPrograms = async () => {
    try {
      const res = await programsApi.getAll()
      setPrograms(res.data)
    } catch (e) {
      console.error('プログラムマスタの読み込みエラー:', e)
    }
  }
  
  const programOptions = programs.map(p => ({
    value: p.programId,
    label: `${p.programId}：${p.programName}`
  }))


  // 保存（即座に実行）
  const saveQuestions = async (newQuestions: Question[]) => {
    try {
      await questionsApi.saveBulk(newQuestions)

      const res = await questionsApi.getAll()
      const converted = res.data.map((q: any) => {
        const options = q.optionsJson ? JSON.parse(q.optionsJson) : {}
        return {
          ...q,
          text: q.questionText,
          type: q.answerType,
          yesPrograms: options.yes ?? [],
          noPrograms: options.no ?? [],
          choicePrograms: options.choice ?? {},
          choices: options.choice ? Object.keys(options.choice) : [],
          textPrograms: options.text ?? [],
        }
      })
      setQuestions(converted)
    } catch (e) {
      alert('保存に失敗しました')
      throw e
    }
  }

  const filteredQuestions = filterBusiness === 'すべて' 
    ? questions 
    : questions.filter(q => q.businessType === filterBusiness)

  const handleAdd = () => {
    const newQuestion: Question = {
      id: Math.max(...questions.map(q => q.id), 0) + 1,
      businessType: formData.businessType!,
      questionNo: formData.questionNo!,
      text: formData.text!,
      type: formData.type!,
      choices: formData.type === 'choice' ? formData.choices : undefined,
      choicePrograms: formData.type === 'choice' ? formData.choicePrograms : undefined,
      yesPrograms: formData.type === 'yesno' ? formData.yesPrograms : undefined,
      noPrograms: formData.type === 'yesno' ? formData.noPrograms : undefined,
      textPrograms: formData.type === 'text' ? formData.textPrograms : undefined,
      implementation: formData.implementation!,
      settings: formData.settings!,
      priority: formData.priority!
    }
    saveQuestions([...questions, newQuestion])
    resetForm()
  }

  const handleEdit = (question: Question) => {
    setEditingQuestion(question)
    setFormData(question)
    setShowModal(true)
  }

  const handleUpdate = () => {
    if (editingQuestion) {
      const updated = questions.map(q => q.id === editingQuestion.id ? { 
        ...q, 
        ...formData,
        choices: formData.type === 'choice' ? formData.choices : undefined,
        choicePrograms: formData.type === 'choice' ? formData.choicePrograms : undefined,
        yesPrograms: formData.type === 'yesno' ? formData.yesPrograms : undefined,
        noPrograms: formData.type === 'yesno' ? formData.noPrograms : undefined,
        textPrograms: formData.type === 'text' ? formData.textPrograms : undefined
      } as Question : q)
      saveQuestions(updated)
      resetForm()
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('この質問を削除しますか？')) return

    try {
      await questionsApi.delete(id)
      await loadQuestions() // DBを正として再取得
    } catch (e) {
      console.error('質問削除エラー:', e)
      alert('削除に失敗しました')
    }
  }

  
  // ======================
  // ✅ 一括削除
  // ======================
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return

    if (!confirm(`選択した ${selectedIds.length} 件を削除しますか？`)) return

    try {
      for (const id of selectedIds) {
        await questionsApi.delete(id)
      }

      setSelectedIds([])
      await loadQuestions()
    } catch (e) {
      console.error('一括削除エラー:', e)
      alert('一括削除に失敗しました')
    }
  }
  

  const resetForm = () => {
    setShowModal(false)
    setEditingQuestion(null)
    setFormData({
      businessType: '見積',
      questionNo: '',
      text: '',
      type: 'yesno',
      choices: [],
      choicePrograms: {},
      yesPrograms: [],
      noPrograms: [],
      implementation: '',
      settings: '',
      priority: '中'
    })
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const csv = event.target?.result as string
        const lines = csv.split('\n').filter(line => line.trim())
        
        const imported: Question[] = []
        
        lines.slice(1).forEach(line => {
          const parts = line.split(',').map(s => s.trim())
          const businessType = parts[0]
          const questionNo = parts[1]
          const text = parts[2]
          const type = parts[3] as 'yesno' | 'choice' | 'text'

          // 選択肢・プログラム
          const choices = parts.slice(4, 9).filter(Boolean)
          const choiceProgIds = parts.slice(9, 14).filter(Boolean)

          // yes/no プログラム
          const yesProgs = parts[14]
          const noProgs = parts[15]

          // ✅ ← ここが今回の修正ポイント（後半列はインデックス指定）
          const implementation = parts[16] ?? ''
          const settings = parts[17] ?? ''
          const priorityRaw = parts[18]

          const priority =
            priorityRaw === '高' || priorityRaw === '中' || priorityRaw === '低'
              ? priorityRaw
              : '中'
          
          if (businessType && questionNo && text) {
            const choicePrograms: Record<string, string> = {}

            // ✅ すでに定義済みの choices / choiceProgIds を使う
            choices.forEach((choice, idx) => {
              if (choiceProgIds[idx]) {
                choicePrograms[choice] = choiceProgIds[idx]
              }
            })

            const newQuestion: Question = {
              id: Math.max(
                ...questions.map(q => q.id),
                ...imported.map(q => q.id),
                0
              ) + imported.length + 1,
              businessType,
              questionNo,
              text,
              type,
              choices: type === 'choice' && choices.length > 0 ? choices : undefined,
              choicePrograms: type === 'choice' && Object.keys(choicePrograms).length > 0 ? choicePrograms : undefined,
              yesPrograms: type === 'yesno' && yesProgs ? yesProgs.split(';').filter(Boolean) : undefined,
              noPrograms: type === 'yesno' && noProgs ? noProgs.split(';').filter(Boolean) : undefined,
              implementation,
              settings,
              priority,
            }

            imported.push(newQuestion)
          }

        })
        
        
        try {
          await saveQuestions([...questions, ...imported])
          alert(`インポートが完了しました（${imported.length}件）`)
        } catch {
          // saveQuestions 側で alert 済み
        }

      } catch (error) {
        console.error('インポートエラー:', error)
        alert('インポートに失敗しました: ' + error)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleDownloadTemplate = () => {
    const csv = '業務,質問No,質問内容,タイプ,選択肢1,選択肢2,選択肢3,選択肢4,選択肢5,プログラムID1,プログラムID2,プログラムID3,プログラムID4,プログラムID5,○プログラムID,×プログラムID,SC実現方法,設定内容,重要度\n' +
      '見積,Q1,見積パターンを使用しますか？,yesno,,,,,,,,,,P001;P002,P003,見積パターン機能,設定内容,高\n' +
      '受注,Q1,受注方式を選択してください,choice,通常受注,直送受注,預り在庫受注,,P004,P005,P006,,,,,受注区分機能,設定内容,高\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'question_template.csv'
    link.click()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>質問一覧（{questions.length}件）</h2>
          <select value={filterBusiness} onChange={(e) => setFilterBusiness(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}>
            <option value="すべて">すべて</option>
            {businesses.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            disabled={selectedIds.length === 0}
            onClick={handleBulkDelete}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: selectedIds.length === 0 ? '#bdc3c7' : '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            🗑 選択した質問を削除
          </button>
          <button onClick={handleDownloadTemplate} style={{
            padding: '0.75rem 1.5rem', backgroundColor: '#95a5a6', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem'
          }}>📥 雛形ダウンロード</button>
          <label style={{
            padding: '0.75rem 1.5rem', backgroundColor: '#27ae60', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem'
          }}>
            📤 インポート
            <input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button onClick={() => { setShowModal(true); setEditingQuestion(null); }} style={{
            padding: '0.75rem 1.5rem', backgroundColor: '#3498db', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem'
          }}>＋ 新規質問追加</button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
            <th style={{ padding: '1rem', textAlign: 'center' }}>
              <input
                type="checkbox"
                checked={
                  filteredQuestions.length > 0 &&
                  selectedIds.length === filteredQuestions.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(filteredQuestions.map(q => q.id))
                  } else {
                    setSelectedIds([])
                  }
                }}
              />
            </th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>業務</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>質問No</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>質問内容</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>タイプ</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>プログラム紐付</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>重要度</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {filteredQuestions.map((question, index) => (
            <tr key={question.id} style={{ borderBottom: '1px solid #ecf0f1', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(question.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds([...selectedIds, question.id])
                    } else {
                      setSelectedIds(selectedIds.filter(id => id !== question.id))
                    }
                  }}
                />
              </td>
              <td style={{ padding: '0.75rem' }}>{question.businessType}</td>
              <td style={{ padding: '0.75rem' }}>{question.questionNo}</td>
              <td style={{ padding: '0.75rem' }}>{question.questionText}</td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
              {question.type === 'yesno'  ? '○×'  : question.type === 'choice'  ? '選択'  : 'テキスト'}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem' }}>
                
                {/* choice の場合 */}
                {question.type === 'choice' && question.choicePrograms && Object.keys(question.choicePrograms).length > 0 && (
                  <span style={{ color: '#27ae60' }}>
                    ✓ {Object.keys(question.choicePrograms).length}件
                  </span>
                )}

                {/* yesno の場合 */}
                {question.type === 'yesno' && (question.yesPrograms?.length || question.noPrograms?.length) && (
                  <span style={{ color: '#27ae60' }}>
                    ✓ ○×分岐
                  </span>
                )}
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <span style={{
                  padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem',
                  backgroundColor: question.priority === '高' ? '#e74c3c' : question.priority === '中' ? '#f39c12' : '#95a5a6',
                  color: 'white'
                }}>{question.priority}</span>
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <button onClick={() => handleEdit(question)} style={{
                  padding: '0.4rem 0.8rem', marginRight: '0.5rem', backgroundColor: '#27ae60', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                }}>編集</button>
                <button onClick={() => handleDelete(question.id)} style={{
                  padding: '0.4rem 0.8rem', backgroundColor: '#e74c3c', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                }}>削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, overflow: 'auto'
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '8px', padding: '2rem', maxWidth: '800px', width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h2 style={{ marginTop: 0 }}>{editingQuestion ? '質問編集' : '新規質問追加'}</h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>業務</label>
              <select value={formData.businessType} onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}>
                {businesses.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>質問No</label>
              <input type="text" value={formData.questionNo} onChange={(e) => setFormData({ ...formData, questionNo: e.target.value })}
                placeholder="Q1"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>質問内容</label>
              <textarea value={formData.text} onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                placeholder="質問内容を入力"
                rows={3}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>タイプ</label>
              <select value={formData.type} onChange={(e) => {
                const newType = e.target.value as 'yesno' | 'choice' | 'text'
                setFormData({ 
                  ...formData, 
                  type: newType, 
                  choices: newType === 'choice' ? [] : undefined,
                  choicePrograms: newType === 'choice' ? {} : undefined,
                  yesPrograms: newType === 'yesno' ? [] : undefined,
                  noPrograms: newType === 'yesno' ? [] : undefined,
                  textPrograms: newType === 'text' ? [] : undefined
                })
              }}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}>
                <option value="yesno">○×</option>
                <option value="choice">選択</option>
                <option value="text">テキスト</option>
              </select>
            </div>

            {/* ○×タイプ：プログラム分岐設定 */}
            {/* ○×タイプ：プログラム分岐設定 */}
            {formData.type === 'yesno' && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#e8f5e9', borderRadius: '4px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>プログラム分岐設定</label>
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>○（はい）の場合のプログラムID</label>
                  <Select
                    isMulti
                    options={programOptions}
                    value={programOptions.filter(opt => formData.yesPrograms?.includes(opt.value))}
                    onChange={(selected) => {
                      const values = selected ? selected.map(s => s.value) : []
                      setFormData({ ...formData, yesPrograms: values })
                    }}
                    placeholder="プログラムを選択してください"
                    noOptionsMessage={() => 'プログラムが見つかりません'}
                    styles={{
                      control: (base) => ({ ...base, minHeight: '42px' }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                  <small style={{ color: '#7f8c8d', display: 'block', marginTop: '0.25rem' }}>
                    複数選択可能。検索もできます。
                  </small>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>×（いいえ）の場合のプログラムID</label>
                  <Select
                    isMulti
                    options={programOptions}
                    value={programOptions.filter(opt => formData.noPrograms?.includes(opt.value))}
                    onChange={(selected) => {
                      const values = selected ? selected.map(s => s.value) : []
                      setFormData({ ...formData, noPrograms: values })
                    }}
                    placeholder="プログラムを選択してください"
                    noOptionsMessage={() => 'プログラムが見つかりません'}
                    styles={{
                      control: (base) => ({ ...base, minHeight: '42px' }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                  <small style={{ color: '#7f8c8d', display: 'block', marginTop: '0.25rem' }}>
                    複数選択可能。検索もできます。
                  </small>
                </div>
              </div>
            )}

            {/* 選択タイプ：選択肢とプログラム設定 */}
            {formData.type === 'choice' && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>選択肢とプログラム設定（最大5つ）</label>
                {[0, 1, 2, 3, 4].map(i => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="text"
                      placeholder={`選択肢${i + 1}`}
                      value={formData.choices?.[i] || ''}
                      onChange={(e) => {
                        const newChoices = [...(formData.choices || [])]
                        newChoices[i] = e.target.value
                        setFormData({ ...formData, choices: newChoices.filter((_, idx) => idx <= i || newChoices[idx]) })
                      }}
                      style={{ flex: 1, padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
                    />
                    <div style={{ flex: 1 }}>
                      <Select
                        options={programOptions}
                        value={formData.choices?.[i] && formData.choicePrograms?.[formData.choices[i]] 
                          ? programOptions.find(opt => opt.value === formData.choicePrograms[formData.choices[i]])
                          : null
                        }
                        onChange={(selected) => {
                          if (formData.choices?.[i]) {
                            const newChoicePrograms = { ...(formData.choicePrograms || {}) }
                            if (selected) {
                              newChoicePrograms[formData.choices[i]] = selected.value
                            } else {
                              delete newChoicePrograms[formData.choices[i]]
                            }
                            setFormData({ ...formData, choicePrograms: newChoicePrograms })
                          }
                        }}
                        placeholder="プログラムID"
                        noOptionsMessage={() => 'プログラムが見つかりません'}
                        isClearable
                        styles={{
                          control: (base) => ({ ...base, minHeight: '38px' }),
                          menu: (base) => ({ ...base, zIndex: 9999 })
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* テキストタイプ：プログラム設定 */}
            {formData.type === 'text' && (
              <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>プログラム設定</label>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem' }}>テキスト入力時のプログラムID</label>
                  <Select
                    isMulti
                    options={programOptions}
                    value={programOptions.filter(opt => formData.textPrograms?.includes(opt.value))}
                    onChange={(selected) => {
                      const values = selected ? selected.map(s => s.value) : []
                      setFormData({ ...formData, textPrograms: values })
                    }}
                    placeholder="プログラムを選択してください"
                    noOptionsMessage={() => 'プログラムが見つかりません'}
                    styles={{
                      control: (base) => ({ ...base, minHeight: '42px' }),
                      menu: (base) => ({ ...base, zIndex: 9999 })
                    }}
                  />
                  <small style={{ color: '#7f8c8d', display: 'block', marginTop: '0.25rem' }}>
                    複数選択可能。検索もできます。
                  </small>
                </div>
              </div>
            )}
            
            

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>SC実現方法</label>
              <textarea value={formData.implementation} onChange={(e) => setFormData({ ...formData, implementation: e.target.value })}
                placeholder="SC実現方法を入力"
                rows={2}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>設定内容</label>
              <textarea value={formData.settings} onChange={(e) => setFormData({ ...formData, settings: e.target.value })}
                placeholder="設定内容を入力"
                rows={2}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem', resize: 'vertical' }} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>重要度</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value as '高' | '中' | '低' })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}>
                <option value="高">高</option>
                <option value="中">中</option>
                <option value="低">低</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={editingQuestion ? handleUpdate : handleAdd} style={{
                flex: 1, padding: '0.75rem', backgroundColor: '#3498db', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
              }}>{editingQuestion ? '更新' : '追加'}</button>
              <button onClick={resetForm} style={{
                flex: 1, padding: '0.75rem', backgroundColor: '#95a5a6', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
              }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QuestionManagement
