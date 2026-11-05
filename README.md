# ConsistencyMaxxing

Catat konsistensi terhadap rencana harianmu sendiri. Satu foto per hari sebagai bukti; kartunya
(1080x1350 atau 1350x1080, tanggal tercetak di bawah) yang disimpan, bukan foto mentah.

Semua data hidup di perangkat: Dexie (IndexedDB) untuk baris, OPFS untuk file gambar. Tidak ada
server, tidak ada akun, tidak ada sinkronisasi. Salinanmu hanya file `.cmx.zip` yang kamu ekspor
sendiri.

## Menjalankan

```
npm install
npm run dev        # http://localhost:5173
npm test           # vitest, 43 test
npm run lint       # oxlint
npm run build         # dist/ + service worker
npm run preview       # sajikan hasil build, cek mode offline di sini
```

Dua woff2 di `public/fonts/` adalah subset latin yang di-self-host; kalau hilang, ambil ulang dengan
`node scripts/fetch-fonts.mjs`. Ikon pasang PNG digenerate dari geometri yang sama dengan
`public/icons/app-icon.svg` oleh `npm run icons`.

## Kenapa beberapa keputusan diambil

- **Kartu dibekukan saat memotret.** Warna kartu dibaca dari CSS saat itu; kalau HP sedang mode
  gelap, kartunya gelap selamanya. Sengaja: hasil harus sama dengan yang dilihat saat memotret.
- **Foto mentah dibuang.** Yang disimpan hanya kartu + thumbnail. Konsekuensinya crop tidak bisa
  diubah lagi, jadi jendela bidik menunjukkan persis 1:1 yang akan masuk.
- **Streak mingguan pakai ambang 1 hari dari 7.** Angka itu di `src/config.ts` (`WEEK_THRESHOLD`),
  masih bisa diganti sebelum dipakai serius.
- **Kamera boleh gagal.** Kalau `getUserMedia` ditolak atau tidak ada kamera, jalur cadangannya
  tetap ada: pilih berkas dari galeri, record-nya ditandai `source: 'fallback'`.
- **Hapus dan ganti perangkat butuh mengetik kata** (`HAPUS`, `GANTI`). Tidak ada dialog
  konfirmasi browser yang bisa di-Enter.

## Menguji di HP dalam 15 menit

Pasang `npm run preview` di laptop, buka dari HP satu jaringan (alamat IP laptop, bukan localhost),
lalu:

1. Tambah rencana di tab **Plan**, pola `ULURULR`, checklist minimal satu baris. Simpan.
2. Tab **Hari ini**: shutter harus menyala (kalau mati, baca alasannya — font atau OPFS).
3. Foto satu: cek kartu yang muncul identik dengan jendela bidik, tanggal benar, tidak mirror.
4. Putar HP jadi landscape, foto lagi: jendela crop tidak boleh bergeser, kartu jadi 1350x1080.
5. Centang satu item, skip satu item, sisanya biarkan kosong. Tutup tab, buka lagi: status masih sama.
6. Tab **Kalender**: hari ini ada thumbnailnya; ketuk kotaknya, cek catatan dan checklist muncul.
7. Matikan WiFi/data seluler, buka aplikasi lagi: harus tetap jalan (service worker), foto baru tetap
   tersimpan.
8. Tab **Data**: ekspor tahun ini, kirim file `.cmx.zip` ke HP lain atau unduh lagi.
9. Ketik kata yang salah di "Ganti semua" — tombol harus tetap mati. Ketik `GANTI`, lalu gabungkan
   arsipmu sendiri: tidak boleh ada duplikat (laporan harus bilang "dilewati").
10. Checklist harian: ulangi 2 hari berturut-turut, pastikan hitungan streak bertambah.
11. "Penyimpanan persisten: tidak" boleh muncul sementara di browser privat; di Chrome normal harus
    "ya" setelah beberapa detik.
12. Kalau install sebagai aplikasi (Add to Home Screen): ikon harus terlihat, bukan kotak kosong.

## Struktur

```
src/capture/    jendela bidik, layout kartu, renderer, caption
src/db/         skema Dexie + query + metrik turunan (streak, coverage)
src/export/     arsip .cmx.zip: bangun, baca, gabungkan, ganti
src/plan/       pola tujuh hari, aksi template/slot/checklist
src/screens/    Hari ini, Kalender, Plan, Data
src/storage/    OPFS, kapasitas, bootstrap, sapu file yatim
test/           vitest + fake-indexeddb (pipeline gambar diuji tanpa kamera)
```
