import { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import { FlowGenerator } from '../services/FlowGenerator'
import { BusinessFlowGenerator } from '../services/BusinessFlowGenerator'
import { BusinessProcessFlowGenerator } from '../services/BusinessProcessFlowGenerator'
import { FunctionalFlowGenerator } from '../services/FunctionalFlowGenerator'
import type { Answer, Judgment, Program } from '../services/api'

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

type FlowType = 'process' | 'business' | 'functional' | 'system'

function BusinessFlowViewer({ answers, judgments, programs, companyName, onClose }: BusinessFlowViewerProps) {
  const [flowType, setFlowType] = useState<FlowType>('process')
  const [mermaidCode, setMermaidCode] = useState('')
  const [svgCode, setSvgCode] = useState('')
  const mermaidRef = useRef<HTMLDivElement>(null)

  const INITIAL_ZOOM = 1.5
  const [zoom, setZoom] = useState(INITIAL_ZOOM)

  const actionButtonStyle = (bgColor: string): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.5rem 0.8rem', borderRadius: '6px', border: 'none',
    backgroundColor: bgColor, color: 'white', fontSize: '0.85rem', fontWeight: 'bold',
    cursor: 'pointer', whiteSpace: 'nowrap', boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  })

  const generateFlow = async () => {
    try {
      let generator: any
      let code: string
      if (flowType === 'process') {
        generator = new BusinessProcessFlowGenerator(answers, judgments, programs)
        await generator.loadMasterData()
        code = generator.generateBusinessProcessFlow()
      } else if (flowType === 'business') {
        generator = new BusinessFlowGenerator(answers, judgments, programs)
        await generator.loadMasterData()
        code = generator.generateBusinessFlow()
      } else if (flowType === 'functional') {
        generator = new FunctionalFlowGenerator(answers, judgments, programs)
        await generator.loadMasterData()
        code = generator.generateFunctionalFlow()
      } else {
        generator = new FlowGenerator(answers, judgments, programs)
        await generator.loadMasterData()
        code = generator.generateSystemFlow()
      }

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

  const flowTypeName = flowType === 'process'    ? '業務プロセスフロー'
                     : flowType === 'business'   ? '業務フロー'
                     : flowType === 'functional' ? '機能フロー'
                     :                              'システムフロー'

  const handleExportSVG = () => {
    const svgElement = mermaidRef.current?.querySelector('svg')
    if (!svgElement) return
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const link = document.createElement('a')
    link.download = `${flowTypeName}_${companyName}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) { alert('ポップアップがブロックされました'); return }
    const html = `
      <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${flowTypeName}_${companyName}</title>
      <style>
        body { font-family: 'Meiryo', sans-serif; padding: 20px; }
        h1 { font-size: 24px; margin-bottom: 20px; }
        .info { margin-bottom: 20px; font-size: 14px; }
        .flow-container { width: 100%; overflow: auto; }
        svg { max-width: 100%; height: auto; }
        @media print { body { padding: 10mm; } @page { size: A4 landscape; margin: 10mm; } }
      </style></head><body>
        <h1>${flowTypeName}図</h1>
        <div class="info">
          <div><strong>会社名：</strong>${companyName}</div>
          <div><strong>出力日時：</strong>${new Date().toLocaleString('ja-JP')}</div>
        </div>
        <div class="flow-container">${svgCode}</div>
      </body></html>`
    printWindow.document.write(html)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 500)
  }

  const handleExportMermaid = () => {
    const blob = new Blob([mermaidCode], { type: 'text/plain;charset=utf-8' })
    const link = document.createElement('a')
    link.download = `${flowTypeName}_mermaid_${companyName}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.txt`
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  const handleExportText = async () => {
    try {
      let generator: any
      if (flowType === 'process')          generator = new BusinessProcessFlowGenerator(answers, judgments, programs)
      else if (flowType === 'business')    generator = new BusinessFlowGenerator(answers, judgments, programs)
      else if (flowType === 'functional')  generator = new FunctionalFlowGenerator(answers, judgments, programs)
      else                                 generator = new FlowGenerator(answers, judgments, programs)
      await generator.loadMasterData()
      const textFlow = generator.generateTextFlow()
      const blob = new Blob([textFlow], { type: 'text/plain;charset=utf-8' })
      const link = document.createElement('a')
      link.download = `${flowTypeName}_テキスト_${companyName}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.txt`
      link.href = URL.createObjectURL(blob)
      link.click()
    } catch (e) { console.error('テキスト出力エラー:', e) }
  }

  const zoomIn = () => setZoom(z => Math.min(z + 0.1, 3))
  const zoomOut = () => setZoom(z => Math.max(z - 0.1, 0.3))
  const resetZoom = () => setZoom(INITIAL_ZOOM)

  const tabButtonStyle = (active: boolean, color: string) => ({
    padding: '0.5rem 1rem',
    backgroundColor: active ? color : '#1e3a5f',
    color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
    fontWeight: active ? 'bold' : 'normal' as 'bold' | 'normal',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
                  display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div ref={mermaidRef} style={{ backgroundColor: 'white', borderRadius: '8px', width: '90%', height: '90%',
                                      padding: '1.5rem', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>📊 {flowTypeName}図</h3>
          <button onClick={onClose} style={actionButtonStyle('#7f8c8d')}>✕ 閉じる</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button onClick={() => setFlowType('process')}    style={tabButtonStyle(flowType === 'process',    '#a855f7')}>🌐 業務プロセス</button>
          <button onClick={() => setFlowType('business')}   style={tabButtonStyle(flowType === 'business',   '#3b82f6')}>📈 業務フロー</button>
          <button onClick={() => setFlowType('functional')} style={tabButtonStyle(flowType === 'functional', '#10b981')}>⚙️ 機能フロー</button>
          <button onClick={() => setFlowType('system')}     style={tabButtonStyle(flowType === 'system',     '#f59e0b')}>🔧 システムフロー</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <button onClick={handleExportSVG}     style={actionButtonStyle('#8e44ad')}>📐 SVG出力</button>
          <button onClick={handleExportPDF}     style={actionButtonStyle('#e74c3c')}>📄 PDF出力</button>
          <button onClick={handleExportMermaid} style={actionButtonStyle('#16a085')}>📝 Mermaid出力</button>
          <button onClick={handleExportText}    style={actionButtonStyle('#34495e')}>📋 テキスト出力</button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <button onClick={zoomOut}>−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={zoomIn}>＋</button>
          <button onClick={resetZoom}>⟲</button>
        </div>

        <div style={{ width: '100%', height: '70vh', overflowX: 'auto', overflowY: 'auto',
                      border: '1px solid #ccc', background: '#fff' }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: 'max-content', minWidth: '100%' }}
               dangerouslySetInnerHTML={{ __html: svgCode }} />
        </div>
      </div>
    </div>
  )
}

export default BusinessFlowViewer
