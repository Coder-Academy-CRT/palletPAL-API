const express = require('express')
const cors = require('cors')

require('dotenv').config()

const app = express()
app.use(cors())           // cors middleware to assist around the CORS issue during development
app.use(express.json())   // this allows the req.body to access as json object


// REQUESTS 
app.get('/', (request, response) => {
  response.send( { myResponse : "Confirmation that .get request was processed " })
})


module.exports = app