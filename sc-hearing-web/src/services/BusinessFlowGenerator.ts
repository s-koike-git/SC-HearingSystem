import type { 
  Answer, 
  Judgment, 
  Program, 
  BusinessFlowStep,
  FlowQuestionMapping,
  FlowConnection 
} from './api';

import { 
  businessFlowStepsApi, 
  flowQuestionMappingsApi, 
  flowConnectionsApi 
} from './api';

export class BusinessFlowGenerator {
  private answers: Answer[];
  private judgments: Judgment[];
  private programs: Program[];
  
  // マスタデータ
  private businessFlowSteps: BusinessFlowStep[] = [];
  private questionMappings: FlowQuestionMapping[] = [];
  private flowConnections: FlowConnection[] = [];

  constructor(
    answers: Answer[],
    judgments: Judgment[],
    programs: Program[]
  ) {
    this.answers = answers;
    this.judgments = judgments;
    this.programs = programs;
  }

  /**
   * マスタデータをロード（初期化時に呼び出す）
   */
  async loadMasterData(): Promise<void> {
    try {
      // 並列で全マスタを取得
      const [stepsResponse, mappingsResponse, connectionsResponse] = await Promise.all([
        businessFlowStepsApi.getAll(),
        flowQuestionMappingsApi.getAll(),
        flowConnectionsApi.getAll()
      ]);

      this.businessFlowSteps = stepsResponse.data;
      this.questionMappings = mappingsResponse.data;
      this.flowConnections = connectionsResponse.data;
      
      console.log('✅ マスタデータ読み込み完了', {
        steps: this.businessFlowSteps.length,
        mappings: this.questionMappings.length,
        connections: this.flowConnections.length
      });
    } catch (error) {
      console.error('❌ マスタデータの読み込みに失敗:', error);
      throw error;
    }
  }

  /**
   * 実行された工程IDを判定（マスタベース）
   */
  private getActiveStepIds(): Set<string> {
    const active = new Set<string>();

    this.answers.forEach(answer => {
      // 質問マッピングから該当する工程を取得
      const matchedMappings = this.questionMappings.filter(m =>
        m.businessType === answer.businessType &&
        m.questionNo === answer.questionNo &&
        m.answerCondition === answer.answerValue &&
        m.isActive &&
        m.flowType === 'business'
      );

      matchedMappings.forEach(mapping => {
        active.add(mapping.flowStepId);
      });
    });

    // Judgmentからも工程を追加（既存ロジック互換性）
    this.judgments.forEach(j => {
      const isEnabled =
        j.isUsed || 
        j.answer === '○' ||
        j.answer === 'はい' ||
        j.answer === '使用している';

      if (isEnabled) {
        active.add(j.businessType);
      }
    });

    return active;
  }

