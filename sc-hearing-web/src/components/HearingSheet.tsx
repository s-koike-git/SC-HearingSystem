import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from './Layout'
import JudgmentResults from './JudgmentResults'
import QuestionRow from './QuestionRow'
import {
  projectsApi,
  answersApi,
  questionsApi,
} from '../services/api'
import type { Project, Answer } from '../services/api'
import { HelpModal, HelpButton, hearingSheetHelpPages } from './HelpModal'

type QuestionType = 'yesno' | 'choice' | 'text'

interface Question {
  businessType: string
  questionNo: string
  questionText: string
  answerType: QuestionType
  options?: string[]
  implementation?: string
  settings?: string
}

interface AnswerState {
  value: string
  isCustom: boolean
  memo: string
}

function HearingSheet() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<Project | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [activeBusiness, setActiveBusiness] = useState<string>('')
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)

  // 回答済み件数集計
  const answeredCounts: Record<string, number> = {}
  const questionCounts: Record<string, number> = {}
  questions.forEach(q => {
    const key = `${q.businessType}_${q.questionNo}`
    questionCounts[q.businessType] = (questionCounts[q.businessType] ?? 0) + 1
    if (answers[key]?.value) {
      answeredCounts[q.businessType] = (answeredCounts[q.businessType] ?? 0) + 1
    }
  })
  const totalAnswered = Object.values(answeredCounts).reduce((s, v) => s + v, 0)
  const totalQuestions = Object.values(questionCounts).reduce((s, v) => s + v, 0)
  const progressPct = totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0

  useEffect(() => {
    questionsApi.getAll().then(res => {
      const converted = res.data.map((q: any) => {
        const options = q.optionsJson ? JSON.parse(q.optionsJson) : {}
        return {
          ...q,
          options: q.answerType === 'choice' ? Object.keys(options.choice ?? {}) : undefined,
        }
      })
      setQuestions(converted)
    }).catch(e => console.error('質問取得エラー', e))
  }, [])

  useEffect(() => {
    if (!projectId) return
    const load = async () => {
      try {
        const projectRes = await projectsApi.getById(Number(projectId))
        setProject(projectRes.data)
        const answerRes = await answersApi.getByProject(Number(projectId))
        const map: Record<string, AnswerState> = {}
        answerRes.data.forEach(a => {
          map[`${a.businessType}_${a.questionNo}`] = {
            value: a.answerValue || '', isCustom: a.isCustom || false, memo: a.memo || '',
          }
        })
        setAnswers(map)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [projectId])

  const businesses = Array.from(new Set(questions.map(q => q.businessType)))

  useEffect(() => {
    if (!activeBusiness && businesses.length > 0) setActiveBusiness(businesses[0])
  }, [businesses])

  const handleChange = async (
    businessType: string, questionNo: string,
    value: string, isCustom: boolean, memo: string
  ) => {
    setAnswers(prev => ({ ...prev, [`${businessType}_${questionNo}`]: { value, isCustom, memo } }))
    if (!projectId) return
    await answersApi.save({ projectId: Number(projectId), businessType, questionNo, answerValue: value, isCustom, memo } as Answer)
    if (project && project.status === '未着手') {
      try {
        await projectsApi.updateStatus(project.id, '進行中')
        setProject({ ...project, status: '進行中' })
      } catch (e) { console.error('ステータス更新エラー', e) }
    }
  }

  const currentQuestions = questions.filter(q => q.businessType === activeBusiness)

  if (loading) return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: '#64748b', gap: 8 }}>
        <span>⟳</span> 読み込み中...
      </div>
    </Layout>
  )
  if (!project) return null

  return (
    <Layout>
      <div style={{ maxWidth: 1600, margin: '0 auto', padding: '1.5rem 2rem', fontFamily: '"Noto Sans JP", sans-serif' }}>

        {/* ─── ヘッダー ─── */}
        <div style={{
          background: 'white', borderRadius: 12, padding: '1.25rem 1.75rem',
          marginBottom: '1.25rem', border: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => navigate('/projects')}
              style={{
                background: 'none', border: '1px solid #e2e8f0', borderRadius: 8,
                color: '#64748b', padding: '0.4rem 0.8rem', cursor: 'pointer',
                fontSize: '0.83rem', flexShrink: 0,
              }}
            >← 一覧へ</button>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                {project.companyName}
              </h2>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: 2 }}>
                {project.industry}　／　担当: {project.contactPerson}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* 進捗 */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>
                {totalAnswered} / {totalQuestions} 問回答済み（{progressPct}%）
              </div>
              <div style={{ width: 150, height: 6, background: '#e2e8f0', borderRadius: 99 }}>
                <div style={{
                  width: `${progressPct}%`, height: '100%', borderRadius: 99,
                  background: progressPct === 100 ? '#059669' : '#1e40af',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
            <HelpButton onClick={() => setShowHelp(true)} />
            <button
              onClick={async () => {
                setShowResults(!showResults)
                if (!showResults && project && project.status !== '完了') {
                  try { await projectsApi.updateStatus(project.id!, '完了'); setProject({ ...project, status: '完了' }) }
                  catch (e) { console.error(e) }
                }
              }}
              style={{
                padding: '0.6rem 1.25rem', border: 'none', borderRadius: 8,
                background: showResults ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,#dc2626,#ef4444)',
                color: 'white', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                boxShadow: showResults ? '0 4px 12px rgba(5,150,105,0.35)' : '0 4px 12px rgba(220,38,38,0.35)',
                flexShrink: 0,
              }}
            >
              {showResults ? '✓ 判定結果表示中' : '判定結果を表示 →'}
            </button>
          </div>
        </div>

        {showHelp && <HelpModal pages={hearingSheetHelpPages} onClose={() => setShowHelp(false)} />}

        {/* ─── メインカード ─── */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>

          {/* ─── 業務タブバー ─── */}
          <div style={{
            background: '#f8fafc', borderBottom: '2px solid #e2e8f0',
            display: 'flex', overflowX: 'auto', padding: '0.5rem 0.75rem 0', gap: '0.25rem',
          }}>
            {businesses.map(b => {
              const isActive = activeBusiness === b && !showResults
              const answered = answeredCounts[b] ?? 0
              const total = questionCounts[b] ?? 0
              const isDone = answered === total && total > 0
              return (
                <button
                  key={b}
                  onClick={() => { setActiveBusiness(b); setShowResults(false) }}
                  style={{
                    padding: '0.6rem 1rem', border: 'none',
                    borderRadius: '8px 8px 0 0',
                    background: isActive ? 'white' : 'transparent',
                    color: isActive ? '#1e40af' : '#64748b',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '0.87rem', cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    // 下ボーダーで選択状態を示す
                    borderBottom: isActive ? '2px solid #1e40af' : '2px solid transparent',
                    marginBottom: -2,
                    outline: 'none',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#1e40af' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#64748b' }}
                >
                  {b}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    minWidth: 22, height: 20, borderRadius: 99,
                    fontSize: '0.7rem', fontWeight: 700, padding: '0 4px',
                    background: isDone ? '#dcfce7' : isActive ? '#dbeafe' : '#f1f5f9',
                    color: isDone ? '#059669' : isActive ? '#1e40af' : '#94a3b8',
                  }}>
                    {isDone ? '✓' : `${answered}/${total}`}
                  </span>
                </button>
              )
            })}
          </div>

          {/* ─── 質問リスト ─── */}
          {!showResults && (
            <>
              <div style={{
                padding: '1rem 1.5rem 0.5rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderBottom: '1px solid #f1f5f9',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    background: '#eff6ff', color: '#1e40af', borderRadius: 6,
                    padding: '0.2rem 0.65rem', fontWeight: 700, fontSize: '0.78rem',
                  }}>
                    {activeBusiness}
                  </span>
                  <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{currentQuestions.length} 問</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>回答は自動保存</span>
              </div>
              {currentQuestions.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                  この業務の質問はありません
                </div>
              ) : (
                currentQuestions.map(q => {
                  const key = `${q.businessType}_${q.questionNo}`
                  const a = answers[key] ?? { value: '', isCustom: false, memo: '' }
                  return (
                    <QuestionRow
                      key={key}
                      question={{
                        no: q.questionNo, text: q.questionText, type: q.answerType,
                        choices: q.options?.map(o => ({ value: o, label: o })),
                        implementation: q.implementation, settings: q.settings,
                      }}
                      businessType={activeBusiness}
                      value={a.value} isCustom={a.isCustom} memo={a.memo}
                      onChange={(value, isCustom, memo) =>
                        handleChange(activeBusiness, q.questionNo, value, isCustom, memo)
                      }
                    />
                  )
                })
              )}
            </>
          )}

          {showResults && projectId && <JudgmentResults />}
        </div>
      </div>

      <style>{`
        button:focus { outline: none; }
        ::-webkit-scrollbar { height: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
      `}</style>
    </Layout>
  )
}

export default HearingSheet
