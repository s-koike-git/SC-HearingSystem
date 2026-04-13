import type { Answer, Judgment, Program } from './api'

// フロー生成エンジン
export class FlowGenerator {
  private answers: Answer[]
  private judgments: Judgment[]
  private programs: Program[]

  
  constructor(
    answers: Answer[],
    judgments: Judgment[],
    programs: Program[]
  ) {
    this.answers = answers
    this.judgments = judgments
    this.programs = programs
  }


  // 特定の回答を取得
  private getAnswer(businessType: string, questionNo: string): string {
    const answer = this.answers.find(
      a => a.businessType === businessType && a.questionNo === questionNo
    )
    return answer?.answerValue || ''
  }
  
  
  private getProgram(programId: string) {
    return (
      this.programs.find(p => p.programId === programId) || {
        programId,
        programName: '未登録',
        workHours: 0,
      }
    )
  }


  // 特定の業務に回答があるかチェック
  private hasAnswers(businessType: string): boolean {
    return this.answers.some(a => a.businessType === businessType && a.answerValue)
  }

  // 業務フロー生成（Mermaid記法）
  generateBusinessFlow(): string {
    let flow = 'graph TB\n'
    flow += '  START([開始]) --> START_NODE[業務開始]\n'
    
    let prevNode = 'START_NODE'

    // 1. 見積
    if (this.hasAnswers('見積')) {
      flow += `  ${prevNode} --> ESTIMATE[見積作成]\n`
      
      const estimatePattern = this.getAnswer('見積', 'Q1')
      if (estimatePattern === '○') {
        flow += '  ESTIMATE --> ESTIMATE_PATTERN[見積パターン使用]\n'
        prevNode = 'ESTIMATE_PATTERN'
      } else {
        prevNode = 'ESTIMATE'
      }

      const estimateMethod = this.getAnswer('見積', 'Q3')
      if (estimateMethod === '2') {
        flow += `  ${prevNode} --> PAST_ESTIMATE[過去見積参照]\n`
        prevNode = 'PAST_ESTIMATE'
      } else if (estimateMethod === '3') {
        flow += `  ${prevNode} --> PRODUCT_MASTER[商品マスタ参照]\n`
        prevNode = 'PRODUCT_MASTER'
      }

      const estimatePrint = this.getAnswer('見積', 'Q2')
      if (estimatePrint === '○') {
        flow += `  ${prevNode} --> ESTIMATE_PRINT[見積書発行<br/>社印付き]\n`
        prevNode = 'ESTIMATE_PRINT'
      }

      const toOrder = this.getAnswer('見積', 'Q11')
      if (toOrder === '○') {
        flow += `  ${prevNode} --> ESTIMATE_TO_ORDER[見積→受注変換]\n`
        prevNode = 'ESTIMATE_TO_ORDER'
      }
    }

    // 2. 受注
    if (this.hasAnswers('受注')) {
      flow += `  ${prevNode} --> ORDER[受注登録]\n`
      prevNode = 'ORDER'

      const orderType = this.getAnswer('受注', 'Q1')
      if (orderType === '2') {
        flow += '  ORDER --> DIRECT_SHIP[直送処理]\n'
        flow += '  DIRECT_SHIP --> ORDER_COMPLETE[受注完了]\n'
        prevNode = 'ORDER_COMPLETE'
      } else if (orderType === '3') {
        flow += '  ORDER --> ORDER_PURCHASE[受発注同時処理]\n'
        prevNode = 'ORDER_PURCHASE'
      }

      const stockCheck = this.getAnswer('受注', 'Q4')
      if (stockCheck === '○') {
        flow += `  ${prevNode} --> STOCK_CHECK[在庫確認]\n`
        prevNode = 'STOCK_CHECK'
      }

      const allocation = this.getAnswer('受注', 'Q5')
      if (allocation === '○') {
        flow += `  ${prevNode} --> ALLOCATE[在庫引当]\n`
        prevNode = 'ALLOCATE'
      }
    }

    // 3. 引当
    if (this.hasAnswers('引当')) {
      const batchAllocate = this.getAnswer('引当', 'Q1')
      if (batchAllocate === '○') {
        flow += `  ${prevNode} --> BATCH_ALLOCATE[バッチ引当処理]\n`
        prevNode = 'BATCH_ALLOCATE'
      }
    }

    // 4. 出荷準備
    if (this.hasAnswers('出荷準備')) {
      flow += `  ${prevNode} --> SHIP_PREP[出荷準備]\n`
      
      const pickingMethod = this.getAnswer('出荷準備', 'Q1')
      if (pickingMethod === '1') {
        flow += '  SHIP_PREP --> TOTAL_PICK[トータルピッキング]\n'
        prevNode = 'TOTAL_PICK'
      } else if (pickingMethod === '2') {
        flow += '  SHIP_PREP --> SINGLE_PICK[シングルピッキング]\n'
        prevNode = 'SINGLE_PICK'
      } else {
        prevNode = 'SHIP_PREP'
      }

      const packing = this.getAnswer('出荷準備', 'Q4')
      if (packing === '○') {
        flow += `  ${prevNode} --> PACKING[梱包作業]\n`
        prevNode = 'PACKING'
      }
    }

    // 5. 出荷
    if (this.hasAnswers('出荷')) {
      flow += `  ${prevNode} --> SHIPPING[出荷処理]\n`
      
      const deliveryNote = this.getAnswer('出荷', 'Q3')
      if (deliveryNote === '○') {
        flow += '  SHIPPING --> DELIVERY_NOTE[納品書発行]\n'
        prevNode = 'DELIVERY_NOTE'
      } else {
        prevNode = 'SHIPPING'
      }

      const shippingLabel = this.getAnswer('出荷', 'Q4')
      if (shippingLabel === '○') {
        flow += `  ${prevNode} --> SHIP_LABEL[送り状発行]\n`
        prevNode = 'SHIP_LABEL'
      }
    }

    // 6. 売上
    if (this.hasAnswers('売上')) {
      flow += `  ${prevNode} --> SALES[売上計上]\n`
      prevNode = 'SALES'
    }

    // 7. 返品（分岐処理）
    if (this.hasAnswers('返品')) {
      flow += `  ${prevNode} --> SALES_CHECK{返品発生?}\n`
      flow += '  SALES_CHECK -->|なし| NEXT_BILLING[請求処理へ]\n'
      flow += '  SALES_CHECK -->|あり| RETURN[返品処理]\n'
      
      const returnType = this.getAnswer('返品', 'Q1')
      if (returnType === '1') {
        flow += '  RETURN --> SALES_RETURN[販売返品処理]\n'
        flow += '  SALES_RETURN --> NEXT_BILLING\n'
      } else if (returnType === '2') {
        flow += '  RETURN --> PURCHASE_RETURN[購買返品処理]\n'
        flow += '  PURCHASE_RETURN --> NEXT_BILLING\n'
      }
      prevNode = 'NEXT_BILLING'
    }

    // 8. 請求
    if (this.hasAnswers('請求')) {
      flow += `  ${prevNode} --> BILLING[請求締め処理]\n`
      
      const invoiceType = this.getAnswer('請求', 'Q2')
      if (invoiceType === '1') {
        flow += '  BILLING --> TOTAL_INVOICE[合計請求書発行]\n'
        prevNode = 'TOTAL_INVOICE'
      } else if (invoiceType === '2') {
        flow += '  BILLING --> SLIP_INVOICE[伝票請求書発行]\n'
        prevNode = 'SLIP_INVOICE'
      } else {
        prevNode = 'BILLING'
      }
    }

    // 9. 売掛
    if (this.hasAnswers('売掛')) {
      flow += `  ${prevNode} --> RECEIVABLE[売掛管理]\n`
      
      const payment = this.getAnswer('売掛', 'Q1')
      if (payment === '○') {
        flow += '  RECEIVABLE --> PAYMENT[入金計上]\n'
        prevNode = 'PAYMENT'
      } else {
        prevNode = 'RECEIVABLE'
      }

      const clearing = this.getAnswer('売掛', 'Q2')
      if (clearing === '○') {
        flow += `  ${prevNode} --> CLEARING[入金消込]\n`
        prevNode = 'CLEARING'
      }
    }

    // 10. 発注（並行処理）
    if (this.hasAnswers('発注')) {
      flow += '  ORDER --> PURCHASE_ORDER[発注処理]\n'
      
      const purchaseType = this.getAnswer('発注', 'Q1')
      if (purchaseType === '2') {
        flow += '  PURCHASE_ORDER --> ORDER_RECEIVE[受発注処理]\n'
      } else if (purchaseType === '3') {
        flow += '  PURCHASE_ORDER --> DIRECT_PURCHASE[直送発注]\n'
      }
    }

    // 11. 入荷
    if (this.hasAnswers('入荷')) {
      flow += '  PURCHASE_ORDER --> RECEIVING[入荷処理]\n'
    }

    // 12. 仕入
    if (this.hasAnswers('仕入')) {
      flow += '  RECEIVING --> PURCHASE[仕入計上]\n'
    }

    // 終了
    flow += `  ${prevNode} --> END([完了])\n`

    // スタイル定義
    flow += '\n  classDef processClass fill:#e3f2fd,stroke:#2196F3,stroke-width:2px\n'
    flow += '  classDef decisionClass fill:#fff3cd,stroke:#ffc107,stroke-width:2px\n'
    flow += '  classDef startEndClass fill:#d5f4e6,stroke:#27ae60,stroke-width:3px\n'
    flow += '\n  class START,END startEndClass\n'
    flow += '  class SALES_CHECK decisionClass\n'

    return flow
  }

