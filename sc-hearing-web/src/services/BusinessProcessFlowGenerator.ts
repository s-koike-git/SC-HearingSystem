import type {
  Answer,
  Judgment,
  Program,
  BusinessProcessFlowStep,
  BusinessProcessFlowConnection,
  BusinessFlowStep,
  FunctionalFlowStep,
  FlowQuestionMapping
} from './api'

import {
  businessProcessFlowStepsApi,
  businessProcessFlowConnectionsApi,
  businessFlowStepsApi,
  functionalFlowStepsApi,
  flowQuestionMappingsApi
} from './api'

/**
 * 業務プロセスフロー(第1階層) Mermaid 生成エンジン
 * 大区分27プロセス、お客様向け俯瞰図
 */
export class BusinessProcessFlowGenerator {
  private answers: Answer[]
  private judgments: Judgment[]
  private programs: Program[]

  private processes: BusinessProcessFlowStep[] = []
  private connections: BusinessProcessFlowConnection[] = []
  private businessFlowSteps: BusinessFlowStep[] = []
  private functionalFlowSteps: FunctionalFlowStep[] = []
  private questionMappings: FlowQuestionMapping[] = []

  constructor(answers: Answer[], judgments: Judgment[], programs: Program[]) {
    this.answers = answers
    this.judgments = judgments
    this.programs = programs
  }

  async loadMasterData(): Promise<void> {
    try {
      const [procRes, connRes, bizRes, ffRes, qmRes] = await Promise.all([
        businessProcessFlowStepsApi.getAll(),
        businessProcessFlowConnectionsApi.getAll(),
        businessFlowStepsApi.getAll(),
        functionalFlowStepsApi.getAll(),
        flowQuestionMappingsApi.getAll(),
      ])

      this.processes = procRes.data
      this.connections = connRes.data
      this.businessFlowSteps = bizRes.data
      this.functionalFlowSteps = ffRes.data
      this.questionMappings = qmRes.data

      console.log('✅ 業務プロセスフロー(第1階層) マスタ読み込み完了', {
        processes: this.processes.length,
        connections: this.connections.length,
        businessFlowSteps: this.businessFlowSteps.length,
        functionalFlowSteps: this.functionalFlowSteps.length,
      })
    } catch (error) {
      console.error('❌ 業務プロセスフローマスタの読み込みに失敗:', error)
      throw error
    }
  }

  private getActiveProcessIds(): Set<string> {
    const active = new Set<string>()

    // 1. 質問→機能フロー有効化
    const activeFunctionalStepIds = new Set<string>()
    this.answers.forEach(answer => {
      const matched = this.questionMappings.filter(m =>
        m.businessType === answer.businessType &&
        m.questionNo === answer.questionNo &&
        m.answerCondition === answer.answerValue &&
        m.isActive &&
        (m.flowType === 'functional' || m.flowType === 'business')
      )
      matched.forEach(m => activeFunctionalStepIds.add(m.flowStepId))
    })

    this.judgments.forEach(j => {
      if (j.isUsed) {
        this.functionalFlowSteps
          .filter(s => s.stepId === j.businessType)
          .forEach(s => activeFunctionalStepIds.add(s.stepId))
      }
    })

    // 2. 機能フロー → 業務フロー → 業務プロセス へ伝播
    const activeBusinessFlowIds = new Set<string>()
    this.functionalFlowSteps.forEach(ff => {
      if (activeFunctionalStepIds.has(ff.stepId) && ff.businessFlowStepId) {
        activeBusinessFlowIds.add(ff.businessFlowStepId)
      }
    })

    this.businessFlowSteps.forEach(bs => {
      if (activeBusinessFlowIds.has(bs.stepId) && bs.businessProcessStepId) {
        active.add(bs.businessProcessStepId)
      }
    })

    return active
  }

  private sanitizeId(s: string): string {
    if (!s) return ''
    return s.replace(/[^a-zA-Z0-9_]/g, '_')
  }

