import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generate } from 'selfsigned'

const CERT_DIR = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), '.certs')
const KEY = join(CERT_DIR, 'dev-key.pem')
const CERT = join(CERT_DIR, 'dev-cert.pem')
const META = join(CERT_DIR, 'dev-meta.json')
const DAYS = 825

/** Nama yang harus ada di sertifikat. Chrome Android menolak IP tanpa subjectAltName,
 * dan tidak menawarkan tombol 'lanjutkan' untuk kesalahan nama — jadi IP LAN ikut ditulis. */
function hostNames() {
  const names = ['localhost', '127.0.0.1', '::1']
  for (const list of Object.values(networkInterfaces())) {
    for (const entry of list ?? []) {
      if (entry.internal || !entry.address) continue
      if (!names.includes(entry.address)) names.push(entry.address)
    }
  }
  return names.sort()
}

function fingerprint(names) {
  return createHash('sha256').update(names.join(',')).digest('hex')
}

function fresh(names) {
  if (!existsSync(KEY) || !existsSync(CERT) || !existsSync(META)) return false
  let meta
  try {
    meta = JSON.parse(readFileSync(META, 'utf8'))
  } catch {
    return false
  }
  if (meta.fingerprint !== fingerprint(names)) return false
  const left = new Date(meta.notAfter).getTime() - Date.now()
  return left > 30 * 24 * 60 * 60 * 1000
}

/** Kunci + sertifikat untuk `HTTPS=1 npm run dev|preview`. Disimpan di .certs/ (gitignored). */
export async function ensureDevCert() {
  const names = hostNames()
  if (!fresh(names)) {
    const pems = await generate(
      [{ name: 'commonName', value: names[0] }],
      {
        days: DAYS,
        keySize: 2048,
        algorithm: 'sha256',
        extensions: [
          { name: 'basicConstraints', cA: false },
          { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
          {
            name: 'extKeyUsage',
            serverAuth: true,
          },
          {
            name: 'subjectAltName',
            altNames: names.map((value) =>
              /^[0-9.]+$/.test(value) || value.includes(':') ? { type: 7, ip: value } : { type: 2, value },
            ),
          },
        ],
      },
    )
    mkdirSync(CERT_DIR, { recursive: true })
    writeFileSync(KEY, pems.private)
    writeFileSync(CERT, pems.cert)
    writeFileSync(META, JSON.stringify({ fingerprint: fingerprint(names), notAfter: pems.expires }))
  }
  return { key: readFileSync(KEY), cert: readFileSync(CERT) }
}
