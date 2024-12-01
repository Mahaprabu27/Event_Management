const express = require('express')
const app = express()
const { connectToDb, getDb } = require('./startup/db')
const dotenv = require('dotenv')
const users = require('./routes/user')
const auth = require('./routes/auth')
const events = require('./routes/events')
const tickets = require('./routes/tickets')
const payment = require('./routes/payment')
const report = require('./routes/report')

const err = require('./middleware/error')
dotenv.config()

app.use(express.json())
app.use('/api/users', users)
app.use('/api/auth', auth)
app.use('/api/events', events)
app.use('/api/tickets', tickets)
app.use('/api/payment', payment)
app.use('/api/report', report)

app.use(err)

connectToDb().then(() => {
    console.log("get the db succesfully")
    app.listen(process.env.MOGODB_PORT, () => {
        console.log(`Server is running on the port ${process.env.MOGODB_PORT}`)
    })
})

