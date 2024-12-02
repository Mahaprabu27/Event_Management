const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')
const {payment_services}=require('../services/payment.services')

//payment for the ticket
router.post('/:id', auth,
    payment_services.make_payment
 )


//get all payments 
router.get('/', auth, admin,
    payment_services.get_all_payments
 )


//get specific payments by id
router.get("/:ticket_id", [auth, admin],
    payment_services.get_specific_payments_by_id
)

module.exports = router