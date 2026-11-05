# ConsistencyMaxxing

Catat konsistensi terhadap rencana harianmu sendiri. Rencana ditulis tangan di tab **Plan**: satu
nama, lalu hari-hari ia muncul (toggle tujuh hari), plus subplan yang boleh kamu isi per sesi. Tidak
ada parser pola, tidak ada yang auto-generate. Ketuk satu plan di **Hari ini**, kamera terbuka, satu
foto menutup plan itu; kartunya (1080x1080, foto penuh satu bingkai dengan tanggal tercetak di atas
graysien gelap) yang disimpan, bukan foto mentah. Plan yang dicentang tanpa foto tercatat sebagai
setengah selesai dan tidak menghidupkan streak. Hari yang tidak punya plan memang kosong — kamera
tidak menawarkan diri.

Semua data hidup di perangkat: Dexie (IndexedDB) untuk baris, OPFS untuk file gambar. Tidak ada
server, tidak ada akun, tidak ada sinkronisasi. Salinanmu hanya file `.cmx.zip` yang kamu ekspor
sendiri.

## Menjalankan

```
npm install
npm run dev        # http://localhost:5173
npm test           # vitest, 67 test
npm run lint       # oxlint
npm run build         # dist/ + service worker
npm run preview       # sajikan hasil build, cek mode offline di sini
```

Fontnya satu woff2 variable yang ikut repo (`public/fonts/hanken-grotesk-var.woff2`, 400..800, 34 KB).
`npm run fonts` hanya perlu dijalankan kalau filenya hilang atau family-nya mau diganti — script itu
meminta satu rentang weight dalam satu permintaan (tidak seperti dulu, ketika 400 dan 600 harus
diambil terpisah), mengambil blok `unicode-range: U+0000-00FF`, dan menolak hasil yang bukan woff2
sejati (magic bytes `wOF2`).

Untuk menguji kamera dari HP, hasil build harus disajikan lewat HTTPS: `getUserMedia` dan OPFS
dua-duanya diblokir di `http://<ip-laptop>`, jadi di sana shutter dan file picker hilang tanpa
pesan yang jelas.

```
# Git Bash
HTTPS=1 npm run preview -- --host --port 4173
# PowerShell
$env:HTTPS='1'; npm run preview -- --host --port 4173
```

Sertifikatnya dibuat sendiri oleh `scripts/cert.mjs` ke `.certs/` (tidak ikut repo) dan memuat
nama host mesin ini beserta IP LAN-nya di `subjectAltName`. Itu yang membuat Chrome Android
menampilkan tombol "Lanjut" di halaman peringatan; sertifikat tanpa SAN ditolak diam-diam dan
alamatnya tidak bisa dibuka sama sekali. Lanjut saja peringatan itu, lalu buka
`https://<ip-laptop>:4173`. Tanpa `HTTPS=1` preview berjalan seperti biasa di HTTP. Kalau IP laptop
berubah, sertifikat dibuat ulang otomatis saat server dinyalakan. Untuk memastikan sertifikat mana
yang sedang disajikan, jalankan `node scripts/check-cert.mjs` sambil preview jalan — SAN-nya harus
memuat IP yang kamu ketik di HP.

Dua hal yang perlu diketahui soal aset: woff2 variable di `public/fonts/` di-self-host (kalau hilang,
ambil ulang dengan `node scripts/fetch-fonts.mjs`), dan ikon pasang PNG digenerate dari geometri yang
sama dengan `public/icons/app-icon.svg` oleh `npm run icons` — jadi mengubah warna merek berarti
menyunting SVG + script itu lalu menjalankan ulang keduanya.

## Design 2 (branch ini)

Branch `design-2` adalah percobaan bahasa visual yang menyalin endcap.design: kertas hangat
(`#f8f7f3`), tinta hijau-hitam (`#181a17`), aksen biru `#2454df` plus lime `#dce87a`, hairline 1px,
radius kartu 6px, Hanken Grotesk variable, dan eyebrow uppercase 10px ber-tracking di atas tiap
judul. Navigasi bawah memakai ikon stroke-1.5 + label, bukan teks saja. `master` masih memegang
arah "Cetak Swiss" lama; kedua branch bisa dibandingkan dengan `git checkout` lalu `npm run dev`.

