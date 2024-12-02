const joi = require("joi")



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


//validating login data before login
function login_validation(value) {
  const schema = joi.object({

      email: joi.string().min(5).max(30).required().email(),
      password: joi.string().min(8).max(30).required()
  })
  return schema.validate(value)
}

module.exports.login_validation=login_validation
module.exports.user_validation = user_validation
module.exports.user_validation_update = user_validation_update


