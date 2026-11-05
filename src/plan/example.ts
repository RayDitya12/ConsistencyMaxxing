import { createPlan } from './actions'

/**
 * Contoh jadwal yang selama ini ditulis sebagai 'ULURULR': Upper pada Senin/Rabu/Jumat, Lower pada
 * Selasa/Sabtu. Kamis dan Minggu tidak punya plan, dan memang begitu maksud huruf R.
 * Dipanggil dari tombol, tidak pernah otomatis — aplikasi ini berangkat kosong.
 */
export async function seedWorkoutExample() {
  await createPlan('Workout · Upper', [0, 2, 4])
  await createPlan('Workout · Lower', [1, 5])
}
