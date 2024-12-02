const { getDb } = require('../startup/db')
const { ObjectId } = require('mongodb')
const { ticket_validation, ticket_validation_update } = require('../validation/tickets')
const async_error = require('../middleware/async_error')
const collection = require('../startup/collections')
const { CREATED, NOT_FOUND, BAD_REQUEST, SUCCESS, UNAUTHORIZED, FORBIDDEN } = require('../startup/status_Codes')

const ticket_collection = collection.ticket_collection
const event_collection = collection.event_collection
const user_collection = collection.user_collection


const book_ticket=async_error(async(req,res)=>{
    const db = await getDb();
    //validation
    const { error } = ticket_validation(req.body)
    if (error) {
        const error_message = error.details.map(detail => detail.message)
        res.status(BAD_REQUEST).send(error_message)
    }

    //check event by id
    const event = await db.collection(event_collection).findOne({ _id: new ObjectId(req.params.eventId) });
    if (!event) return res.status(NOT_FOUND).send({ error: "Event not found" });

    const ticket_bookings = req.body.tickets;
    let total_amount = 0;
     

    //check the available seats
    for (let ticket_booking of ticket_bookings) {
        const { type, seats } = ticket_booking;

        const ticket_type = event.tickets.find(ticket => ticket.type === type);
        if (!ticket_type) return res.status(404).send({ error: `Ticket type ${type} not found` });

        //check seats
        const seat_errors = []
        for (let seat of seats) {
            if (!ticket_type.seats[seat]) {
                seat_errors.push(`Seat ${seat} for ${type} is already booked or does not exist`);
            }
        }
        if (seat_errors.length > 0) return res.status(NOT_FOUND).send({ seatErrors: seat_errors });


        //book a seat
        for (let seat of seats) {
            ticket_type.seats[seat] = false;
        }
        total_amount += ticket_type.price * seats.length;
        ticket_type.available -= seats.length;
        ticket_type.booked += seats.length;
    }

   
    const booking = {
        attendee_id: new ObjectId(req.user._id),
        event_id: new ObjectId(req.params.eventId),
        tickets: ticket_bookings,
        total_amount: total_amount,
        status: 'Pending'
    };

    await db.collection(ticket_collection).insertOne(booking)
    
    //update event in ticket details
    await db.collection(event_collection).updateOne({ _id: new ObjectId(req.params.eventId) }, {
        $set: { tickets: event.tickets }
    });

    res.status(CREATED).send({ message: "Ticket booked successfully", bookingId: booking._id, totalAmount: total_amount })

})

const get_all_booked_tickets=async_error(async(req,res)=>{
    const db = await getDb();
    const user_id = req.params.user_id;

    //validation
    const user = await db.collection(user_collection).findOne({ _id: new Object(user_id) })
    if (!user) res.status(NOT_FOUND).send({ error: "User not found" })

    //admin access
    if (req.user.role === "admin") {
        const tickets = await db.collection(ticket_collection).find({ attendee_id: new ObjectId(user_id) }).toArray();
        res.status(SUCCESS).send({tickets});
    }

    //individual access
    else {
        if (!req.user_id.equals(user_id)) {
            return res.status(UNAUTHORIZED).send({ error: "invalid id,This ticket was booked by someone.please enter your valid ticket id" })
        }

        const tickets = await db.collection(ticket_collection).find({ attendee_id: new ObjectId(user_id) }).toArray();
        res.status(SUCCESS).send(tickets);
    }
})

const get_specific_tickets=async_error(async(req,res)=>{
    const db = await getDb()
    const ticketId = req.params.ticket_id

    //admin access
    if (req.user.role === "admin") {
        const ticket = await db.collection(ticket_collection).findOne({ _id: new ObjectId(ticketId) });
        if (!ticket) return res.status(NOT_FOUND).send({ error: "Ticket not found" });

        res.status(SUCCESS).send(ticket);
    }

    //check the individual access
    else {
        const ticket = await db.collection(ticket_collection).findOne({ _id: new ObjectId(ticketId), attendee_id: new ObjectId(req.user._id) })
        if (!ticket) return res.status(BAD_REQUEST).send({ error: "invalid ticket id or unknown user" })
        res.status(SUCCESS).send(ticket)
    }


})

