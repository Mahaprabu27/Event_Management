const { event_validation, event_validation_update } = require('../validation/events')
const { ObjectId } = require('mongodb')
const async_error = require("../middleware/async_error")
const collection = require('../startup/collections')
const { BAD_REQUEST, SUCCESS, CREATED, NOT_FOUND } = require('../startup/status_Codes')
const event_collection = collection.event_collection
const {getDb}=require('../startup/db')


const create_event=async_error(async(req,res)=>{

    
    //validation
    const error = event_validation(req.body)
    if (error.error) {
        const error_message = error.error.details.map(detail => detail.message)
        return res.status(BAD_REQUEST).send({ error: error_message })
    }



    const db = await getDb()

    //check location and event start date and event end date
    const normalized_location = req.body.location;
    const overlapping_events = await db.collection(event_collection).find({
        location: { $regex: normalized_location, $options: 'i' },
        $or: [{ start_date: { $lte: new Date(req.body.end_date) } }, { end_date: { $gt: new Date(req.body.start_date) } }]
    }).toArray();

    if (overlapping_events.length > 0) {
        return res.status(BAD_REQUEST).send({ error: "There is already an event scheduled at this location during the specified time period." });
    }

    //Iterate Each ticket to validate start and end number
    for (let i = 0; i < req.body.tickets.length; i++) {
        const { start_no, end_no } = req.body.tickets[i];
        if (start_no >= end_no) {
            return res.status(BAD_REQUEST).send({ error: `End number for ticket type ${req.body.tickets[i].type} must be greater than start number` });
        }
        if (i > 0 && start_no <= req.body.tickets[i - 1].end_no) {
            return res.status(BAD_REQUEST).send({ error: `Start number for ticket type ${req.body.tickets[i].type} must be greater than end number of previous ticket type` })
        }
    }

    //data field and value
    const event_data = {
        title: req.body.title,
        description: req.body.description,
        start_date: new Date(req.body.start_date),
        end_date: new Date(req.body.end_date),
        location: req.body.location,
        created_by: new ObjectId(req.user._id),
        status: "upcoming"
    }

    let total_no_of_tickets = 0;
    //generate seats and find total number of seats
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

    //create an event
    const event = await db.collection(event_collection).insertOne(event_data)
    res.status(CREATED).send({ message: "created a event successfully", id: event.insertedId })


    
})

const get_all_event=async_error(async(req,res)=>{

    const db = await getDb()

    const events = await db.collection(event_collection).find({}).toArray()
    if (!events) res.status(200).send(events)
    res.status(SUCCESS).send(events)

})

const get_specific_event_by_id=async_error(async(req,res)=>{

    const db = await getDb()
    const event_id = req.params.id

    //check the event id
    const event = await db.collection(event_collection).findOne({ _id: new ObjectId(event_id) })
    if (!event) return res.status(NOT_FOUND).send({ error: "Event not found or provide proper id" })

    res.status(SUCCESS).send(event)
})
const update_event=async_error(async(req,res)=>{

    const db = await getDb();
    const event_id = req.params.id;
    const updated_data = req.body;

    //validation 
    const error = event_validation_update(req.body)
    if (error.error) {
        const error_message = error.error.details.map(detail => detail.message)
        return res.status(BAD_REQUEST).send({ error: error_message })
    }

    //check the event by id 
    const event = await db.collection(event_collection).findOne({ _id: new ObjectId(event_id) });
    if (!event) return res.status(NOT_FOUND).send({ error: "Event not found" });

    //admin access
    if (req.user.role === "admin") {

        await db.collection(event_collection).updateOne({ _id: new ObjectId(event_id) }, {
            $set: updated_data
        });
        res.status(SUCCESS).send({ message: "Event updated successfully" });
    }
    //manger access for their owned events
    else if (req.user.role === "manager") {

        //check the manger id
        const user_event = await db.collection(event_collection).findOne({ _id: new ObjectId(event_id), created_by: new ObjectId(req.user._id) });
        if (!user_event) return res.status(401).send({ error: "You don't have access to update this event. It was created by someone else." });

        await db.collection(event_collection).updateOne({ _id: new ObjectId(event_id), created_by: new ObjectId(req.user._id) }, {
            $set: updated_data
        });
        res.status(SUCCESS).send({ message: "Event updated successfully" });
    } else {
        res.status(403).send({ error: "You do not have permission to update this event" });
    }

    
})
const delete_event=async_error(async(req,res)=>{
    const db = await getDb()
    const doc_id = req.params.id

    //check the event by id
    const event = await db.collection(event_collection).findOne({ _id: new ObjectId(doc_id) })
    if (!event) return res.status(404).send({ error: "given id event is not found" })

    //check the customer who have already booked this event,to inform all after they cancel we delete the event
    const book_status = event.tickets.some(ticket => ticket.booked > 0)
    if (book_status) return res.status(404).send({ erro: "Peoples are booked this event ,inform all people to cancel the ticket and proceed" })

    //admin access
    if (req.user.role === "admin") {
        await db.collection(event_collection).deleteOne({ _id: new ObjectId(doc_id) })
        res.status(200).send("deleted sucessfully")
    }

    //manager access for their own events
    else if (req.user.role === "manager") {
        console.log(req.user.role)
        const user = await db.collection(event_collection).findOne({ _id: new ObjectId(doc_id), created_by: new ObjectId(req.user._id) })
        if (!user) return res.status(401).send({ error: "dont have access,it was created by someone" })

        await db.collection(event_collection).deleteOne({ _id: new ObjectId(doc_id), created_by: new ObjectId(req.user._id) })
        // eventid=await db.collection(collectionName).aggregate({$match:{created_by:new ObjectId(user._id)}}).deleteOne({_id:new ObjectId(req.params.id)})

        res.status(200).send({ message: "deleted sucessfully" })
    }
})


module.exports.event_services={create_event,get_all_event,get_specific_event_by_id,update_event,delete_event}