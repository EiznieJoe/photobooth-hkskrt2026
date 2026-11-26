# Photobooth Hari Keusahawanan SK Rugading 2026

App photobooth untuk tetamu. Buka link, pilih tema dan bingkai, ambil gambar, simpan. Setiap gambar juga dihantar sendiri ke folder Google Drive anda.

Ada 8 tema, setiap satu ada bingkai Potret dan Landskap:

| Tema | Warna | Nama fail |
|---|---|---|
| Karnival | Biru | `biru` |
| Manisan | Ungu | `ungu` |
| Pasar | Hijau | `hijau` |
| Tropika | Merah Jambu | `merahjambu` |
| Pantai | Biru Laut | `pantai` |
| Kuning | Kuning | `kuning` |
| Karnival 2 | Merah | `karnival` |
| Candyland | Pink | `candyland` |

Contoh nama fail gambar: `HKSKRT2026_ungu_potret_20261126_093015.jpg`

---

## Isi folder

| Fail / folder | Guna untuk apa |
|---|---|
| `index.html`, `style.css`, `app.js` | App itu sendiri. Tak perlu diubah. |
| `config.js` | **Satu-satunya fail yang anda ubah** (tampal link Apps Script). |
| `sw.js`, `manifest.webmanifest` | Supaya app boleh dipasang dan dibuka tanpa internet. |
| `frames/` | 16 bingkai yang dah dipotong. |
| `icons/` | Ikon app (logo sekolah). |
| `apps-script/Code.gs` | Skrip untuk Google Drive. Ini disalin ke Google Apps Script, bukan GitHub. |

Ikut langkah A hingga E di bawah, ikut turutan.

---

## Langkah A: Sediakan folder Google Drive

1. Buka Google Drive dengan akaun yang **akan memiliki** gambar-gambar ini.
2. Buka folder simpanan gambar (atau buat folder baru).
3. Lihat link di atas browser. Contohnya:
   `https://drive.google.com/drive/folders/1lz4Pt4hQJ_ia04OHtNzfcxleGAp0vqqF`
   Bahagian selepas `/folders/` ialah **ID folder**: `1lz4Pt4hQJ_ia04OHtNzfcxleGAp0vqqF`

> **Penting:** folder ini **tidak perlu** dibuka kepada "Anyone with the link". Skrip menyimpan gambar menggunakan akaun anda sendiri. Kalau folder dibuka kepada umum, sesiapa yang dapat link boleh tengok gambar murid. Lebih selamat kekalkan folder private, dan kongsi dengan guru tertentu sahaja bila perlu.

---

## Langkah B: Pasang Google Apps Script (untuk upload ke Drive)

1. Pergi ke **https://script.google.com** (guna akaun Google yang sama dengan folder Drive tadi).
2. Tekan **New project** (Projek baharu).
3. Padam semua kod yang ada dalam kotak.
4. Buka fail `apps-script/Code.gs` dari folder ini (boleh buka dengan Notepad), salin **semua**, tampal dalam kotak tadi.
5. Pada baris `const FOLDER_ID = '...'`, pastikan ID dalam tanda petik ialah ID folder anda dari Langkah A.
6. Tekan ikon **Save** (disket). Tukar nama projek kalau nak, contoh "Photobooth HKSKRT2026".
7. Beri kebenaran Drive:
   - Di bahagian atas, pilih fungsi **ujiSetup**, kemudian tekan **Run**.
   - Keluar tetingkap "Authorization required" → **Review permissions** → pilih akaun anda.
   - Kalau keluar "Google hasn't verified this app" → tekan **Advanced** → **Go to Photobooth (unsafe)** → **Allow**. (Ini normal, sebab skrip ini anda sendiri yang buat.)
   - Di bawah, log patut tunjuk: `Folder dijumpai: <nama folder anda>`.
8. Terbitkan sebagai web app:
   - Tekan **Deploy** (biru, atas kanan) → **New deployment**.
   - Tekan ikon gear ⚙ di sebelah "Select type" → pilih **Web app**.
   - **Execute as:** `Me`
   - **Who has access:** `Anyone`
   - Tekan **Deploy**.
9. Salin **Web app URL**. Ia berakhir dengan `/exec`, contoh:
   `https://script.google.com/macros/s/AKfycbx..../exec`
10. Ujian kecil: tampal link itu di tab browser baru. Patut keluar tulisan `"Photobooth HKSKRT2026 aktif"`.

> **Akaun MOE (@moe-dl.edu.my):** sesetengah akaun sekolah tidak tunjuk pilihan **Anyone** (hanya "Anyone within..."). Kalau begitu, upload akan gagal dari telefon tetamu. Penyelesaian: buat Langkah A dan B guna akaun Gmail biasa.

> **Kalau ubah kod Code.gs selepas ini:** Deploy → **Manage deployments** → ikon pensel → Version: **New version** → Deploy. Link `/exec` kekal sama.

---

## Langkah C: Masukkan link ke dalam app

1. Buka `config.js` dengan Notepad.
2. Ganti `TAMPAL_LINK_EXEC_DI_SINI` dengan link `/exec` tadi. Jangan padam tanda petik `'`.

   Sepatutnya jadi begini:
   ```js
   APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbx..../exec'
   ```
3. Save.

---

## Langkah D: Letak app di internet (GitHub Pages, percuma)

