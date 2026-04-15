import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface PrivateRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

function PrivateRoute({ children, adminOnly = false }: PrivateRouteProps) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth()

  // ✅ localStorage からの復元が完了するまで待つ
  // これがないと「復元前に未認証」と判定されてログイン画面に飛ぶ
  if (isLoading) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        height: '100vh', color: '#7f8c8d', fontSize: '1rem',
      }}>
        読み込み中...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/menu" replace />
  }

  return <>{children}</>
}

export default PrivateRoute
