import { useState, useEffect } from 'react'
import CustomDownloadModal from '../components/CustomDownloadModal'

async function loadXLSX() {
  return (await import('xlsx'))
}
import { useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import api from '../api/client'

const TYPE_META = {
  price:     { label: 'File Price',         cols: 5  },
  inventory: { label: 'File Inventory',     cols: 4  },
  master:    { label: 'Master Product',     cols: 16 },
}

const SOURCE_LABEL = {
  inbox:  'Inbox',
  error:  'Error',
  upload: 'Upload',
}

// Format datetime dengan timezone offset +7 (WIB)
function formatWIB(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  // Tambah 7 jam untuk WIB (UTC+7)
  const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000)
  const pad = n => String(n).padStart(2, '0')
  const day   = pad(wib.getUTCDate())
  const month = wib.toLocaleString('id-ID', { month: 'short', timeZone: 'UTC' })
  const year  = wib.getUTCFullYear()
  const hour  = pad(wib.getUTCHours())
  const min   = pad(wib.getUTCMinutes())
  return `${day} ${month} ${year}, ${hour}:${min} WIB`
}


function _safeName(f){ return (f||'unknown').replace(/\.txt$/i,'').replace(/[^a-zA-Z0-9._-]/g,'_') }
function _trigger(content, filename, mime){
  const bom = mime.includes('tab') ? '\uFEFF' : ''
  const blob = new Blob([bom+content],{type:`${mime};charset=utf-8`})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href=url; a.download=filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

function dlErrorReport(log){
  if(!log.error_details?.length) return
  const byRow={}
  log.error_details.forEach(e=>{
    const k=e.row===null?'FILE':`ROW_${e.row}`
    if(!byRow[k]) byRow[k]=[]
    byRow[k].push(e)
  })
  const lines=[
    '='.repeat(60),
    'FILE VALIDATOR — ERROR REPORT',
    `File    : ${log.filename}`,
    `Sumber  : ${SOURCE_LABEL[log.source]||log.source}`,
    `Oleh    : ${log.validated_by||'-'}`,
    `Waktu   : ${formatWIB(log.validated_at)}`,
    `Total   : ${log.total_rows} baris | ${log.total_errors} error`,
    '='.repeat(60),''
  ]
  Object.entries(byRow).forEach(([k,errs])=>{
    lines.push(k==='FILE'?'[LEVEL FILE]':`[${k.replace('_',' ')}]`)
    errs.forEach(e=>lines.push(`  ${e.column?'Kolom: '+e.column+' | ':''}${e.message}`))
    lines.push('')
  })
  _trigger(lines.join('\n'), `error_report_${_safeName(log.filename)}.txt`, 'text/plain')
}

function dlFileError(log){
  if(!log.error_details?.length) return
  const dataErrors=log.error_details.filter(e=>e.row!==null&&e.row>1)
  const headerErrors=log.error_details.filter(e=>e.row===null||e.row===1)
  const tsvRows=[['No. Baris','Kolom Bermasalah','Pesan Error'].join('\t')]
  log.error_details.filter(e=>e.row===null).forEach(e=>
    tsvRows.push(['[FILE]',e.column||'—',e.message].join('\t')))
  log.error_details.filter(e=>e.row===1).forEach(e=>
    tsvRows.push([`Baris 1 (Header)`,e.column||'—',e.message].join('\t')))
  const sorted=[...dataErrors].sort((a,b)=>(a.row||0)-(b.row||0))
  sorted.forEach(e=>tsvRows.push([`Baris ${e.row}`,e.column||'—',e.message].join('\t')))
  const notes=headerErrors.map(e=>`# ${e.message}`).join('\n')
  const content=[
    `# File Error — ${log.filename}`,
    `# Dibuat: ${new Date().toLocaleString('id-ID')}`,
    `# Total baris data: ${log.total_rows} | Total error: ${log.total_errors}`,
    notes,'',
    ...tsvRows
  ].join('\n')
  _trigger(content, `file_error_${_safeName(log.filename)}.tsv`, 'text/tab-separated-values')
}


async function dlFileErrorXlsx(log){
  if(!log.error_details?.length) return

  const XLSX = await loadXLSX()

  // Kelompokkan pesan error per baris data
  const dataErrors = log.error_details.filter(e=>e.row!==null&&e.row>1)
  const msgByRow = {}
  dataErrors.forEach(e=>{
    if(!msgByRow[e.row]) msgByRow[e.row]=[]
    msgByRow[e.row].push(e.message)
  })
  const errorRowNums = Object.keys(msgByRow).map(Number).sort((a,b)=>a-b)

  // ── SHEET 1: File Error ──
  let sheet1Rows = []

  if(log.raw_lines && log.raw_lines.length > 1){
    // ✅ Ada raw_lines dari DB → tampilkan baris asli + Failure Message
    const headerCols = log.raw_lines[0].split('\t')
    sheet1Rows.push([...headerCols, 'Failure Message'])

    errorRowNums.forEach(rowNum=>{
      const lineIdx = rowNum - 1   // raw_lines[0]=header, raw_lines[1]=baris data ke-2
      const rawLine = log.raw_lines[lineIdx] || ''
      const cols = rawLine.split('\t')
      const msgs = msgByRow[rowNum] || []

      if(msgs.length <= 1){
        sheet1Rows.push([...cols, msgs[0]||''])
      } else {
        sheet1Rows.push([...cols, msgs[0]])
        msgs.slice(1).forEach(msg=>{
          const empty = Array(cols.length).fill('')
          sheet1Rows.push([...empty, msg])
        })
      }
    })
  } else {
    // ❌ Tidak ada raw_lines → fallback tabel error
    sheet1Rows.push(['No. Baris','Kolom Bermasalah','Failure Message'])
    errorRowNums.forEach(rowNum=>{
      msgByRow[rowNum].forEach(msg=>{
        const col = log.error_details.find(e=>e.row===rowNum&&e.message===msg)?.column||'—'
        sheet1Rows.push([`Baris ${rowNum}`, col, msg])
      })
    })
  }

  const headerFileErrors = log.error_details.filter(e=>e.row===null||e.row===1)
  const topNotes = headerFileErrors.map(e=>{
    const loc=e.row===null?'FILE':'HEADER'
    const col=e.column?` [${e.column}]`:''
    return [`[${loc}${col}]`, e.message]
  })

  const finalSheet1 = [
    ...(topNotes.length>0?[['⚠ Error Header / File:'],...topNotes,[]]:[]),
    ...sheet1Rows
  ]

  const ws1 = XLSX.utils.aoa_to_sheet(finalSheet1)
  if(log.raw_lines){
    const numCols = sheet1Rows[0]?.length || 6
    ws1['!cols'] = Array(numCols).fill(0).map((_,i)=>({wch: i===numCols-1?70:22}))
  } else {
    ws1['!cols'] = [{wch:16},{wch:28},{wch:70}]
  }

  // ── SHEET 2: Error Report ──
  const reportRows = [
    ['FILE VALIDATOR — ERROR REPORT'],
    [],
    ['File',        log.filename],
    ['Sumber',      SOURCE_LABEL[log.source]||log.source],
    ['Divalidasi',  log.validated_by||'—'],
    ['Waktu',       formatWIB(log.validated_at)],
    ['Total baris', log.total_rows],
    ['Total error', log.total_errors],
    [],
    ['No.','Lokasi','Kolom','Pesan Error'],
  ]
  log.error_details.forEach((e,i)=>{
    const loc=e.row===null?'FILE':e.row===1?'HEADER':`Baris ${e.row}`
    reportRows.push([i+1, loc, e.column||'—', e.message])
  })

  const ws2 = XLSX.utils.aoa_to_sheet(reportRows)
  ws2['!cols'] = [{wch:6},{wch:16},{wch:28},{wch:80}]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, 'File Error')
  XLSX.utils.book_append_sheet(wb, ws2, 'Error Report')
  XLSX.writeFile(wb, `file_error_${_safeName(log.filename)}.xlsx`)
}

