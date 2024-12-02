const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const {ticket_services}=require('../services/ticket.services')

//book a ticket
router.post('/:eventId/', auth, 
    ticket_services.book_ticket
);


// get all booked tickets by userid
router.get('/:user_id/tickets', auth,
    ticket_services.get_all_booked_tickets
);



//view specific ticket details
router.get('/ticket/:ticket_id', auth, 
    ticket_services.get_specific_tickets
)

//update the tickets
router.patch('/:id', auth, 
    ticket_services.update_tickets
);




//cancel the ticket
router.delete('/:booking_id', auth, 
    ticket_services.delete_tickets
);

module.exports = router
