const express = require('express')
const router = express.Router()

const { getDb } = require('../startup/db')
const { ObjectId } = require('mongodb')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')
const async_error = require('../middleware/async_error')

const collection = require('../startup/collections')

const ticket_collection = collection.ticket_collection

//payment for the ticket
router.post('/:id', auth, async_error(async (req, res) => {
    const db = await getDb();
    const ticket_id = req.params.id;


    const ticket_details = await db.collection(ticket_collection).findOne({ _id: new ObjectId(ticket_id) });
    if (!ticket_details) return res.status(400).send({ error: "Invalid ticket ID or not invalid user" });

    if (!ticket_details.attendee_id.equals(req.user._id)) {
        return res.status(403).send({ error: "You do not have permission to make payment for this ticket" });
    }


    if (ticket_details.status === "Cancelled") {
        return res.status(400).send({ error: "The ticket was cancelled already. Can't make a payment." });
    }


    if (ticket_details.payment && ticket_details.payment.status === "paid") {
        return res.status(400).send({ error: "Payment is already completed for this ticket." });
    }


    const payment = {
        payment_id: new ObjectId(),
        payment_method: req.body.payment_method,
        total_amount: ticket_details.total_amount,
        status: 'paid'
    };


    await db.collection(ticket_collection).updateOne({ _id: new ObjectId(ticket_id) }, {
        $set: { status: "Booked", payment: payment }
    });

    res.status(200).send({ message: "Payment completed successfully", payment: payment });
}))


//get all payments 
router.get('/', auth, admin, async_error(async (req, res) => {
    const db = await getDb()

    const details = await db.collection(ticket_collection).find({ "payment.status": "paid" }).toArray()
    res.status(200).send(details)
}))


//get specific payments by id
router.get("/:ticket_id", auth, async_error(async (req, res) => {
    const db = await getDb()
    const ticket_id = req.params.ticket_id

    const ticket = await db.collection(ticket_collection).findOne({ _id: new ObjectId(ticket_id), "payment.status": "paid" });
    if (!ticket) return res.status(404).send({ error: "Ticket not found or payment not completed" });

    if (req.user.role === "admin" || ticket.attendee_id.equals(req.user._id)) {
        res.status(200).send(ticket);
    }
    else {
        res.status(403).send({ error: "Access denied. You do not have permission to view this payment." });
    }
}))

module.exports = router