1. Log masuk ke **https://github.com** (daftar akaun percuma kalau belum ada).
2. Tekan **+** (atas kanan) → **New repository**.
   - Repository name: `photobooth-hkskrt2026`
   - Pilih **Public**
   - Tekan **Create repository**.
3. Dalam page repo baru, tekan link **uploading an existing file**.
4. Buka folder photobooth ini di komputer. Pilih **semua isi di dalamnya** (fail dan folder `frames`, `icons`, `apps-script`), kemudian **seret (drag)** ke dalam kotak di GitHub. Jangan seret folder induk, seret isinya.
   - Guna Chrome atau Edge untuk langkah ini, sebab browser ini boleh terima folder.
   - Pastikan senarai menunjukkan `frames/...` dan `icons/...`.
5. Tekan **Commit changes** di bawah.
6. Pergi ke **Settings** → **Pages** (menu kiri).
   - Source: **Deploy from a branch**
   - Branch: **main**, folder **/ (root)** → **Save**.
7. Tunggu 1–2 minit, refresh page. Link app akan keluar di atas, contoh:
   `https://namaanda.github.io/photobooth-hkskrt2026/`

Itulah link yang anda kongsi kepada tetamu (boleh jadikan QR code).

---

## Langkah E: Pasang di telefon / komputer

App ni boleh dibuka terus dari link. Memasangnya cuma buat ia muncul sebagai ikon dan buka penuh skrin.

- **Android (Chrome):** buka link → tekan butang **Pasang app di peranti ini** di laman utama. Kalau butang tak keluar: menu ⋮ → **Install app** / **Add to Home screen**.
- **iPhone (Safari):** buka link dalam **Safari** → butang **Share** (kotak dengan anak panah ke atas) → **Add to Home Screen** → **Add**.
- **Windows (Chrome / Edge):** buka link → tekan butang pasang di laman utama, atau ikon pasang di hujung address bar.

Selepas dibuka sekali dengan internet, app boleh dibuka tanpa internet.

---

## Uji sebelum majlis (5 minit)

1. Buka link di telefon anda. Benarkan kamera.
2. Ambil satu gambar.
3. Di skrin gambar, tunggu tulisan **Disimpan ke Drive ✓**.
4. Semak folder Drive. Gambar patut ada di situ.
5. Cuba **Muat Turun** / **Simpan ke Foto** dan semak galeri telefon.

---

## Cara guna (untuk tetamu)

1. **Pilih tema**, kemudian tekan **Potret** atau **Landskap**.
2. Kamera keluar dengan bingkai. Gelongsor **Zum**:
   - tengah = gambar penuhkan tingkap bingkai (mula di sini)
   - ke kiri = nampak seluruh gambar kamera (tepi kosong diisi versi kabur)
   - ke kanan = zum masuk
3. Tekan butang bulat. Kiraan 3-2-1, kemudian kilat.
4. **Muat Turun** (Android/Windows) atau **Simpan ke Foto** (iPhone, kemudian pilih **Save Image**).
5. **Ambil Semula** untuk gambar seterusnya.

Butang lain: **Galeri** = guna gambar sedia ada dari telefon. **Tukar** = tukar kamera depan/belakang.

Gambar dari kamera depan disimpan bercermin (sama macam preview), supaya apa yang tetamu nampak = apa yang disimpan.

---

## Status upload

Di bahagian atas / bawah gambar:

| Status | Maksud |
|---|---|
| **Sedang menyimpan ke Drive…** | Sedang dihantar |
| **Disimpan ke Drive ✓** | Dah masuk folder |
| **Tiada internet · X gambar menunggu** | Gambar disimpan dalam telefon. Akan dihantar sendiri bila ada line. **Jangan padam data browser.** |
| **Gagal ke Drive: semak tetapan Apps Script** | Biasanya "Who has access" bukan **Anyone**. Ulang Langkah B8. |
| **Drive belum disetup** | `config.js` belum diisi (Langkah C) |

Gambar yang menunggu akan dihantar bila app dibuka semula dengan internet.

---

## Masalah lazim

- **Kamera tak keluar / "kebenaran ditolak":** benarkan kamera untuk laman ini dalam tetapan browser (iPhone: Settings → Safari → Camera → Allow). Pastikan link bermula dengan `https://`.
- **Dalam iPhone, gambar masuk Files bukan Foto:** guna butang **Simpan ke Foto**, kemudian pilih **Save Image**. Atau tekan lama pada gambar → **Add to Photos**.
- **Saya ubah fail tapi telefon masih tunjuk versi lama:** buka `sw.js`, tukar `hkskrt2026-v1` jadi `hkskrt2026-v2`, upload semula ke GitHub. Tutup dan buka app dua kali.
- **Nak tambah/tukar bingkai:** fail dalam `frames/` mesti kekal nama yang sama. Kawasan tingkap foto mesti transparent. Kedudukan tingkap ditetapkan dalam `app.js` (bahagian `FRAMES`), jadi bingkai baru yang lain bentuk perlu ukuran baru.

---

## Privasi (PDPA)

Gambar ini mungkin ada murid. Simpan folder Drive secara private, kongsi hanya dengan pihak sekolah yang perlu, dan padam bila tidak diperlukan lagi. Link Apps Script hanya menerima fail JPEG dengan nama format photobooth ini, tetapi sesiapa yang tahu link itu boleh hantar gambar ke folder anda, jadi jangan kongsi link `/exec` secara umum.
