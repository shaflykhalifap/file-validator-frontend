import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth, canAccess } from '../context/AuthContext'

const NAV_MAIN = [
  {
    label: 'Dashboard', to: '/dashboard',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
]

const NAV_VALIDATE = [
  {
    label: 'File Price', to: '/validate/price',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
  },
  {
    label: 'File Inventory', to: '/validate/inventory',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
  },
  {
    label: 'Master Product', to: '/validate/master',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
  },
]

const NAV_HISTORY = [
  { label: 'Price', to: '/history/price' },
  { label: 'Inventory', to: '/history/inventory' },
  { label: 'Master Product', to: '/history/master' },
]

const css = `
  .layout {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: var(--gray-100);
  }

  /* ── SIDEBAR ── */
  .sidebar {
    width: var(--sidebar-w);
    min-width: var(--sidebar-w);
    background: var(--black);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    flex-shrink: 0;
  }

  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 20px 16px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }

  .sidebar-logo-mark {
    width: 28px; height: 28px;
    background: var(--accent);
    border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .sidebar-brand {
    font-family: var(--font-display);
    font-size: 15px;
    color: var(--white);
    
    line-height: 1;
  }

  .sidebar-version {
    font-size: 10px;
    color: rgba(255,255,255,0.2);
    letter-spacing: 0.08em;
    margin-top: 1px;
  }

  .sidebar-nav {
    flex: 1;
    padding: 12px 8px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .sidebar-section {
    font-size: 10px;
    font-weight: 600;
    color: rgba(255,255,255,0.18);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 10px 8px 5px;
  }

  .nav-link {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 8px;
    border-radius: 6px;
    color: rgba(255,255,255,0.42);
    font-size: 13px;
    font-weight: 400;
    transition: all 0.12s;
    text-decoration: none;
    margin-bottom: 1px;
  }

  .nav-link:hover {
    color: rgba(255,255,255,0.82);
    background: rgba(255,255,255,0.05);
  }

  .nav-link.active {
    color: var(--white);
    background: rgba(22,163,74,0.18);
  }

  .nav-link.active svg { color: var(--accent); }

  .nav-link-sub {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px 6px 20px;
    border-radius: 6px;
    color: rgba(255,255,255,0.32);
    font-size: 12px;
    transition: all 0.12s;
    text-decoration: none;
    margin-bottom: 1px;
    position: relative;
  }

  .nav-link-sub::before {
    content: '';
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
  }

  .nav-link-sub:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.04); }
  .nav-link-sub.active { color: #86efac; font-weight: 500; }
  .nav-link-sub.active::before { background: var(--accent); }

  /* ── SIDEBAR FOOTER ── */
  .sidebar-footer {
    padding: 10px 8px 14px;
    border-top: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }

  .user-card {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255,255,255,0.04);
    margin-bottom: 6px;
  }

  .user-avatar {
    width: 26px; height: 26px;
    background: var(--accent);
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 600; color: white;
    flex-shrink: 0;
  }

  .user-name  { font-size: 12px; font-weight: 500; color: rgba(255,255,255,0.82); line-height: 1.2; }
  .user-role  { font-size: 10px; color: rgba(255,255,255,0.28); }

  .logout-btn {
    display: flex; align-items: center; gap: 7px;
    width: 100%; padding: 7px 8px;
    border-radius: 6px; background: none; border: none;
    color: rgba(255,255,255,0.28); font-size: 12px;
    cursor: pointer; transition: all 0.12s;
    font-family: var(--font-body);
  }

  .logout-btn:hover { color: #fca5a5; background: rgba(220,38,38,0.08); }

  /* ── MAIN ── */
  .main-wrapper {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .page-topbar {
    background: var(--white);
    border-bottom: 1px solid var(--gray-200);
    padding: 0 28px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    z-index: 20;
  }

  .page-topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .page-breadcrumb {
    font-size: 12px;
    color: var(--gray-400);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .page-breadcrumb-sep { color: var(--gray-300); }
  .page-breadcrumb-current { color: var(--gray-700); font-weight: 500; }

  .page-title-bar {
    padding: 20px 28px 0;
    background: var(--white);
    border-bottom: 1px solid var(--gray-200);
    flex-shrink: 0;
  }

  .page-title {
    font-family: var(--font-display);
    font-size: 22px;
    color: var(--gray-900);
    
    line-height: 1.2;
    margin-bottom: 4px;
  }

  .page-subtitle {
    font-size: 12px;
    color: var(--gray-400);
    margin-bottom: 16px;
  }

  .page-body {
    flex: 1;
    overflow-y: auto;
    padding: 24px 28px;
    background: var(--gray-100);
  }

  .page-body > * { animation: fadeUp 0.3s ease; }
`

export default function Layout({ children, title, subtitle }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const initial = user?.name?.charAt(0).toUpperCase() || 'A'

  const handleLogout = () => { logout(); navigate('/login') }

  // Breadcrumb logic
  const pathMap = {
    '/dashboard': ['Dashboard'],
    '/validate/price': ['Validasi', 'File Price'],
    '/validate/inventory': ['Validasi', 'File Inventory'],
    '/validate/master': ['Validasi', 'Master Product'],
    '/history/price': ['Riwayat', 'Price'],
    '/history/inventory': ['Riwayat', 'Inventory'],
    '/history/master': ['Riwayat', 'Master Product'],
  }
  const crumbs = pathMap[location.pathname] || ['—']

  return (
    <>
      <style>{css}</style>
      <div className="layout">

        {/* ── SIDEBAR ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <div className="sidebar-logo-mark">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <div className="sidebar-brand">FileValidator</div>
              <div className="sidebar-version">v1.0 · Internal</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-section">Menu</div>
            {NAV_MAIN.map(item => (
              <NavLink key={item.to} to={item.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                {item.icon}{item.label}
              </NavLink>
            ))}

            <div className="sidebar-section" style={{ marginTop: 8 }}>Validasi</div>
            {NAV_VALIDATE.filter(item => {
                const type = item.to.split('/').pop()
                return canAccess(user, 'validate', type)
              }).map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                  {item.icon}{item.label}
                </NavLink>
              ))}

            <div className="sidebar-section" style={{ marginTop: 8 }}>Riwayat</div>
            {NAV_HISTORY.filter(item => {
                const type = item.to.split('/').pop()
                return canAccess(user, 'history', type)
              }).map(item => (
                <NavLink key={item.to} to={item.to}
                  className={({ isActive }) => `nav-link-sub${isActive ? ' active' : ''}`}>
                  {item.label}
                </NavLink>
              ))}
          </nav>

          <div className="sidebar-footer">
            <div className="user-card">
              <div className="user-avatar">{initial}</div>
              <div>
                <div className="user-name">{user?.name || 'User'}</div>
                <div className="user-role">Internal Team</div>
              </div>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              Keluar
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <div className="main-wrapper">
          <div className="page-topbar">
            <div className="page-breadcrumb">
              <span>FileValidator</span>
              {crumbs.map((c, i) => (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="page-breadcrumb-sep">/</span>
                  <span className={i === crumbs.length - 1 ? 'page-breadcrumb-current' : ''}>{c}</span>
                </span>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              {user?.email}
            </div>
          </div>

          {(title || subtitle) && (
            <div className="page-title-bar">
              {title && <div className="page-title">{title}</div>}
              {subtitle && <div className="page-subtitle">{subtitle}</div>}
            </div>
          )}

          <div className="page-body">
            {children}
          </div>
        </div>

      </div>
    </>
  )
}
