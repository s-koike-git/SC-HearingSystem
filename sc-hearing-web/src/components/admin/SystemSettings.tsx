import { useState, useEffect } from 'react'

interface SystemSettings {
  companyName: string
  systemName: string
  maxProjects: number
  sessionTimeout: number
  emailNotification: boolean
  autoBackup: boolean
  backupTime: string
}

function SystemSettings() {
  const [settings, setSettings] = useState<SystemSettings>({
    companyName: '株式会社テクノ・カルチャー・システム',
    systemName: 'SCヒアリングシステム',
    maxProjects: 100,
    sessionTimeout: 30,
    emailNotification: false,
    autoBackup: true,
    backupTime: '02:00'
  })

  useEffect(() => {
    const saved = localStorage.getItem('systemSettings')
    if (saved) {
      setSettings(JSON.parse(saved))
    }
  }, [])

  const handleSave = () => {
    localStorage.setItem('systemSettings', JSON.stringify(settings))
    alert('設定を保存しました')
  }

  return (
    <div>
      <h2 style={{ marginBottom: '1.5rem', color: '#2c3e50' }}>システム設定</h2>

      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#34495e' }}>基本設定</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>会社名</label>
            <input
              type="text"
              value={settings.companyName}
              onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>システム名</label>
            <input
              type="text"
              value={settings.systemName}
              onChange={(e) => setSettings({ ...settings, systemName: e.target.value })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>最大プロジェクト数</label>
            <input
              type="number"
              value={settings.maxProjects}
              onChange={(e) => setSettings({ ...settings, maxProjects: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>セッションタイムアウト（分）</label>
            <input
              type="number"
              value={settings.sessionTimeout}
              onChange={(e) => setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
            />
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#34495e' }}>通知設定</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.emailNotification}
                onChange={(e) => setSettings({ ...settings, emailNotification: e.target.checked })}
                style={{ marginRight: '0.5rem' }}
              />
              <span>メール通知を有効にする</span>
            </label>
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', color: '#34495e' }}>バックアップ設定</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.autoBackup}
                onChange={(e) => setSettings({ ...settings, autoBackup: e.target.checked })}
                style={{ marginRight: '0.5rem' }}
              />
              <span>自動バックアップを有効にする</span>
            </label>
          </div>

          {settings.autoBackup && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>バックアップ時刻</label>
              <input
                type="time"
                value={settings.backupTime}
                onChange={(e) => setSettings({ ...settings, backupTime: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}
              />
            </div>
          )}
        </div>

        <div style={{ textAlign: 'right' }}>
          <button onClick={handleSave} style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}>
            保存
          </button>
        </div>
      </div>

      <div style={{
        marginTop: '1rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '4px',
        fontSize: '0.9rem',
        color: '#7f8c8d'
      }}>
        ©2025 Techno Culture System Co., Ltd. All Right Reserved.
      </div>
    </div>
  )
}

export default SystemSettings
