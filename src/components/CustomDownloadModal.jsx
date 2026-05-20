/**
 * CustomDownloadModal
 * Modal untuk download baris kustom dari hasil validasi.
 *
 * Props:
 *   result   — object hasil validasi: { file, errors, raw_lines, total_rows }
 *   onClose  — callback saat modal ditutup
 *
 * Cara kerja:
 *   - raw_lines[0] = baris header file asli
 *   - raw_lines[1..n] = baris data (index = nomor baris - 1)
 *   - Baris 1 (header) SELALU disertakan di output, tidak bisa dihapus
 *   - User pilih baris via checkbox ATAU input range "5-10, 25, 30-40"
 *   - Download sebagai .xlsx atau .tsv
 */

import { useState, useEffect, useMemo } from 'react'

// ── Lazy load SheetJS ──────────────────────────────────
async function loadXLSX() {
  return (await import('xlsx'))
}

// ── Parse input range "1-5, 10, 20-25" → Set of numbers ──
function parseRange(input, maxRow) {
  const nums = new Set()
  const parts = input.split(',').map(s => s.trim()).filter(Boolean)
  for (const part of parts) {
    if (part.includes('-')) {
      const [a, b] = part.split('-').map(s => parseInt(s.trim()))
      if (!isNaN(a) && !isNaN(b)) {
        for (let i = Math.max(2, a); i <= Math.min(maxRow + 1, b); i++) nums.add(i)
      }
    } else {
      const n = parseInt(part)
      if (!isNaN(n) && n >= 2 && n <= maxRow + 1) nums.add(n)
    }
  }
  return nums
}


// ── Deteksi kolom pencarian berdasarkan posisi kolom ──
//
// ATURAN SEDERHANA:
//   Price     → selalu kolom PERTAMA (index 0)
//               V1: PARENT / GENERIC / SPU
//               V2: GENERIC
//               Apapun nama kolomnya, cari di kolom pertama
//
//   Inventory → selalu kolom KEDUA (index 1)
//               V1: ItemNumber
//               V2: SKU
//               Apapun nama kolomnya, cari di kolom kedua
//
//   Master    → selalu kolom KEDUA (index 1)
//               PARENT/GENERIC/SPU
//
function detectSearchCol(filename, headerCols) {
  // Aturan pencarian berdasarkan POSISI kolom:
  //   Price     → kolom PERTAMA (index 0): PARENT/GENERIC/SPU atau GENERIC
  //   Inventory → kolom KEDUA  (index 1): ItemNumber atau SKU
  //   Master    → kolom KEDUA  (index 1): PARENT/GENERIC/SPU
  const fn = (filename || '').toLowerCase()

  if (fn.includes('inventory') || fn.includes('inv_') || fn.includes('_inv') ||
      fn.includes('iab') || fn.includes('inv__')) {
    // Inventory: selalu kolom ke-2 (index 1)
    const label = headerCols[1] || 'Kolom 2'
    return { idx: 1, label }
  }

  if (fn.includes('master') || fn.includes('mst_') || fn.includes('_mst') ||
      fn.includes('master_')) {
    // Master: selalu kolom ke-2 (index 1)
    const label = headerCols[1] || 'Kolom 2'
    return { idx: 1, label }
  }

  // Price (default): selalu kolom ke-1 (index 0)
  const label = headerCols[0] || 'Kolom 1'
  return { idx: 0, label }
}

// ── Parse multi-line nilai pencarian ──
// Input: satu nilai per baris
// Output: array string (lowercase untuk case-insensitive)
function parseSearchValues(text) {
  return text
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean)
}

// ── Helpers ──
function _safeName(f) {
  return (f || 'unknown').replace(/\.txt$/i, '').replace(/[^a-zA-Z0-9._-]/g, '_')
}

function triggerBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Build error map: row_num → [messages] ──
function buildErrorMap(errors) {
  const map = {}
  ;(errors || []).filter(e => e.row !== null && e.row > 1).forEach(e => {
    if (!map[e.row]) map[e.row] = []
    map[e.row].push(e.message)
  })
  return map
}

