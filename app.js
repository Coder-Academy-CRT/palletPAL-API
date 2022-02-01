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



///////////////////////////////// READ SEEDS, LOT, PALLET, PRODUCT ///////////////////////////////////////////

// CONFIRMATION 

app.get('/', (_, response) => {
  response.send( { myResponse : "Confirmation that .get request was processed " })
})

// READ SEEDS 

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


// READ WAREHOUSE LOCATIONS w/ TYPES and [ PALLETS ]

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

// READ LOTS BELONGING TO WAREHOUSE

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

// READ ALL PRODUCTS (additionally includes coordinates that pallet is located, and seed variety/type)

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

  let batch_string = 
  `UPDATE product
    SET 
      lot_id = $1,
      bag_size = $2,
      number_of_bags = $3
        WHERE id = $4;
      
  DELETE FROM product
    WHERE number_of_bags = 0;

  DELETE FROM pallet
    WHERE id IN (
      SELECT pallet.id AS empty_pallet_id FROM product
        RIGHT JOIN pallet ON pallet.id = product.pallet_id
          WHERE product.pallet_id IS NULL )
  `

  pool.query(batch_string, [req.body.lot_id, req.body.bag_size, req.body.number_of_bags, product_id], (error, _) => {
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
  
    pool.query(query_string, [req.body.lot_code, lot_code, warehouse_id], (error, _) => {
        if (error) {
            res.status(422).send({ error: error.message })
        } else {
            res.send(`lot code ${lot_code} changed to ${req.body.lot_code}`)
        }
    })
})

  // UPDATE LOCATION

  app.put('/locations', (req, res) => {

    let query_string = 
    `UPDATE product
      SET location_type = $1
        WHERE coords IN $2;

    UPDATE product
      SET location_type = $3
        WHERE coords IN $4;

    UPDATE product
      SET location_type = $5
        WHERE coords IN $6
    `
    // consider option for location_type to be an array of relating ids
    // consider option for coordinates to be an array of arrays, where matching coordinates are assigned
    // alternative consider single object with types as keys and values as the array of matching coordinates

    pool.query(query_string, [
        req.body.location_type[0], 
        req.body.coordinates[0][0], 
        req.body.location_type[1], 
        req.body.coordinates[1][0], 
        req.body.location_type[2], 
        req.body.coordinates[2][0] 
      ], (error, _) => {
        if (error) {
            res.status(422).send({ error: error.message })
        } else {
            res.send('location types updated')
        }
    })
})



////////////////////////////  CREATE PRODUCT, LOT, WAREHOUSE  ///////////////////////////////////////////

// CREATE LOT

app.post('/warehouse/:warehouse_id/lot/:lot_code', (req, res) => {

  const warehouse_id = req.params.warehouse_id
  const lot_code = req.params.lot_code

  let query_string = 
  `INSERT INTO lot (warehouse_id, lot_code, seed_id)
  VALUES 
    ($1, 
    $2,
    (SELECT id
      FROM seed
        WHERE type = $3
        AND variety = $4)
    );
  `

  pool.query(query_string, [warehouse_id, lot_code, req.body.seed_type, req.body.seed_variety], (error, _) => {
    if (error) {
      if (error.message.includes("duplicate key value violates unique constraint")) {
        res.send("This lot code already exists for this warehouse. Please choose another if you still wish to create a new lot.")
      } else {
        res.status(422).send({ error: error.message }) }
    } else {
        res.send(`lot code ${lot_code} added to warehouse database`)
    }
  })
})


// CREATE PRODUCT 

app.post('/pallet/:pallet_id/products', (req, res) => {

  const pallet_id = req.params.pallet_id

  let query_string = 
  `INSERT INTO product (pallet_id, lot_id, bag_size, number_of_bags)
  VALUES 
    ($1, 
    (SELECT id
      FROM lot
        WHERE lot_code = $2),
    $3,
    $4) 
  `

  pool.query(query_string, [
    pallet_id, 
    req.body.lot_code, 
    req.body.bag_size,
    req.body.number_of_bags
    ], (error, _) => {
      if (error) {
        if (error.message.includes('duplicate key value violates unique constraint "product_pallet_id_lot_id_bag_size_key"')) {
          res.send("Cannot add another product of the exact same lot code AND bag size, on the same pallet. Please simply adjust the volume of the product already on this pallet.")
        } else {
          res.status(422).send({ error: error.message }) }
      } else {
          res.send(`new product successfully added`)
      }
  })
})


// CREATE WAREHOUSE 

app.post('/warehouse', (req, res) => {

  let query_string = 
  `INSERT INTO warehouse (name)
    VALUES ($1)
      RETURNING name 
  `

  pool.query('INSERT INTO warehouse (name) VALUES ($1) RETURNING *', [req.body.warehouse_name], (error, results) => {
      if (error) {
          res.status(422).send({ error: error.message })
      } else {
          res.send(results.rows[0])
      }
  })
})

module.exports = app