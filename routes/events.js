const express = require('express')
const router = express.Router()
const {event_services}=require('../services/event.services')
const admin_manager = require('../middleware/admin_manager')
const auth = require('../middleware/auth')

//create event
router.post('/', [auth, admin_manager],
    event_services.create_event
 )


//get event by id 
router.get('/getevent/:id', auth,
    event_services.get_specific_event_by_id
 )

//get all events
router.get('/', auth,
    event_services.get_all_event
 )


//update the event
router.patch('/:id', auth,
    event_services.update_event
);


//delete the event
router.delete('/:id', auth,
    event_services.delete_event
)


module.exports = router













