import net from 'node:net'
import tls from 'node:tls'

function portOpen(host, port) {
  return new Promise((resolve) => {
    const s = net.connect(port, host)
    s.once('connect', () => {
      s.destroy()
      resolve(true)
    })
    s.once('error', () => resolve(false))
  })
}

const host = '192.168.1.68'
const port = 4173

let up = false
for (let i = 0; i < 30; i++) {
  if (await portOpen(host, port)) {
    up = true
    break
  }
  await new Promise((r) => setTimeout(r, 500))
}
if (!up) {
  console.log('port belum terbuka')
  process.exit(1)
}

await new Promise((resolve) => {
  const s = tls.connect({ host, port, rejectUnauthorized: false }, () => {
    const cert = s.getPeerCertificate(true)
    console.log('subject:', JSON.stringify(cert.subject))
    console.log('issuer :', JSON.stringify(cert.issuer))
    console.log('validTo:', cert.valid_to)
    console.log('authorized:', s.authorized, s.authorizationError ?? '')
    s.end()
    resolve()
  })
  s.on('error', (e) => {
    console.log('tls error:', e.code || e.message)
    resolve()
  })
})
