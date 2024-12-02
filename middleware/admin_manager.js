const { getDb } = require('../startup/db')
const { user_collection } = require('../startup/collections')
const { ObjectId } = require('mongodb')
const {NOT_FOUND}=require('../startup/status_Codes')

async function admin_manger(req, res, next) {
    const db = await getDb()
    //check the user by id
    const user = await db.collection(user_collection).findOne({ _id: new ObjectId(req.user._id) })
    if (!user) res.status(NOT_FOUND).send({ error: "User not found ,provide valid id" })
    //check the role for proving access
    if (!["admin", "manager"].includes(req.user.role))
        return res.status(NOT_FOUND).send({ error: `Dont have access for ${req.user.role}` })
    next()
}

module.exports = admin_manger