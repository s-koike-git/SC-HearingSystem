import type {
  Answer,
  Judgment,
  Program,
  SystemFlowStep,
  SystemFlowNode,
  FlowConnection,
  FlowQuestionMapping
} from './api'

import {
  systemFlowStepsApi,
  systemFlowNodesApi,
  flowConnectionsApi,
  flowQuestionMappingsApi
} from './api'

/**
 * システムフロー Mermaid 生成エンジン
 *
 * Phase 1スキーマ対応版:
 * - SystemFlowSteps (サブグラフ枠) + SystemFlowNodes (PRGID/データストア/外部エンティティ) + FlowConnections(system) を読込
 * - L01図に忠実なフローチャート (subgraph・形状区別・接続を再現) を Mermaid 形式で生成
 * - 旧FlowGeneratorの「全ノードを一直線に連結」ロジックは廃止
 */
export class FlowGenerator {
  private answers: Answer[]
  private judgments: Judgment[]
  private programs: Program[]

  // マスタデータ（Phase 1スキーマ）
  private systemFlowSteps: SystemFlowStep[] = []
  private systemFlowNodes: SystemFlowNode[] = []
  private connections: FlowConnection[] = []
  private questionMappings: FlowQuestionMapping[] = []

  constructor(
    answers: Answer[],
    judgments: Judgment[],
    programs: Program[]
  ) {
    this.answers = answers
    this.judgments = judgments
    this.programs = programs
  }

  /**
   * マスタデータをロード
   */
  async loadMasterData(): Promise<void> {
    try {
      const [stepsRes, nodesRes, connsRes, questionsRes] = await Promise.all([
        systemFlowStepsApi.getAll(),
        systemFlowNodesApi.getAll(),
        flowConnectionsApi.getAll('system'),  // システムフロー接続のみ取得
        flowQuestionMappingsApi.getAll()
      ])

      this.systemFlowSteps = stepsRes.data
      this.systemFlowNodes = nodesRes.data
      this.connections = connsRes.data
      this.questionMappings = questionsRes.data

      console.log('✅ システムフローマスタ読み込み完了', {
        steps: this.systemFlowSteps.length,
        nodes: this.systemFlowNodes.length,
        connections: this.connections.length,
        questionMappings: this.questionMappings.length
      })
    } catch (error) {
      console.error('❌ システムフローマスタの読み込みに失敗:', error)
      throw error
    }
  }

  /**
   * 実行されるシステムフローStepIdを判定
   */
  private getActiveStepIds(): Set<string> {
    const active = new Set<string>()

    // 質問マッピングから判定（flowType='system'）
    this.answers.forEach(answer => {
      const matched = this.questionMappings.filter(m =>
        m.businessType === answer.businessType &&
        m.questionNo === answer.questionNo &&
        m.answerCondition === answer.answerValue &&
        m.isActive &&
        m.flowType === 'system'
      )
      matched.forEach(m => active.add(m.flowStepId))
    })

    // Judgment から逆引き（businessType でシステムフロー有効化）
    this.judgments.forEach(j => {
      const isEnabled = j.isUsed
      if (!isEnabled) return
      const sysSteps = this.systemFlowSteps.filter(s =>
        s.businessType === j.businessType ||
        s.businessFlowStepId === j.businessType
      )
      sysSteps.forEach(s => active.add(s.stepId))
    })

    return active
  }

  /**
   * Mermaid用のセーフID変換
   * (英数字とアンダースコア以外を _ に置換)
   */
  private sanitizeId(s: string): string {
    return s.replace(/[^a-zA-Z0-9_]/g, '_')
  }

