import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import Layout from './Layout'
import JudgmentResults from './JudgmentResults'
import QuestionCard from './QuestionCard'
import HearingSidebar, { type BusinessProcessInfo } from './HearingSidebar'
import HearingTimeline from './HearingTimeline'
import FilterPanel from './FilterPanel'
import {
  projectsApi,
  answersApi,
  questionsApi,
  businessProcessFlowStepsApi,
} from '../services/api'
import type { Project, Answer } from '../services/api'
import { HelpModal, HelpButton, hearingSheetHelpPages } from './HelpModal'

type QuestionType = 'yesno' | 'choice' | 'text'
type Layer = 'L1' | 'L2' | 'L3'

interface Question {
  businessType: string
  questionNo: string
  questionText: string
  answerType: QuestionType
  options?: string[]
  yesPrograms?: string[]   // L2用: yes 回答時に紐付くプログラムID群
  noPrograms?: string[]    // L2用: no 回答時に紐付くプログラムID群
  implementation?: string
  settings?: string
  priority?: '高' | '中' | '低'
}

interface AnswerState {
  value: string
  isCustom: boolean
  memo: string
}

const detectLayer = (questionNo: string): Layer => {
  if (questionNo.startsWith('L1-') || questionNo.startsWith('L1')) return 'L1'
  if (questionNo.startsWith('L2-') || questionNo.startsWith('L2')) return 'L2'
  return 'L3'
}

// L3 質問の QuestionNo (例: L3-ESTET01) から PRGID を抽出
const extractPrgIdFromL3 = (questionNo: string): string | null => {
  if (!questionNo.startsWith('L3-')) return null
  return questionNo.substring(3)
}

