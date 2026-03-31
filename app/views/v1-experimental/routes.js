//
// Legacy URL support: the journey lives under /v1-baseline (merged from this sandbox).
//

module.exports = (router) => {
  router.use((req, res, next) => {
    const path = req.path || ''
    if (!path.startsWith('/v1-experimental')) {
      return next()
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next()
    }
    const url = req.originalUrl || req.url || ''
    const q = url.indexOf('?')
    const pathPart = q >= 0 ? url.slice(0, q) : url
    const qs = q >= 0 ? url.slice(q) : ''
    let rest = pathPart.replace(/^\/v1-experimental/, '')
    if (!rest) {
      rest = '/dashboard'
    }
    res.redirect(302, '/v1-baseline' + rest + qs)
  })
}
