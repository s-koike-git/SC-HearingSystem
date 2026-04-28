import type {
  Answer,
  Judgment,
  Program,
  BusinessFlowStep,
  FlowConnection,
  FlowQuestionMapping,
  FunctionalFlowStep,
  BusinessProcessFlowStep
} from './api'

import {
  businessFlowStepsApi,
  flowConnectionsApi,
  flowQuestionMappingsApi,
  functionalFlowStepsApi,
  businessProcessFlowStepsApi,
} from './api'

/**
 * 業務フロー(第2階層) Mermaid 生成エンジン
 * 業務処理単位 (約80件) で表示
 */
export class BusinessFlowGenerator {
  private answers: Answer[]
  private judgments: Judgment[]
  private programs: Program[]

  private businessFlowSteps: BusinessFlowStep[] = []
  private flowConnections: FlowConnection[] = []
  private questionMappings: FlowQuestionMapping[] = []
  private functionalFlowSteps: FunctionalFlowStep[] = []
  private businessProcesses: BusinessProcessFlowStep[] = []

  constructor(answers: Answer[], judgments: Judgment[], programs: Program[]) {
    this.answers = answers
    this.judgments = judgments
    this.programs = programs
  }

  async loadMasterData(): Promise<void> {
    try {
      const [bfRes, fcRes, qmRes, ffRes, bpRes] = await Promise.all([
        businessFlowStepsApi.getAll(),
        flowConnectionsApi.getAll('business'),
        flowQuestionMappingsApi.getAll(),
        functionalFlowStepsApi.getAll(),
        businessProcessFlowStepsApi.getAll(),
      ])

      this.businessFlowSteps = bfRes.data
      this.flowConnections = fcRes.data
      this.questionMappings = qmRes.data
      this.functionalFlowSteps = ffRes.data
      this.businessProcesses = bpRes.data

      console.log('✅ 業務フロー(第2階層) マスタデータ読み込み完了', {
        businessFlowSteps: this.businessFlowSteps.length,
        connections: this.flowConnections.length,
        questionMappings: this.questionMappings.length,
        functionalFlowSteps: this.functionalFlowSteps.length,
        businessProcesses: this.businessProcesses.length,
      })
    } catch (error) {
      console.error('❌ マスタデータの読み込みに失敗:', error)
      throw error
    }
  }

  /**
   * 実行される業務処理(第2階層 StepId)を判定
   * 質問→機能フロー(第3階層)→業務フロー(第2階層)の順に伝播
   */
  private getActiveBusinessFlowStepIds(): Set<string> {
    const active = new Set<string>()

    // 1. 質問回答 → 機能フロー(StepIdベース)を有効化
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

    // 2. Judgment(プログラム判定) → 機能フローを有効化
    this.judgments.forEach(j => {
      if (j.isUsed) {
        // BusinessTypeに該当する機能フローを有効化
        this.functionalFlowSteps
          .filter(s => s.stepId === j.businessType)
          .forEach(s => activeFunctionalStepIds.add(s.stepId))
      }
    })

    // 3. 機能フロー(第3階層) → 業務フロー(第2階層) に伝播
    this.functionalFlowSteps.forEach(ff => {
      if (activeFunctionalStepIds.has(ff.stepId) && ff.businessFlowStepId) {
        active.add(ff.businessFlowStepId)
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

  /**
   * 業務フロー(第2階層) Mermaid生成
   */
  generateBusinessFlow(): string {
    const lines: string[] = ['flowchart LR']
    lines.push('')

    const activeIds = this.getActiveBusinessFlowStepIds()

    // 業務プロセスごとにグループ化
    const byProcess = new Map<string, BusinessFlowStep[]>()
    this.businessFlowSteps
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(s => {
        const key = s.businessProcessStepId ?? '_misc'
        const arr = byProcess.get(key) ?? []
        arr.push(s)
        byProcess.set(key, arr)
      })

    // ----- 業務プロセスごとに subgraph を作る -----
    byProcess.forEach((steps, processId) => {
      if (steps.length === 0) return
      const safeProc = this.sanitizeId(processId)
      const label = processId === '_misc' ? '未分類' : processId
      lines.push(`  %% 業務プロセス: ${label}`)
      lines.push(`  subgraph proc_${safeProc}["${this.escapeMermaidLabel(label)}"]`)
      lines.push(`    direction TB`)

      steps.forEach(s => {
        const safeId = this.sanitizeId(s.stepId)
        const lbl = this.escapeMermaidLabel(s.stepName)
        lines.push(`    ${safeId}["${lbl}"]`)
      })

      lines.push(`  end`)
      lines.push('')
    })

    // ----- 接続定義 -----
    lines.push(`  %% 業務処理間の接続`)
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

    // ----- スタイル定義 -----
    lines.push(`  %% スタイル`)
    lines.push(`  classDef active   fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#ffffff`)
    lines.push(`  classDef inactive fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#6b7280,stroke-dasharray:4 2`)
    lines.push('')

    // ノードクラス割り当て
    this.businessFlowSteps.forEach(s => {
      if (!s.isActive) return
      const safeId = this.sanitizeId(s.stepId)
      const isActive = activeIds.size === 0 || activeIds.has(s.stepId)
      lines.push(`  class ${safeId} ${isActive ? 'active' : 'inactive'}`)
    })

    return lines.join('\n')
  }

  /**
   * テキストフロー出力
   */
  generateTextFlow(): string {
    const activeIds = this.getActiveBusinessFlowStepIds()
    let text = '【実行される業務フロー（業務処理単位）】\n\n'

    const byProcess = new Map<string, BusinessFlowStep[]>()
    this.businessFlowSteps
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(s => {
        const key = s.businessProcessStepId ?? '_misc'
        const arr = byProcess.get(key) ?? []
        arr.push(s)
        byProcess.set(key, arr)
      })

    byProcess.forEach((steps, processId) => {
      const activeSteps = steps.filter(s => activeIds.size === 0 || activeIds.has(s.stepId))
      if (activeSteps.length === 0) return
      text += `■ ${processId === '_misc' ? '未分類' : processId}\n`
      activeSteps.forEach(s => {
        text += `  - ${s.stepName}\n`
      })
      text += '\n'
    })

    return text
  }
}