const update_tickets=async_error(async(req,res)=>{
    const db = await getDb();
    const ticket_id = req.params.id;
    const update_data = req.body;

    //validation
    const { error } = ticket_validation_update(req.body)
    if (error) {
        const error_message = error.details.map(detail => detail.message)
        res.status(BAD_REQUEST).send(error_message)
    }

    //chcek the ticket by id
    const ticket_details = await db.collection(ticket_collection).findOne({ _id: new ObjectId(ticket_id) });
    if (!ticket_details) return res.status(NOT_FOUND).send({ error: "Ticket not found" });


    if (req.user.role !== "admin" && !ticket_details.attendee_id.equals(req.user._id)) {
        return res.status(FORBIDDEN).send({ error: "You do not have permission to update this ticket" });
    }

    //check the payment status 
    if (ticket_details.payment && ticket_details.payment.status === "paid") {
        return res.status(BAD_REQUEST).send({ error: "Cannot update ticket after payment has been completed" });
    }

    const event = await db.collection(event_collection).findOne({ _id: ticket_details.event_id });
    if (!event) return res.status(NOT_FOUND).send({ error: "Event not found" });

    //iterate the ticket 
    for (let ticket of update_data.tickets) {
        const { type, seats } = ticket;
        const existing_ticket = event.tickets.find(t => t.type === type);

        //echeck existing chances
        if (!existing_ticket) {
            return res.status(NOT_FOUND).send({ error: `Ticket type ${type} not found` });
        }

        let new_seats = ticket_details.tickets.find(t => t.type === type);
        if (!new_seats) {
            res.status(BAD_REQUEST).send({ error: "If you want to update new type of tickets,book the ticket again" })
        }

        //iterate the seats
        for (let seat of seats) {

            //check the seats
            if (new_seats.seats.includes(seat)) {
                return res.status(NOT_FOUND).send({ error: `Seat ${seat} for ${type} is already booked or does not exist` });
            }

            //validation for seats
            if (seat < 1 || seat > existing_ticket.seats.length) {
                return res.status(BAD_REQUEST).send({ error: `Seat number ${seat} is out of bounds for ticket type ${type}` });
            }

            existing_ticket.seats[seat] = false;
            new_seats.seats.push(seat);
        }

        ticket_details.total_amount += existing_ticket.price * seats.length;
        existing_ticket.available -= seats.length;
        existing_ticket.booked += seats.length;

    }

    await db.collection(ticket_collection).updateOne({ _id: new ObjectId(ticket_id) }, { $set: ticket_details });
    await db.collection(event_collection).updateOne({ _id: ticket_details.event_id }, { $set: { tickets: event.tickets } });

    res.status(SUCCESS).send({ message: "Ticket updated successfully" });
})

const delete_tickets=async_error(async(req,res)=>{
    const db = await getDb();
    const booking_id = req.params.booking_id;

    //check the access
    const user = await db.collection(ticket_collection).findOne({ _id: new ObjectId(booking_id), attendee_id: new ObjectId(req.user._id) });
    if (!user && !["admin"].includes(req.user.role)) return res.status(NOT_FOUND).send({ error: "U dont have acces for this ticket,only booked person" });

    //check the ticket by id
    const ticket_status = await db.collection(ticket_collection).findOne({ _id: new ObjectId(booking_id), status: "Cancelled" })
    if (ticket_status) return res.status(BAD_REQUEST).send({ error: "Ticket was already cancelled" })

    //check the booking status
    const booking = await db.collection(ticket_collection).findOne({ _id: new ObjectId(booking_id) });
    if (!booking) return res.status(NOT_FOUND).send({ error: "Booking not found " });

    //check the event
    const event = await db.collection(event_collection).findOne({ _id: new ObjectId(booking.event_id) });
    if (!event) return res.status(BAD_REQUEST).send({ error: "Event not found" });

    //iterate and update the seats 
    booking.tickets.forEach(ticket_booking => {
        const { type, seats } = ticket_booking;
        const ticket_type = event.tickets.find(ticket => ticket.type === type);
        if (ticket_type) {
            seats.forEach(seat => {
                ticket_type.seats[seat] = true;
            });
            ticket_type.available += seats.length;
            ticket_type.booked -= seats.length;
        }
    });

    booking.status = 'Cancelled';

    await db.collection(ticket_collection).updateOne({ _id: new ObjectId(booking_id) }, {
        $set: { status: booking.status }
    })



    await db.collection(event_collection).updateOne({ _id: new ObjectId(booking.event_id) }, {
        $set: { tickets: event.tickets }
    });

    res.status(SUCCESS).send({ message: "Ticket cancelled successfully", bookingId: booking._id });

})


module.exports.ticket_services={book_ticket,get_all_booked_tickets,get_specific_tickets,update_tickets,delete_tickets}