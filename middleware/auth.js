const jwt = require('jsonwebtoken')
const config = require('config')


function auth(req, res, next) {

    const token = req.header('x-auth-token')
    if (!token) return res.status(400).send({ error: 'Need auth token otherwise we cant provide the access' })

    try {
        const decode = jwt.verify(token, config.get('JwtPrivateKey'))
        req.user = decode
        next()
    }
    catch (error) {
        res.status(400).send({ error: error })
    }

}

module.exports = auth