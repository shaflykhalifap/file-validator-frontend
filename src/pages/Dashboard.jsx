import { useAuth, canAccess } from '../context/AuthContext'
import Layout from '../components/Layout'
import { useNavigate } from 'react-router-dom'

const css = `
  .dash { display: flex; flex-direction: column; gap: 24px; }

  /* Hero */
  .dash-hero {
    background: var(--black);
    border-radius: var(--radius-xl);
    padding: 32px 36px;
    position: relative;
    overflow: hidden;
  }

  .dash-hero::before {
    content: '';
    position: absolute;
    width: 320px; height: 320px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(22,163,74,0.15) 0%, transparent 70%);
    top: -80px; right: -60px;
    pointer-events: none;
  }

  .dash-hero-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 500;
    color: var(--accent);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 14px;
  }

  .dash-hero-tag-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .dash-hero-title {
    font-family: var(--font-display);
    font-size: 28px;
    color: var(--white);
    
    line-height: 1.25;
    margin-bottom: 8px;
    position: relative; z-index: 1;
  }

  .dash-hero-sub {
    font-size: 13px;
    color: rgba(255,255,255,0.4);
    line-height: 1.6;
    max-width: 440px;
    position: relative; z-index: 1;
  }

  /* Cards grid */
  .dash-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 14px;
  }

  .dash-card {
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    padding: 22px 24px;
    cursor: pointer;
    transition: all 0.18s;
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-decoration: none;
    position: relative;
    overflow: hidden;
  }

  .dash-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    background: var(--accent);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.2s ease;
  }

  .dash-card:hover {
    border-color: var(--gray-300);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }

  .dash-card:hover::after { transform: scaleX(1); }

  .dash-card-icon {
    width: 40px; height: 40px;
    background: var(--gray-100);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    color: var(--gray-600);
    transition: all 0.18s;
  }

  .dash-card:hover .dash-card-icon {
    background: var(--accent-light);
    color: var(--accent);
  }

  .dash-card-type {
    font-size: 10px;
    font-weight: 600;
    color: var(--gray-400);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 2px;
  }

  .dash-card-title {
    font-family: var(--font-display);
    font-size: 17px;
    color: var(--gray-900);
    
    line-height: 1.2;
  }

  .dash-card-desc {
    font-size: 12px;
    color: var(--gray-400);
    line-height: 1.5;
    margin-top: 2px;
  }

  .dash-card-arrow {
    margin-top: auto;
    font-size: 12px;
    color: var(--accent);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 4px;
    opacity: 0;
    transform: translateX(-4px);
    transition: all 0.18s;
  }

  .dash-card:hover .dash-card-arrow {
    opacity: 1;
    transform: translateX(0);
  }

  /* Info grid */
  .dash-info-title {
    font-size: 11px;
    font-weight: 600;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
  }

  .dash-info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }

  .info-card {
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    padding: 16px 18px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .info-card-icon {
    width: 32px; height: 32px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    font-size: 14px;
  }

  .info-card-title { font-size: 13px; font-weight: 500; color: var(--gray-900); margin-bottom: 3px; }
  .info-card-text  { font-size: 12px; color: var(--gray-500); line-height: 1.5; }
`

const CARDS = [
  {
    to: '/validate/price',
    type: 'Validasi',
    title: 'File Price',
    desc: '5 kolom · SPU, Legal Entity, SKU, List Price, Current Price',
    delay: '0.05s',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  },
  {
    to: '/validate/inventory',
    type: 'Validasi',
    title: 'File Inventory',
    desc: '4 kolom · Warehouse, ItemNumber, BalanceApproved, Modified_dt',
    delay: '0.1s',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>,
  },
  {
    to: '/validate/master',
    type: 'Validasi',
    title: 'Master Product',
    desc: '16 kolom · UPC, SPU, SKU, Brand, Product Name, dan 10 lainnya',
    delay: '0.15s',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  },
]

const INFO = [
  { bg: '#f0fdf4', iconBg: '#dcfce7', color: '#15803d', icon: '↑', title: 'Upload File', text: 'Drag & drop file .txt dari komputer langsung ke halaman validasi.' },
  { bg: '#fafafa', iconBg: '#f5f5f5', color: '#525252', icon: '📁', title: 'Folder Inbox', text: 'Validasi file yang belum diproses sistem dari folder inbox server.' },
  { bg: '#fff7ed', iconBg: '#ffedd5', color: '#c2410c', icon: '⚠', title: 'Folder Error', text: 'Validasi file yang sudah diconsume sistem namun gagal diproses.' },
  { bg: '#f8fafc', iconBg: '#f1f5f9', color: '#475569', icon: '⌥', title: 'API / Postman', text: 'Semua endpoint tersedia di /docs Railway dengan autentikasi JWT.' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.name?.split(' ')[0] || 'User'

  return (
    <Layout title={`Halo, ${firstName}`} subtitle="Pilih jenis file untuk memulai validasi">
      <style>{css}</style>
      <div className="dash">

        <div className="dash-hero">
          <div className="dash-hero-tag">
            <span className="dash-hero-tag-dot" />
            Sistem Aktif
          </div>
          <div className="dash-hero-title">
            FileValidator System
          </div>
          <div className="dash-hero-sub">
            Validasi otomatis file klien — deteksi spasi tersembunyi, format tidak sesuai,
            dan inkonsistensi data sebelum diproses sistem.
          </div>
        </div>

        <div>
          <div className="dash-info-title" style={{ marginBottom: 14 }}>Jenis File</div>
          <div className="dash-grid">
            {CARDS.filter(card => {
                const type = card.to.split('/').pop()
                return canAccess(user, 'validate', type)
              }).map((card) => (
              <div
                key={card.to}
                className="dash-card"
                style={{ animationDelay: card.delay, animation: `fadeUp 0.4s ease ${card.delay} both` }}
                onClick={() => navigate(card.to)}
              >
                <div className="dash-card-icon">{card.icon}</div>
                <div>
                  <div className="dash-card-type">{card.type}</div>
                  <div className="dash-card-title">{card.title}</div>
                  <div className="dash-card-desc">{card.desc}</div>
                </div>
                <div className="dash-card-arrow">
                  Buka validasi →
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="dash-info-title">Cara Penggunaan</div>
          <div className="dash-info-grid">
            {INFO.map((item, i) => (
              <div key={i} className="info-card">
                <div className="info-card-icon" style={{ background: item.iconBg, color: item.color }}>
                  {item.icon}
                </div>
                <div>
                  <div className="info-card-title">{item.title}</div>
                  <div className="info-card-text">{item.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </Layout>
  )
}
