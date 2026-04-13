import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface PrivateRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

function PrivateRoute({ children, adminOnly = false }: PrivateRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth()

  if (!isAuthenticated) {
    // 未ログインの場合、ログイン画面にリダイレクト
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    // 管理者専用ページに一般ユーザーがアクセスした場合、メニューにリダイレクト
    return <Navigate to="/menu" replace />
  }

  return <>{children}</>
}

export default PrivateRoute
