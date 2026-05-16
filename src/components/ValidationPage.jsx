import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/client'
import ValidationResult from './ValidationResult'

const styles = `
  .vpage { display: flex; flex-direction: column; gap: 0; }

  /* Back button */
  .vpage-back {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; color: var(--stone-400); background: none; border: none;
    cursor: pointer; padding: 0 0 16px 0; transition: color 0.15s;
  }
  .vpage-back:hover { color: var(--accent); }

  /* Tabs */
  .vpage-tabs {
    display: flex; gap: 0;
    border-bottom: 1.5px solid var(--stone-200);
    margin-bottom: 24px;
  }
  .vpage-tab {
    padding: 10px 20px; border: none; background: none;
    font-size: 13.5px; font-weight: 400; color: var(--stone-400);
    cursor: pointer; border-bottom: 2px solid transparent;
    margin-bottom: -1.5px; transition: all 0.15s; white-space: nowrap;
  }
  .vpage-tab.active { color: var(--accent); border-bottom-color: var(--accent); font-weight: 500; }
  .vpage-tab:hover:not(.active) { color: var(--stone-600); }

  /* Panel */
  .vpage-panel { animation: fadeIn 0.2s ease; }
  .vpage-panel-title { font-size: 15px; font-weight: 600; color: var(--stone-900); margin-bottom: 4px; }
  .vpage-panel-desc { font-size: 13px; color: var(--stone-400); margin-bottom: 20px; line-height: 1.6; }

  /* File list */
  .file-list-section { margin-bottom: 16px; }
  .file-list-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 8px;
  }
  .file-list-title { font-size: 11px; font-weight: 600; color: var(--stone-600); text-transform: uppercase; letter-spacing: 0.06em; }
  .file-list-count { font-size: 12px; color: var(--stone-400); }
  .file-list {
    display: flex; flex-direction: column; gap: 3px;
    max-height: 220px; overflow-y: auto;
    border: 1.5px solid var(--stone-200); border-radius: var(--radius-md);
    background: var(--off-white); padding: 4px;
  }
  .file-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; cursor: pointer; border-radius: 6px;
    transition: background 0.12s; user-select: none;
  }
  .file-item:hover { background: var(--accent-light); }
  .file-item.selected { background: var(--accent-light); border-left: 3px solid var(--accent); padding-left: 9px; }
  .file-item-name { font-size: 13px; color: var(--stone-900); display: flex; align-items: center; gap: 8px; }
  .file-item-size { font-size: 11px; color: var(--stone-400); }
  .file-list-empty { padding: 20px; text-align: center; color: var(--stone-400); font-size: 13px; }
  .file-list-loading { padding: 20px; text-align: center; color: var(--stone-400); font-size: 13px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .file-list-spinner { width: 13px; height: 13px; border: 2px solid var(--stone-200); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.7s linear infinite; }

  .selected-info {
    display: flex; align-items: center; gap: 8px;
    background: var(--accent-light); border: 1px solid var(--accent-mid);
    border-radius: var(--radius-md); padding: 8px 14px;
    font-size: 13px; color: var(--accent); margin-bottom: 12px;
  }

  .validate-actions { display: flex; gap: 10px; flex-wrap: wrap; }

  .btn {
    padding: 10px 20px; border-radius: var(--radius-md); border: none;
    font-size: 13.5px; font-weight: 500; transition: all 0.15s;
    display: flex; align-items: center; gap: 7px;
    white-space: nowrap; cursor: pointer;
  }
  .btn-primary { background: var(--accent); color: white; }
  .btn-primary:hover:not(:disabled) { background: var(--accent-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(45,90,61,0.2); }
  .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
  .btn-secondary { background: var(--white); color: var(--stone-600); border: 1.5px solid var(--stone-200); }
  .btn-secondary:hover:not(:disabled) { border-color: var(--accent-mid); color: var(--accent); background: var(--accent-light); }
  .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0; }
  .btn-sm { padding: 5px 12px; font-size: 12px; height: 30px; }

  /* Upload */
  .dropzone {
    border: 2px dashed var(--stone-200); border-radius: var(--radius-lg);
    padding: 40px 24px; text-align: center; cursor: pointer;
    transition: all 0.2s; background: var(--off-white);
  }
  .dropzone:hover, .dropzone.drag-over { border-color: var(--accent); background: var(--accent-light); }
  .dropzone-icon { color: var(--stone-300); margin-bottom: 10px; }
  .dropzone.drag-over .dropzone-icon { color: var(--accent); }
  .dropzone-text { font-size: 14px; font-weight: 500; color: var(--stone-600); margin-bottom: 4px; }
  .dropzone-sub { font-size: 12px; color: var(--stone-400); }
  .selected-file {
    display: flex; align-items: center; gap: 10px;
    background: var(--accent-light); border: 1px solid var(--accent-mid);
    border-radius: var(--radius-md); padding: 10px 14px;
    margin-top: 10px; font-size: 13px; color: var(--accent);
  }
  .remove-file {
    margin-left: auto; background: none; border: none; color: var(--stone-400);
    padding: 2px; display: flex; align-items: center; border-radius: 4px;
    transition: color 0.15s; cursor: pointer;
  }
  .remove-file:hover { color: var(--error); }
  .upload-actions { margin-top: 14px; display: flex; justify-content: flex-end; }

  .error-banner {
    display: flex; align-items: center; gap: 8px;
    background: var(--error-bg); border: 1px solid var(--error-border);
    border-radius: var(--radius-md); padding: 11px 14px;
    font-size: 13px; color: var(--error); margin-bottom: 12px;
  }
`