function getMediaFromNotes(notes) {
  if (!notes) return 'Web'
  if (notes.includes('Postman')) return 'Postman / API'
  if (notes.includes('Web Upload')) return 'Web Upload'
  if (notes.includes('web')) return 'Web'
  return 'Web'
}

const css = `
  .hist-page { display: flex; flex-direction: column; gap: 16px; }

  /* Summary bar */
  .hist-stats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
  }

  .hist-stat {
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    padding: 16px 20px;
  }

  .hist-stat-label {
    font-size: 11px;
    color: var(--gray-400);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 6px;
    font-weight: 500;
  }

  .hist-stat-value {
    font-family: var(--font-display);
    font-size: 26px;
    
    color: var(--gray-900);
    line-height: 1;
  }

  .hist-stat-value.green { color: var(--accent); }
  .hist-stat-value.red   { color: var(--error); }

  /* Filter bar */
  .hist-filters {
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .hist-filter-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--gray-400);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    flex-shrink: 0;
  }

  .hist-select {
    padding: 6px 10px;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    font-size: 12.5px;
    color: var(--gray-700);
    background: var(--gray-50);
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s;
    font-family: var(--font-body);
  }
  .hist-select:focus { border-color: var(--accent); }

  .hist-search {
    flex: 1; min-width: 160px;
    padding: 6px 12px;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    font-size: 12.5px;
    color: var(--gray-700);
    background: var(--gray-50);
    outline: none;
    transition: border-color 0.15s;
    font-family: var(--font-body);
  }
  .hist-search:focus { border-color: var(--accent); }
  .hist-search::placeholder { color: var(--gray-300); }

  .hist-refresh-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 6px 12px;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    background: var(--white);
    color: var(--gray-600);
    font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
    font-family: var(--font-body);
    margin-left: auto;
  }
  .hist-refresh-btn:hover { border-color: var(--accent); color: var(--accent); }

  /* Table */
  .hist-table-card {
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .hist-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
    table-layout: fixed;
  }

  .hist-table th {
    background: var(--gray-50);
    padding: 10px 14px;
    text-align: left;
    font-size: 10.5px;
    font-weight: 600;
    color: var(--gray-500);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-bottom: 1px solid var(--gray-200);
    white-space: nowrap;
  }

  .hist-table td {
    padding: 10px 14px;
    border-bottom: 1px solid var(--gray-100);
    color: var(--gray-700);
    vertical-align: middle;
  }

  .hist-table tr:last-child td { border-bottom: none; }
  .hist-table tr:hover td { background: var(--gray-50); }

  /* Column sizing */
  .col-file     { width: 18%; }
  .col-status   { width: 7%; }
  .col-source   { width: 7%; }
  .col-media    { width: 7%; }
  .col-by       { width: 15%; }
  .col-errors   { width: 7%; }
  .col-dl       { width: 20%; }
  .col-time     { width: 19%; }

  .filename-text {
    font-family: monospace;
    font-size: 12px;
    color: var(--gray-800);
    word-break: break-all;
    line-height: 1.4;
  }

  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 8px; border-radius: 99px;
    font-size: 11px; font-weight: 600;
    white-space: nowrap;
  }
  .badge-valid   { background: #f0fdf4; color: #15803d; }
  .badge-invalid { background: #fef2f2; color: #dc2626; }

  .badge-source {
    display: inline-block;
    padding: 2px 7px; border-radius: 4px;
    font-size: 10.5px; font-weight: 500;
    background: var(--gray-100); color: var(--gray-600);
    white-space: nowrap;
  }

  .badge-media {
    display: inline-block;
    padding: 2px 7px; border-radius: 4px;
    font-size: 10.5px; font-weight: 500;
    white-space: nowrap;
  }
  .badge-media.web     { background: #eff6ff; color: #1d4ed8; }
  .badge-media.api     { background: #faf5ff; color: #7c3aed; }
  .badge-media.upload  { background: #f0fdf4; color: #15803d; }

  .by-email {
    font-size: 12px;
    color: var(--gray-600);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
    max-width: 100%;
  }

  .error-count { font-size: 12px; font-weight: 600; color: var(--error); }
  .error-zero  { font-size: 12px; color: var(--gray-300); }

  .time-text {
    font-size: 11.5px;
    color: var(--gray-500);
    line-height: 1.4;
  }

  .expand-btn {
    background: none; border: none; cursor: pointer;
    color: var(--accent); font-size: 11px;
    padding: 3px 8px; border-radius: 4px;
    transition: background 0.12s; font-family: var(--font-body);
    white-space: nowrap;
  }
  .expand-btn:hover { background: var(--accent-light); }

  .dl-btn-group { display: flex; flex-wrap: wrap; gap: 4px; }
  .dl-btn {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 4px 8px; border-radius: 5px;
    font-size: 10.5px; font-weight: 500;
    cursor: pointer; transition: all 0.12s;
    font-family: var(--font-body); white-space: nowrap;
    border: 1px solid;
    line-height: 1.2;
  }
  .dl-btn-report {
    border-color: var(--gray-200);
    background: var(--white); color: var(--gray-600);
  }
  .dl-btn-report:hover { border-color: var(--gray-400); color: var(--gray-900); }
  .dl-btn-tsv {
    border-color: var(--accent-mid);
    background: var(--accent-light); color: var(--accent-text);
  }
  .dl-btn-tsv:hover { background: #dcfce7; }
  .dl-btn-xlsx {
    border-color: #bbf7d0;
    background: #f0fdf4; color: #166534;
  }
  .dl-btn-xlsx:hover { background: #dcfce7; }

  .icon-btn {
    background: none; border: none; cursor: pointer;
    color: var(--gray-400); padding: 4px;
    border-radius: 4px; transition: all 0.12s;
    display: flex; align-items: center;
  }
  .icon-btn:hover { color: var(--accent); background: var(--accent-light); }

  /* Error detail */
  .error-detail-row td { background: var(--gray-50) !important; padding: 0 !important; }
  .error-detail-inner { padding: 12px 14px 14px; border-top: 1px dashed var(--gray-200); }
  .error-list { display: flex; flex-direction: column; gap: 4px; }

  .error-item {
    display: flex; align-items: flex-start; gap: 6px;
    font-size: 12px; color: var(--gray-800);
    padding: 6px 10px;
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: 6px;
    line-height: 1.5;
  }

  .error-loc {
    font-size: 10.5px; font-weight: 600;
    color: var(--error); background: var(--error-bg);
    border-radius: 3px; padding: 1px 5px;
    white-space: nowrap; flex-shrink: 0;
    margin-top: 1px;
  }

  .error-col {
    font-size: 10.5px; font-weight: 500;
    color: var(--gray-600); background: var(--gray-100);
    border-radius: 3px; padding: 1px 5px;
    white-space: nowrap; flex-shrink: 0;
    margin-top: 1px;
  }

  .more-errors {
    font-size: 11px; color: var(--gray-400);
    text-align: center; padding: 6px;
    
  }

  /* State views */
  .hist-empty {
    padding: 60px;
    text-align: center;
    color: var(--gray-400);
    font-size: 13px;
  }

  .hist-loading {
    padding: 60px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    color: var(--gray-400); font-size: 13px;
  }

  .hist-spinner {
    width: 15px; height: 15px;
    border: 2px solid var(--gray-200);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  .hist-error-msg {
    padding: 60px; text-align: center;
    color: var(--error); font-size: 13px;
  }
  .hist-stat-value.yellow { color: #d97706; }
  .warn-count { font-size: 12px; font-weight: 600; color: #d97706; }
  .badge-warn { background: #fffbeb; color: #d97706; }
`