  private escapeMermaidLabel(s: string | null | undefined): string {
    if (!s) return ''
    return s
      .replace(/"/g, "'")
      .replace(/\(/g, '(')
      .replace(/\)/g, ')')
      .replace(/\[/g, '[')
      .replace(/\]/g, ']')
      .replace(/\{/g, '{')
      .replace(/\}/g, '}')
      .replace(/\|/g, '|')
      .replace(/</g, '<')
      .replace(/>/g, '>')
  }

  private getCategoryClass(category: string, isActive: boolean): string {
    if (!isActive) return 'inactive'
    const map: Record<string, string> = {
      '販売':     'sales',
      '請求売掛': 'receivable',
      '購買':     'purchase',
      '支払買掛': 'payable',
      '在庫':     'inventory',
      '製造':     'manufacturing',
      '原価':     'cost',
      '管理':     'management',
      '物流OP':   'logistics_op',
    }
    return map[category] ?? 'standard'
  }

  generateBusinessProcessFlow(): string {
    const lines: string[] = ['flowchart LR']
    lines.push('')

    const activeIds = this.getActiveProcessIds()

    const sortedProcesses = [...this.processes]
      .filter(p => p.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)

    const byCategory = new Map<string, BusinessProcessFlowStep[]>()
    sortedProcesses.forEach(p => {
      const arr = byCategory.get(p.category) ?? []
      arr.push(p)
      byCategory.set(p.category, arr)
    })

    byCategory.forEach((steps, category) => {
      const safeCat = this.sanitizeId(category)
      lines.push(`  %% カテゴリ: ${category}`)
      lines.push(`  subgraph cat_${safeCat}["${this.escapeMermaidLabel(category)}"]`)
      lines.push(`    direction TB`)
      steps.forEach(p => {
        const safeId = this.sanitizeId(p.stepId)
        const label = this.escapeMermaidLabel(p.stepName)
        lines.push(`    ${safeId}["${label}"]`)
      })
      lines.push(`  end`)
      lines.push('')
    })

    lines.push(`  %% プロセス間接続`)
    this.connections
      .filter(c => c.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(c => {
        const fromId = this.sanitizeId(c.fromStepId)
        const toId = this.sanitizeId(c.toStepId)
        const arrow = c.connectionType === 'dotted' ? '-..->' : '-->'
        const labelPart = c.conditionLabel
          ? `|"${this.escapeMermaidLabel(c.conditionLabel)}"|`
          : ''
        lines.push(`  ${fromId} ${arrow}${labelPart} ${toId}`)
      })
    lines.push('')

    lines.push(`  %% スタイル定義`)
    lines.push(`  classDef sales         fill:#dbeafe,stroke:#2563eb,stroke-width:1.5px,color:#1e3a8a`)
    lines.push(`  classDef receivable    fill:#fce7f3,stroke:#db2777,stroke-width:1.5px,color:#831843`)
    lines.push(`  classDef purchase      fill:#fef3c7,stroke:#d97706,stroke-width:1.5px,color:#78350f`)
    lines.push(`  classDef payable       fill:#fed7aa,stroke:#ea580c,stroke-width:1.5px,color:#9a3412`)
    lines.push(`  classDef inventory     fill:#d1fae5,stroke:#059669,stroke-width:1.5px,color:#064e3b`)
    lines.push(`  classDef manufacturing fill:#e0e7ff,stroke:#4f46e5,stroke-width:1.5px,color:#312e81`)
    lines.push(`  classDef cost          fill:#fae8ff,stroke:#a21caf,stroke-width:1.5px,color:#581c87`)
    lines.push(`  classDef management    fill:#e5e7eb,stroke:#4b5563,stroke-width:1.5px,color:#1f2937`)
    lines.push(`  classDef logistics_op  fill:#fef9c3,stroke:#ca8a04,stroke-width:2px,color:#713f12,stroke-dasharray:4 2`)
    lines.push(`  classDef inactive      fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#6b7280,stroke-dasharray:4 2`)
    lines.push(`  classDef standard      fill:#e5e7eb,stroke:#4b5563,stroke-width:1.5px,color:#1f2937`)
    lines.push('')

    sortedProcesses.forEach(p => {
      const safeId = this.sanitizeId(p.stepId)
      const isActive = activeIds.size === 0 || activeIds.has(p.stepId)
      const cls = this.getCategoryClass(p.category, isActive)
      lines.push(`  class ${safeId} ${cls}`)
    })

    return lines.join('\n')
  }

  generateTextFlow(): string {
    const activeIds = this.getActiveProcessIds()
    let text = '【実行される業務プロセスフロー（俯瞰）】\n\n'

    const byCategory = new Map<string, BusinessProcessFlowStep[]>()
    this.processes
      .filter(p => p.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(p => {
        const arr = byCategory.get(p.category) ?? []
        arr.push(p)
        byCategory.set(p.category, arr)
      })

    byCategory.forEach((processes, category) => {
      const activeProcesses = processes.filter(p => activeIds.size === 0 || activeIds.has(p.stepId))
      if (activeProcesses.length === 0) return
      text += `■ ${category}\n`
      activeProcesses.forEach(p => {
        text += `  - ${p.stepName}: ${p.description ?? ''}\n`
      })
      text += '\n'
    })

    return text
  }
}
