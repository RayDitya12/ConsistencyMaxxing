# ConsistencyMaxxing

PWA untuk mencatat konsistensi terhadap rencana sendiri. Rencana ditulis tangan: satu nama, hari-hari ia
muncul, plus subplan yang boleh diisi per sesi. Ketuk satu plan di **Hari ini**, kamera terbuka, satu foto
menutup plan itu. Yang tersimpan adalah kartunya (1080x1080, foto penuh satu bingkai, tanggal tercetak di
atas graysien gelap), bukan foto mentah. Centang tanpa foto dicatat sebagai setengah selesai dan tidak
menghidupkan streak.

Semua data hidup di perangkat: Dexie (IndexedDB) untuk baris, OPFS untuk file gambar. Tidak ada server,
tidak ada akun, tidak ada sinkronisasi. Salinan data hanya file `.cmx.zip` yang kamu ekspor sendiri.

## Menjalankan

```
npm install
npm run dev         # http://localhost:5173
npm test            # vitest, 67 test
npm run lint        # oxlint
npm run build       # tsc + dist/ + service worker
npm run preview     # sajikan hasil build, cek mode offline di sini
```

Font dan ikon ikut repo, jadi dua script berikutnya hanya dijalankan kalau asetnya mau diganti:
`npm run fonts` mengambil Hanken Grotesk variable (400..800) sebagai satu woff2 dan menolak respons yang
bukan woff2 sejati; `npm run icons` menggenerate PNG pasang dari geometri `public/icons/app-icon.svg`.
Mengubah warna merek berarti menyunting SVG itu lalu menjalankan ulang keduanya.

## Uji kamera dari HP

`getUserMedia` dan OPFS dua-duanya diblokir di `http://<ip-laptop>`, jadi hasil build harus disajikan
lewat HTTPS:

```
HTTPS=1 npm run preview -- --host --port 4173            # Git Bash
$env:HTTPS='1'; npm run preview -- --host --port 4173    # PowerShell
```

`scripts/cert.mjs` membuat sertifikat sendiri ke `.certs/` (tidak ikut repo) dan memasukkan nama host
mesin beserta IP LAN-nya ke `subjectAltName`; tanpa SAN, Chrome Android menolak alamatnya tanpa tombol
lanjut. Buka `https://<ip-laptop>:4173` dan lewati saja peringatan sertifikatnya. Sertifikat dibuat ulang
otomatis kalau IP laptop berubah, dan `node scripts/check-cert.mjs` menunjukkan SAN yang sedang disajikan.

## Desain

Kertas hangat `#f8f7f3`, tinta `#181a17`, hairline 1px, radius kartu 6px, satu aksen biru `#2454df` dengan
lime `#dce87a` sebagai tanda. Hanken Grotesk variable dipakai di UI dan di kartu; tiap judul ditandai
eyebrow uppercase 10px, dan navigasi bawah memakai ikon stroke 1.5 di atas label. Biru boleh memuat teks
kecil karena kontrasnya di atas kertas 5.7:1. Mode gelap ikut didefinisikan lewat `prefers-color-scheme`.

Kartu foto adalah bagian yang tetap: 1080x1080, satu bingkai penuh, caption dibakar di atas graysien
320px, dan `captionStack()` menolak render kalau caption tidak muat. Foto mentah dibuang, jadi jendela
bidik harus menampilkan persis crop 1:1 yang akan disimpan. Restyle cukup menyentuh konstanta di
`src/capture/card.ts` dan token di `src/tokens.css`, tidak pernah pipeline kameranya.

## Keputusan yang perlu diketahui

- Streak harian hanya dihidupkan oleh foto. "Selesai tanpa foto" menandai setengah selesai, bukan selesai.
- Angka utama adalah streak mingguan dengan ambang satu hari dari tujuh (`WEEK_THRESHOLD` di
  `src/config.ts`); streak harian yang lebih ketat tetap tampil di sebelahnya.
- Plan tidak digenerate dan aplikasi berangkat kosong. Jadwal yang dipaksa masuk satu format akan dibuang
  begitu jadwal aslinya berbeda.
- Kamera hanya muncul di dalam plan yang diketuk, tapi "pilih dari galeri" tetap tersedia di semua keadaan.
  Foto galeri ditandai `source: 'fallback'` supaya bedanya masih terbaca di data.
- Kalender tidak menampilkan thumbnail; 42 gambar per bulan terlalu mahal untuk sekilas lihat. Isi sebuah
  hari muncul saat tanggalnya diketuk.
- Izin simpan permanen diminta lewat tombol di Profil -> Pengaturan. Memanggil `persist()` otomatis saat
  boot membuat Chrome menjadwalkan masa tunggu setelah satu penolakan.
- Menghapus data dan mengganti perangkat dengan arsip menuntut kata diketik (`HAPUS`, `GANTI`) karena tidak
  ada dialog konfirmasi browser yang bisa di-Enter.
- Target interaksinya sekitar tiga detik dari buka aplikasi sampai foto tersimpan.

## Uji manual di HP

1. Plan: tambah satu rencana, nyalakan toggle harinya, simpan, lalu buat minimal satu subplan.
2. Hari ini: hanya plan untuk hari itu yang tampil; hari tanpa plan hanya berisi satu baris teks.
3. Ketuk satu plan: kamera langsung diminta, dan ikon galeri terlihat sebelum, selama, dan sesudah gagal.
4. Foto satu: kartu identik dengan jendela bidik, tanggal benar, tidak mirror; baris plan jadi tercatat.
5. Putar HP ke landscape lalu foto lagi: kartu tetap 1080x1080 dan crop tidak berpindah.
6. Pilih "Selesai tanpa foto" di plan lain: tandanya jadi berbingkai aksen, streak tidak bertambah, dan
   statusnya masih sama setelah tab ditutup lalu dibuka lagi.
7. Kalender: hari ini bertanda penuh; ketuk sebuah tanggal untuk melihat plan, status, subplan, dan fotonya.
8. Matikan WiFi atau data seluler: aplikasi tetap jalan dan foto baru tetap tersimpan.
9. Pengaturan: ekspor tahun ini, kirim `.cmx.zip` ke perangkat lain, lalu gabungkan. Salah ketik di "Ganti
   semua" harus membuat tombolnya tetap mati.
10. Klik "Periksa ulang" berkali-kali: angka Terpakai tidak boleh naik tiap klik.
11. Install lewat Add to Home Screen: ikon harus terlihat, bukan kotak kosong.

## Struktur

```
src/capture/    jendela bidik, layout kartu, renderer, caption
src/db/         skema Dexie + query + metrik turunan (streak, coverage)
src/export/     arsip .cmx.zip: bangun, baca, gabungkan, ganti
src/plan/       aksi plan/subplan (toggle hari, contoh Workout)
src/screens/    Hari ini, Kalender, Plan, Profil (di dalamnya ada Pengaturan)
src/storage/    OPFS, kapasitas, bootstrap, sapu file yatim
scripts/        ambil subset font, bikin ikon PNG, sertifikat uji di HP
test/           vitest + fake-indexeddb (pipeline gambar diuji tanpa kamera)
```