function ErrorDetail({ errors, colSpan }) {
  if (!errors?.length) return null
  return (
    <tr className="error-detail-row">
      <td colSpan={colSpan}>
        <div className="error-detail-inner">
          <div className="error-list">
            {errors.slice(0, 15).map((e, i) => (
              <div key={i} className="error-item" style={e.level==='warn'?{background:'#fffbeb',borderColor:'#fde68a'}:{}}>
                <span className="error-loc" style={e.level==='warn'?{color:'#d97706',background:'#fffbeb',border:'1px solid #fde68a'}:{}}>
                  {e.row === null ? 'File' : `Baris ${e.row}`}
                </span>
                {e.level === 'warn' && <span style={{fontSize:10,fontWeight:700,color:'#d97706',background:'#fef3c7',padding:'1px 5px',borderRadius:3,flexShrink:0}}>WARN</span>}
                {e.column && <span className="error-col">{e.column}</span>}
                <span style={{ flex: 1, color: 'var(--gray-700)' }}>{(e.message||'').replace('[WARN] ','')}</span>
              </div>
            ))}
            {errors.length > 15 && (
              <div className="more-errors">...dan {errors.length - 15} error lainnya</div>
            )}
          </div>
        </div>
      </td>
    </tr>
  )
}

function HistRow({ log }) {
  const [expanded, setExpanded]   = useState(false)
  const [showCustom, setShowCustom] = useState(false)
  const hasErrors  = log.total_errors > 0
  const warnCount  = (log.error_details || []).filter(e => e.level === 'warn').length

  // Buat object result yang kompatibel dengan CustomDownloadModal
  const resultForModal = {
    file:      log.filename,
    errors:    log.error_details || [],
    raw_lines: log.raw_lines || null,   // dari DB jika tersedia
    total_rows: log.total_rows,
    folder:    log.source,
  }
  const media = getMediaFromNotes(log.notes)
  const mediaClass = media.includes('Postman') ? 'api' : media.includes('Upload') ? 'upload' : 'web'
  const mediaShort = media.includes('Postman') ? 'API' : media.includes('Upload') ? 'Upload' : 'Web'

  return (
    <>
      <tr>
        <td className="col-file">
          <span className="filename-text">{log.filename}</span>
        </td>
        <td className="col-status">
          <span className={`badge ${log.status === 'valid' ? 'badge-valid' : 'badge-invalid'}`}>
            {log.status === 'valid' ? '✓' : '✗'} {log.status === 'valid' ? 'Valid' : 'Error'}
          </span>
        </td>
        <td className="col-source">
          <span className="badge-source">{SOURCE_LABEL[log.source] || log.source}</span>
        </td>
        <td className="col-media">
          <span className={`badge-media ${mediaClass}`}>{mediaShort}</span>
        </td>
        <td className="col-by">
          <span className="by-email" title={log.validated_by}>{log.validated_by || '—'}</span>
        </td>
        <td className="col-errors">
          {(hasErrors || warnCount > 0) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
              {hasErrors && <span className="error-count">{log.total_errors}</span>}
              {warnCount > 0 && <span className="warn-count">⚠{warnCount}</span>}
              <button className="expand-btn" onClick={() => setExpanded(v => !v)}>
                {expanded ? '▲' : '▼'}
              </button>
            </div>
          ) : (
            <span className="error-zero">—</span>
          )}
        </td>
        <td className="col-dl">
          {hasErrors ? (
            <div className="dl-btn-group">
              <button className="dl-btn dl-btn-report" onClick={() => dlErrorReport(log)} title="Download ringkasan error (teks)">
                ↓ Report
              </button>
              <button className="dl-btn dl-btn-tsv" onClick={() => dlFileError(log)} title="Download file error (.tsv)">
                ↓ TSV
              </button>
              <button className="dl-btn dl-btn-xlsx" onClick={async () => await dlFileErrorXlsx(log)} title="Download File Error (.xlsx) — 2 sheet">
                ↓ Excel
              </button>
              <button
                className="dl-btn"
                onClick={() => setShowCustom(true)}
                title={log.raw_lines ? 'Pilih baris yang ingin didownload' : 'Download daftar error (data lama — validasi ulang untuk data lengkap)'}
                style={{
                  borderColor: 'var(--gray-800)',
                  background: 'var(--gray-900)',
                  color: 'var(--white)',
                  opacity: 1,
                }}
              >
                ⊞ Kustom
              </button>
            </div>
          ) : (
            <span style={{fontSize:11,color:'var(--gray-300)'}}>—</span>
          )}
        </td>
        <td className="col-time">
          <span className="time-text">{formatWIB(log.validated_at)}</span>
        </td>
      </tr>
      {expanded && <ErrorDetail errors={log.error_details} colSpan={7} />}
      {showCustom && (
        <CustomDownloadModal result={resultForModal} onClose={() => setShowCustom(false)} />
      )}
    </>
  )
}

