import type {
  Answer,
  Judgment,
  Program,
  FunctionalFlowStep,
  FlowConnection,
  FlowQuestionMapping
} from './api'

import {
  functionalFlowStepsApi,
  flowConnectionsApi,
  flowQuestionMappingsApi,
} from './api'

/**
 * 機能フロー(第3階層) Mermaid 生成エンジン (NEW)
 *
 * 機能フロー = 旧業務フロー の中身 (180ノード)
 * 処理機能単位、実装者・カスタマイズ検討者向け
 */
export class FunctionalFlowGenerator {
  private answers: Answer[]
  private judgments: Judgment[]
  private programs: Program[]

  private functionalFlowSteps: FunctionalFlowStep[] = []
  private flowConnections: FlowConnection[] = []
  private questionMappings: FlowQuestionMapping[] = []

  constructor(answers: Answer[], judgments: Judgment[], programs: Program[]) {
    this.answers = answers
    this.judgments = judgments
    this.programs = programs
  }

  async loadMasterData(): Promise<void> {
    try {
      const [ffRes, fcRes, qmRes] = await Promise.all([
        functionalFlowStepsApi.getAll(),
        flowConnectionsApi.getAll('functional'),
        flowQuestionMappingsApi.getAll(),
      ])

      this.functionalFlowSteps = ffRes.data
      this.flowConnections = fcRes.data
      this.questionMappings = qmRes.data

      console.log('✅ 機能フロー(第3階層) マスタデータ読み込み完了', {
        functionalFlowSteps: this.functionalFlowSteps.length,
        connections: this.flowConnections.length,
        questionMappings: this.questionMappings.length,
      })
    } catch (error) {
      console.error('❌ マスタデータの読み込みに失敗:', error)
      throw error
    }
  }

  private getActiveStepIds(): Set<string> {
    const active = new Set<string>()

    this.answers.forEach(answer => {
      const matched = this.questionMappings.filter(m =>
        m.businessType === answer.businessType &&
        m.questionNo === answer.questionNo &&
        m.answerCondition === answer.answerValue &&
        m.isActive &&
        m.flowType === 'functional'
      )
      matched.forEach(m => active.add(m.flowStepId))
    })

    this.judgments.forEach(j => {
      if (j.isUsed) {
        this.functionalFlowSteps
          .filter(s => s.stepId === j.businessType)
          .forEach(s => active.add(s.stepId))
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

  generateFunctionalFlow(): string {
    const lines: string[] = ['flowchart LR']
    lines.push('')

    const activeIds = this.getActiveStepIds()

    // StepIdごとにサブグラフでグループ化
    const byStep = new Map<string, FunctionalFlowStep[]>()
    this.functionalFlowSteps
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(s => {
        const arr = byStep.get(s.stepId) ?? []
        arr.push(s)
        byStep.set(s.stepId, arr)
      })

    byStep.forEach((nodes, stepId) => {
      const safeStep = this.sanitizeId(stepId)
      const stepName = nodes[0]?.stepName ?? stepId
      lines.push(`  subgraph step_${safeStep}["${this.escapeMermaidLabel(stepName)}"]`)
      lines.push(`    direction TB`)
      nodes.forEach(n => {
        const safeNodeId = this.sanitizeId(n.nodeId)
        const lbl = this.escapeMermaidLabel(n.nodeLabel)
        lines.push(`    ${safeNodeId}["${lbl}"]`)
      })
      lines.push(`  end`)
      lines.push('')
    })

    // 接続
    lines.push(`  %% 接続`)
    this.flowConnections
      .filter(c => c.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(c => {
        const fromId = this.sanitizeId(c.fromNodeId)
        const toId = this.sanitizeId(c.toNodeId)
        const arrow = c.connectionType === 'dotted' ? '-..->' : '-->'
        const labelPart = c.conditionLabel ? `|"${this.escapeMermaidLabel(c.conditionLabel)}"|` : ''
        lines.push(`  ${fromId} ${arrow}${labelPart} ${toId}`)
      })
    lines.push('')

    // スタイル
    lines.push(`  classDef active   fill:#10b981,stroke:#047857,stroke-width:2px,color:#ffffff`)
    lines.push(`  classDef inactive fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#6b7280,stroke-dasharray:4 2`)
    lines.push('')

    this.functionalFlowSteps.forEach(s => {
      if (!s.isActive) return
      const safeNodeId = this.sanitizeId(s.nodeId)
      const isActive = activeIds.size === 0 || activeIds.has(s.stepId)
      lines.push(`  class ${safeNodeId} ${isActive ? 'active' : 'inactive'}`)
    })

    return lines.join('\n')
  }

  generateTextFlow(): string {
    const activeIds = this.getActiveStepIds()
    let text = '【実行される機能フロー（処理機能単位）】\n\n'

    const byStep = new Map<string, FunctionalFlowStep[]>()
    this.functionalFlowSteps
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(s => {
        const arr = byStep.get(s.stepId) ?? []
        arr.push(s)
        byStep.set(s.stepId, arr)
      })

    byStep.forEach((nodes, stepId) => {
      const activeNodes = nodes.filter(s => activeIds.size === 0 || activeIds.has(s.stepId))
      if (activeNodes.length === 0) return
      text += `■ ${stepId}\n`
      activeNodes.forEach(n => {
        text += `  - ${n.nodeLabel}\n`
      })
      text += '\n'
    })

    return text
  }
}
