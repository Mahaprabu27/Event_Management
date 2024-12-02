const { getDb } = require('../startup/db')
const { user_collection } = require('../startup/collections')
const { ObjectId } = require('mongodb')

async function admin_manger(req, res, next) {
    const db = await getDb()
    console.log(req.user._id)

    const user = await db.collection(user_collection).findOne({ _id:new ObjectId(req.user._id) })
    if (!user) res.status(404).send({ error: "User not found ,provide valid id" })

    if (!["admin", "manager"].includes(req.user.role))
        return res.status(404).send({ error: `Dont have access for ${req.user.role}` })

    next()


}

module.exports = admin_manger