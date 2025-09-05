# Bridging Apotek Online BPJS

Sistem integrasi apotek online dengan layanan BPJS Kesehatan untuk sinkronisasi data resep, klaim, dan monitoring transaksi.

## Deskripsi Project

Aplikasi web ini memungkinkan apotek untuk:
- Melakukan sinkronisasi data dengan sistem BPJS Kesehatan
- Monitoring klaim dan status pembayaran
- Mapping obat sesuai dengan formularium BPJS
- Tracking data SEP (Surat Eligibilitas Peserta)
- Logging request dan response API BPJS

## Instalasi dan Setup

Pastikan Node.js & npm sudah terinstall - [install dengan nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Langkah-langkah instalasi:

```sh
# Step 1: Clone repository
git clone https://github.com/basoro/bridging-apotek-online-bpjs.git

# Step 2: Masuk ke direktori project
cd bridging-apotek-online-bpjs

# Step 3: Install dependencies
npm install

# Step 4: Jalankan development server
npm run dev

# Step 5: Jalankan backend server (terminal terpisah)
cd server
npm install
node server.js
```

## Konfigurasi BPJS

Sebelum menggunakan aplikasi, pastikan untuk mengkonfigurasi:

1. **Credentials BPJS**: Username, password, dan consumer key
2. **URL Endpoint**: URL API BPJS sesuai environment (development/production)
3. **Kode Apotek**: Kode apotek yang terdaftar di BPJS
4. **Mapping Obat**: Pemetaan kode obat internal dengan kode BPJS

## Teknologi yang Digunakan

Project ini dibangun menggunakan:

**Frontend:**
- React + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- shadcn-ui (UI components)
- React Router (routing)

**Backend:**
- Node.js + Express
- RESTful API

**Integrasi:**
- BPJS Kesehatan API
- HTTP Client untuk komunikasi dengan web service BPJS

## Fitur Utama

### 1. Dashboard Monitoring
- Overview statistik klaim dan transaksi
- Status koneksi dengan server BPJS
- Ringkasan data harian/bulanan

### 2. Manajemen Resep
- Input dan validasi data resep
- Sinkronisasi dengan database BPJS
- Tracking status pembayaran

### 3. Mapping Obat
- Pemetaan kode obat lokal dengan kode BPJS
- Validasi formularium BPJS
- Update harga dan stok

### 4. Data SEP
- Input dan validasi data SEP
- Monitoring status SEP
- Laporan SEP per periode

### 5. Integrasi SIMRS
- Integrasi dengan SIMRS untuk sinkronisasi data pasien
- Input dan validasi data resep dan obat
- Monitoring status integrasi
- Support untuk SIMRS mLITE, Khanza, SIMGOS (on progress) 

### 6. Logging System
- Log semua request/response API BPJS
- Error tracking dan debugging
- Audit trail transaksi

## Deployment

Untuk deployment production:

1. Build aplikasi frontend:
```sh
npm run build
```

2. Setup environment variables untuk production
3. Deploy ke web server (Apache/Nginx)
4. Konfigurasi SSL certificate
5. Setup database dan backup routine

## Kontribusi

Untuk berkontribusi pada project ini:
1. Fork repository
2. Buat branch fitur baru
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## Lisensi

Project ini menggunakan lisensi MIT. Lihat file LICENSE untuk detail lengkap.
