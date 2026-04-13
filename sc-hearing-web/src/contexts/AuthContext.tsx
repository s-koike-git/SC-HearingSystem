import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
}

interface AuthContextType {
  user: User | null
  users: Array<User & { password: string }>
  login: (username: string, password: string) => boolean
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  addUser: (user: User & { password: string }) => void
  updateUser: (id: number, user: Partial<User & { password: string }>) => void
  deleteUser: (id: number) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const DEFAULT_USERS: Array<User & { password: string }> = [
  { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', password: 'admin' },
]

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<Array<User & { password: string }>>(DEFAULT_USERS)

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    const savedUsers = localStorage.getItem('systemUsers')
    
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('systemUsers', JSON.stringify(users))
  }, [users])

  const login = (username: string, password: string): boolean => {
    const foundUser = users.find(
      u => u.username === username && u.password === password
    )

    if (foundUser) {
      const { password: _, ...userWithoutPassword } = foundUser
      setUser(userWithoutPassword)
      localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword))
      return true
    }

    return false
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('currentUser')
  }

  const addUser = (newUser: User & { password: string }) => {
    setUsers([...users, newUser])
  }

  const updateUser = (id: number, updatedUser: Partial<User & { password: string }>) => {
    setUsers(users.map(u => u.id === id ? { ...u, ...updatedUser } : u))
    
    if (user && user.id === id) {
      const updated = users.find(u => u.id === id)
      if (updated) {
        const { password: _, ...userWithoutPassword } = { ...updated, ...updatedUser }
        setUser(userWithoutPassword)
        localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword))
      }
    }
  }

  const deleteUser = (id: number) => {
    setUsers(users.filter(u => u.id !== id))
    
    if (user && user.id === id) {
      logout()
    }
  }

  const value: AuthContextType = {
    user,
    users,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    addUser,
    updateUser,
    deleteUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
