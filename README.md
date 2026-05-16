# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
# File Validator — Frontend (React + Vite)

## Struktur Project
```
frontend/
├── src/
│   ├── api/
│   │   └── client.js           ← Axios instance + auth interceptor
│   ├── context/
│   │   └── AuthContext.jsx     ← Global login state (JWT)
│   ├── components/
│   │   ├── Layout.jsx          ← Sidebar + page wrapper
│   │   ├── ValidationPage.jsx  ← Tab panel (Upload / Inbox / Error)
│   │   └── ValidationResult.jsx← Tabel log error hasil validasi
│   ├── pages/
│   │   ├── Dashboard.jsx       ← Halaman utama
│   │   └── ValidatePages.jsx   ← Price, Inventory, Master Product page
│   ├── LoginPage.jsx           ← Halaman login
│   ├── App.jsx                 ← Router & route protection
│   ├── main.jsx                ← Entry point
│   └── index.css               ← Design system (CSS variables)
├── vite.config.js              ← Proxy ke FastAPI di port 8000
├── package.json
└── index.html
```

## Cara Menjalankan

### Pastikan backend sudah jalan di port 8000 dulu!

```bash
# Terminal 1 — Backend
cd backend
venv/Scripts/activate        # Windows
# atau: source venv/bin/activate  (Mac/Linux)
uvicorn app.main:app --reload --port 8000
```

```bash
# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Buka browser: **http://localhost:5173**

---

## Login Default
- **Email:** admin@company.com
- **Password:** admin123

---

## Halaman yang Tersedia

| URL | Keterangan |
|-----|------------|
| `/login` | Halaman login |
| `/dashboard` | Dashboard utama |
| `/validate/price` | Validasi File Price |
| `/validate/inventory` | Validasi File Inventory |
| `/validate/master` | Validasi File Master Product |

---

## Fitur per Halaman Validasi

Setiap halaman validasi memiliki 3 tab:

1. **Upload File** — Drag & drop atau klik untuk upload file .txt langsung
2. **Folder Inbox** — Validasi file di folder inbox server (kosongkan nama = semua file)
3. **Folder Error** — Validasi file di folder error server

Hasil validasi menampilkan:
- Summary: total file, valid, invalid, total error
- Per file: status badge, jumlah baris, dan tabel error detail
- Per error: lokasi baris, nama kolom, dan keterangan lengkap