  // システムフロー生成（プログラム間の流れ）
  generateSystemFlow(): string {
    let flow = 'graph LR\n'
    
    // 判定結果をビジネスタイプごとにグループ化
    const businessGroups = new Map<string, Judgment[]>()
    this.judgments.forEach(j => {
      if (!businessGroups.has(j.businessType)) {
        businessGroups.set(j.businessType, [])
      }
      businessGroups.get(j.businessType)!.push(j)
    })

    let nodeIndex = 0
    const businessOrder = ['見積', '受注', '引当', '出荷準備', '出荷', '売上', '返品', '請求', '売掛', '発注', '入荷', '仕入']
    
    businessOrder.forEach((businessType, idx) => {
      const programs = businessGroups.get(businessType)
      if (!programs || programs.length === 0) return

      const safeBusinessType = businessType.replace(/[^\w]/g, '_')
      
      // サブグラフで業務をグループ化
      flow += `  subgraph ${safeBusinessType}["${businessType}"]\n`
      
      
      programs.forEach(judgment => {
        judgment.programIds.forEach(programId => {
          const prog = this.getProgram(programId)
          const nodeId = `N${nodeIndex++}`

          flow += `    ${nodeId}["${prog.programId}<br/>${prog.programName}"]\n`

          if (nodeIndex > 1) {
            const prevNodeId = `N${nodeIndex - 2}`
            flow += `    ${prevNodeId} --> ${nodeId}\n`
          }
        })
      })

      
      flow += '  end\n'

      // 次の業務へつなぐ
      if (idx < businessOrder.length - 1) {
        const nextBusiness = businessOrder[idx + 1]
        if (businessGroups.has(nextBusiness)) {
          const currentLastNode = `N${nodeIndex - 1}`
          const nextFirstNode = `N${nodeIndex}`
          flow += `  ${currentLastNode} --> ${nextFirstNode}\n`
        }
      }
    })

    // スタイル定義
    flow += '\n  classDef standardClass fill:#e3f2fd,stroke:#2196F3,stroke-width:2px\n'
    flow += '  classDef customClass fill:#fff3cd,stroke:#ffc107,stroke-width:3px\n'

    return flow
  }