  /**
   * StepIdに属するノードIDリストを取得
   */
  private getStepNodes(stepId: string): string[] {
    return this.businessFlowSteps
      .filter(step => step.stepId === stepId && step.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(step => step.nodeId);
  }

  /**
   * すべてのユニークなノードIDを取得
   */
  private getAllNodes(): string[] {
    return this.businessFlowSteps
      .filter(step => step.isActive)
      .map(step => step.nodeId)
      .filter((nodeId, index, self) => self.indexOf(nodeId) === index);
  }

  /**
   * 物流OPが導入されているか判定
   */
  private hasLogisticsOP(): boolean {
    return this.judgments.some(j =>
      j.isCustom &&
      (j.businessType === '出荷' ||
       j.businessType === '入荷' ||
       j.businessType === '移動' ||
       j.businessType.includes('物流OP'))
    );
  }

  /**
   * 業務フロー生成（マスタベース）
   */
  generateBusinessFlow(): string {
    let flow = 'flowchart LR\n';

    // ==========================================
    // ノード定義（マスタから動的生成）
    // ==========================================
    const groupedByStep = new Map<string, BusinessFlowStep[]>();
    this.businessFlowSteps
      .filter(step => step.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(step => {
        if (!groupedByStep.has(step.stepId)) {
          groupedByStep.set(step.stepId, []);
        }
        groupedByStep.get(step.stepId)!.push(step);
      });

    // 工程ごとにコメント付きでノードを出力
    groupedByStep.forEach((steps, stepId) => {
      flow += `  %% =====================================================\n`;
      flow += `  %% ${stepId}\n`;
      flow += `  %% =====================================================\n`;
      
      steps.forEach(step => {
        const styleClass = step.mermaidStyle || 'step';
        flow += `  ${step.nodeId}["${step.nodeLabel}"]:::${styleClass}\n`;
      });
      flow += '\n';
    });

    // ==========================================
    // 接続定義（マスタから動的生成）
    // ==========================================
    flow += `  %% =====================================================\n`;
    flow += `  %% フロー接続\n`;
    flow += `  %% =====================================================\n`;
    
    this.flowConnections
      .filter(conn => conn.isActive)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .forEach(conn => {
        let arrow = '-->';
        if (conn.connectionType === 'dotted') {
          arrow = '-.->';
        } else if (conn.connectionType === 'conditional') {
          arrow = '-->';  // conditional も矢印あり
        }

        // Mermaid のエッジラベルは |ラベル| で囲む必要がある
        // 例: A -->|条件| B  / A -.->|参照| B
        const label = conn.conditionLabel ? `|${conn.conditionLabel}|` : '';
        flow += `  ${conn.fromNodeId} ${arrow}${label} ${conn.toNodeId}\n`;
      });

    flow += '\n';

    // ==========================================
    // スタイル定義
    // ==========================================
    flow += `  %% =====================================================\n`;
    flow += `  %% スタイル定義\n`;
    flow += `  %% =====================================================\n`;
    flow += `  classDef active fill:#c8e6c9,stroke:#2e7d32,stroke-width:3px;\n`;
    flow += `  classDef inactive fill:#eeeeee,stroke:#bdbdbd,stroke-width:1px,stroke-dasharray: 4 2;\n`;
    flow += `  classDef custom fill:#fff3cd,stroke:#f39c12,stroke-width:3px;\n`;
    flow += `  classDef logistics_op fill:#e1f5fe,stroke:#0288d1,stroke-width:3px;\n`;
    
    // マスタに定義された独自スタイルも追加
    const uniqueStyles = new Set(
      this.businessFlowSteps
        .filter(step => step.mermaidStyle)
        .map(step => step.mermaidStyle!)
    );
    
    uniqueStyles.forEach(styleClass => {
      if (!['active', 'inactive', 'custom', 'logistics_op'].includes(styleClass)) {
        flow += `  classDef ${styleClass} fill:#e8f0fe,stroke:#90caf9,stroke-width:1px;\n`;
      }
    });

    flow += '\n';

    // ==========================================
    // 凡例
    // ==========================================
    flow += `  %% =====================================================\n`;
    flow += `  %% 凡例\n`;
    flow += `  %% =====================================================\n`;
    flow += `  LEGEND_ACTIVE["実行される工程"]:::active\n`;
    flow += `  LEGEND_INACTIVE["実行されない工程"]:::inactive\n`;
    flow += `  LEGEND_CUSTOM["🔧 カスタム対応"]:::custom\n`;
    flow += `  LEGEND_OP["🔧 物流OP"]:::logistics_op\n`;
    flow += '\n';

    // ==========================================
    // 判定結果をフロー状態に反映
    // ==========================================
    const activeStepIds = this.getActiveStepIds();
    const allNodes = this.getAllNodes();

    // ① 全ノードを inactive（灰色）
    allNodes.forEach(nodeId => {
      flow += `  class ${nodeId} inactive\n`;
    });

    // ② 実行された工程のノードだけ active（緑）
    activeStepIds.forEach(stepId => {
      const nodes = this.getStepNodes(stepId);
      nodes.forEach(nodeId => {
        flow += `  class ${nodeId} active\n`;
      });
    });

    // ③ 物流OP の ON / OFF
    const logisticsNodes = ['OP01', 'OP02', 'OP03'];
    if (this.hasLogisticsOP()) {
      logisticsNodes.forEach(id => {
        flow += `  class ${id} active\n`;
      });
    } else {
      logisticsNodes.forEach(id => {
        flow += `  class ${id} inactive\n`;
      });
    }

    return flow;
  }

  /**
   * テキストフロー生成（互換性のため残す）
   */
  generateTextFlow(): string {
    const activeStepIds = this.getActiveStepIds();
    let text = '【実行される業務フロー】\n\n';

    activeStepIds.forEach(stepId => {
      const nodes = this.getStepNodes(stepId);
      const steps = this.businessFlowSteps.filter(s => s.stepId === stepId);
      
      if (steps.length > 0) {
        text += `■ ${steps[0].stepName} (${stepId})\n`;
        nodes.forEach(nodeId => {
          const step = steps.find(s => s.nodeId === nodeId);
          if (step) {
            text += `  - ${step.nodeLabel}\n`;
          }
        });
        text += '\n';
      }
    });

    return text;
  }
}