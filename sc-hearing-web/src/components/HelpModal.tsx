import { useState } from 'react'

// ─── 型定義 ──────────────────────────────────────────────────────
interface HelpPage {
  title: string
  content: React.ReactNode
}

interface HelpModalProps {
  pages: HelpPage[]
  onClose: () => void
}

// ─── 共通ヘルプモーダル ────────────────────────────────────────
export function HelpModal({ pages, onClose }: HelpModalProps) {
  const [page, setPage] = useState(0)

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: '10px', padding: '2rem',
        width: '760px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.35)',
      }}>
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#2c3e50', fontSize: '1.3rem' }}>
            ❓ {pages[page].title}
          </h2>
          <button onClick={onClose} style={{
            padding: '0.4rem 1rem', backgroundColor: '#95a5a6', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold',
          }}>✕ 閉じる</button>
        </div>

        {/* コンテンツ */}
        <div>{pages[page].content}</div>

        {/* ページネーション */}
        {pages.length > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #ecf0f1',
          }}>
            <button
              onClick={() => setPage(p => p - 1)} disabled={page === 0}
              style={{ padding: '0.5rem 1.2rem', backgroundColor: page === 0 ? '#bdc3c7' : '#95a5a6', color: 'white', border: 'none', borderRadius: '4px', cursor: page === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >← 前へ</button>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {pages.map((_, i) => (
                <button key={i} onClick={() => setPage(i)} style={{
                  width: '10px', height: '10px', borderRadius: '50%', border: 'none',
                  backgroundColor: i === page ? '#3498db' : '#bdc3c7', cursor: 'pointer', padding: 0,
                }} />
              ))}
            </div>
            <button
              onClick={() => setPage(p => p + 1)} disabled={page === pages.length - 1}
              style={{ padding: '0.5rem 1.2rem', backgroundColor: page === pages.length - 1 ? '#bdc3c7' : '#3498db', color: 'white', border: 'none', borderRadius: '4px', cursor: page === pages.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
            >次へ →</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ヘルプボタン ──────────────────────────────────────────────
export function HelpButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '0.5rem 1rem',
      backgroundColor: '#8e44ad',
      color: 'white', border: 'none', borderRadius: '4px',
      cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9rem',
      display: 'flex', alignItems: 'center', gap: '0.4rem',
    }}>
      ❓ 使い方
    </button>
  )
}

// ─── ヘルプ内容ユーティリティ ──────────────────────────────────
export function HelpSection({ title, color = '#3498db', children }: {
  title: string; color?: string; children: React.ReactNode
}) {
  return (
    <div style={{ backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', borderLeft: `4px solid ${color}` }}>
      <div style={{ fontWeight: 'bold', color, marginBottom: '0.6rem', fontSize: '1rem' }}>{title}</div>
      {children}
    </div>
  )
}

export function HelpRow({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1.1rem', minWidth: '1.5rem' }}>{icon}</span>
      <div>
        <span style={{ fontWeight: 'bold', color: '#2c3e50' }}>{label}</span>
        <span style={{ color: '#555', fontSize: '0.9rem' }}>　{desc}</span>
      </div>
    </div>
  )
}

export function HelpTip({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '6px', padding: '0.6rem 0.9rem', marginTop: '0.75rem', fontSize: '0.88rem', color: '#856404' }}>
      💡 {children}
    </div>
  )
}

// ===================================================================
// 各画面のヘルプページ定義
// ===================================================================