  // 簡易テキストフロー生成
  generateTextFlow(): string {
    let text = '【業務フロー】\n\n'
    
    const businessOrder = ['見積', '受注', '引当', '出荷準備', '出荷', '売上', '返品', '請求', '売掛']
    
    businessOrder.forEach((businessType, idx) => {
      if (this.hasAnswers(businessType)) {
        text += `${idx + 1}. ${businessType}\n`
        
        // 主要な回答を表示
        const businessAnswers = this.answers.filter(a => a.businessType === businessType && a.answerValue)
        businessAnswers.forEach(answer => {
          text += `   - ${answer.questionNo}: ${answer.answerValue}`
          if (answer.isCustom) {
            text += ' 🔧カスタム'
          }
          if (answer.memo) {
            text += ` (${answer.memo})`
          }
          text += '\n'
        })
        text += '\n'
      }
    })

    text += '\n【使用プログラム】\n\n'
    
    const businessGroups = new Map<string, Judgment[]>()
    this.judgments.forEach(j => {
      if (!businessGroups.has(j.businessType)) {
        businessGroups.set(j.businessType, [])
      }
      businessGroups.get(j.businessType)!.push(j)
    })

    
    businessOrder.forEach((businessType) => {
      const programs = businessGroups.get(businessType)
      if (!programs || programs.length === 0) return

      text += `【${businessType}】\n`

      programs.forEach(judgment => {
        judgment.programIds.forEach(programId => {
          const prog = this.getProgram(programId)
          text += `  - ${prog.programId}: ${prog.programName}\n`
        })
      })

      text += '\n'
    })

    return text

  }
}
