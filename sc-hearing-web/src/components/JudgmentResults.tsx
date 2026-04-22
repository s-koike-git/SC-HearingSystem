import { useState, useEffect, Fragment } from 'react'
import { useParams } from 'react-router-dom'
import { questionsApi, programsApi, answersApi } from '../services/api'
import BusinessFlowViewer from './BusinessFlowViewer'
import type { Answer } from '../services/api'
import type { Project } from '../services/api'
import { projectsApi } from '../services/api'
import { BusinessFlowGenerator } from '../services/BusinessFlowGenerator'
import { FlowGenerator } from '../services/FlowGenerator'
import { HelpModal, HelpButton, judgmentResultsHelpPages } from './HelpModal'


interface Question {
  id: number
  businessType: string
  questionNo: string
  text: string
  type: 'yesno' | 'choice' | 'text'
  choices?: string[]
  choicePrograms?: Record<string, string | string[]>
  yesPrograms?: string[]
  noPrograms?: string[]
  implementation: string
  settings: string
  priority: '高' | '中' | '低'
}

interface Program {
  id: number
  programId: string
  programName: string
  workHours: number
  screenId?: string
}

interface Judgment {
  businessType: string
  questionNo: string
  questionText: string
  answer: string
  programIds: string[]
  priority: string
  implementation: string
  settings: string
  isCustom: boolean
  memo: string
}

type SortField = 'businessType' | 'questionNo' | 'priority' | 'workHours'
type SortOrder = 'asc' | 'desc'

