import { useState } from 'react'
import CustomDownloadModal from './CustomDownloadModal'

// ── Lazy load SheetJS ──────────────────────────────────
async function loadXLSX() {
  return (await import('xlsx'))
}

// ═══════════════════════════════════════════════════════
//  DOWNLOAD 1: Error Report (text summary)
// ═══════════════════════════════════════════════════════
function downloadErrorReport(result) {
  if (!result.errors?.length) return

  const byRow = {}
  result.errors.forEach(e => {
    const key = e.row === null ? 'FILE' : `ROW_${e.row}`
    if (!byRow[key]) byRow[key] = []
    byRow[key].push(e)
  })

  const lines = []
  lines.push('='.repeat(60))
  lines.push('FILE VALIDATOR — ERROR REPORT')
  lines.push(`File    : ${result.file || 'unknown'}`)
  lines.push(`Folder  : ${result.folder || '-'}`)
  lines.push(`Total   : ${result.total_rows} baris data`)
  lines.push(`Error   : ${result.errors.filter(e => e.level !== 'warn').length} error ditemukan`)
  lines.push(`Warning : ${result.errors.filter(e => e.level === 'warn').length} warning`)
  lines.push(`Dibuat  : ${new Date().toLocaleString('id-ID')}`)
  lines.push('='.repeat(60))
  lines.push('')

  Object.entries(byRow).forEach(([key, errs]) => {
    lines.push(key === 'FILE' ? '[LEVEL FILE]' : `[${key.replace('_', ' ')}]`)
    errs.forEach(e => {
      const prefix = e.level === 'warn' ? '[WARN] ' : ''
      const col = e.column ? `Kolom: ${e.column} | ` : ''
      lines.push(`  ${prefix}${col}${e.message.replace('[WARN] ', '')}`)
    })
    lines.push('')
  })

  _triggerDownload(lines.join('\n'), `error_report_${_safeName(result.file)}.txt`, 'text/plain')
}

// ═══════════════════════════════════════════════════════
//  DOWNLOAD 2: File Error TSV
// ═══════════════════════════════════════════════════════
function downloadFileError(result) {
  if (!result.errors?.length) return
  const dataErrors = result.errors.filter(e => e.row !== null && e.row > 1)
  const headerErrors = result.errors.filter(e => e.row === null || e.row === 1)
  const tsvRows = [['No. Baris', 'Kolom Bermasalah', 'Level', 'Pesan Error'].join('\t')]
  result.errors.filter(e => e.row === null).forEach(e =>
    tsvRows.push(['[FILE]', e.column || '—', e.level === 'warn' ? 'WARN' : 'ERROR', e.message.replace('[WARN] ', '')].join('\t')))
  result.errors.filter(e => e.row === 1).forEach(e =>
    tsvRows.push([`Baris 1 (Header)`, e.column || '—', e.level === 'warn' ? 'WARN' : 'ERROR', e.message.replace('[WARN] ', '')].join('\t')))
  const sorted = [...dataErrors].sort((a, b) => (a.row || 0) - (b.row || 0))
  sorted.forEach(e => tsvRows.push([`Baris ${e.row}`, e.column || '—', e.level === 'warn' ? 'WARN' : 'ERROR', e.message.replace('[WARN] ', '')].join('\t')))
  const content = [`# File Error — ${result.file || 'unknown'}`, `# Dibuat: ${new Date().toLocaleString('id-ID')}`, '', ...tsvRows].join('\n')
  _triggerDownload(content, `file_error_${_safeName(result.file)}.tsv`, 'text/tab-separated-values')
}