Yang TIDAK ikut berubah: geometri kartu (1080x1080, graysien 320px, penjaga `captionStack`),
pipeline kamera, skema data, dan seluruh tes. Yang berubah di kartu hanya treatment caption —
aturan lime dipersingkat jadi 96px, tanggal tidak lagi di-uppercase, dan hitungan minggu naik
jadi pil aksen.

Mode gelap didefinisikan di `src/tokens.css` (`prefers-color-scheme`) tapi belum pernah dilihat di
layar; QA visualnya masih harus dilakukan manusia.

## Kenapa beberapa keputusan diambil

- **Kartu dibekukan saat memotret.** Yang ikut tema hanya warna merek (aturan dan kotak minggu);
  teks di atas foto selalu putih di atas graysien gelap, karena kartunya dibaca orang lain, bukan
  hanya oleh HP yang memotret.
- **Arah visual: kertas + tinta, aksen cuma satu.** Lihat bagian "Design 2" di atas. Aturan lama
  "Cetak Swiss" (radius nol, aturan 2px, oranye `#E8540C` hanya untuk blok besar) masih hidup di
  `master`. Oranye itu tidak pernah dipakai untuk teks kecil; di design 2 posisi yang sama diisi
  biru `#2454df`, yang di atas kertas `#f8f7f3` dihitung ~5.7:1 sehingga boleh memuat teks 10px.
- **Font diambil dengan script, bukan unduh manual.** `npm run fonts` mengambil satu woff2 variable
  (400..800) sehingga kanvas bisa me-render 600 dan 800 dari satu berkas 34 KB; script menolak
  respons yang bukan `wOF2`. Dulu 400 dan 600 harus dua permintaan terpisah, karena satu permintaan
  untuk dua weight membuat Google Fonts mengembalikan file yang sama dan seluruh teks semi-bold
  diam-diam jadi regular.
- **Foto mentah dibuang.** Yang disimpan hanya kartu + thumbnail. Konsekuensinya crop tidak bisa
  diubah lagi, jadi jendela bidik menunjukkan persis 1:1 yang akan masuk.
- **Streak mingguan pakai ambang 1 hari dari 7.** Angka itu di `src/config.ts` (`WEEK_THRESHOLD`),
  masih bisa diganti sebelum dipakai serius.
- **Centang tanpa foto tetap setengah selesai.** Plan yang dicentang tanpa foto diberi tanda
  berbingkai aksen (bukan kotak penuh); ia tidak menghidupkan streak harian maupun mingguan. Hanya
  foto yang dihitung, jadi "sibuk tapi tidak ada bukti" tidak bisa menyamar menjadi konsistensi.
- **Kalender tidak menampilkan thumbnail.** Kotak hari hanya berisi tanda (foto / centang tanpa
  foto / dilewati); detail plan, subplan, dan foto per plan muncul saat tanggalnya diketuk.
  Thumbnail 42 buah per bulan terlalu mahal untuk dibuka sekilas.
- **Izin simpan permanen diminta lewat tombol.** `persist()` otomatis saat boot membuat Chrome
  menjadwalkan masa tunggu setelah satu penolakan, sehingga permintaan berikutnya bisa mati
  berhari-hari. Tombolnya ada di Profil -> Pengaturan.
- **Plan ditulis tangan, bukan hasil generate.** Aplikasi ini berangkat kosong; satu plan cuma nama
  plus hari-hari ia muncul. Pola tujuh huruf (`ULURULR`) dulu jadi model data, sekarang hanya
  contoh yang bisa diketuk sekali di tab Plan. Alasannya: tracker yang memaksa bentuk jadwal tertentu
  akan dibuang begitu jadwal aslinya berbeda.
- **Kamera tinggal di dalam plan.** Shutter hanya muncul setelah plan hari itu diketuk, jadi ia
  requirement untuk mencentang, bukan fitur melayang tanpa fungsi.