  /**
   * Mermaidラベル用エスケープ
   * Mermaidパーサーが構文記号として扱う () [] {} | などを安全な文字に置換
   */
  private escapeMermaidLabel(s: string | null | undefined): string {
    if (!s) return ''
    return s
      .replace(/"/g, "'")     // ダブルクォート → シングル
      .replace(/\(/g, '（')   // 半角( → 全角（
      .replace(/\)/g, '）')   // 半角) → 全角）
      .replace(/\[/g, '［')   // 半角[ → 全角［
      .replace(/\]/g, '］')   // 半角] → 全角］
      .replace(/\{/g, '｛')   // 半角{ → 全角｛
      .replace(/\}/g, '｝')   // 半角} → 全角｝
      .replace(/\|/g, '｜')   // 半角| → 全角｜
      .replace(/</g, '＜')    // < は HTML タグと衝突
      .replace(/>/g, '＞')
  }

  /**
   * ノード形状を Mermaid 記法で取得
   * - 外部エンティティ: 平行四辺形 [/.../]
   * - データストア: 円柱 [(...)]
   * - 帳票/問合せ(io): 台形 [/...\]
   * - 判定: ダイヤ {...}
   * - 通常プロセス: 矩形 [...]
   */
  private getNodeShape(node: SystemFlowNode): { open: string; close: string } {
    if (node.sourceType === 'external_entity') return { open: '[/', close: '/]' }
    if (node.sourceType === 'data_store') return { open: '[(', close: ')]' }
    if (node.sourceType === 'decision') return { open: '{', close: '}' }
    if (node.nodeType === 'io') return { open: '[/', close: '\\]' }
    return { open: '[', close: ']' }
  }

  /**
   * ノードのCSSクラス決定
   */
  private getNodeClass(node: SystemFlowNode, isActive: boolean): string {
    const baseStyle = node.mermaidStyle ?? 'standard'

    // 状態による色分け
    if (!isActive) return 'inactive'

    // mermaidStyleによる種類分け
    if (baseStyle.startsWith('new')) return 'new_program'
    if (baseStyle.startsWith('customize')) return 'customize_program'
    if (node.sourceType === 'data_store') return 'data_store'
    if (node.sourceType === 'external_entity') return 'external_entity'
    return 'standard'
  }

  /**
   * システムフロー生成（L01図忠実版）
   */
  generateSystemFlow(): string {
    const lines: string[] = ['flowchart TB']
    lines.push('')

    const activeStepIds = this.getActiveStepIds()

    // ステップを表示順にソート
    const sortedSteps = [...this.systemFlowSteps]
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)

    // ステップごとにノードをグループ化
    const nodesByStep = new Map<string, SystemFlowNode[]>()
    this.systemFlowNodes
      .filter(n => n.isActive !== false)
      .forEach(n => {
        const arr = nodesByStep.get(n.flowStepId) ?? []
        arr.push(n)
        nodesByStep.set(n.flowStepId, arr)
      })

    // ----- subgraph (サブグラフ枠) ごとにノード定義 -----
    sortedSteps.forEach(step => {
      const stepNodes = nodesByStep.get(step.stepId) ?? []
      if (stepNodes.length === 0) return

      const safeStepId = this.sanitizeId(step.stepId)
      const label = step.subgraphLabel ?? step.stepName

      lines.push(`  %% ${step.stepId}`)
      lines.push(`  subgraph ${safeStepId}["${this.escapeMermaidLabel(label)}"]`)
      lines.push(`    direction TB`)

      // ノードをDisplayOrder順に並べる
      const sortedNodes = [...stepNodes].sort((a, b) => a.displayOrder - b.displayOrder)
      sortedNodes.forEach(n => {
        const safeNodeId = this.sanitizeId(n.nodeId)
        const shape = this.getNodeShape(n)
        // ラベルは PRGID + プログラム名 形式（PRGIDの場合）
        let label = n.nodeLabel
        if (n.sourceType === 'program' && n.sourceRef) {
          const program = this.programs.find(p => p.programId === n.sourceRef)
          if (program && program.programName) {
            // PRGID と プログラム名 はそれぞれエスケープ、<br/> は維持
            label = `${this.escapeMermaidLabel(n.sourceRef)}<br/>${this.escapeMermaidLabel(program.programName)}`
          } else {
            label = this.escapeMermaidLabel(label)
          }
        } else {
          label = this.escapeMermaidLabel(label)
        }
        lines.push(`    ${safeNodeId}${shape.open}"${label}"${shape.close}`)
      })

      lines.push(`  end`)
      lines.push('')
    })

    // ----- 接続定義 -----
    lines.push(`  %% フロー接続`)
    this.connections
      .filter(c => c.isActive !== false)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(c => {
        const fromId = this.sanitizeId(c.fromNodeId)
        const toId = this.sanitizeId(c.toNodeId)
        const arrow = c.connectionType === 'dotted' ? '-..->'
                    : c.connectionType === 'conditional' ? '-->'
                    : '-->'
        const labelPart = c.conditionLabel ? `|"${this.escapeMermaidLabel(c.conditionLabel)}"|` : ''
        lines.push(`  ${fromId} ${arrow}${labelPart} ${toId}`)
      })

    lines.push('')

    // ----- スタイル定義 -----
    lines.push(`  %% スタイル定義`)
    lines.push(`  classDef standard fill:#dbeafe,stroke:#3b82f6,stroke-width:1.5px,color:#1e3a8a`)
    lines.push(`  classDef new_program fill:#fed7aa,stroke:#ea580c,stroke-width:2px,color:#9a3412`)
    lines.push(`  classDef customize_program fill:#bbf7d0,stroke:#16a34a,stroke-width:2px,color:#14532d`)
    lines.push(`  classDef data_store fill:#e0e7ff,stroke:#6366f1,stroke-width:1.5px,color:#3730a3`)
    lines.push(`  classDef external_entity fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#78350f`)
    lines.push(`  classDef inactive fill:#f3f4f6,stroke:#9ca3af,stroke-width:1px,color:#6b7280,stroke-dasharray:4 2`)
    lines.push('')

    // ----- 各ノードにクラス割当 -----
    this.systemFlowNodes
      .filter(n => n.isActive !== false)
      .forEach(n => {
        const safeNodeId = this.sanitizeId(n.nodeId)
        const isActive = activeStepIds.size === 0 || activeStepIds.has(n.flowStepId)
        const cls = this.getNodeClass(n, isActive)
        lines.push(`  class ${safeNodeId} ${cls}`)
      })

    return lines.join('\n')
  }