// ── CSS ──────────────────────────────────────────────────
const css = `
  .cdm-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.55);
    z-index: 1000;
    display: flex; align-items: center; justify-content: center;
    padding: 20px;
    animation: fadeIn 0.15s ease;
  }

  .cdm-modal {
    background: var(--white);
    border-radius: var(--radius-xl);
    width: 100%; max-width: 780px;
    height: 88vh;
    display: flex; flex-direction: column;
    box-shadow: 0 24px 64px rgba(0,0,0,0.18);
    animation: fadeUp 0.2s ease;
    overflow: hidden;
  }

  /* Header */
  .cdm-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid var(--gray-200);
    flex-shrink: 0;
  }

  .cdm-title { font-size: 16px; font-weight: 600; color: var(--gray-900); }
  .cdm-sub   { font-size: 12px; color: var(--gray-400); margin-top: 2px; }

  .cdm-close-btn {
    background: none; border: none; cursor: pointer;
    color: var(--gray-400); padding: 4px; border-radius: 6px;
    display: flex; align-items: center;
    transition: all 0.12s; flex-shrink: 0; margin-left: 12px;
  }
  .cdm-close-btn:hover { background: var(--gray-100); color: var(--gray-700); }

  /* Controls */
  .cdm-controls {
    padding: 14px 24px;
    border-bottom: 1px solid var(--gray-100);
    display: flex; flex-direction: column; gap: 10px;
    flex-shrink: 0;
    background: var(--gray-50);
  }

  .cdm-controls-row {
    display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  }

  .cdm-label {
    font-size: 11px; font-weight: 600;
    color: var(--gray-500); text-transform: uppercase;
    letter-spacing: 0.06em; white-space: nowrap;
  }

  .cdm-range-input {
    flex: 1; min-width: 200px;
    padding: 7px 12px;
    border: 1.5px solid var(--gray-200);
    border-radius: var(--radius-md);
    font-size: 13px; color: var(--gray-900);
    background: var(--white); outline: none;
    font-family: monospace;
    transition: border-color 0.15s;
  }
  .cdm-range-input:focus { border-color: var(--accent); }
  .cdm-range-input::placeholder { color: var(--gray-300); font-family: var(--font-body); }
  .cdm-range-input.error { border-color: var(--error); }

  .cdm-range-hint {
    font-size: 11px; color: var(--gray-400);
  }
  .cdm-range-hint.error { color: var(--error); }

  .cdm-chip-btn {
    padding: 5px 12px; border-radius: 99px;
    font-size: 12px; font-weight: 500; cursor: pointer;
    border: 1.5px solid var(--gray-200);
    background: var(--white); color: var(--gray-600);
    transition: all 0.12s; white-space: nowrap;
    font-family: var(--font-body);
  }
  .cdm-chip-btn:hover { border-color: var(--accent); color: var(--accent); }
  .cdm-chip-btn.active { background: var(--accent); color: var(--white); border-color: var(--accent); }

  /* Selected count bar */
  .cdm-selected-bar {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 24px;
    background: var(--accent-light);
    border-bottom: 1px solid var(--accent-mid);
    flex-shrink: 0;
  }

  .cdm-selected-count {
    font-size: 12px; font-weight: 500; color: var(--accent-text);
  }

  .cdm-clear-btn {
    margin-left: auto; font-size: 12px; color: var(--accent);
    background: none; border: none; cursor: pointer;
    font-family: var(--font-body); text-decoration: underline;
  }

  /* Table */
  .cdm-table-wrap {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .cdm-table {
    width: 100%; border-collapse: collapse;
    font-size: 12.5px; table-layout: fixed;
  }

  .cdm-table th {
    background: var(--gray-900); color: var(--white);
    padding: 9px 12px; text-align: left;
    font-size: 11px; font-weight: 600;
    letter-spacing: 0.04em; white-space: nowrap;
    position: sticky; top: 0; z-index: 2;
  }

  .cdm-table th:first-child { width: 44px; text-align: center; }
  .cdm-table th:nth-child(2) { width: 72px; }

  .cdm-table td {
    padding: 7px 12px;
    border-bottom: 1px solid var(--gray-100);
    color: var(--gray-700); vertical-align: middle;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .cdm-table td:first-child { text-align: center; }

  .cdm-table tr.selected td  { background: var(--accent-light); }
  .cdm-table tr.has-error td { border-left: 2px solid var(--error); }
  .cdm-table tr.is-header-row td { background: var(--gray-900) !important; color: var(--white); font-weight: 600; pointer-events: none; }
  .cdm-table tr:hover:not(.is-header-row):not(.selected) td { background: var(--gray-50); }

  .cdm-row-num {
    font-size: 11px; color: var(--gray-400);
    font-family: monospace;
  }
  .cdm-row-num.has-error { color: var(--error); font-weight: 600; }

  .cdm-error-pill {
    display: inline-block;
    background: var(--error-bg);
    color: var(--error);
    font-size: 10px; font-weight: 600;
    padding: 1px 6px; border-radius: 99px;
    margin-left: 6px; vertical-align: middle;
    white-space: nowrap;
  }

  .cdm-cb {
    width: 15px; height: 15px; cursor: pointer;
    accent-color: var(--accent);
  }

  /* Footer */
  .cdm-footer {
    padding: 14px 24px;
    border-top: 1px solid var(--gray-200);
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-shrink: 0;
    background: var(--white);
  }

  .cdm-footer-left { font-size: 12px; color: var(--gray-400); }
  .cdm-footer-right { display: flex; gap: 8px; }

  .cdm-dl-btn {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: var(--radius-md);
    font-size: 13px; font-weight: 500; cursor: pointer;
    border: none; font-family: var(--font-body);
    transition: all 0.15s; white-space: nowrap;
  }
  .cdm-dl-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .cdm-dl-btn.tsv  { background: var(--gray-100); color: var(--gray-700); border: 1.5px solid var(--gray-200); }
  .cdm-dl-btn.tsv:hover:not(:disabled)  { background: var(--gray-200); }
  .cdm-dl-btn.xlsx { background: var(--accent); color: var(--white); }
  .cdm-dl-btn.xlsx:hover:not(:disabled) { background: var(--accent-dark); }

  .cdm-spinner {
    width: 13px; height: 13px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }
  .cdm-spinner.dark {
    border-color: rgba(0,0,0,0.1);
    border-top-color: var(--gray-600);
  }

  /* ── Mode tabs ── */
  .cdm-mode-tabs {
    display: flex;
    border-bottom: 1px solid var(--gray-200);
    flex-shrink: 0;
    background: var(--white);
  }
  .cdm-mode-tab {
    padding: 10px 20px;
    font-size: 13px; font-weight: 400;
    color: var(--gray-400);
    cursor: pointer; border: none; background: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    transition: all 0.12s;
    font-family: var(--font-body);
    display: flex; align-items: center; gap: 6px;
    white-space: nowrap;
  }
  .cdm-mode-tab:hover { color: var(--gray-700); }
  .cdm-mode-tab.active { color: var(--gray-900); font-weight: 500; border-bottom-color: var(--gray-900); }

  /* ── Search mode ── */
  .cdm-search-panel {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .cdm-search-top {
    padding: 14px 24px;
    border-bottom: 1px solid var(--gray-100);
    background: var(--gray-50);
    flex-shrink: 0;
    overflow-y: auto;
  }

  .cdm-search-label {
    font-size: 11px; font-weight: 600;
    color: var(--gray-500);
    text-transform: uppercase; letter-spacing: 0.06em;
    margin-bottom: 6px;
  }

  .cdm-search-col-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: var(--gray-900); color: var(--white);
    font-size: 11px; font-weight: 600;
    padding: 3px 9px; border-radius: 99px;
    font-family: monospace;
    margin-bottom: 10px;
  }

  .cdm-search-textarea {
    width: 100%;
    height: 110px;
    padding: 9px 12px;
    border: 1.5px solid var(--gray-200);
    border-radius: var(--radius-md);
    font-size: 12.5px;
    font-family: monospace;
    color: var(--gray-900);
    background: var(--white);
    outline: none;
    resize: vertical;
    line-height: 1.6;
    transition: border-color 0.15s;
  }
  .cdm-search-textarea:focus { border-color: var(--accent); }
  .cdm-search-textarea::placeholder { color: var(--gray-300); font-family: var(--font-body); }

  .cdm-search-hint {
    font-size: 11px; color: var(--gray-400);
    margin-top: 5px; line-height: 1.5;
  }

  .cdm-search-results {
    flex: 1;
    overflow-y: auto;
    padding: 12px 24px;
    min-height: 0;
  }

  .cdm-search-stat {
    display: flex; align-items: center; gap: 8px;
    font-size: 12px; color: var(--gray-500);
    margin-bottom: 10px; flex-wrap: wrap;
  }

  .cdm-search-stat-found { color: var(--accent); font-weight: 600; }
  .cdm-search-stat-missing { color: var(--error); font-weight: 600; }

  .cdm-missing-list {
    background: var(--error-bg);
    border: 1px solid var(--error-border);
    border-radius: var(--radius-md);
    padding: 10px 14px;
    margin-bottom: 10px;
  }
  .cdm-missing-title {
    font-size: 11px; font-weight: 600;
    color: var(--error); margin-bottom: 6px;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .cdm-missing-item {
    font-size: 12px; font-family: monospace;
    color: var(--error); padding: 1px 0;
  }

  .cdm-search-preview-title {
    font-size: 11px; font-weight: 600;
    color: var(--gray-500);
    text-transform: uppercase; letter-spacing: 0.06em;
    margin-bottom: 8px;
  }

  .cdm-search-preview-table {
    width: 100%; border-collapse: collapse;
    font-size: 12px;
  }
  .cdm-search-preview-table th {
    background: var(--gray-900); color: var(--white);
    padding: 7px 10px; text-align: left;
    font-size: 10.5px; font-weight: 600;
    white-space: nowrap; position: sticky; top: 0;
  }
  .cdm-search-preview-table td {
    padding: 6px 10px;
    border-bottom: 1px solid var(--gray-100);
    color: var(--gray-700);
    max-width: 180px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .cdm-search-preview-table tr.has-error td { border-left: 2px solid var(--error); }
  .cdm-search-preview-table td.key-col { font-weight: 600; color: var(--gray-900); background: var(--accent-light); }
  .cdm-search-preview-table td.err-msg { font-size: 11px; color: var(--error); max-width: 220px; }
`


