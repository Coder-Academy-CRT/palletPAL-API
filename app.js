const express = require('express')
const cors = require('cors')

require('dotenv').config()

const Pool = require('pg').Pool
const pool = new Pool({
  user: process.env.USERNAME,
  password: process.env.PASSWORD,
  host: process.env.HOST,
  port: process.env.PORT,
  database: process.env.DATABASENAME
})

const app = express()
app.use(cors())           // cors middleware to assist around the CORS issue during development
app.use(express.json())   // this allows the req.body to access as json object

// SEEDS QUERY #################################################################

app.get('/', (request, response) => {
  response.send( { myResponse : "Confirmation that .get request was processed " })
})

app.get('/seeds', (req, res) => {

  let query_string = 
  `SELECT type, variety 
    FROM seed`
    
  pool.query( query_string, (error, results) => {
    if (error) {
      res.status(422).send({ error: error.message })
    } else if (results.rows.length == 0) {
        res.status(404).send({ error: 'No entries' })
    } else {
        res.send(results.rows)
    }
  })
})



app.get('/warehouse/:warehouse_id/locations', (req, res) => {
  const warehouse_id = req.params.warehouse_id

  let query_string = 
  `SELECT coordinates, category, ARRAY_AGG(id) AS pallets_on_location FROM (
    SELECT
        coord AS coordinates, category, pallet.id
          FROM warehouse
            INNER JOIN location ON location.warehouse_id = warehouse.id
              INNER JOIN location_type ON location_type_id = location_type.id
                LEFT JOIN pallet ON pallet.location_id = location.id	        
        WHERE warehouse.id = $1
        ) AS location_data 
    GROUP BY coordinates, category`
    
  pool.query( query_string, [warehouse_id], (error, results) => {
    if (error) {
      res.status(422).send({ error: error.message })
    } else if (results.rows.length == 0) {
        res.status(404).send({ error: 'No entries' })
    } else {
        res.send(results.rows)
    }
  })
})


app.get('/warehouse/:warehouse_id/lots', (req, res) => {
  const warehouse_id = req.params.warehouse_id

  let query_string = 
  `SELECT
	  lot_code, 
	  seed.type AS seed_type, 
	  seed.variety AS seed_variety
	  	FROM lot
				INNER JOIN seed ON lot.seed_id = seed.id
					INNER JOIN warehouse ON lot.warehouse_id = warehouse.id				
	          WHERE warehouse.id = $1`
    

  pool.query( query_string, [warehouse_id], (error, results) => {
    if (error) {
      res.status(422).send({ error: error.message })
    } else if (results.rows.length == 0) {
        res.status(404).send({ error: 'No entries' })
    } else {
        res.send(results.rows)
    }
  })
})


app.get('/warehouse/:warehouse_id/locations', (req, res) => {
  const warehouse_id = req.params.warehouse_id

  let query_string = 
  `SELECT coordinates, category, ARRAY_AGG(id) AS pallets_on_location FROM (
    SELECT
        coord AS coordinates, category, pallet.id
          FROM warehouse
            INNER JOIN location ON location.warehouse_id = warehouse.id
              INNER JOIN location_type ON location_type_id = location_type.id
                LEFT JOIN pallet ON pallet.location_id = location.id	        
        WHERE warehouse.id = $1
        ) AS location_data 
    GROUP BY coordinates, category`
    
  pool.query( query_string, [warehouse_id], (error, results) => {
    if (error) {
      res.status(422).send({ error: error.message })
    } else if (results.rows.length == 0) {
        res.status(404).send({ error: 'No entries' })
    } else {
        res.send(results.rows)
    }
  })
})


app.get('/warehouse/:warehouse_id/products', (req, res) => {
  const warehouse_id = req.params.warehouse_id

  let query_string = 
  `SELECT
    product.id AS product_id,
	  coord AS coordinates, 
	  pallet.id AS pallet_id, 
    lot_code, 
    seed.type AS seed_type, 
    seed.variety AS seed_variety, 
    product.bag_size, 
    product.number_of_bags	
	
      FROM product
        INNER JOIN lot ON product.lot_id = lot.id
          INNER JOIN seed ON lot.seed_id = seed.id
            INNER JOIN pallet ON product.pallet_id = pallet.id
              INNER JOIN location ON pallet.location_id = location.id
                INNER JOIN warehouse ON location.warehouse_id = warehouse.id 	
							
		WHERE warehouse.id = $1`
    

  pool.query( query_string, [warehouse_id], (error, results) => {
    if (error) {
      res.status(422).send({ error: error.message })
    } else if (results.rows.length == 0) {
        res.status(404).send({ error: 'No entries' })
    } else {
        res.send(results.rows)
    }
  })
})

module.exports = app