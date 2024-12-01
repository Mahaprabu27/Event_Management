const joi = require('joi')

function ticket_validation(value) {
  const ticketSchema = joi.object({
    tickets: joi.array().required().items(
      joi.object().required().keys({
        type: joi.string().valid('VIP', 'gold', 'silver').required(),
        seats: joi.array().items(joi.number().required()).required()
      })
    )
  })
  const option = { abortEarly: false }
  return ticketSchema.validate(value, option)
}

module.exports.ticket_validation = ticket_validation
module.exports.ticket_validation_update = ticket_validation