export default function HistoryPage() {
  const { fileType } = useParams()
  const meta = TYPE_META[fileType] || TYPE_META.price
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [errMsg, setErrMsg] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [search, setSearch] = useState('')

  const fetchLogs = async () => {
    setLoading(true); setErrMsg('')
    try {
      const res = await api.get(`/validate/logs?file_type=${fileType}&limit=300`)
      setLogs(res.data.logs || [])
    } catch {
      setErrMsg('Gagal mengambil riwayat. Pastikan backend berjalan.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [fileType])

  const filtered = logs.filter(l => {
    if (filterStatus !== 'all' && l.status !== filterStatus) return false
    if (filterSource !== 'all' && l.source !== filterSource) return false
    if (search && !l.filename.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const totalValid   = logs.filter(l => l.status === 'valid').length
  const totalInvalid = logs.filter(l => l.status === 'invalid').length
  const totalErrors  = logs.reduce((acc, l) => acc + (l.total_errors || 0), 0)
  const totalWarns   = logs.reduce((acc, l) => acc + ((l.error_details || []).filter(e => e.level === 'warn').length), 0)

  return (
    <Layout
      title={`Riwayat ${meta.label}`}
      subtitle={`${logs.length} entri validasi tercatat`}
    >
      <style>{css}</style>
      <div className="hist-page">

        <div className="hist-stats">
          <div className="hist-stat">
            <div className="hist-stat-label">Total Validasi</div>
            <div className="hist-stat-value">{logs.length}</div>
          </div>
          <div className="hist-stat">
            <div className="hist-stat-label">File Valid</div>
            <div className={`hist-stat-value ${totalValid > 0 ? 'green' : ''}`}>{totalValid}</div>
          </div>
          <div className="hist-stat">
            <div className="hist-stat-label">File Invalid</div>
            <div className={`hist-stat-value ${totalInvalid > 0 ? 'red' : ''}`}>{totalInvalid}</div>
          </div>
          <div className="hist-stat">
            <div className="hist-stat-label">Total Error</div>
            <div className={`hist-stat-value ${totalErrors > 0 ? 'red' : ''}`}>{totalErrors}</div>
          </div>
          <div className="hist-stat">
            <div className="hist-stat-label">Warning</div>
            <div className={`hist-stat-value ${totalWarns > 0 ? 'yellow' : ''}`}>{totalWarns}</div>
          </div>
        </div>

        <div className="hist-filters">
          <span className="hist-filter-label">Filter</span>
          <select className="hist-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">Semua status</option>
            <option value="valid">Valid</option>
            <option value="invalid">Invalid</option>
          </select>
          <select className="hist-select" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
            <option value="all">Semua sumber</option>
            <option value="inbox">Folder Inbox</option>
            <option value="error">Folder Error</option>
            <option value="upload">Web Upload</option>
          </select>
          <input
            className="hist-search"
            placeholder="Cari nama file..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="hist-refresh-btn" onClick={fetchLogs}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>

        <div className="hist-table-card">
          {loading ? (
            <div className="hist-loading">
              <div className="hist-spinner" /> Memuat riwayat...
            </div>
          ) : errMsg ? (
            <div className="hist-error-msg">{errMsg}</div>
          ) : filtered.length === 0 ? (
            <div className="hist-empty">Tidak ada riwayat validasi ditemukan.</div>
          ) : (
            <table className="hist-table">
              <thead>
                <tr>
                  <th className="col-file">Nama File</th>
                  <th className="col-status">Status</th>
                  <th className="col-source">Sumber</th>
                  <th className="col-media">Media</th>
                  <th className="col-by">Divalidasi Oleh</th>
                  <th className="col-errors">Error</th>
                  <th className="col-dl">Download</th>
                  <th className="col-time">Waktu (WIB)</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(log => <HistRow key={log.id} log={log} />)}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </Layout>
  )
}
