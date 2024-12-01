const express = require('express')
const router = express.Router()
const { getDb } = require('../startup/db')
const auth = require('../middleware/auth')
const admin = require('../middleware/admin')
const _ = require('lodash')
const bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb')
const async_error=require('../middleware/async_error')

const { user_validation, generate_authToken, user_validation_update } = require('../validation/users')

const collection =require('../startup/collections')

const user_collection=collection.user_collection


const status_error = 400
const success = 200

//registration for manager,user
router.post('/', async_error(async (req, res) => {

    const db = await getDb()


    const { error } = user_validation(req.body)
    if (error) {
        const error_message = error.details.map(detail => detail.message)
        return res.status(status_error).send({ error: error_message })
    }


    if (!['manager', 'user'].includes(req.body.role)) {
        return res.status(status_error).send({ error: "provide proper role either user or manager. [!use small letters..]" })
    }

    let user = await db.collection(user_collection).findOne({ email: req.body.email })
    if (user) return res.status(status_error).send({ error: "the user have already registered" })

    user = _.pick(req.body, ['name', 'email', 'password', 'role'])


    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(user.password, salt)

    const _id = new ObjectId()
    user._id = _id

    const jwtToken = generate_authToken(user)
    const result = await db.collection(user_collection).insertOne(user)

    res.header('x-auth-token', jwtToken).status(201).send({
        message: "data inserted sucessfully",
        id: result.insertedId
    })


}))

//get the current details of the user by auth token
router.get('/me', auth, async_error(async (req, res) => {
    const db = await getDb()

    const user = await db.collection(user_collection).findOne({ _id: new ObjectId(req.user._id) }, { projection: { password: 0 } })
    if (!user) return res.status(404).send({ error: "user not found" })

    res.status(success).send(user)

}))


//get all users and managers
router.get('/', [auth, admin],async_error(async (req, res) => {
    const db = await getDb()
    const result = await db.collection(user_collection).find({}, { projection: { password: 0 } }).toArray()
    res.status(success).send(result)

}))

//view all maanger details
router.get('/managers', [auth, admin],async_error( async (req, res) => {
    const db = await getDb()
    const result = await db.collection(user_collection).find({ role: "manager" }).toArray()
    res.status(success).send(result)
}))

router.get('/users', [auth, admin], async_error(async (req, res) => {
    const db = await getDb()
    const result = await db.collection(user_collection).find({ role: "user" }).toArray()
    res.status(success).send(result)
}))

router.delete('/:id', [auth, admin],async_error(async (req, res) => {
    const db = await getDb()

    const check = await db.collection(user_collection).findOne({ _id: new ObjectId(req.params.id) })
    if (!check) res.status(status_error).send({ error: "invalid id" })

    await db.collection(user_collection).deleteOne({ _id: req.params.id })
    res.status(success).send({ message: "deleted sucessfully" })
}))

router.put("/:id", [auth, admin], async_error(async (req, res) => {

    const user = req.body

    const { error } = user_validation_update(user)
    if (error) return res.status(status_error).send({ error: error.details[0].message })

    const check = await db.collection(user_collection).findOne({ _id: new ObjectId(req.params.id) })
    if (!check) res.status(status_error).send({ error: "invalid id" })

    if (user.password) {
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(user.password, salt)
    }
    const db = await getDb()
    await db.collection(user_collection).updateOne({ _id: new ObjectId(req.params.id) }, {
        $set: user
    })

    res.status(success).send({ message: "updated successfully" })
}))
module.exports = router





