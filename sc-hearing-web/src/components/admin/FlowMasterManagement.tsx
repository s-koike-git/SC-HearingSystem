// タブ構成
const flowMasterTabs = [
  { id: 'business-flow', label: '業務フロー設定' },
  { id: 'system-flow', label: 'システムフロー設定' },
  { id: 'question-mapping', label: '質問紐づけ' },
  { id: 'program-mapping', label: 'プログラム紐づけ' },
  { id: 'flow-preview', label: 'フロー確認' },
]

// 各タブコンポーネント
- BusinessFlowSettings.tsx // 業務フローノード・接続管理
- SystemFlowSettings.tsx   // システムフロー工程管理
- QuestionMappingSettings.tsx // 質問→フロー紐づけ
- ProgramMappingSettings.tsx  // プログラム→フロー紐づけ
- FlowPreview.tsx          // プレビュー表示