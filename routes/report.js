const express = require('express')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')
const router = express.Router()
const { getDb } = require('../startup/db')
const { ObjectId } = require('mongodb')
const async_error = require('../middleware/async_error')

const collection =require('../startup/collections')

const event_collection=collection.event_collection

//get all event report
router.get('/event-stats', [auth, admin], async_error(async (req, res) => {

    const db = await getDb();

    const eventStats = await db.collection(event_collection).aggregate([
        {
            $unwind: "$tickets"
        },
        {
            $group: {
                _id: "$_id",
                event_name: { $first: "$title" },
                event_venue: { $first: "$location" },
                total_booked_tickets: { $sum: "$tickets.booked" },
                total_available_tickets: { $sum: "$tickets.available" },
                booked_tickets_status: { $push: { type: "$tickets.type", price: "$tickets.price", available: "$tickets.available", booked: "$tickets.booked", total_revenue: { $sum: { $multiply: ["$tickets.price", "$tickets.booked"] } } } },
                total_revenue: { $sum: { $multiply: ["$tickets.booked", "$tickets.price"] } }
            }
        },
        {
            $project: {
                _id: 0,
                event_name: 1,
                event_venue: 1,
                total_booked_tickets: 1,
                booked_tickets_status: 1,
                total_available_tickets: 1,
                total_revenue: 1
            }
        }
    ]).toArray();

    res.status(200).send(eventStats);

}));


//get report for specific event id
router.get("/:event_id", [auth, admin], async_error(async (req, res) => {

    const db = await getDb()
    const event_id = req.params.event_id


    const eventStats = await db.collection(event_collection).aggregate([
        {
            $match: { _id: new ObjectId(event_id) }
        },
        {
            $unwind: "$tickets"
        },
        {
            $group: {
                _id: "$_id",
                event_name: { $first: "$title" },
                event_venue: { $first: "$location" },
                total_booked_tickets: { $sum: "$tickets.booked" },
                total_available_tickets: { $sum: "$tickets.available" },
                booked_tickets_status: { $push: { type: "$tickets.type", price: "$tickets.price", available: "$tickets.available", booked: "$tickets.booked", total_revenue: { $sum: { $multiply: ["$tickets.price", "$tickets.booked"] } } } },
                total_revenue: { $sum: { $multiply: ["$tickets.booked", "$tickets.price"] } }
            }
        },
        {
            $project: {
                _id: 0,
                event_name: 1,
                event_venue: 1,
                total_booked_tickets: 1,
                booked_tickets_status: 1,
                total_available_tickets: 1,
                total_revenue: 1
            }
        }
    ]).toArray();

    res.status(200).send(eventStats);


}))



module.exports = router