function JudgmentResults() {
  const { projectId } = useParams<{ projectId: string }>()
  const [judgments, setJudgments] = useState<Judgment[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [totalHours, setTotalHours] = useState(0)
  const [sortField, setSortField] = useState<SortField>('businessType')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [showFlowViewer, setShowFlowViewer] = useState(false)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [project, setProject] = useState<Project | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  
  const [reportFiles, setReportFiles] = useState<string[]>([]);
  
  
  type TabType = 'results' | 'programs'
  const [activeTab, setActiveTab] = useState<TabType>('results')
  const [selectedBusiness, setSelectedBusiness] = useState<string>('すべて')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [selectedReportFile, setSelectedReportFile] = useState<string | null>(null);
 
  // ==================================================
  // State 定義（⚠️ 定義順厳守）
  // ==================================================

  // 現在選択されているプログラムID
  const [selectedProgramId, setSelectedProgramId] =
    useState<string | null>(null);

  // 選択中プログラムに対応する帳票一覧
  const [availableReportFiles, setAvailableReportFiles] =
    useState<string[]>([]);

  // 帳票一覧モーダル制御
  const [reportProgramId, setReportProgramId] =
    useState<string | null>(null);

  // 帳票プレビュー制御
  const [previewReportFile, setPreviewReportFile] =
    useState<string | null>(null);
    
  const REPORT_BASE_PATH = import.meta.env.PROD 
    ? '/sc-hearing/screen-viewer/Contents/image/rpt'
    : '/screen-viewer/Contents/image/rpt';


  // ==================================================
  // selectedProgramId 変更時に帳票を探索
  // ==================================================
  useEffect(() => {
    if (!selectedProgramId) {
      setAvailableReportFiles([]);
      return;
    }

    (async () => {
      const files = await checkReportExists(selectedProgramId.trim());
      setAvailableReportFiles(files);
    })();
  }, [selectedProgramId]);

  // ==================================================
  // 帳票有無判定（最終的に UI が見る値）
  // ==================================================
  const hasReport = availableReportFiles.length > 0;

  
  
  // ✅ 帳票存在確認（PDFのみ・csv.pdf 等も考慮）
  async function checkReportExists(programId: string): Promise<string[]> {
    const basePath = import.meta.env.PROD 
      ? '/sc-hearing/screen-viewer/Contents/image/rpt'
      : '/screen-viewer/Contents/image/rpt';

    const candidates = [
      `${programId}.pdf`,
      `${programId}.PDF`,
      `${programId}_1.pdf`,
      `${programId}_2.pdf`,
      `${programId}_3.pdf`,
      `${programId}_4.pdf`,
      `${programId}_5.pdf`,
      `${programId}_1.PDF`,
      `${programId}_2.PDF`,
      `${programId}_3.PDF`,
      `${programId}_4.PDF`,
      `${programId}_5.PDF`,
      `${programId}.csv.pdf`,
      `${programId}.CSV.PDF`,
      `${programId}.xlsm.pdf`,
      `${programId}.xlsx.pdf`,
    ];

    const exists: string[] = [];

    for (const file of candidates) {
      try {
        const res = await fetch(`${basePath}/${file}`, {
          method: 'GET',
          cache: 'no-store',
        });

        const contentType = res.headers.get('Content-Type') ?? '';

        if (res.ok && contentType.includes('application/pdf')) {
          exists.push(file); // ✅ 本物のPDFだけ
        }
      } catch {
        // 通信エラーは無視
      }
    }

    return exists;
  }
  
  const getJudgmentKey = (j: Judgment): string =>
    `${j.businessType}_${j.questionNo}`;

  
  useEffect(() => {
    loadData()
  }, [projectId])
  
  const loadData = async () => {
    try {
      // DBから質問マスタ、プログラムマスタ、回答データを取得
      const [questionsRes, programsRes, answersRes, projectRes] = await Promise.all([
        questionsApi.getAll(),
        programsApi.getAll(),
        answersApi.getByProject(parseInt(projectId!)),
        projectsApi.getById(parseInt(projectId!))
      ])

      // 質問データの正規化
      const questionsData: Question[] = questionsRes.data.map((q: any) => {
      const options = q.optionsJson ? JSON.parse(q.optionsJson) : {}
        
        return {
          id: q.id,
          businessType: q.businessType,
          questionNo: q.questionNo,
          text: q.questionText,
          type: q.answerType,
          choices: options.choice ? Object.keys(options.choice) : [],
          choicePrograms: options.choice ?? {},
          yesPrograms: options.yes ?? [],
          noPrograms: options.no ?? [],
          implementation: q.implementation,
          settings: q.settings,
          priority: q.priority
        }
      })

      setQuestions(questionsData)
      setPrograms(programsRes.data)
      setAnswers(answersRes.data)
      setProject(projectRes.data)

      // 回答データを questionNo -> answer のマップに変換
      
      const answersMap: Record<
        string,
        { value: string; isCustom: boolean; memo: string }
      > = {}
      
      
      answersRes.data.forEach(ans => {
        answersMap[`${ans.BusinessType ?? ans.businessType}_${ans.QuestionNo ?? ans.questionNo}`] = {
          value: ans.AnswerValue ?? ans.answerValue ?? '',
          // ✅ ここが重要：数値 → boolean に明示変換
          isCustom: ans.IsCustom === 1 || ans.isCustom === true,
          memo: ans.Memo ?? ans.memo ?? '',
        }
      })
      
      // 判定結果の生成
      
      const results: Judgment[] = []

      questionsData.forEach(q => {
        const answerObj = answersMap[`${q.businessType}_${q.questionNo}`]
        if (!answerObj) return

        const { value: answer, isCustom, memo } = answerObj

        let programIds: string[] = []

        if (q.type === 'yesno') {
          if (answer === '○' && q.yesPrograms) {
            programIds = Array.isArray(q.yesPrograms) ? q.yesPrograms : []
          } else if (answer === '×' && q.noPrograms) {
            programIds = Array.isArray(q.noPrograms) ? q.noPrograms : []
          }
        } else if (q.type === 'choice' && q.choicePrograms) {
          const programId = q.choicePrograms[answer]
          if (programId) {
            programIds = typeof programId === 'string' ? [programId] : programId
          }
        }

        
        // ✅ 回答があることを必須条件にする
        if (
          answer &&                       // ←★これを追加
          (
            programIds.length > 0 ||
            isCustom ||
            memo
          )
        ) {
          results.push({
            businessType: q.businessType,
            questionNo: q.questionNo,
            questionText: q.text,
            answer,
            programIds: Array.from(new Set(programIds)),
            priority: q.priority,
            implementation: q.implementation,
            settings: q.settings,
            isCustom,
            memo,
          })
        }
      })
      
      results.sort((a, b) => {
        const order = { '高': 1, '中': 2, '低': 3 }
        return order[a.priority as '高' | '中' | '低'] -
               order[b.priority as '高' | '中' | '低']
      })
      
      setJudgments(results)
      
      // ========================================
      // 🆕 フローマスタデータ読み込み
      // ========================================
      try {
        console.log('🔄 フローマスタデータ読み込み開始...')
        
        // 業務フロージェネレーター初期化
        const businessFlowGen = new BusinessFlowGenerator(
          answersRes.data,
          results.map(r => ({
            businessType: r.businessType,
            answer: r.answer,
            isUsed: r.programIds.length > 0,
            isCustom: r.isCustom
          })) as any,
          programsRes.data
        )
        
        // マスタデータ読み込み
        await businessFlowGen.loadMasterData()
        console.log('✅ 業務フローマスタ読み込み完了')
        
        // システムフロージェネレーター初期化
        const systemFlowGen = new FlowGenerator(
          answersRes.data,
          results.map(r => ({
            businessType: r.businessType,
            answer: r.answer,
            isUsed: r.programIds.length > 0,
            programIds: r.programIds
          })) as any,
          programsRes.data
        )
        
        // マスタデータ読み込み
        await systemFlowGen.loadMasterData()
        console.log('✅ システムフローマスタ読み込み完了')
        
      } catch (flowError) {
        console.error('⚠️ フローマスタの読み込みに失敗しました:', flowError)
        // フローマスタ読み込み失敗は警告のみ（判定結果表示は継続）
      }
      
    } catch (error) {
      console.error('データ読み込みエラー:', error)
      alert('データの読み込みに失敗しました')
    }
  }

  useEffect(() => {
    let total = 0
    const uniquePrograms = new Set<string>()
    
    judgments.forEach(j => {
      j.programIds.forEach(pid => uniquePrograms.add(pid))
    })
    
    uniquePrograms.forEach(pid => {
      const program = programs.find(p => p.programId === pid)
      if (program) {
        total += program.workHours
      }
    })
    
    setTotalHours(total)
  }, [judgments, programs])
  
  // ✅ 使用されたプログラムIDの集合
  const usedProgramIdSet = new Set<string>(
    judgments.flatMap(j => j.programIds)
  )

  // ✅ 使用されたプログラムのみ抽出
  const usedPrograms = programs.filter(p =>
    usedProgramIdSet.has(p.programId)
  )


  
  const getProgramDetails = (programId: string) => {
    return (
      programs.find(p => p.programId === programId) || {
        programId: programId,
        programName: '未登録',
        workHours: 0,
      }
    )
  }


  const formatAnswer = (judgment: Judgment): string => {
    const question = questions.find(q => q.questionNo === judgment.questionNo)
    
    if (question?.type === 'yesno') {
      return judgment.answer === '○' ? 'はい' : 'いいえ'
    }
    
    return judgment.answer
  }
  
  
  
  // ✅ 業務で絞り込んだ判定結果
  const filteredJudgments =
    selectedBusiness === 'すべて'
      ? judgments
      : judgments.filter(j => j.businessType === selectedBusiness)

  // ✅ 絞り込み後にソート
  const sortedJudgments = [...filteredJudgments].sort((a, b) => {
    let comparison = 0
    if (sortField === 'businessType') {
      comparison = a.businessType.localeCompare(b.businessType, 'ja')
    } else if (sortField === 'questionNo') {
      comparison = a.questionNo.localeCompare(b.questionNo)
    } else if (sortField === 'priority') {
      const priorityOrder = { '高': 3, '中': 2, '低': 1 }
      comparison =
        priorityOrder[a.priority as '高' | '中' | '低'] -
        priorityOrder[b.priority as '高' | '中' | '低']
    }
    return sortOrder === 'asc' ? comparison : -comparison
  })
  
  const handleExcelExport = () => {
    if (activeTab === 'results') {
      exportJudgmentsToExcel()
    } else if (activeTab === 'programs') {
      exportProgramsToExcel()
    } else {
      alert('出力対象が選択されていません')
    }
  }
  
  const exportJudgmentsToExcel = () => {
    // ヘッダ
    let csv =
      '業務,質問No,質問内容,回答,プログラムID,重要度\n';

    // 明細（現在画面に表示されている並び順をそのまま使う）
    sortedJudgments.forEach(j => {
      csv +=
        `"${j.businessType}",` +
        `"${j.questionNo}",` +
        `"${j.questionText}",` +
        `"${formatAnswer(j)}",` +
        `"${j.programIds.length > 0 ? j.programIds.join('; ') : '-'}",` +
        `"${j.priority}"\n`;
    });

    // CSV ダウンロード処理
    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = '判定結果一覧.csv';
    a.click();

    URL.revokeObjectURL(url);
  };
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }
  
  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return ' '
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }
 
  const handleExportFlow = () => {
    // 業務ごとにグループ化
    const businessGroups: Record<string, Judgment[]> = {}
    
    judgments.forEach(j => {
      if (!businessGroups[j.businessType]) {
        businessGroups[j.businessType] = []
      }
      businessGroups[j.businessType].push(j)
    })

    // Mermaid形式のフローチャート生成
    let mermaidCode = 'graph TD\n'
    mermaidCode += '  Start[業務フロー開始]\n'
    
    let prevNode = 'Start'
    Object.keys(businessGroups).forEach((business, index) => {
      const nodeId = `B${index}`
      mermaidCode += `  ${prevNode} --> ${nodeId}[${business}]\n`
      
      businessGroups[business].forEach((j, jIndex) => {
        const qNodeId = `${nodeId}_Q${jIndex}`
        mermaidCode += `  ${nodeId} --> ${qNodeId}["${j.questionNo}: ${j.questionText.substring(0, 30)}..."]\n`
        
        j.programIds.forEach((pid, pIndex) => {
          const prog = getProgramDetails(pid)
          const pNodeId = `${qNodeId}_P${pIndex}`
          mermaidCode += `  ${qNodeId} --> ${pNodeId}["${prog.programId}: ${prog.programName} (${prog.workHours}H)"]\n`
        })
      })
      
      prevNode = nodeId
    })
    
    mermaidCode += `  ${prevNode} --> End[完了]\n`

    const blob = new Blob([mermaidCode], { type: 'text/plain' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `業務フロー_${new Date().toISOString().split('T')[0]}.mmd`
    link.click()
  }
  
  const handlePrint = () => {
    window.print()
  }
  
  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.75rem 1.5rem',
    border: 'none',
    borderBottom: active ? '3px solid #3498db' : '3px solid transparent',
    backgroundColor: active ? '#ecf0f1' : '#f8f9fa',
    fontWeight: active ? 'bold' : 'normal',
    cursor: 'pointer',
  })
  
  const createPrintablePrograms = () => {
    const html = `
      <h1>対象プログラム一覧</h1>
      <table border="1" cellspacing="0" cellpadding="5">
        <tr><th>プログラムID</th><th>プログラム名</th><th>工数</th></tr>
        ${usedPrograms.map(p => `
          <tr>
            <td>${p.programId}</td>
            <td>${p.programName}</td>
            <td align="right">${p.workHours}H</td>
          </tr>
        `).join('')}
        <tr>
          <td colspan="2"><b>合計</b></td>
          <td align="right"><b>${usedPrograms.reduce((s,p)=>s+p.workHours,0)}H</b></td>
        </tr>
      </table>
    `

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.print()
  }
  
  const handlePDFExport = () => {
    if (activeTab === 'results') {
      createPrintableJudgments()
    } else if (activeTab === 'programs') {
      createPrintablePrograms()
    }
  }
  
  
  const createPrintableJudgments = () => {
    const html = `
      <html>
        <head>
          <title>判定結果</title>
          <style>
            body { font-family: sans-serif; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #333; padding: 6px; }
            th { background: #f0f0f0; }
          </style>
        </head>
        <body>
          <h1>判定結果</h1>
          <table>
            <tr>
              <th>業務</th>
              <th>質問No</th>
              <th>質問内容</th>
              <th>回答</th>
              <th>プログラムID</th>
              <th>重要度</th>
            </tr>
            ${sortedJudgments.map(j => `
              <tr>
                <td>${j.businessType}</td>
                <td>${j.questionNo}</td>
                <td>${j.questionText}</td>
                <td>${formatAnswer(j)}</td>
                <td>${j.programIds.join(', ')}</td>
                <td>${j.priority}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.print()
  }
  
  
  const exportProgramsToExcel = () => {
    // ヘッダ
    let csv =
      'プログラムID,プログラム名,工数\n'

    // 明細
    usedPrograms.forEach(p => {
      csv +=
        `${p.programId},` +
        `${p.programName},` +
        `${p.workHours}\n`
    })

    // 合計行
    const total = usedPrograms.reduce((sum, p) => sum + p.workHours, 0)
    csv += `合計,,${total}\n`

    // CSVダウンロード
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = '対象プログラム一覧.csv'
    a.click()

    URL.revokeObjectURL(url)
  }
  
  
  const selectedScreenId = (() => {
    const prog = programs.find(p => p.programId === selectedProgramId)
    // screenId が未設定の場合は programId をフォールバックとして使用
    return prog?.screenId || prog?.programId || null
  })()
  
  const actionButtonStyle = (bgColor: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',

    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: 'none',

    backgroundColor: bgColor,
    color: 'white',

    fontSize: '0.9rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',

    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease',
  });
  
  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        background: '#f1f5f9',
        paddingTop: '0.5rem',
        paddingBottom: '0.5rem',
        marginLeft: '-2rem',
        marginRight: '-2rem',
        paddingLeft: '2rem',
        paddingRight: '2rem',
      }}>
        <h1 style={{ margin: 0, color: '#2c3e50' }}>判定結果</h1>
        {/* ✅ タブ切り替え */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <button
            onClick={() => setActiveTab('results')}
            style={tabStyle(activeTab === 'results')}
          >
            結果
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            style={tabStyle(activeTab === 'programs')}
          >
            対象PG
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <HelpButton onClick={() => setShowHelp(true)} />
          <button
            onClick={() => setShowFlowViewer(true)}
            style={actionButtonStyle('#27ae60')}
          >
            📊 業務フロー
          </button>

          <button
            onClick={handlePrint}
            style={actionButtonStyle('#7f8c8d')}
          >
            🖨 印刷
          </button>

          <button
            onClick={handlePDFExport}
            style={actionButtonStyle('#e74c3c')}
          >
            📄 PDF
          </button>

          <button
            onClick={handleExcelExport}
            style={actionButtonStyle('#2ecc71')}
          >
            📊 CSV
          </button>
        </div>
      </div>
      {activeTab === 'results' && (
        <>
      
      {/* 業務フィルター */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ marginRight: '0.5rem' }}>業務：</label>
        <select
          value={selectedBusiness}
          onChange={(e) => setSelectedBusiness(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #bdc3c7',
            borderRadius: '4px',
            fontSize: '1rem',
          }}
        >
          <option value="すべて">すべて</option>
          {[...new Set(judgments.map(j => j.businessType))].map(b => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 140, zIndex: 30 }}>
            <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
              <th style={{ width: '32px' }}></th>
              <th 
                onClick={() => handleSort('businessType')}
                style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>
                業務{getSortIndicator('businessType')}
              </th>
              <th 
                onClick={() => handleSort('questionNo')}
                style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>
                質問No{getSortIndicator('questionNo')}
              </th>
              <th style={{ padding: '1rem', textAlign: 'left' }}>質問内容</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>回答</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>プログラムID</th>
              <th 
                onClick={() => handleSort('priority')}
                style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                重要度{getSortIndicator('priority')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedJudgments.map((judgment, index) => {
              const key = getJudgmentKey(judgment)
              const isOpen = expandedKey === key
              return (
                <Fragment key={key}>
                  <tr
                    style={{
                      cursor: 'default',
                      backgroundColor: isOpen
                        ? '#eef6fb'
                        : index % 2 === 0
                        ? 'white'
                        : '#f8f9fa',
                    }}
                  >
                    {/* ▶ / ▼ 専用列（業務の前） */}
                    <td
                      style={{
                        width: '32px',
                        textAlign: 'center',
                        cursor:
                          judgment.implementation || judgment.settings ? 'pointer' : 'default',
                        userSelect: 'none',
                      }}
                      onClick={() => {
                        if (judgment.implementation || judgment.settings) {
                          if (!isOpen) {
                            // ✅ 展開時：最初のプログラムを自動選択
                            setSelectedProgramId(
                              judgment.programIds?.[0]?.trim() ?? null
                            );
                            setExpandedKey(key)
                          } else {
                            setExpandedKey(null)
                          }
                        }
                      }}
                    >
                      {(judgment.implementation || judgment.settings) &&
                        (isOpen ? '▼' : '▶')}
                    </td>

                    {/* 業務 */}
                    <td>{judgment.businessType}</td>

                    {/* 質問No */}
                    <td>{judgment.questionNo}</td>

                    {/* 質問内容 */}
                    <td>{judgment.questionText}</td>

                    {/* 回答 */}
                    <td style={{ textAlign: 'center' }}>
                      {formatAnswer(judgment)}
                    </td>
                   {/* プログラムID */}
                   <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                     {judgment.programIds && judgment.programIds.length > 0 ? (
                       judgment.programIds.map(pid => (
                         <span
                           key={pid}
                           style={{ marginRight: '0.5rem', color: '#555' }}
                         >
                           {pid}
                         </span>
                       ))
                     ) : (
                       <span style={{ color: '#999' }}>-</span>
                     )}
                   </td>
                    {/* 重要度 */}
                    <td style={{ textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          backgroundColor:
                            judgment.priority === '高'
                              ? '#e74c3c'
                              : judgment.priority === '中'
                              ? '#f39c12'
                              : '#95a5a6',
                          color: 'white',
                        }}
                      >
                        {judgment.priority}
                      </span>
                    </td>
                  </tr>

                  {/* 展開行（中身は前に復元したものをそのまま） */}
                  {isOpen && (
                    <tr>
                      <td colSpan={7} style={{ padding: '1rem', backgroundColor: '#f9fbfd' }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 2fr',
                            gap: '1rem',
                            minHeight: '700px',
                          }}
                        >
                          {/* 左：SC実現方法・設定内容 */}
                          <div style={{ display: 'grid', gap: '0.75rem' }}>
                            {judgment.isCustom && (
                              <div style={{ color: '#e67e22', fontWeight: 'bold' }}>
                                🔧 カスタム対応あり
                              </div>
                            )}

                            {judgment.memo && (
                              <div>
                                <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                                  メモ
                                </div>
                                <div>{judgment.memo}</div>
                              </div>
                            )}

                            <div>
                              <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                                SC実現方法
                              </div>
                              <div style={{ whiteSpace: 'pre-line' }}>
                                {judgment.implementation || '―'}
                              </div>
                            </div>

                            <div>
                              <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                                設定内容
                              </div>
                              <div style={{ whiteSpace: 'pre-line' }}>
                                {judgment.settings || '―'}
                              </div>
                            </div>
                          </div>
                          
                          <div
                            style={{
                              position: 'relative',
                              width: '100%',
                              height: '100%',
                            }}
                          >
                            {/* 帳票表示ボタン */}
                            {selectedProgramId && (
                              <button
                                onClick={() => {
                                  setReportFiles(availableReportFiles);
                                  setReportProgramId(selectedProgramId);
                                }}
                                disabled={!hasReport}
                                style={{
                                  position: 'absolute',
                                  top: '0px',
                                  right: '16px',
                                  zIndex: 10,
                                  padding: '4px 12px',
                                  whiteSpace: 'nowrap',
                                  cursor: hasReport ? 'pointer' : 'not-allowed',
                                  opacity: hasReport ? 1 : 0.4,
                                }}
                              >
                                帳票表示
                              </button>
                            )}
                            {/* V100画面 */}
                            {selectedProgramId && selectedScreenId ? (
                              <iframe
                                src={`${import.meta.env.PROD ? '/sc-hearing' : ''}/screen-viewer/Start.htm?screen=${selectedScreenId}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  border: 'none',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  color: '#999',
                                  fontSize: '0.9rem',
                                  textAlign: 'center',
                                  marginTop: '2rem',
                                }}
                              >
                                プログラムが設定されていません
                              </div>
                            )}

                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      </>
      )}
      
      {activeTab === 'programs' && (
        <div
          style={{
            marginTop: '2rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            overflow: 'hidden',
          }}
        >
          <h2
            style={{
              padding: '1rem',
              margin: 0,
              backgroundColor: '#2ecc71',
              color: 'white',
            }}
          >
            対象プログラム一覧
          </h2>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#ecf0f1' }}>
                <th style={{ padding: '0.75rem' }}>プログラムID</th>
                <th style={{ padding: '0.75rem' }}>プログラム名</th>
                <th style={{ padding: '0.75rem', textAlign: 'right' }}>工数</th>
              </tr>
            </thead>
            <tbody>
              {usedPrograms.map(p => (
                <tr key={p.programId}>
                  <td style={{ padding: '0.75rem' }}>{p.programId}</td>
                  <td style={{ padding: '0.75rem' }}>{p.programName}
                  
                  {judgments.some(
                      j =>
                        j.programIds.includes(p.programId) &&
                        j.isCustom
                    ) && (
                      <span style={{ marginLeft: '0.5rem', color: '#e67e22', fontWeight: 'bold' }}>
                        🔧 カスタム
                      </span>
                    )}
                  
                  </td>
                  <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                    {p.workHours}H
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div
            style={{
              padding: '1rem',
              textAlign: 'right',
              fontWeight: 'bold',
              backgroundColor: '#f8f9fa',
            }}
          >
            合計工数：
            {usedPrograms.reduce((sum, p) => sum + p.workHours, 0)}H
          </div>
        </div>
      )}
      
      {/* ✅ 業務フローモーダル（タブとは独立して常に描画対象にする） */}
        {showHelp && <HelpModal pages={judgmentResultsHelpPages} onClose={() => setShowHelp(false)} />}

        {showFlowViewer && (
          <BusinessFlowViewer
            answers={answers}
            judgments={judgments}
            programs={programs}
            companyName={project?.companyName ?? ''}
            onClose={() => setShowFlowViewer(false)}
          />
        )}
      
      {reportProgramId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 10000,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '400px',
              backgroundColor: '#fff',
              borderRadius: '8px',
              padding: '1rem',
            }}
          >
            <h3>帳票一覧（{reportProgramId}）</h3>

            {reportFiles.length === 0 ? (
              <div>帳票は登録されていません</div>
            ) : (
              
              <ul
                style={{
                  listStyle: 'none',
                  paddingLeft: 0,
                  margin: 0,
                }}
              >
                {reportFiles.map(file => (
                  <li key={file} style={{ marginBottom: '0.5rem' }}>
                    <button
                      onClick={() => {
                        setPreviewReportFile(file); // ← これが本来の動作
                      }}
                      style={{ textAlign: 'left' }}
                    >
                      {file}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div style={{ textAlign: 'right' }}>
              <button
                onClick={() => {
                  setReportProgramId(null);
                  setReportFiles([]);
                }}
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
      
      {previewReportFile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            zIndex: 10001,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '5%',
              left: '5%',
              right: '5%',
              bottom: '5%',
              backgroundColor: '#fff',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '0.5rem 1rem',
                borderBottom: '1px solid #ccc',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontWeight: 'bold' }}>
                帳票プレビュー：{previewReportFile}
              </div>
              <button onClick={() => setPreviewReportFile(null)}>✕</button>
            </div>

            <div style={{ flex: 1 }}>
              <iframe
                src={`${REPORT_BASE_PATH}/${previewReportFile}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
              />
            </div>
          </div>
        </div>
      )}
      
      
    </div>
  )
}

export default JudgmentResults
