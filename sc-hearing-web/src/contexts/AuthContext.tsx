import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import axios from 'axios'

export interface User {
  id: number
  username: string
  email: string
  role: 'admin' | 'user'
}

interface AuthContextType {
  user: User | null
  users: Array<User & { password: string }>
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
  addUser: (user: User & { password: string }) => Promise<void>
  updateUser: (id: number, user: Partial<User & { password: string }>) => Promise<void>
  deleteUser: (id: number) => Promise<void>
  loadUsers: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
     ? import.meta.env.VITE_API_BASE_URL.replace('/api', '/api/Auth') 
     : '/api/Auth'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<Array<User & { password: string }>>([])

  // 初回ロード時にLocalStorageからユーザー情報を復元
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  // ユーザー一覧をAPIから取得
  const loadUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/users`)
      setUsers(response.data)
    } catch (error) {
      console.error('ユーザー一覧の取得に失敗しました', error)
    }
  }

  // ログイン
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/login`, {
        username,
        password
      })
      
      const userData = response.data
      setUser(userData)
      localStorage.setItem('currentUser', JSON.stringify(userData))
      return true
    } catch (error) {
      console.error('ログインに失敗しました', error)
      return false
    }
  }

  // ログアウト
  const logout = () => {
    setUser(null)
    localStorage.removeItem('currentUser')
  }

  // ユーザー追加
  const addUser = async (newUser: User & { password: string }) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/users`, newUser)
      setUsers([...users, response.data])
    } catch (error) {
      console.error('ユーザーの追加に失敗しました', error)
      throw error
    }
  }

  // ユーザー更新
  const updateUser = async (id: number, updatedUser: Partial<User & { password: string }>) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/users/${id}`, updatedUser)
      setUsers(users.map(u => u.id === id ? response.data : u))
    } catch (error) {
      console.error('ユーザーの更新に失敗しました', error)
      throw error
    }
  }

  // ユーザー削除
  const deleteUser = async (id: number) => {
    try {
      await axios.delete(`${API_BASE_URL}/users/${id}`)
      setUsers(users.filter(u => u.id !== id))
    } catch (error) {
      console.error('ユーザーの削除に失敗しました', error)
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        users,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        addUser,
        updateUser,
        deleteUser,
        loadUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
