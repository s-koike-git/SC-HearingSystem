import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import MenuPage from './pages/MenuPage'
import ProjectListPage from './pages/ProjectListPage'
import CreateProjectPage from './pages/CreateProjectPage'
import HearingSheet from './components/HearingSheet'
import JudgmentResults from './components/JudgmentResults'
import AdminDashboard from './components/AdminDashboard'
import PrivateRoute from './components/PrivateRoute'
import ProgramEstimatePage from './pages/ProgramEstimatePage'
import CostSimulationPage from './pages/CostSimulationPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ログイン画面（認証不要） */}
          <Route path="/login" element={<LoginPage />} />

          {/* メニュー画面（認証必要） */}
          <Route 
            path="/menu" 
            element={
              <PrivateRoute>
                <MenuPage />
              </PrivateRoute>
            } 
          />

          {/* 案件一覧（認証必要） */}
          <Route 
            path="/projects" 
            element={
              <PrivateRoute>
                <ProjectListPage />
              </PrivateRoute>
            } 
          />

          {/* 新規案件作成（認証必要） */}
          <Route 
            path="/projects/new" 
            element={
              <PrivateRoute>
                <CreateProjectPage />
              </PrivateRoute>
            } 
          />

          {/* ヒアリングシート（認証必要） */}
          <Route 
            path="/hearing/:projectId" 
            element={
              <PrivateRoute>
                <HearingSheet />
              </PrivateRoute>
            } 
          />

          {/* 判定結果（認証必要） */}
          <Route 
            path="/results/:projectId" 
            element={
              <PrivateRoute>
                <JudgmentResults />
              </PrivateRoute>
            } 
          />

          {/* 管理画面（管理者のみ） */}
          <Route 
            path="/admin" 
            element={
              <PrivateRoute adminOnly>
                <AdminDashboard />
              </PrivateRoute>
            } 
          />
          
          {/* プログラム工数見積もり（認証必要） */}
          <Route
            path="/program-estimate"
            element={
              <PrivateRoute>
                <ProgramEstimatePage />
              </PrivateRoute>
            }
          />
          
          <Route path="/cost-simulation" element={<CostSimulationPage />} />
          
          {/* デフォルトルート：ログインにリダイレクト */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
