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

type FlowType = 'process' | 'business' | 'system'
type PaperSize = 'a4-landscape' | 'a3-landscape' | 'a4-portrait'
type PrintMode = 'fit' | 'multipage'

const PAPER_LABEL: Record<PaperSize, string> = {
  'a4-landscape': 'A4横',
  'a3-landscape': 'A3横',
  'a4-portrait':  'A4縦',
}

const PAPER_DIM_MM: Record<PaperSize, { w: number; h: number; pageW: number; pageH: number }> = {
  'a4-landscape': { pageW: 297, pageH: 210, w: 277, h: 190 },
  'a3-landscape': { pageW: 420, pageH: 297, w: 400, h: 277 },
  'a4-portrait':  { pageW: 210, pageH: 297, w: 190, h: 277 },
}

const FLOW_TYPES: { value: FlowType; label: string; icon: string; color: string; gradient: string }[] = [
  { value: 'process',    label: '業務プロセス', icon: '🌐', color: '#A855F7', gradient: 'linear-gradient(135deg, #7C3AED, #A855F7)' },
  { value: 'business',   label: '業務フロー',   icon: '📈', color: '#185FA5', gradient: 'linear-gradient(135deg, #185FA5, #0C447C)' },
  { value: 'system',     label: 'システム',     icon: '🔧', color: '#BA7517', gradient: 'linear-gradient(135deg, #BA7517, #854F0B)' },
]

