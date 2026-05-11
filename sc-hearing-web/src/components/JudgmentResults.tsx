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

const LAYER_CONFIG: Record<string, { label: string; badgeBg: string; borderColor: string; bgColor: string }> = {
  L1: { label: 'L1 業務プロセス', badgeBg: '#534AB7', borderColor: '#534AB7', bgColor: '#EEEDFE' },
  L2: { label: 'L2 業務フロー',   badgeBg: '#185FA5', borderColor: '#185FA5', bgColor: '#E6F1FB' },
  L3: { label: 'L3 機能',         badgeBg: '#5F5E5A', borderColor: '#888780', bgColor: '#F1EFE8' },
}

const PRIORITY_CFG: Record<string, { bg: string; label: string }> = {
  '高': { bg: '#A32D2D', label: '高' },
  '中': { bg: '#BA7517', label: '中' },
  '低': { bg: '#888780', label: '低' },
}

const detectLayer = (questionNo: string): 'L1' | 'L2' | 'L3' => {
  if (questionNo.startsWith('L1-') || questionNo.startsWith('L1')) return 'L1'
  if (questionNo.startsWith('L2-') || questionNo.startsWith('L2')) return 'L2'
  return 'L3'
}

const getBusinessColor = (businessType: string): { bg: string; text: string; border: string; accent: string } => {
  const SALES = ['見積', '受注', '引当', '出荷準備', '出荷', '売上', '返品', '得意先管理']
  const RECEIVABLE = ['請求', '売掛']
  const PURCHASE = ['発注', '入荷', '購買', '支払']
  const PAYABLE = ['仕入', '買掛']
  const STOCK = ['在庫', '棚卸', '移動', '評価']
  const PRODUCTION = ['生産', '工程', '製造']
  const COST = ['原価', '配賦']
  const STATS = ['統計', '統計1', '統計2']

  if (SALES.includes(businessType))      return { bg: '#E6F1FB', text: '#0C447C', border: '#185FA5', accent: '#185FA5' }
  if (RECEIVABLE.includes(businessType)) return { bg: '#E0F2F1', text: '#00695C', border: '#00897B', accent: '#00897B' }
  if (PURCHASE.includes(businessType))   return { bg: '#EEEDFE', text: '#3C3489', border: '#534AB7', accent: '#534AB7' }
  if (PAYABLE.includes(businessType))    return { bg: '#FCE4EC', text: '#880E4F', border: '#C2185B', accent: '#C2185B' }
  if (STOCK.includes(businessType))      return { bg: '#FFF3E0', text: '#854F0B', border: '#BA7517', accent: '#BA7517' }
  if (PRODUCTION.includes(businessType)) return { bg: '#FFEBEE', text: '#A32D2D', border: '#E64A19', accent: '#E64A19' }
  if (COST.includes(businessType))       return { bg: '#F3E5F5', text: '#4A148C', border: '#7B1FA2', accent: '#7B1FA2' }
  if (STATS.includes(businessType))      return { bg: '#FCEBEB', text: '#A32D2D', border: '#E24B4A', accent: '#E24B4A' }
  if (businessType === '月次')           return { bg: '#ECEFF1', text: '#37474F', border: '#546E7A', accent: '#546E7A' }
  if (businessType.startsWith('物流OP')) return { bg: '#E8F5E9', text: '#1B5E20', border: '#388E3C', accent: '#388E3C' }
  return { bg: '#F1F5F9', text: '#475569', border: '#94A3B8', accent: '#64748B' }
}


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
      
      {/* 業務フィルター + ソート */}
      <div style={{
        marginBottom: '1rem',
        background: 'white',
        padding: '12px 16px',
        borderRadius: 8,
        border: '1px solid #e2e8f0',
        display: 'flex',
        gap: 16,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>業務:</label>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: 'white',
            }}
          >
            <option value="すべて">すべて</option>
            {[...new Set(judgments.map(j => j.businessType))].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>並び順:</label>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            style={{
              padding: '6px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: 'white',
            }}
          >
            <option value="businessType">業務 順</option>
            <option value="questionNo">質問No 順</option>
            <option value="priority">重要度 順</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            title={sortOrder === 'asc' ? '昇順 (クリックで降順)' : '降順 (クリックで昇順)'}
            style={{
              padding: '6px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: 'white',
              color: '#475569',
              fontWeight: 600,
            }}
          >
            {sortOrder === 'asc' ? '↑ 昇順' : '↓ 降順'}
          </button>
        </div>

        <div style={{ marginLeft: 'auto', fontSize: '0.8rem', color: '#64748b' }}>
          {sortedJudgments.length} 件表示
        </div>
      </div>

      <div style={{ background: '#eef2f7', padding: 12, borderRadius: 8 }}>
        {(() => {
          const groups: Record<string, typeof sortedJudgments> = {}
          for (const j of sortedJudgments) {
            if (!groups[j.businessType]) groups[j.businessType] = []
            groups[j.businessType].push(j)
          }
          const businessOrder = Object.keys(groups)
          if (businessOrder.length === 0) {
            return (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#94a3b8', background: 'white', borderRadius: 8 }}>
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>📭</div>
                <div style={{ fontSize: '0.95rem' }}>該当する判定結果がありません</div>
              </div>
            )
          }
          return businessOrder.map(businessType => {
            const items = groups[businessType]
            const cat = getBusinessColor(businessType)
            const counts = {
              '高': items.filter(i => i.priority === '高').length,
              '中': items.filter(i => i.priority === '中').length,
              '低': items.filter(i => i.priority === '低').length,
            }
            return (
              <div key={businessType} style={{ marginBottom: 16 }}>
                <div style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 20,
                  background: cat.bg,
                  color: cat.text,
                  padding: '12px 18px',
                  borderRadius: 8,
                  borderLeft: `4px solid ${cat.border}`,
                  marginBottom: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>{businessType}</span>
                    <span style={{ fontSize: '0.78rem', opacity: 0.85, background: 'rgba(255,255,255,0.5)', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>
                      {items.length}件
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, fontSize: '0.75rem', alignItems: 'center' }}>
                    {counts['高'] > 0 && (
                      <span style={{ background: '#A32D2D', color: 'white', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>高 {counts['高']}</span>
                    )}
                    {counts['中'] > 0 && (
                      <span style={{ background: '#BA7517', color: 'white', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>中 {counts['中']}</span>
                    )}
                    {counts['低'] > 0 && (
                      <span style={{ background: '#888780', color: 'white', padding: '2px 10px', borderRadius: 12, fontWeight: 600 }}>低 {counts['低']}</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 8 }}>
                  {items.map(judgment => {
                    const key = getJudgmentKey(judgment)
                    const isOpen = expandedKey === key
                    const layer = detectLayer(judgment.questionNo)
                    const layerCfg = LAYER_CONFIG[layer]
                    const priorityCfg = PRIORITY_CFG[judgment.priority] || PRIORITY_CFG['中']
                    const hasDetail = !!(judgment.implementation || judgment.settings)
                    const ans = formatAnswer(judgment)
                    return (
                      <div
                        key={key}
                        style={{
                          background: 'white',
                          border: '1px solid #e2e8f0',
                          borderLeft: `4px solid ${layerCfg.borderColor}`,
                          borderRadius: 8,
                          padding: '14px 18px',
                          cursor: hasDetail ? 'pointer' : 'default',
                          transition: 'all 0.15s',
                          boxShadow: isOpen ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                        onClick={() => {
                          if (!hasDetail) return
                          if (isOpen) {
                            setExpandedKey(null)
                          } else {
                            setSelectedProgramId(judgment.programIds?.[0]?.trim() ?? null)
                            setExpandedKey(key)
                          }
                        }}
                        onMouseEnter={(e) => {
                          if (hasDetail && !isOpen) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
                        }}
                        onMouseLeave={(e) => {
                          if (hasDetail && !isOpen) e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                            <span style={{
                              background: layerCfg.badgeBg,
                              color: 'white',
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '3px 8px',
                              borderRadius: 3,
                              letterSpacing: '0.3px',
                              whiteSpace: 'nowrap',
                            }}>{layerCfg.label}</span>
                            <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#64748b', fontWeight: 500 }}>
                              {judgment.questionNo}
                            </span>
                            {judgment.isCustom && (
                              <span style={{
                                background: '#FAEEDA',
                                color: '#854F0B',
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: 3,
                                border: '1px solid #BA7517',
                                whiteSpace: 'nowrap',
                              }}>🔧 カスタム対応</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                            <span style={{
                              padding: '3px 12px',
                              borderRadius: 12,
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: priorityCfg.bg,
                              color: 'white',
                              letterSpacing: '0.02em',
                            }}>{priorityCfg.label}</span>
                            {hasDetail && (
                              <span style={{
                                color: '#64748b',
                                fontSize: 12,
                                transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 0.15s',
                                display: 'inline-block',
                                width: 16,
                                textAlign: 'center',
                              }}>▶</span>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: '0.95rem', color: '#0f172a', lineHeight: 1.5, marginBottom: 10, fontWeight: 500 }}>
                          {judgment.questionText}
                        </div>

                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>回答:</span>
                            <span style={{
                              fontSize: '0.92rem',
                              fontWeight: 700,
                              color: ans === 'はい' ? '#0F6E56' : ans === 'いいえ' ? '#A32D2D' : '#475569',
                              padding: '2px 10px',
                              background: ans === 'はい' ? '#E1F5EE' : ans === 'いいえ' ? '#FCEBEB' : '#f1f5f9',
                              borderRadius: 4,
                            }}>{ans}</span>
                          </div>
                          {judgment.programIds && judgment.programIds.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>プログラム:</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {judgment.programIds.slice(0, isOpen ? judgment.programIds.length : 5).map(pid => (
                                  <span key={pid} style={{
                                    padding: '2px 8px',
                                    background: '#f1f5f9',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 4,
                                    fontSize: '0.75rem',
                                    fontFamily: 'monospace',
                                    color: '#334155',
                                    fontWeight: 500,
                                  }}>{pid}</span>
                                ))}
                                {!isOpen && judgment.programIds.length > 5 && (
                                  <span style={{
                                    padding: '2px 8px',
                                    background: '#185FA5',
                                    color: 'white',
                                    borderRadius: 4,
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                  }}>+{judgment.programIds.length - 5}</span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {isOpen && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              marginTop: 16,
                              paddingTop: 16,
                              borderTop: '1px solid #e2e8f0',
                              display: 'grid',
                              gridTemplateColumns: '1fr 2fr',
                              gap: 16,
                              minHeight: 600,
                              cursor: 'default',
                            }}
                          >
                            <div style={{ display: 'grid', gap: 14, alignContent: 'flex-start' }}>
                              {judgment.memo && (
                                <div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, marginBottom: 4, letterSpacing: '0.05em' }}>
                                    メモ
                                  </div>
                                  <div style={{ fontSize: '0.88rem', color: '#0f172a', background: '#f8fafc', padding: '8px 12px', borderRadius: 6 }}>
                                    {judgment.memo}
                                  </div>
                                </div>
                              )}

                              <div>
                                <div style={{ fontSize: '0.72rem', color: '#185FA5', fontWeight: 700, marginBottom: 4, letterSpacing: '0.05em' }}>
                                  💡 SC実現方法
                                </div>
                                <div style={{ whiteSpace: 'pre-line', fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.6, background: '#f8fafc', padding: '10px 12px', borderRadius: 6, borderLeft: '3px solid #185FA5' }}>
                                  {judgment.implementation || '―'}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: '0.72rem', color: '#854F0B', fontWeight: 700, marginBottom: 4, letterSpacing: '0.05em' }}>
                                  ⚙️ 設定内容
                                </div>
                                <div style={{ whiteSpace: 'pre-line', fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.6, background: '#f8fafc', padding: '10px 12px', borderRadius: 6, borderLeft: '3px solid #BA7517' }}>
                                  {judgment.settings || '―'}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {judgment.programIds && judgment.programIds.length > 0 && (
                                <div style={{
                                  display: 'flex',
                                  gap: 8,
                                  alignItems: 'center',
                                  padding: '8px 12px',
                                  background: 'white',
                                  border: '1px solid #d0d7de',
                                  borderRadius: 6,
                                }}>
                                  <label style={{
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    color: '#475569',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    🖥️ 表示画面：
                                  </label>
                                  <select
                                    value={selectedProgramId || ''}
                                    onChange={(e) => setSelectedProgramId(e.target.value || null)}
                                    style={{
                                      flex: 1,
                                      padding: '6px 8px',
                                      border: '1px solid #cbd5e1',
                                      borderRadius: 4,
                                      fontSize: '0.85rem',
                                      fontFamily: 'monospace',
                                      background: 'white',
                                      cursor: 'pointer',
                                      minWidth: 0,
                                    }}
                                  >
                                    {judgment.programIds.map(pid => {
                                      const prog = programs.find(p => p.programId === pid)
                                      return (
                                        <option key={pid} value={pid}>
                                          {pid}{prog ? ` - ${prog.programName}` : ''}
                                        </option>
                                      )
                                    })}
                                  </select>
                                  <span style={{
                                    fontSize: '0.75rem',
                                    color: '#64748b',
                                    whiteSpace: 'nowrap',
                                  }}>
                                    ({judgment.programIds.length}件)
                                  </span>
                                  <button
                                    onClick={() => {
                                      setReportFiles(availableReportFiles)
                                      setReportProgramId(selectedProgramId)
                                    }}
                                    disabled={!hasReport}
                                    style={{
                                      padding: '6px 12px',
                                      background: hasReport ? '#185FA5' : '#cbd5e1',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: 4,
                                      cursor: hasReport ? 'pointer' : 'not-allowed',
                                      fontSize: '0.8rem',
                                      whiteSpace: 'nowrap',
                                      fontWeight: 600,
                                    }}
                                  >
                                    📄 帳票表示
                                  </button>
                                </div>
                              )}

                              <div style={{
                                flex: 1,
                                border: '1px solid #d0d7de',
                                borderRadius: 6,
                                overflow: 'hidden',
                                background: 'white',
                                minHeight: 500,
                              }}>
                                {selectedProgramId && selectedScreenId ? (
                                  <iframe
                                    src={`${import.meta.env.PROD ? '/sc-hearing' : ''}/screen-viewer/Start.htm?screen=${selectedScreenId}`}
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      border: 'none',
                                      display: 'block',
                                    }}
                                  />
                                ) : (
                                  <div style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', padding: '4rem 1rem' }}>
                                    プログラムが設定されていません
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        })()}
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
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(2px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => {
            setReportProgramId(null);
            setReportFiles([]);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 480,
              maxHeight: '80vh',
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{
              padding: '14px 18px',
              background: 'linear-gradient(135deg, #185FA5, #0C447C)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <span style={{ fontSize: 18 }}>📄</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, lineHeight: 1.2 }}>
                    帳票一覧
                  </div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {reportProgramId}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setReportProgramId(null);
                  setReportFiles([]);
                }}
                title="閉じる"
                style={{
                  width: 30, height: 30,
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 6,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
              >✕</button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {reportFiles.length === 0 ? (
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#94a3b8',
                }}>
                  <div style={{ fontSize: 40, marginBottom: 8, opacity: 0.5 }}>📭</div>
                  <div style={{ fontSize: '0.9rem' }}>帳票は登録されていません</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: 6 }}>
                  {reportFiles.map(file => (
                    <button
                      key={file}
                      onClick={() => setPreviewReportFile(file)}
                      style={{
                        textAlign: 'left',
                        padding: '10px 12px',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        fontSize: '0.85rem',
                        color: '#1e293b',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#E6F1FB'
                        e.currentTarget.style.borderColor = '#185FA5'
                        e.currentTarget.style.transform = 'translateX(2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'white'
                        e.currentTarget.style.borderColor = '#e2e8f0'
                        e.currentTarget.style.transform = 'translateX(0)'
                      }}
                    >
                      <span style={{
                        flexShrink: 0,
                        width: 32, height: 32,
                        background: '#FCEBEB',
                        color: '#A32D2D',
                        borderRadius: 6,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                        fontWeight: 700,
                        border: '1px solid #E24B4A40',
                      }}>📄</span>
                      <span style={{
                        flex: 1,
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: 'monospace',
                      }}>{file}</span>
                      <span style={{ color: '#94a3b8', fontSize: 14, flexShrink: 0 }}>›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {reportFiles.length} 件の帳票
              </div>
              <button
                onClick={() => {
                  setReportProgramId(null);
                  setReportFiles([]);
                }}
                style={{
                  padding: '7px 18px',
                  background: 'white',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  color: '#475569',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9'
                  e.currentTarget.style.borderColor = '#94a3b8'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white'
                  e.currentTarget.style.borderColor = '#cbd5e1'
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
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(3px)',
            zIndex: 10001,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2.5%',
          }}
          onClick={() => setPreviewReportFile(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              height: '100%',
              background: 'white',
              borderRadius: 12,
              boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '12px 18px',
                background: 'linear-gradient(135deg, #185FA5, #0C447C)',
                color: 'white',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.72rem', opacity: 0.85, letterSpacing: '0.05em', fontWeight: 600, textTransform: 'uppercase' }}>
                    帳票プレビュー
                  </div>
                  <div style={{
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2,
                  }}>
                    {previewReportFile}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <a
                  href={`${REPORT_BASE_PATH}/${previewReportFile}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="新しいタブで開く"
                  style={{
                    width: 32, height: 32,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
                >↗</a>
                <button
                  onClick={() => setPreviewReportFile(null)}
                  title="閉じる (Esc)"
                  style={{
                    padding: '0 14px',
                    height: 32,
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
                >
                  <span style={{ fontSize: 14 }}>✕</span> 閉じる
                </button>
              </div>
            </div>

            <div style={{ flex: 1, background: '#525659', minHeight: 0 }}>
              <iframe
                src={`${REPORT_BASE_PATH}/${previewReportFile}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
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
