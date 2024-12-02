const { getDb } = require('../startup/db')
const { user_collection } = require('../startup/collections')
const { ObjectId } = require('mongodb')
const {NOT_FOUND}=require('../startup/status_Codes')
async function admin(req, res, next) {

    const db = await getDb()
    //check the role for providing access
    const admin = await db.collection(user_collection).findOne({ _id: new ObjectId(req.user._id), role: req.user.role })
    if (!admin) return res.status(NOT_FOUND).send({ error: "user not found,dont have access.." })

    // if (req.user.role !== "admin") return res.status(403).send({ error: `need admin access ,dont have access to ${req.user.role}` })
    next();
}

module.exports = admin