// ─── 案件一覧ヘルプ ────────────────────────────────────────────
export const projectListHelpPages: HelpPage[] = [
  {
    title: '案件一覧 — 基本操作',
    content: (
      <div>
        <HelpSection title="📋 この画面でできること" color="#3498db">
          <HelpRow icon="📁" label="案件一覧の確認" desc="登録済みの全案件を一覧で確認できます。" />
          <HelpRow icon="🔍" label="検索" desc="会社名・業種・担当者名でリアルタイム検索できます。" />
          <HelpRow icon="↑↓" label="ソート" desc="各列のヘッダーをクリックすると昇順/降順で並び替えできます。" />
          <HelpRow icon="＋" label="新規案件作成" desc="右上のボタンから新しい案件を登録します。" />
        </HelpSection>
        <HelpSection title="🔘 操作ボタンの説明" color="#27ae60">
          <HelpRow icon="✏️" label="編集" desc="ヒアリングシートを開いて質問への回答を入力・編集します。" />
          <HelpRow icon="📤" label="出力" desc="案件情報をCSVファイルとしてダウンロードします。" />
          <HelpRow icon="🗑️" label="削除" desc="案件を完全に削除します。この操作は取り消せません。" />
        </HelpSection>
        <HelpTip>新規案件を作成したら「✏️ 編集」からヒアリングシートに進んでください。</HelpTip>
      </div>
    ),
  },
  {
    title: '案件一覧 — ステータス管理',
    content: (
      <div>
        <HelpSection title="📊 ステータスの種類" color="#e67e22">
          {[
            { status: '未着手', color: '#3498db', desc: '案件作成直後の初期状態です。' },
            { status: '進行中', color: '#f39c12', desc: 'ヒアリングシートで最初の回答を入力すると自動的に変わります。' },
            { status: '完了', color: '#27ae60', desc: '判定結果を表示したタイミングで自動的に変わります。' },
            { status: '保留', color: '#95a5a6', desc: '手動で設定します。一時的に保留にしたい案件に使います。' },
          ].map(({ status, color, desc }) => (
            <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <span style={{ backgroundColor: color, color: 'white', borderRadius: '12px', padding: '0.2rem 0.8rem', fontSize: '0.85rem', fontWeight: 'bold', minWidth: '60px', textAlign: 'center' }}>{status}</span>
              <span style={{ color: '#555', fontSize: '0.9rem' }}>{desc}</span>
            </div>
          ))}
        </HelpSection>
        <HelpSection title="✏️ ステータスの変更" color="#8e44ad">
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#555' }}>
            一覧のステータス欄にあるプルダウンから直接変更できます。変更は即座に保存されます。
          </p>
        </HelpSection>
        <HelpTip>ステータスを活用することで、対応済み/未対応の案件を素早く把握できます。</HelpTip>
      </div>
    ),
  },
]