function HearingSheet() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [processes, setProcesses] = useState<BusinessProcessInfo[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [activeBusiness, setActiveBusiness] = useState<string>('')
  const [showResults, setShowResults] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showHelp, setShowHelp] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)

  // フィルタ・検索
  const [searchText, setSearchText] = useState('')
  const [filterUnanswered, setFilterUnanswered] = useState(false)
  const [filterPriority, setFilterPriority] = useState<'全て' | '高' | '中' | '低'>('全て')
  const [filterLayer, setFilterLayer] = useState<'全て' | 'L1' | 'L2' | 'L3'>('全て')
  const [filterCustom, setFilterCustom] = useState(false)

  // === データ取得 ===
  useEffect(() => {
    questionsApi.getAll().then(res => {
      const converted = res.data.map((q: any) => {
        let opts: any = {}
        try { opts = q.optionsJson ? JSON.parse(q.optionsJson) : {} } catch (e) { /* */ }
        return {
          ...q,
          options: q.answerType === 'choice' ? Object.keys(opts.choice ?? {}) : undefined,
          yesPrograms: Array.isArray(opts.yes) ? opts.yes : [],
          noPrograms: Array.isArray(opts.no) ? opts.no : [],
        }
      })
      setQuestions(converted)
    }).catch(e => console.error('質問取得エラー', e))

    businessProcessFlowStepsApi.getAll().then(res => {
      const procs: BusinessProcessInfo[] = (res.data as any[]).map((p: any) => ({
        stepId: p.stepId,
        stepName: p.stepName,
        category: p.category,
        displayOrder: p.displayOrder,
      }))
      setProcesses(procs)
    }).catch(e => console.error('業務プロセス取得エラー', e))
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

  // === L1質問の「いいえ」回答チェック (該当業務をスキップ) ===
  const skippedBusinesses = useMemo(() => {
    const skipped = new Set<string>()
    questions.forEach(q => {
      if (detectLayer(q.questionNo) === 'L1') {
        const ans = answers[`${q.businessType}_${q.questionNo}`]
        if (ans && ans.value === '×') {
          skipped.add(q.businessType)
        }
      }
    })
    return skipped
  }, [questions, answers])

  // === L2質問の「いいえ」回答チェック (該当PRGIDのL3をスキップ) ===
  const l2SkippedPrgIds = useMemo(() => {
    const skipped = new Set<string>()
    questions.forEach(q => {
      if (detectLayer(q.questionNo) === 'L2') {
        const ans = answers[`${q.businessType}_${q.questionNo}`]
        if (ans && ans.value === '×') {
          // L2で「いいえ」 = yesProgramsのPRGIDは不要
          (q.yesPrograms || []).forEach(p => skipped.add(p))
        }
      }
    })
    return skipped
  }, [questions, answers])

  // === 質問の表示判定 (visibility) ===
  const isQuestionVisible = useMemo(() => {
    return (q: Question): boolean => {
      const layer = detectLayer(q.questionNo)
      // L1スキップ業務のL2/L3は非表示 (L1質問本体は表示)
      if (skippedBusinesses.has(q.businessType) && layer !== 'L1') {
        return false
      }
      // L2スキップ対応のL3は非表示
      if (layer === 'L3') {
        const prgId = extractPrgIdFromL3(q.questionNo)
        if (prgId && l2SkippedPrgIds.has(prgId)) return false
      }
      return true
    }
  }, [skippedBusinesses, l2SkippedPrgIds])

  // === 業務プロセス別 統計 (スキップ質問は完了扱い) ===
  const stats = useMemo<Record<string, { total: number; answered: number; l1Skipped: boolean }>>(() => {
    const result: Record<string, { total: number; answered: number; l1Skipped: boolean }> = {}
    processes.forEach(p => {
      result[p.stepId] = { total: 0, answered: 0, l1Skipped: skippedBusinesses.has(p.stepId) }
    })
    questions.forEach(q => {
      const bt = q.businessType
      if (!result[bt]) result[bt] = { total: 0, answered: 0, l1Skipped: skippedBusinesses.has(bt) }

      const layer = detectLayer(q.questionNo)
      const isVisible = isQuestionVisible(q)

      if (skippedBusinesses.has(bt)) {
        // L1で「いいえ」業務: L1のみカウント、L2/L3はスキップ完了扱い (totalに含めない)
        if (layer === 'L1') {
          result[bt].total += 1
          if (answers[`${bt}_${q.questionNo}`]?.value) result[bt].answered += 1
        }
        // L2/L3 はカウントしない (= 自動的に「全部完了」状態)
      } else {
        // 通常業務: 表示質問のみカウント (L2スキップ対応のL3は除外される)
        if (isVisible) {
          result[bt].total += 1
          if (answers[`${bt}_${q.questionNo}`]?.value) result[bt].answered += 1
        }
        // 非表示質問もカウントしない (= 自動完了扱い)
      }
    })
    return result
  }, [questions, processes, answers, skippedBusinesses, isQuestionVisible])

  // === 全体進捗 ===
  const { totalAnswered, totalQuestions, progressPct } = useMemo(() => {
    const arr = Object.values(stats) as Array<{ total: number; answered: number; l1Skipped: boolean }>
    const ta = arr.reduce((s, v) => s + v.answered, 0)
    const tq = arr.reduce((s, v) => s + v.total, 0)
    return {
      totalAnswered: ta,
      totalQuestions: tq,
      progressPct: tq > 0 ? Math.round(ta * 100 / tq) : 0,
    }
  }, [stats])

  // === 業務プロセス自動選択 ===
  useEffect(() => {
    if (!activeBusiness && processes.length > 0) {
      const sortedProcs = [...processes].sort((a, b) => a.displayOrder - b.displayOrder)
      setActiveBusiness(sortedProcs[0].stepId)
    }
  }, [processes])

  // === 現在表示する質問 (フィルタ適用) ===
  const filteredQuestions = useMemo(() => {
    let qs = questions.filter(q => q.businessType === activeBusiness)

    // ★★★ visibility フィルタ: L1スキップ業務はL2/L3を非表示、L2スキップ対応のL3を非表示
    qs = qs.filter(q => isQuestionVisible(q))

    if (searchText.trim()) {
      const txt = searchText.trim().toLowerCase()
      qs = qs.filter(q =>
        q.questionText.toLowerCase().includes(txt) ||
        q.questionNo.toLowerCase().includes(txt) ||
        (q.implementation || '').toLowerCase().includes(txt)
      )
    }
    if (filterLayer !== '全て') {
      qs = qs.filter(q => detectLayer(q.questionNo) === filterLayer)
    }
    if (filterPriority !== '全て') {
      qs = qs.filter(q => (q.priority || '中') === filterPriority)
    }
    if (filterUnanswered) {
      qs = qs.filter(q => !answers[`${q.businessType}_${q.questionNo}`]?.value)
    }
    if (filterCustom) {
      qs = qs.filter(q => answers[`${q.businessType}_${q.questionNo}`]?.isCustom)
    }

    // L1 → L2 → L3 の順、各内で QuestionNo 順
    const layerOrder = { L1: 0, L2: 1, L3: 2 } as const
    qs.sort((a, b) => {
      const la = layerOrder[detectLayer(a.questionNo)]
      const lb = layerOrder[detectLayer(b.questionNo)]
      if (la !== lb) return la - lb
      return a.questionNo.localeCompare(b.questionNo, 'ja', { numeric: true })
    })
    return qs
  }, [questions, activeBusiness, searchText, filterLayer, filterPriority, filterUnanswered, filterCustom, answers, isQuestionVisible])

  // 全質問数 (visibility適用後、フィルタ前)
  const allCurrentQuestions = useMemo(
    () => questions.filter(q => q.businessType === activeBusiness && isQuestionVisible(q)),
    [questions, activeBusiness, isQuestionVisible]
  )

  // 隠された質問数 (情報表示用)
  const hiddenQuestionCount = useMemo(
    () => questions.filter(q => q.businessType === activeBusiness && !isQuestionVisible(q)).length,
    [questions, activeBusiness, isQuestionVisible]
  )

  // === 回答変更 ===
  const handleChange = async (
    businessType: string, questionNo: string,
    value: string, isCustom: boolean, memo: string
  ) => {
    setAnswers(prev => ({
      ...prev,
      [`${businessType}_${questionNo}`]: { value, isCustom, memo },
    }))
    if (!projectId) return
    try {
      await answersApi.save({
        projectId: Number(projectId),
        businessType, questionNo,
        answerValue: value, isCustom, memo,
      } as Answer)
      if (project && project.status === '未着手') {
        await projectsApi.updateStatus(project.id!, '進行中')
        setProject({ ...project, status: '進行中' })
      }
    } catch (e) { console.error(e) }
  }

  // === 業務切替 (前/次) ===
  const orderedProcs = useMemo(
    () => [...processes].sort((a, b) => a.displayOrder - b.displayOrder),
    [processes]
  )
  const currentIdx = orderedProcs.findIndex(p => p.stepId === activeBusiness)
  const goPrev = () => { if (currentIdx > 0) setActiveBusiness(orderedProcs[currentIdx - 1].stepId) }
  const goNext = () => { if (currentIdx < orderedProcs.length - 1) setActiveBusiness(orderedProcs[currentIdx + 1].stepId) }

  if (loading) return (
    <Layout>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '60vh', color: '#64748b', gap: 8,
      }}>
        <span>⟳</span> 読み込み中...
      </div>
    </Layout>
  )
  if (!project) return null

  const currentProc = orderedProcs.find(p => p.stepId === activeBusiness)
  const isSkipped = skippedBusinesses.has(activeBusiness)
  const currentStat = stats[activeBusiness] || { total: 0, answered: 0, l1Skipped: false }

  return (
    <Layout>
      <div style={{
        maxWidth: 1700, margin: '0 auto', padding: '1rem 1.5rem',
        fontFamily: '"Noto Sans JP", sans-serif',
      }}>
        {/* === ヘッダー === */}
        <div style={{
          background: 'white', borderRadius: 8, padding: '12px 16px',
          marginBottom: 8, border: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
          position: 'sticky', top: 0, zIndex: 50,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#0f172a' }}>
              {project.companyName}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {project.industry} ／ 担当: {project.contactPerson}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              style={{
                padding: '6px 12px', backgroundColor: showTimeline ? '#185FA5' : 'white',
                color: showTimeline ? 'white' : '#5F5E5A',
                border: '1px solid #d0d7de', borderRadius: 6, cursor: 'pointer',
                fontSize: 12,
              }}
            >📊 タイムライン</button>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
                {totalAnswered} / {totalQuestions} 問回答済み（{progressPct}%）
              </div>
              <div style={{ width: 180, height: 6, background: '#e2e8f0', borderRadius: 99 }}>
                <div style={{
                  width: `${progressPct}%`, height: '100%', borderRadius: 99,
                  background: progressPct === 100 ? '#1D9E75' : '#185FA5',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
            <HelpButton onClick={() => setShowHelp(true)} />
            <button
              onClick={async () => {
                setShowResults(!showResults)
                if (!showResults && project && project.status !== '完了') {
                  try {
                    await projectsApi.updateStatus(project.id!, '完了')
                    setProject({ ...project, status: '完了' })
                  } catch (e) { console.error(e) }
                }
              }}
              style={{
                padding: '8px 16px', border: 'none', borderRadius: 6,
                background: showResults ? '#1D9E75' : '#A32D2D',
                color: 'white', fontWeight: 500, fontSize: 13, cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {showResults ? '✓ 判定結果表示中' : '判定結果を表示 →'}
            </button>
          </div>
        </div>

        {showHelp && <HelpModal pages={hearingSheetHelpPages} onClose={() => setShowHelp(false)} />}

        {/* === タイムライン (折りたたみ可能) === */}
        {showTimeline && !showResults && (
          <div style={{ marginBottom: 8 }}>
            <HearingTimeline
              processes={processes}
              stats={stats}
              activeBusiness={activeBusiness}
              onSelect={(id) => setActiveBusiness(id)}
            />
          </div>
        )}

        {showResults && projectId ? (
          <JudgmentResults />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 8 }}>
            {/* === 左サイドバー === */}
            <HearingSidebar
              processes={processes}
              stats={stats}
              activeBusiness={activeBusiness}
              onSelect={(id) => setActiveBusiness(id)}
            />

            {/* === メインコンテンツ === */}
            <div style={{
              background: 'white',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              minHeight: 'calc(100vh - 180px)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* 業務見出し */}
              <div style={{
                padding: '12px 16px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                flexWrap: 'wrap',
              }}>
                <button
                  onClick={goPrev}
                  disabled={currentIdx <= 0}
                  style={{
                    padding: '4px 10px',
                    background: 'white', border: '1px solid #d0d7de',
                    borderRadius: 4, cursor: currentIdx <= 0 ? 'not-allowed' : 'pointer',
                    opacity: currentIdx <= 0 ? 0.4 : 1, fontSize: 12,
                  }}
                >← 前へ</button>
                <span style={{
                  background: '#EEEDFE', color: '#3C3489', borderRadius: 4,
                  padding: '4px 10px', fontWeight: 500, fontSize: 13,
                }}>
                  {currentProc?.stepName || activeBusiness}
                </span>
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {isSkipped ? (
                    <span style={{ color: '#A32D2D', fontWeight: 500 }}>
                      ⊘ L1で「いいえ」回答 → この業務は不要 (✓ 完了扱い)
                    </span>
                  ) : (
                    <>
                      {currentStat.answered} / {currentStat.total} 問
                      {hiddenQuestionCount > 0 && (
                        <span style={{ marginLeft: 8, color: '#888780', fontSize: 11 }}>
                          (前工程スキップで {hiddenQuestionCount} 問非表示)
                        </span>
                      )}
                    </>
                  )}
                </span>
                <button
                  onClick={goNext}
                  disabled={currentIdx >= orderedProcs.length - 1}
                  style={{
                    padding: '4px 10px',
                    background: 'white', border: '1px solid #d0d7de',
                    borderRadius: 4, cursor: currentIdx >= orderedProcs.length - 1 ? 'not-allowed' : 'pointer',
                    opacity: currentIdx >= orderedProcs.length - 1 ? 0.4 : 1, fontSize: 12,
                  }}
                >次へ →</button>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
                  💾 回答は自動保存
                </span>
              </div>

              {/* フィルタパネル */}
              <div style={{ padding: '8px 16px' }}>
                <FilterPanel
                  searchText={searchText}
                  onSearchChange={setSearchText}
                  filterUnanswered={filterUnanswered}
                  onFilterUnansweredChange={setFilterUnanswered}
                  filterPriority={filterPriority}
                  onFilterPriorityChange={setFilterPriority}
                  filterLayer={filterLayer}
                  onFilterLayerChange={setFilterLayer}
                  filterCustom={filterCustom}
                  onFilterCustomChange={setFilterCustom}
                  visibleCount={filteredQuestions.length}
                  totalCount={allCurrentQuestions.length}
                />
              </div>

              {/* 質問リスト */}
              <div style={{
                padding: '8px 16px 16px',
                flex: 1,
                overflowY: 'auto',
              }}>
                {filteredQuestions.length === 0 ? (
                  <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8' }}>
                    {allCurrentQuestions.length === 0
                      ? 'この業務の質問はありません'
                      : '条件に一致する質問はありません'}
                  </div>
                ) : (
                  filteredQuestions.map(q => {
                    const key = `${q.businessType}_${q.questionNo}`
                    const a = answers[key] ?? { value: '', isCustom: false, memo: '' }
                    const layer = detectLayer(q.questionNo)
                    return (
                      <QuestionCard
                        key={key}
                        question={{
                          no: q.questionNo,
                          text: q.questionText,
                          type: q.answerType,
                          choices: q.options?.map(o => ({ value: o, label: o })),
                          implementation: q.implementation,
                          settings: q.settings,
                          priority: q.priority,
                        }}
                        layer={layer}
                        businessType={activeBusiness}
                        value={a.value}
                        isCustom={a.isCustom}
                        memo={a.memo}
                        disabled={false}
                        onChange={(value, isCustom, memo) =>
                          handleChange(activeBusiness, q.questionNo, value, isCustom, memo)
                        }
                      />
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`
        button:focus { outline: none; }
        ::-webkit-scrollbar { height: 6px; width: 6px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </Layout>
  )
}

export default HearingSheet