function svgToDataUrl(svgEl: SVGElement): string {
  const clone = svgEl.cloneNode(true) as SVGElement
  if (!clone.getAttribute('xmlns')) {
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  }
  const xml = new XMLSerializer().serializeToString(clone)
  const encoded = encodeURIComponent(xml).replace(/'/g, '%27').replace(/"/g, '%22')
  return `data:image/svg+xml;charset=utf-8,${encoded}`
}

const PX_TO_MM = 1 / 3.7795

function BusinessFlowViewer({ answers, judgments, programs, companyName, onClose }: BusinessFlowViewerProps) {
  const [flowType, setFlowType] = useState<FlowType>('process')
  const [mermaidCode, setMermaidCode] = useState('')
  const [svgCode, setSvgCode] = useState('')
  const [zoom, setZoom] = useState(1)
  const [svgSize, setSvgSize] = useState({ w: 0, h: 0 })
  const [showPdfMenu, setShowPdfMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const [printScale, setPrintScale] = useState(0.3)
  const [paperSize, setPaperSize] = useState<PaperSize>('a3-landscape')
  const containerRef = useRef<HTMLDivElement>(null)
  const svgWrapRef = useRef<HTMLDivElement>(null)

  const currentType = FLOW_TYPES.find(t => t.value === flowType)!
  const flowTypeName = `${currentType.label}${flowType === 'system' ? 'フロー' : ''}`

  const generateFlow = async () => {
    try {
      setLoading(true)
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
      setSvgCode('<div style="padding:40px;text-align:center;color:#A32D2D;">フローの生成に失敗しました</div>')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!judgments || judgments.length === 0) return
    generateFlow()
  }, [flowType, answers, judgments])

  useEffect(() => {
    if (!svgCode || !svgWrapRef.current) return
    const t = setTimeout(() => {
      const svgEl = svgWrapRef.current?.querySelector('svg')
      if (!svgEl) return

      const vb = svgEl.viewBox?.baseVal
      const w = parseFloat(svgEl.getAttribute('width') || '0') || vb?.width || 0
      const h = parseFloat(svgEl.getAttribute('height') || '0') || vb?.height || 0
      setSvgSize({ w, h })

      if (w > 0 && containerRef.current) {
        const cw = containerRef.current.clientWidth - 48
        const ch = containerRef.current.clientHeight - 48
        const fitZoom = Math.min(cw / w, ch / h, 1.2)
        setZoom(Math.max(fitZoom, 0.3))
      }

      // SVGサイズに応じて、A3横で2〜6ページに収まる印刷スケールを推奨値として設定
      if (w > 0) {
        const dim = PAPER_DIM_MM['a3-landscape']
        const svgW_mm_full = w * PX_TO_MM
        const svgH_mm_full = h * PX_TO_MM
        // 4ページに収まる目安スケール
        const sx = (dim.w * 2) / svgW_mm_full
        const sy = (dim.h * 2) / svgH_mm_full
        const recommended = Math.min(sx, sy, 1.0)
        setPrintScale(Math.max(0.15, Math.min(recommended, 0.5)))
      }
    }, 50)
    return () => clearTimeout(t)
  }, [svgCode])

  const fitToContainer = () => {
    if (!svgSize.w || !containerRef.current) return
    const cw = containerRef.current.clientWidth - 48
    const ch = containerRef.current.clientHeight - 48
    setZoom(Math.min(cw / svgSize.w, ch / svgSize.h))
  }
  const fitWidth = () => {
    if (!svgSize.w || !containerRef.current) return
    const cw = containerRef.current.clientWidth - 48
    setZoom(cw / svgSize.w)
  }
  const zoomIn  = () => setZoom(z => Math.min(z + 0.1, 3))
  const zoomOut = () => setZoom(z => Math.max(z - 0.1, 0.3))

  const handleExportSVG = () => {
    const svgElement = svgWrapRef.current?.querySelector('svg')
    if (!svgElement) return
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const link = document.createElement('a')
    link.download = `${flowTypeName}_${companyName}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
  }

  const calcPagesAt = (paper: PaperSize, scale: number): { cols: number; rows: number; total: number } => {
    if (!svgSize.w) return { cols: 0, rows: 0, total: 0 }
    const dim = PAPER_DIM_MM[paper]
    const svgW_mm = svgSize.w * PX_TO_MM * scale
    const svgH_mm = svgSize.h * PX_TO_MM * scale
    const cols = Math.max(1, Math.ceil(svgW_mm / dim.w))
    const rows = Math.max(1, Math.ceil((svgH_mm + 18) / dim.h))
    return { cols, rows, total: cols * rows }
  }

  const handleExportPDF = (paper: PaperSize, mode: PrintMode, scaleOverride?: number) => {
    setShowPdfMenu(false)

    const svgEl = svgWrapRef.current?.querySelector('svg') as SVGElement | null
    if (!svgEl) {
      alert('フローがまだ生成されていません')
      return
    }

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('ポップアップがブロックされました')
      return
    }

    const orientation = paper.includes('portrait') ? 'portrait' : 'landscape'
    const pageSize = paper.startsWith('a3') ? 'A3' : 'A4'
    const dim = PAPER_DIM_MM[paper]
    const usedScale = scaleOverride ?? printScale

    let bodyHtml = ''

    if (mode === 'fit') {
      bodyHtml = `
<div class="page page-fit">
  <div class="page-header">
    <h1>${currentType.icon} ${flowTypeName}図</h1>
    <div class="meta">
      <span><strong>会社名:</strong>${companyName || '―'}</span>
      <span><strong>出力日時:</strong>${new Date().toLocaleString('ja-JP')}</span>
      <span><strong>用紙:</strong>${PAPER_LABEL[paper]} (1ページフィット)</span>
    </div>
  </div>
  <div class="fit-container">${svgCode}</div>
  <div class="page-footer">
    <span>${companyName} | ${flowTypeName}</span>
    <span>SC ヒアリングシステム</span>
  </div>
</div>`
    } else {
      const svgW_mm = svgSize.w * PX_TO_MM * usedScale
      const svgH_mm = svgSize.h * PX_TO_MM * usedScale

      const HEADER_H = 18
      const firstPageH = dim.h - HEADER_H
      const otherPageH = dim.h - 6

      const colsCount = Math.max(1, Math.ceil(svgW_mm / dim.w))

      const rows: { yOffset: number; h: number }[] = []
      let remaining = svgH_mm
      let yOffset = 0
      let firstRow = true
      while (remaining > 0) {
        const pageH = firstRow ? firstPageH : otherPageH
        const used = Math.min(pageH, remaining)
        rows.push({ yOffset, h: pageH })
        yOffset += pageH
        remaining -= used
        firstRow = false
      }

      const totalPages = rows.length * colsCount
      const svgDataUrl = svgToDataUrl(svgEl)

      let pagesHtml = ''
      let pageNum = 1
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r]
        const isFirstRow = r === 0
        for (let c = 0; c < colsCount; c++) {
          const headerHtml = isFirstRow && c === 0 ? `
            <div class="page-header">
              <h1>${currentType.icon} ${flowTypeName}図</h1>
              <div class="meta">
                <span><strong>会社名:</strong>${companyName || '―'}</span>
                <span><strong>出力日時:</strong>${new Date().toLocaleString('ja-JP')}</span>
                <span><strong>用紙:</strong>${PAPER_LABEL[paper]} ${totalPages}ページ (${Math.round(usedScale * 100)}%)</span>
              </div>
            </div>` : ''

          const tileH = row.h
          const offsetX = c * dim.w
          const offsetY = row.yOffset

          pagesHtml += `
<div class="page page-multi">
  ${headerHtml}
  <div class="tile-container" style="height: ${tileH}mm;">
    <img src="${svgDataUrl}" class="tile" style="
      width: ${svgW_mm}mm;
      height: ${svgH_mm}mm;
      left: -${offsetX}mm;
      top: -${offsetY}mm;
    " />
  </div>
  <div class="page-footer">
    <span>${companyName} | ${flowTypeName}</span>
    <span>ページ ${pageNum} / ${totalPages}</span>
  </div>
</div>`
          pageNum++
        }
      }
      bodyHtml = pagesHtml
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>${flowTypeName}_${companyName}</title>
<style>
  @page { size: ${pageSize} ${orientation}; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    font-family: 'Meiryo', 'Yu Gothic', 'MS PGothic', sans-serif;
    color: #0f172a;
    background: white;
  }
  .page {
    width: ${dim.w}mm;
    height: ${dim.h}mm;
    page-break-after: always;
    page-break-inside: avoid;
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .page:last-child { page-break-after: auto; }

  .page-header {
    border-bottom: 3px solid ${currentType.color};
    padding-bottom: 4mm;
    margin-bottom: 4mm;
    flex-shrink: 0;
  }
  .page-header h1 {
    font-size: 16px;
    margin: 0 0 2px 0;
    color: ${currentType.color};
  }
  .page-header .meta {
    display: flex; gap: 18px;
    font-size: 9px; color: #475569;
    margin-top: 2px; flex-wrap: wrap;
  }
  .page-header .meta strong { color: #0f172a; margin-right: 3px; }

  .page-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 2mm;
    margin-top: auto;
    font-size: 8px;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
    flex-shrink: 0;
  }

  .page-fit .fit-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    text-align: center;
  }
  .page-fit svg {
    max-width: 100%;
    max-height: 100%;
    height: auto;
    display: block;
  }

  .page-multi .tile-container {
    width: 100%;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
  }
  .page-multi .tile {
    position: absolute;
    display: block;
    max-width: none;
  }

  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { margin: 0; }
  }
  @media screen {
    body { background: #e2e8f0; padding: 20px; }
    .page {
      background: white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin: 0 auto 20px;
    }
  }
</style>
</head>
<body>
${bodyHtml}
<script>
  window.addEventListener('load', () => {
    setTimeout(() => window.print(), 600);
  });
</script>
</body>
</html>`

    printWindow.document.write(html)
    printWindow.document.close()
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
      else                                 generator = new FlowGenerator(answers, judgments, programs)
      await generator.loadMasterData()
      const textFlow = generator.generateTextFlow()
      const blob = new Blob([textFlow], { type: 'text/plain;charset=utf-8' })
      const link = document.createElement('a')
      link.download = `${flowTypeName}_テキスト_${companyName}_${new Date().toISOString().split('T')[0].replace(/-/g, '')}.txt`
      link.href = URL.createObjectURL(blob)
      link.click()
    } catch (e) {
      console.error('テキスト出力エラー:', e)
    }
  }

  const currentPagesInfo = calcPagesAt(paperSize, printScale)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(2px)',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '2%',
        fontFamily: '"Noto Sans JP", sans-serif',
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 12,
          width: '100%',
          height: '100%',
          maxWidth: 1700,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >

        <div style={{
          padding: '12px 18px',
          background: currentType.gradient,
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>{currentType.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.7rem', opacity: 0.85, letterSpacing: '0.05em', fontWeight: 600 }}>
                {companyName || '案件'}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {flowTypeName}図
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '7px 16px',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 6,
              color: 'white',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)' }}
          >
            <span style={{ fontSize: 14 }}>✕</span> 閉じる
          </button>
        </div>

        <div style={{
          padding: '10px 18px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          flexWrap: 'wrap',
          flexShrink: 0,
        }}>

          <div style={{ display: 'flex', gap: 4, background: '#e2e8f0', padding: 3, borderRadius: 7 }}>
            {FLOW_TYPES.map(ft => {
              const active = flowType === ft.value
              return (
                <button
                  key={ft.value}
                  onClick={() => setFlowType(ft.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: 'none',
                    background: active ? 'white' : 'transparent',
                    color: active ? ft.color : '#64748b',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span>{ft.icon}</span>
                  <span>{ft.label}</span>
                </button>
              )
            })}
          </div>

          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />

          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button onClick={zoomOut} style={iconBtnStyle}>−</button>
            <span style={{
              minWidth: 56, textAlign: 'center', fontSize: '0.82rem', fontWeight: 600, color: '#475569',
              padding: '5px 8px', background: 'white', border: '1px solid #cbd5e1',
              borderRadius: 5, fontFamily: 'monospace',
            }}>{Math.round(zoom * 100)}%</span>
            <button onClick={zoomIn} style={iconBtnStyle}>＋</button>
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={fitToContainer} style={presetBtnStyle}>📐 全体</button>
            <button onClick={fitWidth} style={presetBtnStyle}>↔ 幅</button>
            <button onClick={() => setZoom(1)} style={presetBtnStyle}>1:1</button>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, position: 'relative' }}>

            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPdfMenu(!showPdfMenu)}
                style={{
                  padding: '7px 14px',
                  background: '#A32D2D',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  boxShadow: '0 1px 3px rgba(163,45,45,0.3)',
                }}
              >📄 PDF / 印刷 ▾</button>
              {showPdfMenu && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                    minWidth: 420,
                    zIndex: 100,
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: '0.78rem', color: '#0f172a', fontWeight: 700, marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid #f1f5f9' }}>
                    📄 印刷設定
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>
                      用紙サイズ
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {(['a3-landscape', 'a4-landscape', 'a4-portrait'] as PaperSize[]).map(p => {
                        const active = paperSize === p
                        return (
                          <button
                            key={p}
                            onClick={() => setPaperSize(p)}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              borderRadius: 5,
                              border: active ? '2px solid #185FA5' : '1px solid #cbd5e1',
                              background: active ? '#E6F1FB' : 'white',
                              color: active ? '#0C447C' : '#475569',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              fontFamily: 'inherit',
                            }}
                          >{PAPER_LABEL[p]}{p === 'a3-landscape' && ' ⭐'}</button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                      <span>印刷スケール</span>
                      <span style={{ color: '#0f172a' }}>{Math.round(printScale * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={Math.round(printScale * 100)}
                      onChange={(e) => setPrintScale(Number(e.target.value) / 100)}
                      style={{ width: '100%', accentColor: '#185FA5' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginTop: 2 }}>
                      <span>小さく (多ページ少ない)</span>
                      <span>大きく (多ページ)</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                      {[0.2, 0.3, 0.5, 0.7, 1.0].map(s => {
                        const active = Math.abs(printScale - s) < 0.01
                        const info = calcPagesAt(paperSize, s)
                        return (
                          <button
                            key={s}
                            onClick={() => setPrintScale(s)}
                            style={{
                              flex: 1,
                              padding: '4px 4px',
                              borderRadius: 4,
                              border: active ? '2px solid #185FA5' : '1px solid #e2e8f0',
                              background: active ? '#E6F1FB' : 'white',
                              color: active ? '#0C447C' : '#64748b',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              fontFamily: 'inherit',
                              lineHeight: 1.3,
                            }}
                          >
                            <div>{Math.round(s * 100)}%</div>
                            <div style={{ fontSize: '0.6rem', color: active ? '#0C447C' : '#94a3b8' }}>{info.total}枚</div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: 6,
                    padding: '8px 10px',
                    marginBottom: 10,
                    fontSize: '0.78rem',
                    color: '#475569',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span>📄 印刷予想:</span>
                    <span style={{ color: '#0f172a', fontWeight: 700 }}>
                      {currentPagesInfo.cols} × {currentPagesInfo.rows} = <span style={{ color: '#185FA5' }}>{currentPagesInfo.total}ページ</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => handleExportPDF(paperSize, 'multipage')}
                      style={{
                        flex: 1,
                        padding: '9px 14px',
                        background: '#A32D2D',
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        fontFamily: 'inherit',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 6,
                      }}
                    >📄 印刷する ({currentPagesInfo.total}枚)</button>
                    <button
                      onClick={() => handleExportPDF(paperSize, 'fit')}
                      title="1ページに収める (全体俯瞰用・縮小されます)"
                      style={{
                        padding: '9px 12px',
                        background: 'white',
                        color: '#475569',
                        border: '1px solid #cbd5e1',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        fontFamily: 'inherit',
                        whiteSpace: 'nowrap',
                      }}
                    >📐 1枚に</button>
                  </div>
                </div>
              )}
            </div>

            <button onClick={handleExportSVG} style={exportBtnStyle('#7B1FA2')}>📐 SVG</button>
            <button onClick={handleExportMermaid} style={exportBtnStyle('#1D9E75')}>📝 MMD</button>
            <button onClick={handleExportText} style={exportBtnStyle('#475569')}>📋 TXT</button>
          </div>
        </div>

        <div
          ref={containerRef}
          style={{
            flex: 1,
            background: 'repeating-linear-gradient(0deg, #f1f5f9 0, #f1f5f9 24px, #e2e8f0 24px, #e2e8f0 25px), repeating-linear-gradient(90deg, #f1f5f9 0, #f1f5f9 24px, #e2e8f0 24px, #e2e8f0 25px)',
            overflow: 'auto',
            position: 'relative',
            minHeight: 0,
          }}
          onClick={() => setShowPdfMenu(false)}
        >
          {loading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.85)',
              zIndex: 5,
            }}>
              <div style={{ color: currentType.color, fontWeight: 600, fontSize: '0.9rem' }}>
                ⏳ {flowTypeName}を生成しています...
              </div>
            </div>
          )}
          <div
            ref={svgWrapRef}
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              padding: 24,
              width: 'max-content',
              minWidth: '100%',
              minHeight: '100%',
            }}
            dangerouslySetInnerHTML={{ __html: svgCode }}
          />
        </div>

        <div style={{
          padding: '6px 18px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.72rem',
          color: '#64748b',
          flexShrink: 0,
        }}>
          <span>📏 サイズ: {Math.round(svgSize.w)} × {Math.round(svgSize.h)} px</span>
          <span>🖨️ 印刷: {PAPER_LABEL[paperSize]} {Math.round(printScale * 100)}% → {currentPagesInfo.total}ページ</span>
          <span>🔍 表示倍率: {Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  width: 30, height: 30,
  borderRadius: 5,
  border: '1px solid #cbd5e1',
  background: 'white',
  cursor: 'pointer',
  fontSize: 16,
  color: '#475569',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'inherit',
  fontWeight: 600,
}

const presetBtnStyle: React.CSSProperties = {
  padding: '5px 11px',
  borderRadius: 5,
  border: '1px solid #cbd5e1',
  background: 'white',
  cursor: 'pointer',
  fontSize: '0.78rem',
  fontWeight: 600,
  color: '#475569',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
}

const exportBtnStyle = (bg: string): React.CSSProperties => ({
  padding: '7px 12px',
  background: bg,
  color: 'white',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: '0.78rem',
  fontWeight: 600,
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
})

export default BusinessFlowViewer
