import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'

export default function AccessDenied() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <Layout title="Akses Ditolak">
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: '80px 20px', textAlign: 'center'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: '#fef2f2', display: 'flex', alignItems: 'center',
          justifyContent: 'center', marginBottom: 20,
          border: '1px solid #fecaca'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          </svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: '#111', marginBottom: 8 }}>
          Akses Tidak Diizinkan
        </div>
        <div style={{ fontSize: 13, color: '#737373', maxWidth: 360, lineHeight: 1.6, marginBottom: 28 }}>
          Akun <strong>{user?.name}</strong> ({user?.role}) tidak memiliki izin untuk mengakses halaman ini.
          Hubungi administrator jika Anda membutuhkan akses.
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            padding: '9px 20px', background: '#0a0a0a', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500,
            cursor: 'pointer'
          }}
        >
          Kembali ke Dashboard
        </button>
      </div>
    </Layout>
  )
}
