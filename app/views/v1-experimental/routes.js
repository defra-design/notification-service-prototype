//
// Legacy /v1-experimental URLs redirect to /v1-baseline (merged journey).
//

const OLD = '/v1-experimental'
const NEW = '/v1-baseline'

module.exports = (router) => {
  router.use((req, res, next) => {
    const path = req.path || ''
    if (path !== OLD && !path.startsWith(OLD + '/')) {
      return next()
    }
    const tail = path === OLD ? '' : path.slice(OLD.length)
    const search = req.originalUrl && req.originalUrl.includes('?')
      ? req.originalUrl.slice(req.originalUrl.indexOf('?'))
      : ''
    res.redirect(302, NEW + (tail || '/') + search)
  })
}
