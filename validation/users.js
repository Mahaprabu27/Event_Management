const joi = require("joi")
const jwt = require('jsonwebtoken')
const config = require('config')


//validating user data before register 
function user_validation(value) {
  const validateSchema = joi.object({
    name: joi.string().min(4).max(20).required(),
    email: joi.string().min(6).max(30).required().email(),
    password: joi.string().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{6,}$')).required(),
    role: joi.string().valid('user', 'manager').required()
  })
  const option = { abortEarly: false }
  return validateSchema.validate(value, option)
}

//validate the data while update request
function user_validation_update(value) {
  const validateSchema = joi.object({
    name: joi.string().min(4).max(20),
    email: joi.string().min(6).max(30).email(),
    password: joi.string().min(8).pattern(new RegExp('^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{6,}$')),
    role: joi.string().valid('user', 'manager')
  })
  const option = { abortEarly: false }
  return validateSchema.validate(value, option)
}


//generate jwt token by getting userId,role with secreteKey
function generate_authToken(user) {
  console.log(user._id)
  const token = jwt.sign({ _id: user._id, role: user.role }, config.get('JwtPrivateKey'), { expiresIn: "60m" })
  return token
}


module.exports.user_validation = user_validation
module.exports.generate_authToken = generate_authToken
module.exports.user_validation_update = user_validation_update


