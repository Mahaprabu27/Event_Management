const express = require('express')
const joi = require('joi')
const bcrypt = require('bcrypt')
const router = express.Router()
const { getDb } = require('../startup/db')
const { generate_authToken } = require('../startup/tokenGeneration')
const async_error = require('../middleware/async_error')
const collection = require('../startup/collections')
const { login_validation } = require('../validation/users')
const { BAD_REQUEST, NOT_FOUND } = require('../startup/status_Codes')

const user_collection = collection.user_collection

//user login - enter the details to get the token for future operations
router.post('/', async_error(async (req, res) => {

    //validation
    const { error } = login_validation(req.body)
    if (error) return res.status(BAD_REQUEST).send(error.details[0].message)

    const db = await getDb()

    //checking email
    let user = await db.collection(user_collection).findOne({ email: req.body.email })
    if (!user) return res.status(NOT_FOUND).send('invalid email address')

    //checking the passwords
    const validate_pass = await bcrypt.compare(req.body.password, user.password)
    if (!validate_pass) return res.status(BAD_REQUEST).send('Invalid user or password')

    //generate auth token
    const jwtToken = generate_authToken(user)
    res.send(jwtToken)

}))



module.exports = router