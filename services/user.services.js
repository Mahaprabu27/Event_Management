const {getDb}=require('../startup/db')
const {user_validation}=require('../validation/users')
const {user_collection}=require('../startup/collections')
const {BAD_REQUEST, CREATED, NOT_FOUND, SUCCESS}=require('../startup/status_Codes')
const {ObjectId}=require('mongodb')
const _=require('lodash')
const bcrypt=require('bcrypt')
const {generate_authToken}=require('../startup/tokenGeneration')
const async_error=require('../middleware/async_error')


const user_creation=async_error(async(req,res)=>{
    const db = await getDb()

    const { error } = user_validation(req.body)
    if (error) {
        const error_message = error.details.map(detail => detail.message)
        return res.status(BAD_REQUEST).send({ error: error_message })
    }

     //check the email
    let user = await db.collection(user_collection).findOne({ email: req.body.email })
    if (user) return res.status(BAD_REQUEST).send({ error: "the user have already registered" })

    user = _.pick(req.body, ['name', 'email', 'password', 'role'])

    //encrypt the password
    const salt = await bcrypt.genSalt(10)
    user.password = await bcrypt.hash(user.password, salt)

    user._id = new ObjectId()

    //generate Token
    const jwtToken = generate_authToken(user)
    const result = await db.collection(user_collection).insertOne(user)

    res.header('x-auth-token', jwtToken).status(CREATED).send({
        message: "data inserted sucessfully",
        id: result.insertedId
    })
})


const current_details_of_user=async_error(async(req,res)=>{
    const db = await getDb()

    const user = await db.collection(user_collection).findOne({ _id: new ObjectId(req.user._id) }, { projection: { password: 0 } })
    if (!user) return res.status(NOT_FOUND).send({ error: "user not found" })

    res.status(SUCCESS).send(user)
})

const get_all_users_and_mangers=async_error(async(req,res)=>{
    const db = await getDb()

    const result = await db.collection(user_collection).find({}, { projection: { password: 0 } }).toArray()
    res.status(SUCCESS).send(result)
})

const view_all_managers=async_error(async(req,res)=>{
    const db = await getDb()

    //check the counts
    const result = await db.collection(user_collection).find({ role: "manager" }).toArray()
    if(!result) res.status(NOT_FOUND).send({message:"no users registered in manager role"})

    res.status(SUCCESS).send(result)
})

const view_all_users=async_error(async(req,res)=>{
    const db = await getDb()

    const result = await db.collection(user_collection).find({ role: "user" }).toArray()
    res.status(SUCCESS).send(result)
})

const delete_user=async_error(async(req,res)=>{
    const db = await getDb()

    //check the user by id
    const check = await db.collection(user_collection).findOne({ _id: new ObjectId(req.params.id) })
    if (!check) res.status(BAD_REQUEST).send({ error: "invalid id" })

    await db.collection(user_collection).deleteOne({ _id: req.params.id })
    res.status(SUCCESS).send({ message: "deleted sucessfully" })
})

const update_user=async_error(async(req,res)=>{
    const user = req.body
    
    //validation
    const { error } = user_validation_update(user)
    if (error) return res.status(BAD_REQUEST).send({ error: error.details[0].message })
    
    //check the user by id
    const check = await db.collection(user_collection).findOne({ _id: new ObjectId(req.params.id) })
    if (!check) res.status(NOT_FOUND).send({ error: "invalid id" })

    //encrypt the password
    if (user.password) {
        const salt = await bcrypt.genSalt(10)
        user.password = await bcrypt.hash(user.password, salt)
    }
    const db = await getDb()
    await db.collection(user_collection).updateOne({ _id: new ObjectId(req.params.id) }, {
        $set: user
    })

    res.status(SUCCESS).send({ message: "updated successfully" })
})

module.exports.user_services={user_creation,view_all_users,update_user,delete_user,current_details_of_user,get_all_users_and_mangers,view_all_managers}