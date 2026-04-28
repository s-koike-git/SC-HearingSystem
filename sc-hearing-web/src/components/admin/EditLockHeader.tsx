import { useState, ReactNode } from 'react'
import { useEditLock } from '../../contexts/EditLockContext'
import PasswordPromptModal from './PasswordPromptModal'

export function EditLockHeader() {
  const { isUnlocked, lock } = useEditLock()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0.75rem 1rem', marginBottom: '1rem',
        backgroundColor: isUnlocked ? '#fef3c7' : '#f3f4f6',
        border: isUnlocked ? '2px solid #f59e0b' : '1px solid #d1d5db',
        borderRadius: 8,
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 22 }}>{isUnlocked ? '✏️' : '🔒'}</span>
          <div>
            <div style={{
              fontSize: '0.95rem', fontWeight: 700,
              color: isUnlocked ? '#92400e' : '#374151',
            }}>
              {isUnlocked ? '編集モード中' : '編集ロック中（閲覧のみ）'}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 2 }}>
              {isUnlocked
                ? 'マスタ情報を変更できます。他のタブに移ると自動でロックされます。'
                : '誤操作防止のため、編集にはパスワードが必要です。'}
            </div>
          </div>
        </div>
        {isUnlocked ? (
          <button
            onClick={lock}
            style={{
              padding: '0.5rem 1rem', backgroundColor: '#6b7280',
              color: 'white', border: 'none', borderRadius: 6,
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              whiteSpace: 'nowrap',
            }}
          >🔒 ロック</button>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            style={{
              padding: '0.5rem 1rem', backgroundColor: '#3b82f6',
              color: 'white', border: 'none', borderRadius: 6,
              cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
              whiteSpace: 'nowrap',
            }}
          >✏️ 修正</button>
        )}
      </div>
      <PasswordPromptModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}

export function EditLockedContent({ children }: { children: ReactNode }) {
  const { isUnlocked } = useEditLock()
  return (
    <fieldset
      disabled={!isUnlocked}
      style={{
        border: 'none', padding: 0, margin: 0, minWidth: 0,
        opacity: isUnlocked ? 1 : 0.85,
        transition: 'opacity 0.2s',
      }}
    >
      {children}
    </fieldset>
  )
}
