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


///////////////////////////////// DELETE LOT, PALLET, PRODUCT ///////////////////////////////////////////

// DELETE PALLET

app.delete('/pallet/:pallet_id', (req, res) => {

  const pallet_id = req.params.pallet_id

  let query_string = 
  `DELETE FROM pallet
    WHERE id = $1`

  pool.query(query_string, [pallet_id], (error, _) => {
      if (error) {
          res.status(422).send({ error: error.message })
      } else {
          res.send(`pallet ${pallet_id} deleted`)
      }
  })
})


// DELETE PRODUCT 

app.delete('/product/:product_id', (req, res) => {

  const pallet_id = req.params.pallet_id

  let query_string = 
  `DELETE FROM product
    WHERE id = $1;

    DELETE FROM pallet
      WHERE id IN (
        SELECT pallet.id AS empty_pallet_id FROM product
          RIGHT JOIN pallet ON pallet.id = product.pallet_id
            WHERE product.pallet_id IS NULL )
  `
  // optional additional SQL will search for any empty pallets (should generally just be a single one) and delete the pallet
  

  pool.query(query_string, [pallet_id], (error, _) => {
      if (error) {
          res.status(422).send({ error: error.message })
      } else {
          res.send(`product ${product_id} deleted`)
      }
  })
})


// DELETE LOT

app.delete('/warehouse/:warehouse_id/lot/:lot_code', (req, res) => {

  const warehouse_id = req.params.warehouse_id
  const lot_code = req.params.lot_code

  let query_string = 
  `DELETE FROM lot
	  WHERE id = (
      SELECT lot.id FROM lot
	      INNER JOIN warehouse ON lot.warehouse_id = warehouse.id
	      	WHERE lot_code = $1
	      	AND warehouse.id = $2 );
		

    DELETE FROM pallet
      WHERE id IN (
        SELECT pallet.id AS empty_pallet_id FROM product
          RIGHT JOIN pallet ON pallet.id = product.pallet_id
            WHERE product.pallet_id IS NULL )
  `
  // optional additional SQL will search for any empty pallets (could be multiple here) and delete the pallet/s
  
  pool.query(query_string, [lot_code, warehouse_id], (error, _) => {
      if (error) {
          res.status(422).send({ error: error.message })
      } else {
          res.send(`lot ${lot_code} deleted`)
      }
  })
})



////////////////////////////////////// UPDATE PRODUCT AND LOT ///////////////////////////////////////////

// UPDATE PRODUCT

app.put('/product/:product_id', (req, res) => {

  const product_id = req.params.product_id

  let query_string = 
  `UPDATE product
    SET lot_code = $1
      WHERE id = $2;
      
  DELETE FROM product
    WHERE number_of_bags = 0;

  DELETE FROM pallet
    WHERE id IN (
      SELECT pallet.id AS empty_pallet_id FROM product
        RIGHT JOIN pallet ON pallet.id = product.pallet_id
          WHERE product.pallet_id IS NULL )
  `

  pool.query(query_string, [req.body.number_of_bags, product_id], (error, _) => {
      if (error) {
          res.status(422).send({ error: error.message })
      } else {
          res.send(`product ${product_id} updated`)
      }
  })
})


  // UPDATE LOT

  app.put('/warehouse/:warehouse_id/lot/:lot_code', (req, res) => {

    const warehouse_id = req.params.warehouse_id
    const lot_code = req.params.lot_code
  
    let query_string = 
    `UPDATE product
      SET lot_code = $1
      WHERE id = (
        SELECT lot.id FROM lot
          INNER JOIN warehouse ON lot.warehouse_id = warehouse.id
            WHERE lot_code = $2
            AND warehouse.id = $3 );
    `
  
    pool.query(query_string, [req.lot_code, lot_code, warehouse_id], (error, _) => {
        if (error) {
            res.status(422).send({ error: error.message })
        } else {
            res.send(`lot code ${lot_code} changed to ${req.lot_code}`)
        }
    })

})



module.exports = app