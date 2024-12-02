const joi = require('joi')

//validating event data before register
function event_validation(value) {
    const eventSchema = joi.object({
        title: joi.string().min(5).max(30).required(),
        description: joi.string().min(10).max(100).required(),
        start_date: joi.date().required(),
        end_date: joi.date().greater(joi.ref('start_date')).required(),
        location: joi.string().min(5).max(50).required(),
        tickets: joi.array().required().items(
            joi.object().required().keys({
                type: joi.string().valid('VIP', 'gold', 'silver').required(),
                price: joi.number().min(1).max(1000).required(),
                start_no: joi.number().min(1).required(),
                end_no: joi.number().greater(joi.ref('start_no')).required()
            })
        )
        // .custom((tickets,helpers)=>{
        //     for(let start=0;start<tickets.length;start++){
        //         const {start_no,end_no,type}=tickets[start];

        //       if(start_no>=end_no){
        //         return helpers.error('any.invalid', { message: `End number for ticket type ${type} must be greater than start number`})
        //       }
        //       if(start>0 && start_no<=tickets[start-1].end_no){
        //         return helpers.error('any.invalid', { message: `Start number for ticket type ${type} must be greater than end number of previous ticket type` });
        //       }
        //     }
        //     return tickets
        // },'custom validation').required()

    })
    const option = { abortEarly: false }
    return eventSchema.validate(value, option)
}

//validate the date while update request
function event_validation_update(value) {
    const eventSchema = joi.object({
        title: joi.string().min(5).max(30),
        description: joi.string().min(10).max(100),

        location: joi.string().min(5).max(50),

    })
    const option = { abortEarly: false }
    return eventSchema.validate(value, option)
}


module.exports.event_validation = event_validation
module.exports.event_validation_update = event_validation_update
