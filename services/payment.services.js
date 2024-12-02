
const { getDb } = require('../startup/db')
const { ObjectId } = require('mongodb')

const async_error = require('../middleware/async_error')

const collection = require('../startup/collections')
const { BAD_REQUEST, UNAUTHORIZED, SUCCESS } = require('../startup/status_Codes')

const ticket_collection = collection.ticket_collection

const make_payment=async_error(async(req,res)=>{
    const db = await getDb();
    const ticket_id = req.params.id;

    //check the ticket by id
    const ticket_details = await db.collection(ticket_collection).findOne({ _id: new ObjectId(ticket_id) });
    if (!ticket_details) return res.status(BAD_REQUEST).send({ error: "Invalid ticket ID or not invalid user" });

    //check the permission for their oen ticket
    if (!ticket_details.attendee_id.equals(req.user._id)) {
        return res.status(UNAUTHORIZED).send({ error: "You do not have permission to make payment for this ticket" });
    }

    //chack the ticket status
    if (ticket_details.status === "Cancelled") {
        return res.status(BAD_REQUEST).send({ error: "The ticket was cancelled already. Can't make a payment." });
    }

    //chekc the payment status
    if (ticket_details.payment && ticket_details.payment.status === "paid") {
        return res.status(BAD_REQUEST).send({ error: "Payment is already completed for this ticket." });
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

    res.status(SUCCESS).send({ message: "Payment completed successfully", payment: payment });
})

const get_all_payments= async_error(async(req,res)=>{
    const db = await getDb()

    const details = await db.collection(ticket_collection).find({ "payment.status": "paid" }).toArray()
    res.status(SUCCESS).send(details)
})

const get_specific_payments_by_id=async_error(async(req,res)=>{
    const db = await getDb()
    const ticket_id = req.params.ticket_id

    //check the ticket and payment status
    const ticket = await db.collection(ticket_collection).findOne({ _id: new ObjectId(ticket_id), "payment.status": "paid" });
    if (!ticket) return res.status(404).send({ error: "Ticket not found or payment not completed" });

    res.status(SUCCESS).send(ticket);
})


module.exports.payment_services={get_all_payments,get_specific_payments_by_id,make_payment}