// ═══════════════════════════════════════════════════════
//  DOWNLOAD 3: File Error Excel 2 sheet (lazy SheetJS)
// ═══════════════════════════════════════════════════════
async function downloadFileErrorXlsx(result) {
  if (!result.errors?.length) return
  const XLSX = await loadXLSX()

  const dataErrors = result.errors.filter(e => e.row !== null && e.row > 1)
  const msgByRow = {}
  dataErrors.forEach(e => {
    if (!msgByRow[e.row]) msgByRow[e.row] = []
    msgByRow[e.row].push({ msg: e.message.replace('[WARN] ', ''), level: e.level || 'error' })
  })
  const errorRowNums = Object.keys(msgByRow).map(Number).sort((a, b) => a - b)

  let sheet1Rows = []
  if (result.raw_lines && result.raw_lines.length > 1) {
    const headerCols = result.raw_lines[0].split('\t')
    sheet1Rows.push([...headerCols, 'Level', 'Failure Message'])
    errorRowNums.forEach(rowNum => {
      const lineIdx = rowNum - 1
      const cols = (result.raw_lines[lineIdx] || '').split('\t')
      const items = msgByRow[rowNum] || []
      if (items.length <= 1) {
        sheet1Rows.push([...cols, items[0]?.level?.toUpperCase() || 'ERROR', items[0]?.msg || ''])
      } else {
        sheet1Rows.push([...cols, items[0].level.toUpperCase(), items[0].msg])
        items.slice(1).forEach(item => {
          sheet1Rows.push([...Array(cols.length).fill(''), item.level.toUpperCase(), item.msg])
        })
      }
    })
  } else {
    sheet1Rows.push(['No. Baris', 'Kolom Bermasalah', 'Level', 'Failure Message'])
    errorRowNums.forEach(rowNum => {
      msgByRow[rowNum].forEach(item => {
        const col = result.errors.find(e => e.row === rowNum && e.message.includes(item.msg))?.column || '—'
        sheet1Rows.push([`Baris ${rowNum}`, col, item.level.toUpperCase(), item.msg])
      })
    })
  }

  const headerFileErrors = result.errors.filter(e => e.row === null || e.row === 1)
  const topNotes = headerFileErrors.map(e => [`[${e.row === null ? 'FILE' : 'HEADER'}${e.column ? ' — ' + e.column : ''}]`, e.message.replace('[WARN] ', '')])
  const finalSheet1 = [...(topNotes.length > 0 ? [['⚠ Catatan Header / File:'], ...topNotes, []] : []), ...sheet1Rows]

  const ws1 = XLSX.utils.aoa_to_sheet(finalSheet1)
  const numCols = sheet1Rows[0]?.length || 5
  ws1['!cols'] = Array(numCols).fill(0).map((_, i) => ({ wch: i >= numCols - 2 ? (i === numCols - 1 ? 70 : 10) : 22 }))

  const reportRows = [
    ['FILE VALIDATOR — ERROR REPORT'], [],
    ['File', result.file || '—'],
    ['Total baris', result.total_rows],
    ['Total error', result.errors.filter(e => e.level !== 'warn').length],
    ['Total warning', result.errors.filter(e => e.level === 'warn').length],
    ['Dibuat', new Date().toLocaleString('id-ID')], [],
    ['No.', 'Lokasi', 'Kolom', 'Level', 'Pesan'],
  ]
  result.errors.forEach((e, i) => {
    const loc = e.row === null ? 'FILE' : e.row === 1 ? 'HEADER' : `Baris ${e.row}`
    reportRows.push([i + 1, loc, e.column || '—', (e.level || 'error').toUpperCase(), e.message.replace('[WARN] ', '')])
  })
  const ws2 = XLSX.utils.aoa_to_sheet(reportRows)
  ws2['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 28 }, { wch: 8 }, { wch: 80 }]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws1, 'File Error')
  XLSX.utils.book_append_sheet(wb, ws2, 'Error Report')
  XLSX.writeFile(wb, `file_error_${_safeName(result.file)}.xlsx`)
}

function _safeName(f) { return (f || 'unknown').replace(/\.txt$/i, '').replace(/[^a-zA-Z0-9._-]/g, '_') }
function _triggerDownload(content, filename, mime) {
  const bom = mime.includes('tab-separated') ? '\uFEFF' : ''
  const blob = new Blob([bom + content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

function DownloadButtons({ result, compact = false }) {
  if (!result.errors?.length) return null
  const s = {
    display: 'flex', alignItems: 'center', gap: 5,
    padding: compact ? '3px 8px' : '4px 10px', borderRadius: 6,
    border: '1px solid var(--gray-200)', background: 'var(--white)',
    color: 'var(--gray-600)', fontSize: 11, fontWeight: 500,
    cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap',
  }
  const DownIcon = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'wrap' }}>
      <button onClick={e => { e.stopPropagation(); downloadErrorReport(result) }} style={s}
        onMouseEnter={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--gray-400)', color: 'var(--gray-800)' })}
        onMouseLeave={e => Object.assign(e.currentTarget.style, { borderColor: 'var(--gray-200)', color: 'var(--gray-600)' })}>
        <DownIcon /> Report
      </button>
      <button onClick={e => { e.stopPropagation(); downloadFileError(result) }}
        style={{ ...s, color: 'var(--accent)', borderColor: 'var(--accent-mid)', background: 'var(--accent-light)' }}
        onMouseEnter={e => Object.assign(e.currentTarget.style, { background: '#dcfce7', borderColor: 'var(--accent)' })}
        onMouseLeave={e => Object.assign(e.currentTarget.style, { background: 'var(--accent-light)', borderColor: 'var(--accent-mid)' })}>
        <DownIcon /> TSV
      </button>
      <button onClick={async e => { e.stopPropagation(); await downloadFileErrorXlsx(result) }}
        style={{ ...s, color: '#166534', borderColor: '#bbf7d0', background: '#f0fdf4' }}
        onMouseEnter={e => Object.assign(e.currentTarget.style, { background: '#dcfce7' })}
        onMouseLeave={e => Object.assign(e.currentTarget.style, { background: '#f0fdf4' })}>
        <DownIcon /> Excel
      </button>
    </div>
  )
}

// ══ CSS ══════════════════════════════════════════════════
const css = `
  .vr-wrap { display: flex; flex-direction: column; gap: 14px; margin-top: 20px; animation: fadeUp 0.3s ease; }
  .vr-summary { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; }
  .vr-stat { background: var(--white); border: 1px solid var(--gray-200); border-radius: var(--radius-lg); padding: 14px 16px; }
  .vr-stat-label { font-size: 10px; font-weight: 600; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 5px; }
  .vr-stat-value { font-family: var(--font-display); font-size: 24px; color: var(--gray-900); line-height: 1; }
  .vr-stat-value.green  { color: var(--accent); }
  .vr-stat-value.red    { color: var(--error); }
  .vr-stat-value.yellow { color: #d97706; }

  .vr-card { background: var(--white); border: 1px solid var(--gray-200); border-radius: var(--radius-lg); overflow: hidden; }
  .vr-card.is-valid   { border-left: 3px solid var(--accent); }
  .vr-card.is-invalid { border-left: 3px solid var(--error); }
  .vr-card.is-warn    { border-left: 3px solid #f59e0b; }

  .vr-card-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; cursor: pointer; transition: background 0.12s; user-select: none; gap: 12px; }
  .vr-card-header:hover { background: var(--gray-50); }
  .vr-card-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }

  .vr-badge { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
  .vr-badge.valid   { background: #f0fdf4; color: #15803d; }
  .vr-badge.invalid { background: #fef2f2; color: #dc2626; }
  .vr-badge.warn    { background: #fffbeb; color: #d97706; }

  .vr-dup-banner {
    display: flex; align-items: flex-start; gap: 8px;
    background: #fffbeb; border-top: 1px solid #fde68a;
    padding: 10px 14px; font-size: 12px; color: #92400e;
  }

  .vr-filename { font-size: 12.5px; font-weight: 500; color: var(--gray-900); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .vr-meta { font-size: 11px; color: var(--gray-400); margin-top: 1px; }
  .vr-chevron { color: var(--gray-300); transition: transform 0.18s; flex-shrink: 0; }
  .vr-chevron.open { transform: rotate(180deg); }

  .vr-table-wrap { overflow-x: auto; }
  .vr-table { width: 100%; border-collapse: collapse; font-size: 12.5px; }
  .vr-table th { background: var(--gray-50); padding: 8px 14px; text-align: left; font-size: 10.5px; font-weight: 600; color: var(--gray-500); letter-spacing: 0.06em; text-transform: uppercase; border-top: 1px solid var(--gray-200); border-bottom: 1px solid var(--gray-200); white-space: nowrap; }
  .vr-table td { padding: 9px 14px; border-bottom: 1px solid var(--gray-100); color: var(--gray-700); vertical-align: top; }
  .vr-table tr:last-child td { border-bottom: none; }
  .vr-table tr:hover td { background: var(--gray-50); }
  .vr-table tr.is-warn-row td { background: #fffbeb; }

  .vr-loc { font-size: 11px; font-weight: 600; color: var(--error); background: var(--error-bg); border-radius: 3px; padding: 2px 6px; display: inline-block; white-space: nowrap; }
  .vr-loc.file-level { color: var(--warning); background: var(--warning-bg); }
  .vr-loc.warn-level { color: #d97706; background: #fffbeb; border: 1px solid #fde68a; }
  .vr-col-tag { font-size: 11px; font-weight: 500; color: var(--gray-600); background: var(--gray-100); border-radius: 3px; padding: 2px 6px; display: inline-block; white-space: nowrap; }
  .vr-warn-tag { font-size: 10px; font-weight: 700; color: #d97706; background: #fffbeb; border: 1px solid #fde68a; border-radius: 3px; padding: 1px 5px; display: inline-block; white-space: nowrap; margin-left: 4px; }

  .vr-msg { color: var(--gray-800); line-height: 1.5; }
  .vr-msg code { font-family: monospace; font-size: 11.5px; background: var(--gray-100); padding: 1px 5px; border-radius: 3px; color: var(--error); }
  .vr-valid-notice { display: flex; align-items: center; gap: 9px; padding: 16px; color: var(--accent); font-size: 13px; font-weight: 500; }
  .vr-empty { text-align: center; padding: 40px; color: var(--gray-400); font-size: 13px; }
`

function fmtMsg(msg) {
  const clean = msg.replace('[WARN] ', '')
  const parts = clean.split(/('.*?')/)
  return parts.map((p, i) =>
    p.startsWith("'") && p.endsWith("'")
      ? <code key={i}>{p.slice(1, -1)}</code>
      : p
  )
}

function FileCard({ result }) {
  const [open, setOpen] = useState(!result.valid || (result.errors || []).some(e => e.level === 'warn'))
  const [showCustom, setShowCustom] = useState(false)

  const errors = (result.errors || []).filter(e => e.level !== 'warn')
  const warns  = (result.errors || []).filter(e => e.level === 'warn')
  const isValid = result.valid
  const hasWarn = warns.length > 0
  const hasDup  = !!result.duplicate_warning
  const allIssues = result.errors || []

  // Card border class
  const cardClass = `vr-card ${!isValid ? 'is-invalid' : hasWarn ? 'is-warn' : 'is-valid'}`

  // Badge
  let badgeClass = 'valid', badgeText = '✓ Valid'
  if (!isValid) { badgeClass = 'invalid'; badgeText = `✗ ${errors.length} Error` }
  else if (hasWarn) { badgeClass = 'warn'; badgeText = `⚠ ${warns.length} Warning` }
  if (!isValid && hasWarn) badgeText = `✗ ${errors.length} Error · ⚠ ${warns.length} Warn`

  return (
    <>
      <style>{css}</style>
      <div className={cardClass}>
        {/* Duplicate warning banner */}
        {hasDup && (
          <div className="vr-dup-banner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span><strong>Duplikat:</strong> {result.duplicate_warning}</span>
          </div>
        )}

        <div className="vr-card-header" onClick={() => setOpen(v => !v)}>
          <div className="vr-card-left">
            <span className={`vr-badge ${badgeClass}`}>{badgeText}</span>
            <div style={{ minWidth: 0 }}>
              <div className="vr-filename">{result.file || 'Unknown'}</div>
              <div className="vr-meta">
                {result.folder !== 'upload' ? `Folder: ${result.folder} · ` : ''}
                {result.total_rows} baris data
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {allIssues.length > 0 && <DownloadButtons result={result} />}
            {allIssues.length > 0 && result.raw_lines?.length > 0 && (
              <button
                onClick={e => { e.stopPropagation(); setShowCustom(true) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                  borderRadius: 6, border: '1.5px solid var(--gray-800)',
                  background: 'var(--gray-900)', color: 'var(--white)',
                  fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'var(--font-body)', whiteSpace: 'nowrap'
                }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                </svg>
                Kustom
              </button>
            )}
            <svg className={`vr-chevron${open ? ' open' : ''}`} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </div>

        {open && (
          isValid && !hasWarn ? (
            <div className="vr-valid-notice">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Semua baris valid. Tidak ada error ditemukan.
            </div>
          ) : (
            <div className="vr-table-wrap">
              <table className="vr-table">
                <thead>
                  <tr>
                    <th style={{ width: '12%' }}>Lokasi</th>
                    <th style={{ width: '18%' }}>Kolom</th>
                    <th style={{ width: '8%' }}>Level</th>
                    <th>Keterangan</th>
                  </tr>
                </thead>
                <tbody>
                  {allIssues.map((e, i) => {
                    const isWarn = e.level === 'warn'
                    const isFileLevel = e.row === null
                    return (
                      <tr key={i} className={isWarn ? 'is-warn-row' : ''}>
                        <td>
                          <span className={`vr-loc${isFileLevel ? ' file-level' : ''}${isWarn ? ' warn-level' : ''}`}>
                            {e.row === null ? 'File' : `Baris ${e.row}`}
                          </span>
                        </td>
                        <td>
                          {e.column
                            ? <span className="vr-col-tag">{e.column}</span>
                            : <span style={{ color: 'var(--gray-300)' }}>—</span>
                          }
                        </td>
                        <td>
                          {isWarn
                            ? <span className="vr-warn-tag">WARN</span>
                            : <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--error)' }}>ERROR</span>
                          }
                        </td>
                        <td className="vr-msg">{fmtMsg(e.message)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
      {showCustom && (
        <CustomDownloadModal result={result} onClose={() => setShowCustom(false)} />
      )}
    </>
  )
}



export default function ValidationResult({ data }) {
  if (!data) return null
  const { summary, results } = data

  const totalErrors = summary.total_errors || 0
  const totalWarns  = summary.total_warns  || 0

  return (
    <>
      <style>{css}</style>
      <div className="vr-wrap">
        <div className="vr-summary">
          <div className="vr-stat">
            <div className="vr-stat-label">Total File</div>
            <div className="vr-stat-value">{summary.total_files}</div>
          </div>
          <div className="vr-stat">
            <div className="vr-stat-label">Valid</div>
            <div className={`vr-stat-value ${summary.valid_files > 0 ? 'green' : ''}`}>{summary.valid_files}</div>
          </div>
          <div className="vr-stat">
            <div className="vr-stat-label">Invalid</div>
            <div className={`vr-stat-value ${summary.invalid_files > 0 ? 'red' : ''}`}>{summary.invalid_files}</div>
          </div>
          <div className="vr-stat">
            <div className="vr-stat-label">Total Error</div>
            <div className={`vr-stat-value ${totalErrors > 0 ? 'red' : ''}`}>{totalErrors}</div>
          </div>
          <div className="vr-stat">
            <div className="vr-stat-label">Warning</div>
            <div className={`vr-stat-value ${totalWarns > 0 ? 'yellow' : ''}`}>{totalWarns}</div>
          </div>
        </div>

        {results.length === 0
          ? <div className="vr-empty">Tidak ada hasil validasi.</div>
          : results.map((r, i) => <FileCard key={i} result={r} />)
        }
      </div>
    </>
  )
}

export { downloadErrorReport, downloadFileError, downloadFileErrorXlsx, DownloadButtons, _safeName, _triggerDownload }
