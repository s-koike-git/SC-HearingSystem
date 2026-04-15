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

interface Business {
  id: number
  name: string
  displayOrder: number
  status: '有効' | '無効'
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
  
  // ✅ 質問マスタをすべて取得
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const res = await questionsApi.getAll()

        const converted = res.data.map((q: any) => {
          const options = q.optionsJson ? JSON.parse(q.optionsJson) : {}
          return {
            ...q,
            options:
              q.answerType === 'choice'
                ? Object.keys(options.choice ?? {})
                : undefined
          }
        })

        setQuestions(converted)
      } catch (e) {
        console.error('質問取得エラー', e)
      }
    }

    loadQuestions()
  }, [])


  /** ============================
   * 初期データ読込
   ============================ */
  useEffect(() => {
    if (!projectId) return

    const load = async () => {
      try {
        const projectRes = await projectsApi.getById(Number(projectId))
        setProject(projectRes.data)

        const answerRes = await answersApi.getByProject(Number(projectId))
        const map: Record<string, AnswerState> = {}
        answerRes.data.forEach(a => {
          const key = `${a.businessType}_${a.questionNo}`
          map[key] = {
            value: a.answerValue || '',
            isCustom: a.isCustom || false,
            memo: a.memo || '',
          }
        })
        setAnswers(map)

      } finally {
        setLoading(false)
      }
    }

    load()
  }, [projectId])
  
// ✅ 質問マスタから業務一覧を生成
  const businesses = Array.from(
    new Set(questions.map(q => q.businessType))
  )
  
  
  // ✅ 業務の初期選択（最初の業務を自動選択）
  useEffect(() => {
    if (!activeBusiness && businesses.length > 0) {
      setActiveBusiness(businesses[0])
    }
  }, [businesses])
  
  /** ============================
   * 回答変更
   ============================ */
  const handleChange = async (
    businessType: string,
    questionNo: string,
    value: string,
    isCustom: boolean,
    memo: string
  ) => {
    const key = `${businessType}_${questionNo}`

    setAnswers(prev => ({
      ...prev,
      [key]: { value, isCustom, memo },
    }))

    if (!projectId) return

    const payload: Answer = {
      projectId: Number(projectId),
      businessType,
      questionNo,
      answerValue: value,
      isCustom,
      memo,
    }

    await answersApi.save(payload)

    // ✅ ステータスを自動更新（初回回答時に「進行中」に変更）
    if (project && project.status === '未着手') {
      try {
        await projectsApi.updateStatus(project.id, '進行中')
        setProject({ ...project, status: '進行中' })
      } catch (e) {
        console.error('ステータス更新エラー', e)
      }
    }
  }
  
  // ✅ 表示対象の質問（選択中業務）
  
  const currentQuestions = questions.filter(
    q => q.businessType === activeBusiness
  )
  
  if (loading) {
    return (
      <Layout>
        <div style={{ padding: '2rem', textAlign: 'center' }}>読み込み中...</div>
      </Layout>
    )
  }
  if (!project) return null


  return (
    <Layout>
      <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '2rem' }}>
        {/* ====== ヘッダ ====== */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ margin: 0 }}>{project.companyName} - ヒアリングシート</h2>
              <div style={{ color: '#7f8c8d', marginTop: '0.5rem' }}>
                業種: {project.industry} ／ 担当者: {project.contactPerson}
              </div>
            </div>
            <HelpButton onClick={() => setShowHelp(true)} />
          </div>
        </div>

        {showHelp && <HelpModal pages={hearingSheetHelpPages} onClose={() => setShowHelp(false)} />}

        {/* ====== 業務タブ ====== */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          marginBottom: '2rem',
          overflow: 'hidden'
        }}>
          {/* ======<div style={{ display: 'flex', borderBottom: '2px solid #ecf0f1' }}>====== */}
          
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              borderBottom: '2px solid #ecf0f1'
            }}
          >

            {businesses.map(b => (
              <button
                key={b}
                onClick={() => setActiveBusiness(b)}
                style={{
                  padding: '1rem 1.5rem',
                  border: 'none',
                  backgroundColor: activeBusiness === b ? '#3498db' : 'transparent',
                  color: activeBusiness === b ? 'white' : '#2c3e50',
                  fontWeight: activeBusiness === b ? 'bold' : 'normal',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {b}
              </button>
            ))}
            <button
            onClick={async () => {
              setShowResults(!showResults)
              
              // ✅ 判定結果表示時に「完了」に更新
              if (!showResults && project && project.status !== '完了') {
                try {
                  await projectsApi.updateStatus(project.id!, '完了')
                  setProject({ ...project, status: '完了' })
                } catch (e) {
                  console.error('ステータス更新エラー', e)
                }
              }
            }}
            style={{
              marginLeft: 'auto',
              padding: '1rem 1.5rem',
              border: 'none',
              backgroundColor: showResults ? '#2ecc71' : '#e74c3c',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {showResults ? '✓ 判定結果表示中' : '判定結果を表示'}
          </button>
          </div>

          {!showResults && (
            <div>
              {currentQuestions.map(q => {
                const key = `${q.businessType}_${q.questionNo}`
                const a = answers[key] ?? { value: '', isCustom: false, memo: '' }

                return (
                  <QuestionRow
                    key={key}
                    question={{
                      no: q.questionNo,
                      text: q.questionText,
                      type: q.answerType,
                      choices: q.options?.map(o => ({ value: o, label: o })),
                      implementation: q.implementation,
                      settings: q.settings
                    }}
                    businessType={activeBusiness}
                    value={a.value}
                    isCustom={a.isCustom}
                    memo={a.memo}
                    onChange={(value, isCustom, memo) =>
                      handleChange(activeBusiness, q.questionNo, value, isCustom, memo)
                    }
                  />
                )
              })}
            </div>
          )}

          {showResults && projectId && (
            <JudgmentResults />
          )}
        </div>
      </div>
    </Layout>
  )
}

export default HearingSheet