const endpointMap = {
  price:     { inbox: '/validate/inbox/price',         error: '/validate/error/price',         upload: '/validate/upload/price' },
  inventory: { inbox: '/validate/inbox/inventory',     error: '/validate/error/inventory',     upload: '/validate/upload/inventory' },
  master:    { inbox: '/validate/inbox/master-product', error: '/validate/error/master-product', upload: '/validate/upload/master-product' },
}

const IconFile = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
  </svg>
)

const IconAlert = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
)

// ── Folder Panel ──
function FolderPanel({ type, folder }) {
  const [files, setFiles] = useState([])
  const [loadingFiles, setLoadingFiles] = useState(true)
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const fetchFiles = async () => {
    setLoadingFiles(true)
    setError('')
    try {
      const res = await api.get(`/validate/files/${type}/${folder}`)
      setFiles(res.data.files || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal mengambil daftar file.')
      setFiles([])
    } finally {
      setLoadingFiles(false)
    }
  }

  useEffect(() => { fetchFiles() }, [type, folder])

  const handleValidate = async () => {
    setError('')
    setResult(null)
    setLoading(true)
    try {
      // Kirim sebagai form-data (x-www-form-urlencoded)
      const params = new URLSearchParams()
      if (selectedFile) params.append('filename', selectedFile)

      const res = await api.post(
        endpointMap[type][folder],
        params,
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Terjadi kesalahan. Pastikan server berjalan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <div className="error-banner"><IconAlert />{error}</div>}

      <div className="file-list-section">
        <div className="file-list-header">
          <span className="file-list-title">File di folder {folder}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!loadingFiles && <span className="file-list-count">{files.length} file</span>}
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchFiles}
              disabled={loadingFiles}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <div className="file-list">
          {loadingFiles ? (
            <div className="file-list-loading">
              <div className="file-list-spinner" /> Memuat daftar file...
            </div>
          ) : files.length === 0 ? (
            <div className="file-list-empty">Tidak ada file .txt di folder {folder}</div>
          ) : (
            <>
              <div
                className={`file-item${selectedFile === null ? ' selected' : ''}`}
                onClick={() => setSelectedFile(null)}
              >
                <span className="file-item-name">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                  <strong>Semua file</strong>
                </span>
                <span className="file-item-size">{files.length} file</span>
              </div>
              {files.map(f => (
                <div
                  key={f.filename}
                  className={`file-item${selectedFile === f.filename ? ' selected' : ''}`}
                  onClick={() => setSelectedFile(f.filename)}
                >
                  <span className="file-item-name"><IconFile />{f.filename}</span>
                  <span className="file-item-size">{f.size_kb} KB</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {selectedFile && (
        <div className="selected-info">
          <IconFile />
          File dipilih: <strong>{selectedFile}</strong>
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 12 }}
            onClick={() => setSelectedFile(null)}
          >
            × Batalkan pilihan
          </button>
        </div>
      )}

      <div className="validate-actions">
        <button
          className="btn btn-primary"
          onClick={handleValidate}
          disabled={loading || loadingFiles}
        >
          {loading ? (
            <><div className="btn-spinner" />Memproses...</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              {selectedFile ? `Validasi: ${selectedFile}` : `Validasi semua (${files.length} file)`}
            </>
          )}
        </button>
      </div>

      <ValidationResult data={result} />
    </div>
  )
}

// ── Upload Panel ──
function UploadPanel({ type }) {
  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f && f.name.endsWith('.txt')) { setFile(f); setError('') }
    else setError('Hanya file .txt yang diperbolehkan.')
  }

  const handleValidate = async () => {
    if (!file) { setError('Pilih file terlebih dahulu.'); return }
    setError(''); setResult(null); setLoading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post(endpointMap[type].upload, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <div className="error-banner"><IconAlert />{error}</div>}
      <div
        className={`dropzone${dragOver ? ' drag-over' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="dropzone-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <div className="dropzone-text">Klik atau drag & drop file di sini</div>
        <div className="dropzone-sub">Hanya file .txt yang diterima</div>
        <input
          ref={fileRef} type="file" accept=".txt" style={{ display: 'none' }}
          onChange={e => { if (e.target.files[0]) { setFile(e.target.files[0]); setError('') } }}
        />
      </div>

      {file && (
        <div className="selected-file">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          {file.name}
          <span style={{ color: 'var(--stone-400)', fontSize: 12 }}>({(file.size / 1024).toFixed(1)} KB)</span>
          <button className="remove-file" onClick={() => { setFile(null); setResult(null) }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      <div className="upload-actions">
        <button className="btn btn-primary" onClick={handleValidate} disabled={loading || !file}>
          {loading ? (
            <><div className="btn-spinner" />Memproses...</>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              Validasi File
            </>
          )}
        </button>
      </div>
      <ValidationResult data={result} />
    </div>
  )
}

const TABS = [
  { key: 'upload', label: '↑ Upload File' },
  { key: 'inbox',  label: '📁 Folder Inbox' },
  { key: 'error',  label: '⚠ Folder Error' },
]

const DESC = {
  upload: 'Upload file .txt langsung dari komputer Anda untuk divalidasi.',
  inbox:  'Pilih file dari folder inbox server, lalu klik Validasi.',
  error:  'Pilih file dari folder error server, lalu klik Validasi.',
}

export default function ValidationPage({ type }) {
  const [tab, setTab] = useState('upload')
  const navigate = useNavigate()

  return (
    <>
      <style>{styles}</style>
      <div className="vpage">
        <button className="vpage-back" onClick={() => navigate('/dashboard')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Kembali ke Dashboard
        </button>

        <div className="vpage-tabs">
          {TABS.map(t => (
            <button
              key={t.key}
              className={`vpage-tab${tab === t.key ? ' active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="vpage-panel">
          <div className="vpage-panel-title">
            {tab === 'upload' ? 'Upload & Validasi' : tab === 'inbox' ? 'Validasi dari Folder Inbox' : 'Validasi dari Folder Error'}
          </div>
          <div className="vpage-panel-desc">{DESC[tab]}</div>
          {tab === 'upload' && <UploadPanel type={type} />}
          {tab === 'inbox'  && <FolderPanel key={`inbox-${type}`}  type={type} folder="inbox" />}
          {tab === 'error'  && <FolderPanel key={`error-${type}`}  type={type} folder="error" />}
        </div>
      </div>
    </>
  )
}
