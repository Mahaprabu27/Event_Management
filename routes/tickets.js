const express = require('express')
const router = express.Router()
const { getDb } = require('../startup/db')
const { ObjectId } = require('mongodb')
const auth = require('../middleware/auth')
const { ticket_validation, ticket_validation_update } = require('../validation/tickets')
const async_error = require('../middleware/async_error')
const collection =require('../startup/collections')

const ticket_collection = collection.ticket_collection
const event_collection=collection.event_collection
const user_collection=collection.user_collection

//book a ticket
router.post('/:eventId/', auth, async_error(async (req, res) => {

    const db = await getDb();

    const { error } = ticket_validation(req.body)
    if (error) {
        const error_message = error.details.map(detail => detail.message)
        res.status(400).send(error_message)
    }

    const event = await db.collection(event_collection).findOne({ _id: new ObjectId(req.params.eventId) });
    if (!event) return res.status(404).send({ error: "Event not found" });

    const ticket_bookings = req.body.tickets;
    let total_amount = 0;


    for (let ticket_booking of ticket_bookings) {
        const { type, seats } = ticket_booking;

        const ticket_type = event.tickets.find(ticket => ticket.type === type);
        if (!ticket_type) return res.status(404).send({ error: `Ticket type ${type} not found` });


        const seat_errors = []
        for (let seat of seats) {
            if (!ticket_type.seats[seat]) {
                seat_errors.push(`Seat ${seat} for ${type} is already booked or does not exist`);
            }
        }
        if (seat_errors.length > 0) return res.status(400).send({ seatErrors: seat_errors });



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

    await db.collection(event_collection).updateOne({ _id: new ObjectId(req.params.eventId) }, {
        $set: { tickets: event.tickets }
    });

    res.status(201).send({ message: "Ticket booked successfully", bookingId: booking._id, totalAmount: total_amount })

}));


// get all booked tickets by userid
router.get('/:user_id/tickets', auth, async_error(async (req, res) => {

    const db = await getDb();
    const user_id = req.params.user_id;

    const user = await db.collection(user_collection).findOne({ _id: new Object(user_id) })
    if (!user) res.status(404).send({ error: "User not found" })

    if (req.user.role === "admin") {
        const tickets = await db.collection(ticket_collection).find({ attendee_id: new ObjectId(user_id) }).toArray();
        res.status(200).send(tickets);
    }
    else {
        if (!req.user_id.equals(user_id)) {
            return res.status(401).send({ error: "invalid id,This ticket was booked by someone.please enter your valid ticket id" })
        }

        const tickets = await db.collection(ticket_collection).find({ attendee_id: new ObjectId(user_id) }).toArray();
        res.status(200).send(tickets);
    }
}));



//view specific ticket details
router.get('/ticket/:ticket_id', auth, async_error(async (req, res) => {
    const db = await getDb()
    const ticketId = req.params.ticket_id


    if (req.user.role === "admin") {
        const ticket = await db.collection(ticket_collection).findOne({ _id: new ObjectId(ticketId) });
        if (!ticket) return res.status(404).send({ error: "Ticket not found" });

        res.status(200).send(ticket);
    }
    else {
        const ticket = await db.collection(ticket_collection).findOne({ _id: new ObjectId(ticketId), attendee_id: new ObjectId(req.user._id) })
        if (!ticket) return res.status(400).send({ error: "invalid ticket id or unknown user" })
        res.status(200).send(ticket)
    }


}))

//update the tickets
router.patch('/:id', auth, async_error(async (req, res) => {

    const db = await getDb();
    const ticket_id = req.params.id;
    const update_data = req.body;

    const { error } = ticket_validation_update(req.body)
    if (error) {
        const error_message = error.details.map(detail => detail.message)
        res.status(400).send(error_message)
    }

    const ticket_details = await db.collection(ticket_collection).findOne({ _id: new ObjectId(ticket_id) });
    if (!ticket_details) return res.status(404).send({ error: "Ticket not found" });


    if (req.user.role !== "admin" && !ticket_details.attendee_id.equals(req.user._id)) {
        return res.status(403).send({ error: "You do not have permission to update this ticket" });
    }

    if (ticket_details.payment && ticket_details.payment.status === "paid") {
        return res.status(400).send({ error: "Cannot update ticket after payment has been completed" });
    }

    const event = await db.collection(event_collection).findOne({ _id: ticket_details.event_id });
    if (!event) return res.status(404).send({ error: "Event not found" });


    for (let ticket of update_data.tickets) {
        const { type, seats } = ticket;
        const existing_ticket = event.tickets.find(t => t.type === type);

        if (!existing_ticket) {
            return res.status(404).send({ error: `Ticket type ${type} not found` });
        }

        let new_seats = ticket_details.tickets.find(t => t.type === type);
        if (!new_seats) {
            res.status(400).send({ error: "If you want to update new type of tickets,book the ticket again" })
        }

        for (let seat of seats) {

            if (new_seats.seats.includes(seat)) {
                return res.status(400).send({ error: `Seat ${seat} for ${type} is already booked or does not exist` });
            }

            if (seat < 1 || seat > existing_ticket.seats.length) {
                return res.status(400).send({ error: `Seat number ${seat} is out of bounds for ticket type ${type}` });
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

    res.status(200).send({ message: "Ticket updated successfully" });
}));




//cancel the ticket
router.delete('/:booking_id', auth, async_error(async (req, res) => {

    const db = await getDb();
    const booking_id = req.params.booking_id;

    console.log(req.user._id)
    const user = await db.collection(ticket_collection).findOne({ _id: new ObjectId(booking_id), attendee_id: new ObjectId(req.user._id) });
    if (!user && !["admin"].includes(req.user.role)) return res.status(404).send({ error: "U dont have acces for this ticket,only booked person" });

    const ticket_status = await db.collection(ticket_collection).findOne({ _id: new ObjectId(booking_id), status: "Cancelled" })
    if (ticket_status) return res.status(400).send({ error: "Ticket was already cancelled" })

    const booking = await db.collection(ticket_collection).findOne({ _id: new ObjectId(booking_id) });
    if (!booking) return res.status(404).send({ error: "Booking not found " });


    const event = await db.collection(event_collection).findOne({ _id: new ObjectId(booking.event_id) });
    if (!event) return res.status(404).send({ error: "Event not found" });


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

    res.status(200).send({ message: "Ticket cancelled successfully", bookingId: booking._id });
}));

module.exports = router
