require('pg') // Assure l'inclusion de pg dans le bundle Vercel
const app = require('../src/app')

module.exports = (req, res) => {
  app(req, res, (err) => {
    if (err) {
      res.status(500).json({ error: 'Internal Server Error' })
    }
  })
}