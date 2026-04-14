import { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { FlowGenerator } from '../services/FlowGenerator'
import { BusinessFlowGenerator } from '../services/BusinessFlowGenerator'
import type { Answer, Judgment } from '../services/api'

interface BusinessFlowViewerProps {
  answers: Answer[]
  judgments: Judgment[]
  programs: Program[]
  companyName: string
  onClose: () => void
}

mermaid.initialize({
  startOnLoad: false,
  theme: 'default',
  securityLevel: 'loose',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: false,
    curve: 'basis'
  }
})

function BusinessFlowViewer({ answers, judgments, programs, companyName, onClose }: BusinessFlowViewerProps) {
  const [flowType, setFlowType] = useState<'business' | 'system'>('business')
  const [mermaidCode, setMermaidCode] = useState('')
  const [svgCode, setSvgCode] = useState('')
  const mermaidRef = useRef<HTMLDivElement>(null)
  
  const INITIAL_ZOOM = 1.5  // ← 見やすい基準サイズ
  const [zoom, setZoom] = useState(INITIAL_ZOOM)
  
  
  const actionButtonStyle = (bgColor: string): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',

    padding: '0.5rem 0.8rem',
    borderRadius: '6px',
    border: 'none',

    backgroundColor: bgColor,
    color: 'white',

    fontSize: '0.85rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    whiteSpace: 'nowrap',

    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  });


  
  const generateFlow = async () => {
  try {
    const generator =
      flowType === 'business'
        ? new BusinessFlowGenerator(answers, judgments, programs)
        : new FlowGenerator(answers, judgments, programs)

    // ✅ マッピングデータをロード
    if (flowType === 'business') {
      await (generator as BusinessFlowGenerator).loadMappings()
    }

    const code =
      flowType === 'business'
        ? generator.generateBusinessFlow()
        : generator.generateSystemFlow()

      setMermaidCode(code)

      const id = `mermaid-${Date.now()}`
      const { svg } = await mermaid.render(id, code)
      setSvgCode(svg)
    } catch (error) {
      console.error('フロー生成エラー:', error)
      setSvgCode('フローの生成に失敗しました')
    }
  }
  
  
  useEffect(() => {
    if (!judgments || judgments.length === 0) return
    generateFlow()
  }, [flowType, answers, judgments])
  
  // SVG出力
  const handleExportSVG = () => {
    const svgElement = mermaidRef.current?.querySelector('svg')
    if (!svgElement) return

    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const link = document.createElement('a')
    link.download = `${flowType === 'business' ? '業務フロー' : 'システムフロー'}_${companyName}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  // PDF出力
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('ポップアップがブロックされました')
      return
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${flowType === 'business' ? '業務フロー' : 'システムフロー'}_${companyName}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}</title>
        <style>
          body { font-family: 'Meiryo', sans-serif; padding: 20px; }
          h1 { font-size: 24px; margin-bottom: 20px; }
          .info { margin-bottom: 20px; font-size: 14px; }
          .flow-container { width: 100%; overflow: auto; }
          svg { max-width: 100%; height: auto; }
          @media print { 
            body { padding: 10mm; }
            @page { size: A4 landscape; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <h1>${flowType === 'business' ? '業務フロー図' : 'システムフロー図'}</h1>
        <div class="info">
          <div><strong>会社名：</strong>${companyName}</div>
          <div><strong>出力日時：</strong>${new Date().toLocaleString('ja-JP')}</div>
        </div>
        <div class="flow-container">
          ${svgCode}
        </div>
      </body>
      </html>
    `

    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  // Mermaidテキスト出力
  const handleExportMermaid = () => {
    const blob = new Blob([mermaidCode], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.download = `${flowType === 'business' ? '業務フロー' : 'システムフロー'}_mermaid_${companyName}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.txt`
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  // テキストフロー出力
  const handleExportText = () => {
    const generator =
      flowType === 'business'
        ? new BusinessFlowGenerator(answers, judgments, programs)
        : new FlowGenerator(answers, judgments, programs)
        
    const textFlow = generator.generateTextFlow()
    const blob = new Blob([textFlow], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.download = `業務フロー_テキスト_${companyName}_${new Date()
      .toISOString()
      .split('T')[0]
      .replace(/-/g, '')}.txt`
    link.href = URL.createObjectURL(blob)
    link.click()
  }
  
  
  const getProgram = (programId: string) => {
    return (
      programs.find(p => p.programId === programId) || {
        programId,
        programName: '未登録',
        workHours: 0,
      }
    )
  }
  
  
  const zoomIn = () => {
    setZoom(z => Math.min(z + 0.1, 3))  // 最大300%
  }

  const zoomOut = () => {
    setZoom(z => Math.max(z - 0.1, 0.3)) // 最小30%
  }

  
  const resetZoom = () => {
    setZoom(INITIAL_ZOOM)
  }


  
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          width: '90%',
          height: '90%',
          padding: '1.5rem',
          overflow: 'auto',
        }}
        ref={mermaidRef}
      >
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <h3 style={{ margin: 0 }}>
            📊 {flowType === 'business' ? '業務フロー図' : 'システムフロー図'}
          </h3>

          <button
            onClick={onClose}
            style={actionButtonStyle('#7f8c8d')}
          >
            ✕ 閉じる
          </button>
        </div>

        {/* フロータイプ切替 */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={() => setFlowType('business')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: flowType === 'business' ? '#3498db' : '#ecf0f1',
              color: flowType === 'business' ? 'white' : '#2c3e50',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            📈 業務フロー
          </button>
          <button
            onClick={() => setFlowType('system')}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: flowType === 'system' ? '#3498db' : '#ecf0f1',
              color: flowType === 'system' ? 'white' : '#2c3e50',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            🔧 システムフロー
          </button>
        </div>

        {/* 出力ボタン */}
        <div
          style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap',
            alignItems: 'center',
            marginBottom: '0.75rem',
          }}
        >
          <button
            onClick={handleExportSVG}
            style={actionButtonStyle('#8e44ad')}
          >
            📐 SVG出力
          </button>

          <button
            onClick={handleExportPDF}
            style={actionButtonStyle('#e74c3c')}
          >
            📄 PDF出力
          </button>

          <button
            onClick={handleExportMermaid}
            style={actionButtonStyle('#16a085')}
          >
            📝 Mermaid出力
          </button>

          <button
            onClick={handleExportText}
            style={actionButtonStyle('#34495e')}
          >
            📋 テキスト出力
          </button>
        </div>

        {/* フロー描画 */}
        
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button onClick={zoomOut}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn}>＋</button>
          <button onClick={resetZoom}>⟲</button>
        </div>

        <div
          style={{
            width: '100%',
            height: '70vh',
            overflowX: 'auto',   // ✅ 横スクロール
            overflowY: 'auto',   // ✅ 縦スクロール
            border: '1px solid #ccc',
            background: '#fff',
          }}
        >
          <div
            ref={mermaidRef}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',   // ← 超重要
              width: 'max-content',   // ✅ 横に必要なだけ伸びる
              minWidth: '100%',       // ✅ 小さい場合でも親幅は維持
              }}
            dangerouslySetInnerHTML={{ __html: svgCode }}
          />
        </div>
      </div>
    </div>
  )
}

export default BusinessFlowViewer
