const { MongoClient } = require('mongodb')
require('dotenv').config()

const url = process.env.MONGODB_URL
const dbName = process.env.MONGODB_DBNAME

let db;

async function connectToDb() {
  const client = new MongoClient(url)
  try {
    await client.connect()
    db = client.db(dbName)
    console.log("Mongodb connected sucessfully..")

  } catch (error) {
    console.log("Error", error)
  }
}

async function getDb() {
  if (!db) {
    throw new Error('Error occured in mongodb connection...')
  }
  return db;
}

module.exports = { connectToDb, getDb }