import type { Answer, Judgment, Program, BusinessFlowMapping } from './api';

export class BusinessFlowGenerator {
  private mappings: BusinessFlowMapping[] = [];

  constructor(
    private answers: Answer[],
    private judgments: Judgment[],
    private programs: Program[]
  ) {}

  /**
   * マッピングデータをロード（初期化時に呼び出す）
   */
  async loadMappings(): Promise<void> {
    try {
      const API_BASE = import.meta.env.PROD
        ? '/sc-hearing/api'
        : 'http://localhost:5176';

      const response = await fetch(`${API_BASE}/BusinessFlowMappings`);
      const result = await response.json();
      
      if (result.success) {
        this.mappings = result.data;
      }
    } catch (error) {
      console.error('マッピングデータの読み込みに失敗:', error);
      // エラー時は空配列のまま続行（フォールバック処理）
    }
  }

  /**
   * 実行された工程を判定（マスタベース）
   */
  private getActiveSteps(): Set<string> {
    const active = new Set<string>();

    this.judgments.forEach(j => {
      // ✅ 「実施している」と判断できる回答だけを見る
      const isEnabled =
        j.answer === '○' ||
        j.answer === 'はい' ||
        j.answer === '使用している' ||
        j.answer === '出荷基準' ||
        j.answer === '検収基準';

      if (!isEnabled) return;

      // ✅ マッピングテーブルから業務タイプに対応するStepIdを取得
      const mapping = this.mappings.find(m => m.businessType === j.businessType);
      if (mapping) {
        active.add(mapping.stepId);
      }
    });

    return active;
  }

  /**
   * StepIdに対応するノードIDリストを取得（マスタベース）
   */
  private getStepNodes(stepId: string): string[] {
    return this.mappings
      .filter(m => m.stepId === stepId)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(m => m.nodeId)
      // 重複削除
      .filter((nodeId, index, self) => self.indexOf(nodeId) === index);
  }

