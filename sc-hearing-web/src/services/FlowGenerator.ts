import type { 
  Answer, 
  Judgment, 
  Program,
  SystemFlowStep,
  FlowProgramMapping,
  FlowQuestionMapping
} from './api'

import {
  systemFlowStepsApi,
  flowProgramMappingsApi,
  flowQuestionMappingsApi
} from './api'

// システムフロー生成エンジン（マスタベース）
export class FlowGenerator {
  private answers: Answer[]
  private judgments: Judgment[]
  private programs: Program[]
  
  // マスタデータ
  private systemFlowSteps: SystemFlowStep[] = []
  private programMappings: FlowProgramMapping[] = []
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
      const [stepsResponse, programMappingsResponse, questionMappingsResponse] = await Promise.all([
        systemFlowStepsApi.getAll(),
        flowProgramMappingsApi.getAll(),
        flowQuestionMappingsApi.getAll()
      ])

      this.systemFlowSteps = stepsResponse.data
      this.programMappings = programMappingsResponse.data
      this.questionMappings = questionMappingsResponse.data

      console.log('✅ システムフローマスタ読み込み完了', {
        steps: this.systemFlowSteps.length,
        programMappings: this.programMappings.length,
        questionMappings: this.questionMappings.length
      })
    } catch (error) {
      console.error('❌ システムフローマスタの読み込みに失敗:', error)
      throw error
    }
  }

  /**
   * 実行される工程IDを判定
   */
  private getActiveStepIds(): Set<string> {
    const active = new Set<string>()

    this.answers.forEach(answer => {
      const matchedMappings = this.questionMappings.filter(m =>
        m.businessType === answer.businessType &&
        m.questionNo === answer.questionNo &&
        m.answerCondition === answer.answerValue &&
        m.isActive &&
        m.flowType === 'system'
      )

      matchedMappings.forEach(mapping => {
        active.add(mapping.flowStepId)
      })
    })

    // Judgmentからも工程を追加（互換性）
    this.judgments.forEach(j => {
      const isEnabled = j.isUsed || j.answer === '○' || j.answer === 'はい'
      if (isEnabled) {
        const steps = this.systemFlowSteps.filter(s => s.businessType === j.businessType)
        steps.forEach(step => active.add(step.stepId))
      }
    })

    return active
  }

  /**
   * 特定工程で使用するプログラムを取得
   */
  private getProgramsForStep(stepId: string): Program[] {
    const mappings = this.programMappings
      .filter(m => m.flowStepId === stepId && m.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)

    return mappings
      .map(m => this.getProgram(m.programId))
      .filter(p => p !== null) as Program[]
  }

  /**
   * プログラム情報を取得
   */
  private getProgram(programId: string): Program | null {
    return this.programs.find(p => p.programId === programId) || null
  }

  /**
   * 特定の回答を取得（互換性のため残す）
   */
  private getAnswer(businessType: string, questionNo: string): string {
    const answer = this.answers.find(
      a => a.businessType === businessType && a.questionNo === questionNo
    )
    return answer?.answerValue || ''
  }

  /**
   * 特定の業務に回答があるかチェック（互換性のため残す）
   */
  private hasAnswers(businessType: string): boolean {
    return this.answers.some(a => a.businessType === businessType && a.answerValue)
  }

  /**
   * 業務タイプでグループ化
   */
  private groupByBusinessType(): Map<string, SystemFlowStep[]> {
    const grouped = new Map<string, SystemFlowStep[]>()

    this.systemFlowSteps
      .filter(step => step.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(step => {
        if (!grouped.has(step.businessType)) {
          grouped.set(step.businessType, [])
        }
        grouped.get(step.businessType)!.push(step)
      })

    return grouped
  }

  /**
   * システムフロー生成（マスタベース）
   */
  generateSystemFlow(): string {
    let flow = 'graph LR\n'
    
    const activeStepIds = this.getActiveStepIds()
    const businessGroups = this.groupByBusinessType()
    
    let nodeIndex = 0
    const nodeIdMap = new Map<string, string>() // stepId -> nodeId

    businessGroups.forEach((steps, businessType) => {
      // この業務タイプに有効な工程があるか確認
      const hasActiveSteps = steps.some(step => activeStepIds.has(step.stepId))
      if (!hasActiveSteps) return

      // サブグラフ化するか判定
      const isSubgraph = steps.some(step => step.isSubgraph)
      const subgraphLabel = steps.find(step => step.subgraphLabel)?.subgraphLabel || businessType

      if (isSubgraph) {
        const safeBusinessType = businessType.replace(/[^\w]/g, '_')
        flow += `  subgraph ${safeBusinessType}["${subgraphLabel}"]\n`
      }

      steps.forEach(step => {
        if (!activeStepIds.has(step.stepId)) return

        const programs = this.getProgramsForStep(step.stepId)
        
        programs.forEach(program => {
          const nodeId = `N${nodeIndex++}`
          nodeIdMap.set(`${step.stepId}_${program.programId}`, nodeId)

          const prefix = isSubgraph ? '    ' : '  '
          const styleClass = step.businessType === 'カスタム' ? 'customClass' : 'standardClass'
          
          flow += `${prefix}${nodeId}["${program.programId}<br/>${program.programName}"]:::${styleClass}\n`
        })
      })

      if (isSubgraph) {
        flow += '  end\n'
      }
    })

    // 接続線を追加（簡易版：順序で接続）
    const allNodeIds = Array.from(nodeIdMap.values())
    for (let i = 0; i < allNodeIds.length - 1; i++) {
      flow += `  ${allNodeIds[i]} --> ${allNodeIds[i + 1]}\n`
    }

    // スタイル定義
    flow += '\n  classDef standardClass fill:#e3f2fd,stroke:#2196F3,stroke-width:2px\n'
    flow += '  classDef customClass fill:#fff3cd,stroke:#ffc107,stroke-width:3px\n'

    return flow
  }

  /**
   * 業務フロー生成（互換性のため残す - 旧ロジック）
   */
  generateBusinessFlow(): string {
    let flow = 'graph TB\n'
    flow += '  START([開始]) --> START_NODE[業務開始]\n'
    
    let prevNode = 'START_NODE'

    // 既存の簡易的なフロー生成ロジック（省略可）
    // ...

    flow += `  ${prevNode} --> END([完了])\n`

    flow += '\n  classDef processClass fill:#e3f2fd,stroke:#2196F3,stroke-width:2px\n'
    flow += '  classDef startEndClass fill:#d5f4e6,stroke:#27ae60,stroke-width:3px\n'
    flow += '\n  class START,END startEndClass\n'

    return flow
  }

  /**
   * テキストフロー生成
   */
  generateTextFlow(): string {
    const activeStepIds = this.getActiveStepIds()
    let text = '【実行されるシステムフロー】\n\n'
    
    const businessGroups = this.groupByBusinessType()
    
    businessGroups.forEach((steps, businessType) => {
      const activeSteps = steps.filter(step => activeStepIds.has(step.stepId))
      if (activeSteps.length === 0) return

      text += `【${businessType}】\n`

      activeSteps.forEach(step => {
        const programs = this.getProgramsForStep(step.stepId)
        if (programs.length > 0) {
          text += `  ${step.stepName}:\n`
          programs.forEach(prog => {
            text += `    - ${prog.programId}: ${prog.programName}\n`
          })
        }
      })

      text += '\n'
    })

    return text
  }
}