  /**
   * 業務フロー生成（互換性のため残すが、業務フローは BusinessFlowGenerator を使うべき）
   */
  generateBusinessFlow(): string {
    // BusinessFlowGenerator.generateBusinessFlow を使用してください
    let flow = 'flowchart LR\n'
    flow += '  START([開始]) --> END([完了])\n'
    flow += '\n  classDef se fill:#d5f4e6,stroke:#27ae60,stroke-width:3px\n'
    flow += '  class START,END se\n'
    return flow
  }

  /**
   * テキストフロー生成
   */
  generateTextFlow(): string {
    const activeStepIds = this.getActiveStepIds()
    let text = '【実行されるシステムフロー】\n\n'

    const sortedSteps = [...this.systemFlowSteps]
      .filter(s => s.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)

    const nodesByStep = new Map<string, SystemFlowNode[]>()
    this.systemFlowNodes.forEach(n => {
      const arr = nodesByStep.get(n.flowStepId) ?? []
      arr.push(n)
      nodesByStep.set(n.flowStepId, arr)
    })

    sortedSteps.forEach(step => {
      const isActive = activeStepIds.size === 0 || activeStepIds.has(step.stepId)
      if (!isActive) return

      const stepNodes = (nodesByStep.get(step.stepId) ?? [])
        .filter(n => n.sourceType === 'program')
        .sort((a, b) => a.displayOrder - b.displayOrder)

      if (stepNodes.length === 0) return

      text += `■ ${step.stepName} (${step.businessType})\n`
      stepNodes.forEach(n => {
        const program = this.programs.find(p => p.programId === n.sourceRef)
        const programName = program?.programName ?? n.nodeLabel
        text += `  - ${n.sourceRef}: ${programName}\n`
      })
      text += '\n'
    })

    return text
  }
}