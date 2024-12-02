const {getDb}=require('../startup/db')
const {user_collection}=require('../startup/collections')
const { ObjectId } = require('mongodb')

async function admin(req, res, next) {

    const db=await getDb()
    const admin=await db.collection(user_collection).findOne({_id:new ObjectId(req.user._id),role:req.user.role})
    if(!admin) return res.status(404).send({error:"user not found,dont have access.."})

    // if (req.user.role !== "admin") return res.status(403).send({ error: `need admin access ,dont have access to ${req.user.role}` })

    next();
}

module.exports = admin