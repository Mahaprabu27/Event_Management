const express = require('express')
const { getDb } = require('../startup/db')
const router = express.Router()
const { event_validation, event_validation_update } = require('../validation/events')
const auth = require('../middleware/auth')
const { ObjectId } = require('mongodb')
const async_error = require("../middleware/async_error")

const collection =require('../startup/collections')

const event_collection=collection.event_collection


//create event
router.post('/', auth, async_error(async (req, res) => {

    const error = event_validation(req.body)
    if (error.error) {
        const error_message = error.error.details.map(detail => detail.message)
        return res.status(400).send({ error: error_message })
    }

    const db = await getDb()

    if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(401).send({ error: `unauthorized user ,dont have access to create an event for ${req.user.role}` })
    }


    for (let i = 0; i < req.body.tickets.length; i++) {
        const { start_no, end_no } = req.body.tickets[i];
        if (start_no >= end_no) {
            return res.status(400).send({ error: `End number for ticket type ${req.body.tickets[i].type} must be greater than start number` });
        }
        if (i > 0 && start_no <= req.body.tickets[i - 1].end_no) {
            return res.status(400).send({ error: `Start number for ticket type ${req.body.tickets[i].type} must be greater than end number of previous ticket type` })
        }
    }


    const event_data = {
        title: req.body.title,
        description: req.body.description,
        start_date: new Date(req.body.start_date),
        end_date: new Date(req.body.end_date),
        location: normalized_location,
        created_by: new ObjectId(req.user._id),
        status: "upcoming"
    }

    let total_no_of_tickets = 0;

    event_data.tickets = req.body.tickets.map(ticket => {

        const available = (ticket.end_no - ticket.start_no) + 1
        total_no_of_tickets += available

        let seat_numbers = {}
        for (let start = ticket.start_no; start <= ticket.end_no; start++) {
            seat_numbers[start] = true;
        }

        return {
            type: ticket.type,
            price: ticket.price,
            start_no: ticket.start_no,
            end_no: ticket.end_no,
            available: available,
            booked: 0,
            seats: seat_numbers
        }
    })

    event_data.total_no_of_tickets = total_no_of_tickets

    const event = await db.collection(event_collection).insertOne(event_data)
    res.status(201).send({ message: "created a event successfully", id: event.insertedId })


}))


//get event by id 
router.get('/getevent/:id', auth, async_error(async (req, res) => {

    const db = await getDb()
    const event_id = req.params.id

    const event = await db.collection(event_collection).findOne({ _id: new ObjectId(event_id) })
    if (!event) return res.status(404).send({ error: "Event not found or provide proper id" })

    res.status(200).send(event)


}))

//get all events
router.get('/', auth, async_error(async (req, res) => {

    const db = await getDb()

    const events = await db.collection(event_collection).find({}).toArray()
    if (!events) res.status(200).send(events)
    res.status(200).send(events)


}))


//update the event
router.patch('/:id', auth, async_error(async (req, res) => {
    const db = await getDb();
    const event_id = req.params.id;
    const updated_data = req.body;

    const error = event_validation_update(req.body)
    if (error.error) {
        const error_message = error.error.details.map(detail => detail.message)
        return res.status(400).send({ error: error_message })
    }


    const event = await db.collection(event_collection).findOne({ _id: new ObjectId(event_id) });
    if (!event) return res.status(404).send({ error: "Event not found" });


    if (req.user.role === "admin") {

        await db.collection(event_collection).updateOne({ _id: new ObjectId(event_id) }, {
            $set: updated_data
        });
        res.status(200).send({ message: "Event updated successfully" });
    } else if (req.user.role === "manager") {

        const user_event = await db.collection(event_collection).findOne({ _id: new ObjectId(event_id), created_by: new ObjectId(req.user._id) });
        if (!user_event) return res.status(401).send({ error: "You don't have access to update this event. It was created by someone else." });

        await db.collection(event_collection).updateOne({ _id: new ObjectId(event_id), created_by: new ObjectId(req.user._id) }, {
            $set: updated_data
        });
        res.status(200).send({ message: "Event updated successfully" });
    } else {
        res.status(403).send({ error: "You do not have permission to update this event" });
    }

}));


//delete the event
router.delete('/:id', auth, async_error(async (req, res) => {

    const db = await getDb()
    const doc_id = req.params.id


    const event = await db.collection(event_collection).findOne({ _id: new ObjectId(doc_id) })
    if (!event) return res.status(404).send({ error: "given id event is not found" })

    const book_status = event.tickets.some(ticket => ticket.booked > 0)
    if (book_status) return res.status(404).send({ erro: "Peoples are booked this event ,inform all people to cancel the ticket and proceed" })

    if (req.user.role === "admin") {
        await db.collection(event_collection).deleteOne({ _id: new ObjectId(doc_id) })
        res.status(200).send("deleted sucessfully")
    }

    else if (req.user.role === "manager") {
        console.log(req.user.role)
        const user = await db.collection(event_collection).findOne({ _id: new ObjectId(doc_id), created_by: new ObjectId(req.user._id) })
        if (!user) return res.status(401).send({ error: "dont have access,it was created by someone" })

        await db.collection(event_collection).deleteOne({ _id: new ObjectId(doc_id), created_by: new ObjectId(req.user._id) })
        // eventid=await db.collection(collectionName).aggregate({$match:{created_by:new ObjectId(user._id)}}).deleteOne({_id:new ObjectId(req.params.id)})

        res.status(200).send({ message: "deleted sucessfully" })
    }
}))

module.exports = router