// ─── ヒアリングシートヘルプ ────────────────────────────────────
export const hearingSheetHelpPages: HelpPage[] = [
  {
    title: 'ヒアリングシート — 基本操作',
    content: (
      <div>
        <HelpSection title="📝 この画面でできること" color="#3498db">
          <HelpRow icon="🏢" label="業務タブ切り替え" desc="上部のタブで業務（見積・受注・出荷など）を切り替えます。" />
          <HelpRow icon="✅" label="回答入力" desc="各質問に対して回答を選択・入力します。回答は自動保存されます。" />
          <HelpRow icon="📊" label="判定結果表示" desc="右上の「判定結果を表示」ボタンで必要プログラム一覧を確認できます。" />
        </HelpSection>
        <HelpSection title="💬 回答方法" color="#27ae60">
          <HelpRow icon="○×" label="はい/いいえ形式" desc="「○（はい）」か「×（いいえ）」を選択します。" />
          <HelpRow icon="📋" label="選択式" desc="プルダウンから該当する選択肢を選びます。" />
          <HelpRow icon="🔧" label="カスタムフラグ" desc="標準機能で対応できない場合に「カスタム」にチェックを入れます。" />
          <HelpRow icon="📌" label="メモ" desc="補足情報や特記事項をメモ欄に入力できます。" />
        </HelpSection>
        <HelpTip>回答は入力のたびに自動保存されます。途中で閉じても再度開くと続きから入力できます。</HelpTip>
      </div>
    ),
  },
  {
    title: 'ヒアリングシート — 効果的な使い方',
    content: (
      <div>
        <HelpSection title="🎯 推奨の進め方" color="#e67e22">
          {[
            { step: 1, text: '顧客と面談しながら業務タブを左から順に進める' },
            { step: 2, text: '各質問に対して顧客の回答を選択・入力する' },
            { step: 3, text: '標準機能で対応できない場合はカスタムフラグを立てる' },
            { step: 4, text: 'すべての業務の回答が完了したら「判定結果を表示」を押す' },
            { step: 5, text: '判定結果画面で必要プログラムと工数を確認・出力する' },
          ].map(({ step, text }) => (
            <div key={step} style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.6rem', alignItems: 'flex-start' }}>
              <div style={{ minWidth: '1.8rem', height: '1.8rem', borderRadius: '50%', backgroundColor: '#e67e22', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem', flexShrink: 0 }}>{step}</div>
              <span style={{ color: '#555', fontSize: '0.9rem', paddingTop: '0.2rem' }}>{text}</span>
            </div>
          ))}
        </HelpSection>
        <HelpSection title="⚠️ 注意事項" color="#e74c3c">
          <HelpRow icon="💾" label="自動保存" desc="回答は即時保存されます。保存ボタンの押し忘れはありません。" />
          <HelpRow icon="🔄" label="回答の変更" desc="いつでも回答を変更できます。変更すると判定結果も自動的に更新されます。" />
        </HelpSection>
        <HelpTip>回答が「未回答」の質問があっても判定は実行されます。必要に応じて後から追加入力できます。</HelpTip>
      </div>
    ),
  },
]

// ─── 判定結果ヘルプ ────────────────────────────────────────────
export const judgmentResultsHelpPages: HelpPage[] = [
  {
    title: '判定結果 — 基本操作',
    content: (
      <div>
        <HelpSection title="📊 この画面でできること" color="#3498db">
          <HelpRow icon="📋" label="判定結果タブ" desc="回答に基づいて必要なプログラムを質問ごとに一覧表示します。" />
          <HelpRow icon="💻" label="プログラム一覧タブ" desc="必要なプログラムをまとめて工数とともに表示します。" />
          <HelpRow icon="📈" label="フロー図表示" desc="業務フロー・システムフロー図を視覚的に確認できます。" />
          <HelpRow icon="📤" label="各種出力" desc="CSV・Excel・テキスト形式でダウンロードできます。" />
        </HelpSection>
        <HelpSection title="🔍 判定結果の見方" color="#27ae60">
          <HelpRow icon="🔴" label="重要度：高" desc="導入に必須または強く推奨されるプログラムです。" />
          <HelpRow icon="🟡" label="重要度：中" desc="多くの場合に必要となるプログラムです。" />
          <HelpRow icon="⚪" label="重要度：低" desc="オプション的な位置付けのプログラムです。" />
          <HelpRow icon="🔧" label="カスタム対応" desc="標準機能では対応できずカスタム開発が必要な項目です。" />
        </HelpSection>
        <HelpTip>「プログラム一覧」タブの合計工数が見積の基準工数になります。</HelpTip>
      </div>
    ),
  },
  {
    title: '判定結果 — 出力機能',
    content: (
      <div>
        <HelpSection title="📤 出力形式の説明" color="#8e44ad">
          <HelpRow icon="📄" label="CSV出力" desc="Excelで開ける形式で全判定結果を出力します。判定結果タブ・プログラム一覧タブそれぞれに出力ボタンがあります。" />
          <HelpRow icon="📈" label="フロー図出力" desc="SVG・PDF・Mermaidテキスト・テキスト形式でフロー図を出力できます。" />
        </HelpSection>
        <HelpSection title="📈 フロー図の使い方" color="#16a085">
          <HelpRow icon="📈" label="業務フロー" desc="見積→受注→出荷など業務の流れを図示します。顧客向け説明資料に活用できます。" />
          <HelpRow icon="🔧" label="システムフロー" desc="各業務で使用するプログラムの流れを図示します。導入範囲の説明に活用できます。" />
          <HelpRow icon="🔍" label="ズーム" desc="図の下部にある ＋/− ボタンで拡大縮小できます。⟲ で初期サイズに戻ります。" />
        </HelpSection>
        <HelpSection title="💡 活用シーン" color="#e67e22">
          <HelpRow icon="🤝" label="初回提案時" desc="フロー図を印刷して顧客に業務全体像を説明します。" />
          <HelpRow icon="📝" label="見積作成時" desc="プログラム一覧の合計工数を見積書に転記します。" />
          <HelpRow icon="📊" label="社内共有時" desc="CSV出力してExcelで加工・管理します。" />
        </HelpSection>
        <HelpTip>フロー図はフローマスタの設定内容が反映されます。正しく表示されない場合は管理画面のフローマスタ設定を確認してください。</HelpTip>
      </div>
    ),
  },
]
