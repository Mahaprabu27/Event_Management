const jwt = require('jsonwebtoken')
const config = require('config')

//generate jwt token by getting userId,role with secreteKey

function generate_authToken(user) {
    const token = jwt.sign({ _id: user._id, role: user.role }, config.get('JwtPrivateKey'), { expiresIn: "60m" })
    return token
  }
  

  module.exports.generate_authToken=generate_authToken