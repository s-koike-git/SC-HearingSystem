import { createContext, useContext, useState, ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface EditLockContextValue {
  isUnlocked: boolean
  unlock: (password: string) => Promise<boolean>
  lock: () => void
}

const EditLockContext = createContext<EditLockContextValue>({
  isUnlocked: false,
  unlock: async () => false,
  lock: () => {},
})

export function EditLockProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const { user, login } = useAuth()

  const unlock = async (password: string): Promise<boolean> => {
    if (!user || !user.username) return false
    try {
      const success = await login(user.username, password)
      if (success) {
        setIsUnlocked(true)
        return true
      }
      return false
    } catch (e) {
      console.error('編集ロック解除エラー:', e)
      return false
    }
  }

  const lock = () => setIsUnlocked(false)

  return (
    <EditLockContext.Provider value={{ isUnlocked, unlock, lock }}>
      {children}
    </EditLockContext.Provider>
  )
}

export function useEditLock() {
  return useContext(EditLockContext)
}