// ── Fallback: tidak ada raw_lines ────────────────────────────
// Digunakan saat data riwayat lama (belum ada raw_lines di DB)
// atau saat folder inbox/error tanpa raw data.
// User tetap bisa download daftar error per baris dalam TSV/Excel.
function CustomDownloadFallback({ result, errorMap, errorRowNums, onClose }) {
  const [xlsxLoading, setXlsxLoading] = useState(false)
  const filename = result?.file || 'file'
  const errors   = result?.errors || []

  const downloadFallbackTSV = () => {
    const rows = [['No. Baris', 'Kolom Bermasalah', 'Failure Message']]
    // File/header level errors
    errors.filter(e => e.row === null || e.row === 1).forEach(e => {
      const loc = e.row === null ? 'FILE' : 'HEADER'
      rows.push([`[${loc}]`, e.column || '—', e.message])
    })
    // Data errors grouped by row
    const sortedNums = [...errorRowNums].sort((a, b) => a - b)
    sortedNums.forEach(rowNum => {
      ;(errorMap[rowNum] || []).forEach(msg => {
        const col = errors.find(e => e.row === rowNum && e.message === msg)?.column || '—'
        rows.push([`Baris ${rowNum}`, col, msg])
      })
    })
    const tsv = rows.map(r => r.join('\t')).join('\n')
    const blob = new Blob(['\uFEFF' + tsv], { type: 'text/tab-separated-values;charset=utf-8' })
    triggerBlob(blob, `error_rows_${_safeName(filename)}.tsv`)
  }

  const downloadFallbackXLSX = async () => {
    setXlsxLoading(true)
    try {
      const XLSX = await loadXLSX()
      const rows = [['No. Baris', 'Kolom Bermasalah', 'Failure Message']]
      errors.filter(e => e.row === null || e.row === 1).forEach(e => {
        const loc = e.row === null ? 'FILE' : 'HEADER'
        rows.push([`[${loc}]`, e.column || '—', e.message])
      })
      const sortedNums = [...errorRowNums].sort((a, b) => a - b)
      sortedNums.forEach(rowNum => {
        ;(errorMap[rowNum] || []).forEach(msg => {
          const col = errors.find(e => e.row === rowNum && e.message === msg)?.column || '—'
          rows.push([`Baris ${rowNum}`, col, msg])
        })
      })
      const ws = XLSX.utils.aoa_to_sheet(rows)
      ws['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 75 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Error Rows')
      XLSX.writeFile(wb, `error_rows_${_safeName(filename)}.xlsx`)
    } finally {
      setXlsxLoading(false)
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="cdm-overlay" onClick={onClose}>
        <div className="cdm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
          <div className="cdm-header">
            <div>
              <div className="cdm-title">Download Baris Error</div>
              <div className="cdm-sub">{filename} · {errorRowNums.size} baris error</div>
            </div>
            <button className="cdm-close-btn" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div style={{ padding: '16px 24px', background: 'var(--warning-bg)', borderBottom: '1px solid #fde68a' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--warning)', marginBottom: 4 }}>
                  Data baris asli tidak tersedia
                </div>
                <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
                  Validasi ini dilakukan sebelum fitur download kustom tersedia, sehingga baris asli file tidak tersimpan.
                  Download di bawah akan berisi <strong>daftar error per baris</strong> (tanpa nilai data aslinya).
                  Untuk mendapat data lengkap, validasi ulang file ini.
                </div>
              </div>
            </div>
          </div>

          {/* Preview error list */}
          <div style={{ padding: '16px 24px', overflowY: 'auto', maxHeight: 280 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              {errors.length} error ditemukan
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr>
                  {['Lokasi', 'Kolom', 'Pesan Error'].map(h => (
                    <th key={h} style={{ background: 'var(--gray-50)', padding: '7px 10px', textAlign: 'left', fontSize: 10.5, fontWeight: 600, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {errors.map((e, i) => (
                  <tr key={i}>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--gray-100)', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: e.row === null ? 'var(--warning)' : 'var(--error)', background: e.row === null ? 'var(--warning-bg)' : 'var(--error-bg)', borderRadius: 3, padding: '1px 5px' }}>
                        {e.row === null ? 'FILE' : e.row === 1 ? 'HEADER' : `Baris ${e.row}`}
                      </span>
                    </td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--gray-100)', color: 'var(--gray-600)', fontSize: 12, whiteSpace: 'nowrap' }}>{e.column || '—'}</td>
                    <td style={{ padding: '6px 10px', borderBottom: '1px solid var(--gray-100)', color: 'var(--gray-700)', lineHeight: 1.5 }}>{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="cdm-footer">
            <div className="cdm-footer-left">Download semua {errors.length} error</div>
            <div className="cdm-footer-right">
              <button className="cdm-dl-btn tsv" onClick={downloadFallbackTSV}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download TSV
              </button>
              <button className="cdm-dl-btn xlsx" disabled={xlsxLoading} onClick={downloadFallbackXLSX}>
                {xlsxLoading
                  ? <><div className="cdm-spinner" />Memproses...</>
                  : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Download Excel</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Main Component ────────────────────────────────────────
export default function CustomDownloadModal({ result, onClose }) {
  const rawLines  = result?.raw_lines || []
  const errors    = result?.errors || []
  const filename  = result?.file || 'file'

  // raw_lines[0] = header, raw_lines[1..] = data rows
  // dataRows[i] corresponds to file line (i+2) — baris ke-2 dst
  const headerLine = rawLines[0] || ''
  const dataLines  = rawLines.slice(1)
  const totalDataRows = dataLines.length

  const errorMap = useMemo(() => buildErrorMap(errors), [errors])

  // ── Mode: 'row' = pilih per baris, 'search' = cari per kolom ──
  const [mode, setMode] = useState('row')

  // ── State mode baris ──
  const [selected, setSelected]     = useState(new Set())
  const [rangeInput, setRangeInput] = useState('')
  const [rangeError, setRangeError] = useState('')
  const [xlsxLoading, setXlsxLoading] = useState(false)
  const [activePreset, setActivePreset] = useState(null)

  // ── State mode pencarian kolom ──
  const headerCols = useMemo(() => headerLine.split('\t'), [headerLine])
  const searchCol  = useMemo(() => detectSearchCol(filename, headerCols), [filename, headerCols])
  const [searchText, setSearchText]   = useState('')
  const [searchXlsxLoading, setSearchXlsxLoading] = useState(false)

  // Hasil pencarian: { foundRows: [{rowNum, cols, msgs}], missing: [string] }
  const searchResult = useMemo(() => {
    const values = parseSearchValues(searchText)
    if (!values.length) return { foundRows: [], missing: [] }

    const lowerVals = values.map(v => v.toLowerCase())
    const colIdx    = searchCol.idx
    const found     = []
    const foundKeys = new Set()

    dataLines.forEach((line, idx) => {
      const cols   = line.split('\t')
      const keyVal = (cols[colIdx] || '').trim()
      const keyLow = keyVal.toLowerCase()
      if (lowerVals.includes(keyLow)) {
        foundKeys.add(keyLow)
        const rowNum = idx + 2
        found.push({
          rowNum,
          cols,
          keyVal,
          msgs: (errorMap[rowNum] || []),
        })
      }
    })

    const missing = values.filter(v => !foundKeys.has(v.toLowerCase()))
    return { foundRows: found, missing }
  }, [searchText, dataLines, searchCol, errorMap])

  // ── Preset: pilih semua error rows ──
  const errorRowNums = useMemo(() =>
    new Set(Object.keys(errorMap).map(Number)),
    [errorMap]
  )

  const handlePresetErrors = () => {
    setSelected(new Set(errorRowNums))
    setRangeInput([...errorRowNums].sort((a,b)=>a-b).join(', '))
    setActivePreset('errors')
    setRangeError('')
  }

  const handlePresetAll = () => {
    const all = new Set()
    for (let i = 2; i <= totalDataRows + 1; i++) all.add(i)
    setSelected(all)
    setRangeInput(`2-${totalDataRows + 1}`)
    setActivePreset('all')
    setRangeError('')
  }

  const handleClear = () => {
    setSelected(new Set())
    setRangeInput('')
    setRangeError('')
    setActivePreset(null)
  }

  // ── Parse range input ──
  const handleRangeChange = (val) => {
    setRangeInput(val)
    setActivePreset(null)
    if (!val.trim()) { setSelected(new Set()); setRangeError(''); return }

    // Validate input characters
    if (/[^0-9,\-\s]/.test(val)) {
      setRangeError('Hanya angka, koma, dan tanda hubung yang diperbolehkan')
      return
    }

    const parsed = parseRange(val, totalDataRows)
    if (parsed.size === 0) {
      setRangeError(`Baris tidak ditemukan. Rentang valid: 2–${totalDataRows + 1}`)
    } else {
      setRangeError('')
    }
    setSelected(parsed)
  }

  // ── Toggle single row ──
  const toggleRow = (rowNum) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(rowNum) ? next.delete(rowNum) : next.add(rowNum)
      return next
    })
    setActivePreset(null)
    // Update range input to reflect selection
    setRangeInput('')
  }

  // ── Build output rows for download ──
  const buildOutputRows = () => {
    const rows = [headerCols] // baris 1 selalu ada

    const sortedNums = [...selected].sort((a, b) => a - b)
    for (const rowNum of sortedNums) {
      const idx = rowNum - 2
      const line = dataLines[idx] || ''
      rows.push(line.split('\t'))
    }
    return { rows }
  }

  // ── Download Search Mode — TSV ──
  const downloadSearchTSV = () => {
    const { foundRows } = searchResult
    if (!foundRows.length) return
    // TSV tidak menyertakan Failure Message — hanya data asli file
    const rows = [headerCols]
    foundRows.forEach(({ cols }) => {
      rows.push(cols)
    })
    const tsv = rows.map(r => r.join('\t')).join('\n')
    const blob = new Blob(['\uFEFF' + tsv], { type: 'text/tab-separated-values;charset=utf-8' })
    triggerBlob(blob, `search_${_safeName(filename)}.tsv`)
  }

  // ── Download Search Mode — XLSX ──
  const downloadSearchXLSX = async () => {
    const { foundRows, missing } = searchResult
    if (!foundRows.length) return
    setSearchXlsxLoading(true)
    try {
      const XLSX = await loadXLSX()

      // Sheet 1: Data hasil pencarian
      const sheet1 = [
        [...headerCols, 'Failure Message'],
        ...foundRows.map(({ cols, msgs }) => [...cols, msgs.join(' | ')])
      ]
      const ws1 = XLSX.utils.aoa_to_sheet(sheet1)
      const numCols = sheet1[0].length
      ws1['!cols'] = Array(numCols).fill(0).map((_, i) => ({
        wch: i === numCols - 1 ? 60 : 20
      }))

      // Sheet 2: Info pencarian
      const searchedVals = parseSearchValues(searchText)
      const sheet2 = [
        ['INFO PENCARIAN'],
        [],
        ['File',              filename],
        ['Kolom pencarian',   searchCol.label],
        ['Total nilai dicari', searchedVals.length],
        ['Baris ditemukan',   foundRows.length],
        ['Tidak ditemukan',   missing.length],
        ['Dibuat',            new Date().toLocaleString('id-ID')],
        [],
        ['Nilai yang dicari:'],
        ...searchedVals.map(v => [v, missing.includes(v) ? '⚠ Tidak ditemukan' : `✓ ${foundRows.filter(r => r.keyVal.toLowerCase() === v.toLowerCase()).length} baris`]),
      ]
      const ws2 = XLSX.utils.aoa_to_sheet(sheet2)
      ws2['!cols'] = [{ wch: 35 }, { wch: 25 }]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, 'Data')
      XLSX.utils.book_append_sheet(wb, ws2, 'Info Pencarian')
      XLSX.writeFile(wb, `search_${_safeName(filename)}.xlsx`)
    } finally {
      setSearchXlsxLoading(false)
    }
  }

  // ── Download TSV ──
  const downloadTSV = () => {
    const { rows } = buildOutputRows()
    // TSV tidak menyertakan Failure Message — hanya data asli file
    const tsv = rows.map(r => r.join('\t')).join('\n')
    const blob = new Blob(['\uFEFF' + tsv], { type: 'text/tab-separated-values;charset=utf-8' })
    triggerBlob(blob, `custom_${_safeName(filename)}.tsv`)
  }

  // ── Download Excel ──
  const downloadXLSX = async () => {
    setXlsxLoading(true)
    try {
      const XLSX = await loadXLSX()
      const { rows } = buildOutputRows()

      // Sheet 1: File Data dengan Failure Message
      const sortedNums = [...selected].sort((a, b) => a - b)
      const sheet1 = rows.map((cols, i) => {
        if (i === 0) return [...cols, 'Failure Message']
        const rowNum = sortedNums[i - 1]
        const msgs = (errorMap[rowNum] || []).join(' | ')
        return [...cols, msgs]
      })

      const ws1 = XLSX.utils.aoa_to_sheet(sheet1)
      const numCols = sheet1[0]?.length || 2
      ws1['!cols'] = Array(numCols).fill(0).map((_, i) => ({
        wch: i === numCols - 1 ? 60 : 22
      }))

      // Sheet 2: Info — file + baris yang dipilih
      const infoRows = [
        ['File',          filename],
        ['Total baris dipilih', selected.size],
        ['Baris dipilih', sortedNums.join(', ')],
        ['Dibuat',        new Date().toLocaleString('id-ID')],
        [],
        ['Catatan: Baris 1 (header) selalu disertakan sebagai acuan kolom.'],
      ]

      // Error summary untuk baris yang dipilih
      const selectedErrors = errors.filter(e => e.row !== null && e.row > 1 && selected.has(e.row))
      if (selectedErrors.length > 0) {
        infoRows.push([])
        infoRows.push(['Error pada baris yang dipilih:'])
        infoRows.push(['Baris', 'Kolom', 'Pesan Error'])
        selectedErrors.forEach(e => {
          infoRows.push([`Baris ${e.row}`, e.column || '—', e.message])
        })
      }

      const ws2 = XLSX.utils.aoa_to_sheet(infoRows)
      ws2['!cols'] = [{ wch: 22 }, { wch: 60 }]

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws1, 'Data')
      XLSX.utils.book_append_sheet(wb, ws2, 'Info')
      XLSX.writeFile(wb, `custom_${_safeName(filename)}.xlsx`)
    } finally {
      setXlsxLoading(false)
    }
  }

  // ── Prevent background scroll ──
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const canDownload = selected.size > 0

  // ── Render ──
  // Mode terbatas: tidak ada raw_lines (data lama di DB atau folder tanpa raw data)
  // Tampilkan modal sederhana — hanya bisa download baris error berdasarkan nomor baris
  if (!rawLines.length) {
    return (
      <CustomDownloadFallback
        result={result}
        errorMap={errorMap}
        errorRowNums={errorRowNums}
        onClose={onClose}
      />
    )
  }

  return (
    <>
      <style>{css}</style>
      <div className="cdm-overlay" onClick={onClose}>
        <div className="cdm-modal" onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="cdm-header">
            <div>
              <div className="cdm-title">Download Kustom</div>
              <div className="cdm-sub">
                {filename} · {totalDataRows} baris data · {errorRowNums.size} baris error
              </div>
            </div>
            <button className="cdm-close-btn" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="cdm-mode-tabs">
            <button
              className={`cdm-mode-tab${mode === 'row' ? ' active' : ''}`}
              onClick={() => setMode('row')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
              Pilih Baris
            </button>
            <button
              className={`cdm-mode-tab${mode === 'search' ? ' active' : ''}`}
              onClick={() => setMode('search')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              Cari per Kolom
            </button>
          </div>

          {/* ── ROW MODE ── */}
          {mode === 'row' && (
          <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0, overflow:'hidden' }}>

          {/* Controls */}
          <div className="cdm-controls">
            {/* Preset buttons */}
            <div className="cdm-controls-row">
              <span className="cdm-label">Pilih cepat</span>
              <button
                className={`cdm-chip-btn${activePreset === 'errors' ? ' active' : ''}`}
                onClick={handlePresetErrors}
                disabled={errorRowNums.size === 0}
              >
                ✗ Semua baris error ({errorRowNums.size})
              </button>
              <button
                className={`cdm-chip-btn${activePreset === 'all' ? ' active' : ''}`}
                onClick={handlePresetAll}
              >
                ☑ Semua baris ({totalDataRows})
              </button>
              <button className="cdm-chip-btn" onClick={handleClear}>
                ✕ Hapus pilihan
              </button>
            </div>

            {/* Range input */}
            <div className="cdm-controls-row">
              <span className="cdm-label">Input range</span>
              <input
                className={`cdm-range-input${rangeError ? ' error' : ''}`}
                placeholder="Contoh: 2-10, 25, 30-40"
                value={rangeInput}
                onChange={e => handleRangeChange(e.target.value)}
              />
              <span className={`cdm-range-hint${rangeError ? ' error' : ''}`}>
                {rangeError || `Rentang: baris 2–${totalDataRows + 1}`}
              </span>
            </div>
          </div>

          {/* Selected count bar */}
          {selected.size > 0 && (
            <div className="cdm-selected-bar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="cdm-selected-count">
                {selected.size} baris dipilih
                {selected.size > 0 && errorRowNums.size > 0 && (() => {
                  const errSelected = [...selected].filter(n => errorRowNums.has(n)).length
                  return errSelected > 0 ? ` · ${errSelected} di antaranya mengandung error` : ''
                })()}
              </span>
              <button className="cdm-clear-btn" onClick={handleClear}>Hapus pilihan</button>
            </div>
          )}

          {/* Table */}
          <div className="cdm-table-wrap">
            <table className="cdm-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Baris</th>
                  {headerCols.map((h, i) => (
                    <th key={i} title={h}>{h || `Kolom ${i+1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Baris 1: Header — selalu terpilih, tidak bisa di-uncheck */}
                <tr className="is-header-row">
                  <td>
                    <input type="checkbox" className="cdm-cb" checked readOnly />
                  </td>
                  <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>1 (Header)</td>
                  {headerCols.map((h, i) => <td key={i}>{h}</td>)}
                </tr>

                {/* Baris data */}
                {dataLines.map((line, idx) => {
                  const rowNum  = idx + 2  // baris ke-2 dst
                  const cols    = line.split('\t')
                  const hasErr  = errorMap[rowNum]?.length > 0
                  const isSel   = selected.has(rowNum)
                  const errMsgs = errorMap[rowNum] || []

                  return (
                    <tr
                      key={rowNum}
                      className={[isSel ? 'selected' : '', hasErr ? 'has-error' : ''].join(' ')}
                      onClick={() => toggleRow(rowNum)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="cdm-cb"
                          checked={isSel}
                          onChange={() => toggleRow(rowNum)}
                        />
                      </td>
                      <td>
                        <span className={`cdm-row-num${hasErr ? ' has-error' : ''}`}>
                          {rowNum}
                        </span>
                        {hasErr && (
                          <span className="cdm-error-pill" title={errMsgs.join('\n')}>
                            {errMsgs.length} err
                          </span>
                        )}
                      </td>
                      {cols.map((c, i) => (
                        <td key={i} title={c}>{c}</td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer — Row mode */}
          <div className="cdm-footer">
            <div className="cdm-footer-left">
              {canDownload
                ? `Siap download ${selected.size} baris + header`
                : 'Pilih minimal 1 baris untuk download'
              }
            </div>
            <div className="cdm-footer-right">
              <button
                className="cdm-dl-btn tsv"
                disabled={!canDownload}
                onClick={downloadTSV}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download TSV
              </button>
              <button
                className="cdm-dl-btn xlsx"
                disabled={!canDownload || xlsxLoading}
                onClick={downloadXLSX}
              >
                {xlsxLoading ? (
                  <><div className="cdm-spinner" />Memproses...</>
                ) : (
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Excel
                  </>
                )}
              </button>
            </div>
          </div>

          </div>)} {/* end mode === row */}

          {/* ── SEARCH MODE ── */}
          {mode === 'search' && (
            <div className="cdm-search-panel">
              <div className="cdm-search-top">
                <div className="cdm-search-label">Cari berdasarkan kolom</div>
                <div className="cdm-search-col-badge">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                  {searchCol.label}
                </div>
                <textarea
                  className="cdm-search-textarea"
                  placeholder={`Ketik nilai satu per baris.\nContoh:\nBRKBXG40606.458\nBRKBXL42192.449\nBRKBXG45071.458`}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                />
                <div className="cdm-search-hint">
                  Satu nilai per baris · tidak case-sensitive · semua baris yang cocok akan disertakan
                </div>
              </div>

              <div className="cdm-search-results">
                {searchText.trim() && (
                  <>
                    {/* Missing values warning */}
                    {searchResult.missing.length > 0 && (
                      <div className="cdm-missing-list">
                        <div className="cdm-missing-title">
                          ⚠ {searchResult.missing.length} nilai tidak ditemukan
                        </div>
                        {searchResult.missing.map((v, i) => (
                          <div key={i} className="cdm-missing-item">{v}</div>
                        ))}
                      </div>
                    )}

                    {/* Stats */}
                    <div className="cdm-search-stat">
                      <span>
                        Dari <strong>{parseSearchValues(searchText).length}</strong> nilai dicari:
                      </span>
                      <span className="cdm-search-stat-found">
                        ✓ {searchResult.foundRows.length} baris ditemukan
                      </span>
                      {searchResult.missing.length > 0 && (
                        <span className="cdm-search-stat-missing">
                          ✗ {searchResult.missing.length} tidak ditemukan
                        </span>
                      )}
                    </div>

                    {/* Preview table */}
                    {searchResult.foundRows.length > 0 && (
                      <>
                        <div className="cdm-search-preview-title">
                          Preview — {searchResult.foundRows.length} baris
                        </div>
                        <table className="cdm-search-preview-table">
                          <thead>
                            <tr>
                              <th>Baris</th>
                              {headerCols.map((h, i) => (
                                <th key={i}
                                  style={{ background: i === searchCol.idx ? '#16a34a' : undefined }}
                                >
                                  {h || `Kol ${i+1}`}
                                </th>
                              ))}
                              <th>Failure Message</th>
                            </tr>
                          </thead>
                          <tbody>
                            {searchResult.foundRows.slice(0, 50).map(({ rowNum, cols, msgs }) => (
                              <tr key={rowNum} className={msgs.length > 0 ? 'has-error' : ''}>
                                <td style={{ color: 'var(--gray-400)', fontSize: 11, fontFamily: 'monospace' }}>
                                  {rowNum}
                                </td>
                                {cols.map((c, i) => (
                                  <td key={i} className={i === searchCol.idx ? 'key-col' : ''} title={c}>
                                    {c}
                                  </td>
                                ))}
                                <td className="err-msg">{msgs.join(' | ') || '—'}</td>
                              </tr>
                            ))}
                            {searchResult.foundRows.length > 50 && (
                              <tr>
                                <td colSpan={headerCols.length + 2}
                                  style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 11, fontStyle: 'italic', padding: '8px' }}>
                                  ...dan {searchResult.foundRows.length - 50} baris lainnya (ditampilkan di file download)
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </>
                    )}
                  </>
                )}

                {!searchText.trim() && (
                  <div style={{ textAlign: 'center', color: 'var(--gray-300)', fontSize: 13, padding: '32px 0' }}>
                    Masukkan nilai di atas untuk mulai pencarian
                  </div>
                )}
              </div>

              {/* Footer — Search mode */}
              <div className="cdm-footer">
                <div className="cdm-footer-left">
                  {searchResult.foundRows.length > 0
                    ? `${searchResult.foundRows.length} baris siap didownload`
                    : 'Belum ada hasil pencarian'
                  }
                </div>
                <div className="cdm-footer-right">
                  <button
                    className="cdm-dl-btn tsv"
                    disabled={searchResult.foundRows.length === 0}
                    onClick={downloadSearchTSV}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download TSV
                  </button>
                  <button
                    className="cdm-dl-btn xlsx"
                    disabled={searchResult.foundRows.length === 0 || searchXlsxLoading}
                    onClick={downloadSearchXLSX}
                  >
                    {searchXlsxLoading ? (
                      <><div className="cdm-spinner" />Memproses...</>
                    ) : (
                      <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download Excel
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