  /**
   * すべてのユニークなノードIDを取得（マスタベース）
   */
  private getAllNodes(): string[] {
    return this.mappings
      .map(m => m.nodeId)
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
   * 標準業務フロー（固定）
   */
  generateBusinessFlow(): string {
    let flow = `
flowchart LR
  %% =====================================================
  %% ①〜⑤ 販売 主線
  %% =====================================================
  A01["① 見積依頼／注文受付"]:::estimate
  A02["① 見積登録\n📄見積書"]:::estimate
  A03["① 受注受付（仮伝票）"]:::order
  A04["① 受注計上（本伝票）"]:::order
  A05{"① 在庫引当\n即時／バッチ"}:::allocation

  A06["② 出荷指示"]:::shipping
  A07["② 品揃え（ピッキング）"]:::shipping
  A08["② 仕分・積込み"]:::shipping
  A09["② 出荷確定"]:::shipping

  A10{"③ 売上計上基準\n出荷／検収／みなし"}:::sales
  A11["③ 売上計上"]:::sales

  A12["⑤ 請求締め"]:::billing
  A13["⑤ 請求書発行\n📄請求書"]:::billing
  A14["⑦ 売掛管理"]:::receivable

  A01 --> A02 --> A03 --> A04 --> A05
  A05 -- 引当OK --> A06 --> A07 --> A08 --> A09 --> A10
  A10 --> A11 --> A12 --> A13 --> A14

  %% =====================================================
  %% ⑨〜⑬ 調達 主線
  %% =====================================================
  B01["⑨ 発注数検討"]:::purchase
  B02["⑨ 発注データ作成"]:::purchase
  B03["⑨ 発注計上"]:::purchase
  B04["⑨ 注文書発行\n📄注文書"]:::purchase
  B05["⑩ 入荷"]:::purchase
  B06{"⑩ 検収\nOK／NG"}:::purchase

  B07["⑪ 仕入計上"]:::purchase
  B08["⑫ 支払請求"]:::purchase
  B09["⑬ 買掛管理"]:::purchase

  A05 -- 発注要 --> B01
  B01 --> B02 --> B03 --> B04 --> B05 --> B06
  B06 -- OK --> B07 --> B08 --> B09

  %% =====================================================
  %% ④ 預り在庫（並行）
  %% =====================================================
  C01["④ 預り在庫受注"]:::consignment
  C02["④ 預り出庫"]:::consignment
  C03["④ 預り売上計上"]:::consignment
  C01 --> C02 --> C03

  %% =====================================================
  %% ⑭ 移動
  %% =====================================================
  D01["⑭ 移動依頼"]:::movement
  D02["⑭ 移動出庫"]:::movement
  D03["⑭ 移動入庫"]:::movement
  D01 --> D02 --> D03

  %% =====================================================
  %% ⑮ セット加工
  %% =====================================================
  E01["⑮ セット加工指示"]:::processing
  E02["⑮ 構成品ピッキング"]:::processing
  E03["⑮ 組立／分解"]:::processing
  E04["⑮ 加工計上"]:::processing
  E01 --> E02 --> E03 --> E04

  %% =====================================================
  %% ⑰ 製造
  %% =====================================================
  F01["⑰ 販売計画"]:::manufacturing
  F02["⑰ 生産計画"]:::manufacturing
  F03["⑰ 製造指示"]:::manufacturing
  F04["⑰ 製造実績"]:::manufacturing
  F05["⑰ 完成計上"]:::manufacturing
  F01 --> F02 --> F03 --> F04 --> F05

  %% =====================================================
  %% ⑯ 棚卸
  %% =====================================================
  G01["⑯ 棚卸準備"]:::inventory
  G02["⑯ 実地棚卸"]:::inventory
  G03["⑯ 差異調整"]:::inventory
  G01 --> G02 --> G03

  %% =====================================================
  %% ⑱ 原価・⑲ 原価シミュレーション・⑳ 月次更新
  %% =====================================================
  H01["⑱ 原価計算"]:::cost
  H02["⑲ 原価シミュレーション"]:::cost
  H03["⑳ 月次更新（締め）"]:::closing
  F05 --> H01 --> H03
  H01 -. 参照 .-> H02

  %% =====================================================
  %% ⑥ 得意先状況・⑧ 評価分析（参照）
  %% =====================================================
  R01["⑥ 得意先状況照会"]:::reference
  R02["⑧ 評価分析\n（売上・仕入・在庫）"]:::reference

  %% =====================================================
  %% 物流OP（オプション・標準非置換）
  %% =====================================================
  OP01["🔧 物流OP 出荷検品"]:::logistics_op
  OP02["🔧 物流OP HHT実績"]:::logistics_op
  OP03["🔧 物流OP 実績反映"]:::logistics_op

  OP01 --> OP02 --> OP03
  OP03 -. 実績反映 .-> A09

  %% =====================
  %% スタイル定義
  %% =====================
  classDef step fill:#e8f0fe,stroke:#90caf9,stroke-width:1px;
  classDef active fill:#c8e6c9,stroke:#2e7d32,stroke-width:3px;
  classDef inactive fill:#eeeeee,stroke:#bdbdbd,stroke-width:1px,stroke-dasharray: 4 2;
  classDef custom fill:#fff3cd,stroke:#f39c12,stroke-width:3px;
  %% =====================
  %% スタイル定義（凡例兼用）
  %% =====================
  classDef active fill:#c8e6c9,stroke:#2e7d32,stroke-width:3px;
  classDef inactive fill:#eeeeee,stroke:#bdbdbd,stroke-width:1px,stroke-dasharray: 4 2;
  classDef custom fill:#fff3cd,stroke:#f39c12,stroke-width:3px;
  classDef logistics_op fill:#e1f5fe,stroke:#0288d1,stroke-width:3px;
  %% =====================
  %% 凡例（Legend）
  %% =====================
  LEGEND_ACTIVE["実行される工程"]:::active
  LEGEND_INACTIVE["実行されない工程"]:::inactive
  LEGEND_CUSTOM["🔧 カスタム対応"]:::custom
  LEGEND_OP["🔧 物流OP"]:::logistics_op
  `;

  // =====================================================
  // 判定結果をフロー状態に反映（マスタベース）
  // =====================================================
  const activeSteps = this.getActiveSteps();
  const allNodes = this.getAllNodes();

  // ① まず全ノードを inactive（灰色）
  allNodes.forEach(nodeId => {
    flow += `\nclass ${nodeId} inactive`;
  });

  // ② 実行された工程に属するノードだけ active（緑）
  activeSteps.forEach(stepId => {
    const nodes = this.getStepNodes(stepId);
    nodes.forEach(nodeId => {
      flow += `\nclass ${nodeId} active`;
    });
  });

  // ③ 物流OP の ON / OFF
  const logisticsNodes = ['OP01', 'OP02', 'OP03'];
  if (this.hasLogisticsOP()) {
    logisticsNodes.forEach(id => {
      flow += `\nclass ${id} active`;
    });
  } else {
    logisticsNodes.forEach(id => {
      flow += `\nclass ${id} inactive`;
    });
  }

  // ★ 最後に必ず return
  return flow;
  }

  /**
   * テキストフロー生成（互換性のため残す）
   */
  generateTextFlow(): string {
    const activeSteps = this.getActiveSteps();
    let text = '【実行される業務フロー】\n\n';

    activeSteps.forEach(stepId => {
      const nodes = this.getStepNodes(stepId);
      const businessTypes = this.mappings
        .filter(m => m.stepId === stepId)
        .map(m => m.businessType)
        .filter((type, index, self) => self.indexOf(type) === index)
        .join(', ');

      text += `■ ${businessTypes} (${stepId})\n`;
      nodes.forEach(nodeId => {
        text += `  - ${nodeId}\n`;
      });
      text += '\n';
    });

    return text;
  }
}