- **Kamera utama, galeri selalu bisa dipilih.** Tombol rana adalah aksi utamanya, tapi "pilih dari
  galeri" ikut tampil di semua keadaan (diam, bidik, maupun gagal), bukan hanya sebagai hadiah
  setelah kamera menolak. Foto dari galeri ditandai `source: 'fallback'` supaya bedanya masih bisa
  dibaca di data, dan kartu yang dibekukan tetap memakai tanggal hari itu.
- **Hapus dan ganti perangkat butuh mengetik kata** (`HAPUS`, `GANTI`). Tidak ada dialog
  konfirmasi browser yang bisa di-Enter.

## Menguji di HP dalam 15 menit

Jalankan preview lewat HTTPS seperti di atas, buka dari HP satu jaringan (alamat IP laptop, bukan
localhost), lalu:

1. Tab **Plan**: ketuk "+ Tambah rencana", tulis satu nama, nyalakan toggle harinya (misalnya
   Senin untuk "Belajar NLP"), simpan, lalu tambahkan minimal satu subplan. Rencana harus langsung
   muncul di daftar. Kalau mau cepat, pakai tombol contoh Workout — Upper keluar Senin/Rabu/Jumat,
   Lower Selasa/Sabtu.
2. Tab **Hari ini**: hanya plan yang hari itu aktif yang muncul. Hari tanpa plan harus berisi satu
   baris teks saja — tidak ada shutter, tidak ada kamera yang menggantung.
3. Ketuk satu plan: kamera langsung diminta. Ikon "pilih dari galeri" harus terlihat di keadaan apa
   pun — sebelum kamera menyala, saat jendela bidik aktif, dan saat izin ditolak. Kalau kamera tidak
   mau menyala sama sekali, ada tombol "Coba lagi"; kamera dan OPFS dua-duanya butuh HTTPS.
4. Foto satu: cek kartu yang muncul identik dengan jendela bidik, tanggal benar, tidak mirror.
   Row plan-nya berubah jadi "tercatat" dan jumlah fotonya ikut naik.
5. Putar HP jadi landscape, lalu foto lagi: kartunya tetap 1080x1080 dan crop tidak boleh berpindah —
   orientasi tidak lagi memilih mode.
6. Ketuk plan lain, pilih "Catat tanpa foto": tandanya berubah jadi berbingkai aksen "tanpa foto"
   dan streak tidak bertambah. Tutup tab, buka lagi: status masih sama.
7. Tekan "lewati" di baris yang sama: plan jadi "dilewati"; tekan lagi untuk membatalkan.
8. Centang satu subplan, skip satu subplan, sisanya biarkan kosong.
9. Tab **Kalender**: hari ini bertanda penuh, hari lain sesuai isinya. Ketuk sebuah tanggal: plan,
   status, subplan, dan foto per plan muncul; satu hari boleh punya lebih dari satu plan.
10. Matikan WiFi/data seluler, buka aplikasi lagi: harus tetap jalan (service worker), foto baru
    tetap tersimpan.
11. Tab **Profil** -> **Pengaturan**: ekspor tahun ini, kirim file `.cmx.zip` ke HP lain atau unduh
    lagi.
12. Ketik kata yang salah di "Ganti semua" — tombol harus tetap mati. Ketik `GANTI`, lalu gabungkan
    arsipmu sendiri: tidak boleh ada duplikat (laporan harus bilang "dilewati").
13. Klik "Periksa ulang" berkali-kali: angka "Terpakai" tidak boleh naik tiap klik.
14. "Penyimpanan persisten: tidak" boleh muncul di profil browser baru; pakai tombol "Minta izin
    simpan permanen" dan catat jawabannya apa adanya.
15. Ulangi memotret 2 hari berturut-turut, pastikan hitungan streak bertambah.
16. Kalau install sebagai aplikasi (Add to Home Screen): ikon harus terlihat, bukan kotak kosong.
17. Buka sebuah foto di dinding, lalu tekan tombol back Android: catat apa yang terjadi — sekarang
    overlay hanya punya tombol "tutup", jadi kemungkinan besar yang keluar adalah aplikasinya.
18. Beri izin kamera lalu tolak sekali lagi: sheet plan harus menjelaskan jalan cadangannya, bukan
    diam-diam memakai foto lama dari galeri (itu merusak arti "bukti hari ini").

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
