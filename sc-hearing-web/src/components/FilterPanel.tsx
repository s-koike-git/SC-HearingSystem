interface FilterPanelProps {
  searchText: string
  onSearchChange: (v: string) => void
  filterUnanswered: boolean
  onFilterUnansweredChange: (v: boolean) => void
  filterPriority: '全て' | '高' | '中' | '低'
  onFilterPriorityChange: (v: '全て' | '高' | '中' | '低') => void
  filterLayer: '全て' | 'L1' | 'L2' | 'L3'
  onFilterLayerChange: (v: '全て' | 'L1' | 'L2' | 'L3') => void
  filterCustom: boolean
  onFilterCustomChange: (v: boolean) => void
  visibleCount: number
  totalCount: number
}

function FilterPanel(props: FilterPanelProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: '#f8fafc',
      borderRadius: 6,
      border: '1px solid #e2e8f0',
      flexWrap: 'wrap',
      fontSize: 12,
    }}>
      <input
        type="text"
        value={props.searchText}
        onChange={(e) => props.onSearchChange(e.target.value)}
        placeholder="🔍 質問文・PRGIDで検索"
        style={{
          flex: 1,
          minWidth: 200,
          padding: '6px 10px',
          border: '1px solid #d0d7de',
          borderRadius: 4,
          fontSize: 12,
        }}
      />
      <select
        value={props.filterLayer}
        onChange={(e) => props.onFilterLayerChange(e.target.value as any)}
        style={{
          padding: '6px 8px', border: '1px solid #d0d7de',
          borderRadius: 4, fontSize: 12, backgroundColor: 'white',
        }}
      >
        <option value="全て">全階層</option>
        <option value="L1">L1のみ</option>
        <option value="L2">L2のみ</option>
        <option value="L3">L3のみ</option>
      </select>
      <select
        value={props.filterPriority}
        onChange={(e) => props.onFilterPriorityChange(e.target.value as any)}
        style={{
          padding: '6px 8px', border: '1px solid #d0d7de',
          borderRadius: 4, fontSize: 12, backgroundColor: 'white',
        }}
      >
        <option value="全て">全重要度</option>
        <option value="高">高のみ</option>
        <option value="中">中のみ</option>
        <option value="低">低のみ</option>
      </select>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 4,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        <input
          type="checkbox"
          checked={props.filterUnanswered}
          onChange={(e) => props.onFilterUnansweredChange(e.target.checked)}
        />
        未回答のみ
      </label>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 4,
        cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        <input
          type="checkbox"
          checked={props.filterCustom}
          onChange={(e) => props.onFilterCustomChange(e.target.checked)}
        />
        🔧 カスタムのみ
      </label>
      <span style={{ color: '#888780', whiteSpace: 'nowrap' }}>
        {props.visibleCount} / {props.totalCount} 件
      </span>
    </div>
  )
}

export default FilterPanel
