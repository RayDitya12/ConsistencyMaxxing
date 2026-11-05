export const APP_NAME = 'ConsistencyMaxxing'

export const SCHEMA_VERSION = 2

export const WEEKDAY_LABELS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] as const

/** Indeks hari pada Plan.days, Senin lebih dulu. */
export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const

/** Ambang streak mingguan: minimal sekian hari tercatat dalam satu minggu. */
export const WEEK_THRESHOLD = 1

/** Sesi lewat tengah malam masih boleh dicatat atas tanggal kemarin. */
export const GRACE_HOURS_AFTER_MIDNIGHT = 2

/** Kartu persegi: foto mengisi seluruh kanvas dan caption duduk di atasnya. Karena foto mentah
 * dibuang, sisi 1080 ini sekaligus crop permanen user — tidak ada mode tidur yang bisa memutar
 * keputusan itu setelah jepret. */
export const CARD = {
  edge: 1080,
  /** Tinggi graysien gelap dari tepi bawah, tempat teks caption harus muat seluruhnya. */
  scrimHeight: 320,
  thumbEdge: 320,
  quality: 0.82,
} as const
