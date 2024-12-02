const jwt = require('jsonwebtoken')
const config = require('config')
const { INTERNAL_SERVER_ERROR, BAD_REQUEST } = require('../startup/status_Codes')

function auth(req, res, next) {

    const token = req.header('x-auth-token')
    if (!token) return res.status(BAD_REQUEST).send({ error: 'Need auth token otherwise we cant provide the access' })

    try {
        //decode the jwt token
        const decode = jwt.verify(token, config.get('JwtPrivateKey'))
        req.user = decode
        next()
    }
    catch (error) {
        res.status(INTERNAL_SERVER_ERROR).send({ error: error })
    }

}

module.exports = auth