const express = require('express')
const cors = require('cors')

require('dotenv').config()

const Pool = require('pg').Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized : false },
  ssl: false
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

// READ WAREHOUSES

app.get('/warehouses', (_, res) => {
 
  let query_string = 
  `SELECT * FROM warehouse`
    
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


// READ ALL LOTS




///////////////////////////////// DELETE LOT, PALLET, EMPTY PALLETS, PRODUCT ///////////////////////////////////////////

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

  const product_id = req.params.product_id

  let query_string = 
  `DELETE FROM product
    WHERE id = $1
  `

  let empty_pallets_string = 
  `
  DELETE FROM product
    WHERE number_of_bags = 0;

  DELETE FROM pallet
    WHERE id IN (
      SELECT pallet.id AS empty_pallet_id FROM product
        RIGHT JOIN pallet ON pallet.id = product.pallet_id
          WHERE product.pallet_id IS NULL )
  `

  pool.query(query_string, [product_id], (error, _) => {
    if (error) {
        res.status(422).send({ error: error.message })
    } else {
      pool.query(empty_pallets_string, (error, _) => {
        if (error) {
            res.status(422).send({ error: error.message })
        } else {
            res.send(`product ${product_id} deleted`)
        }
      })
    }
  })
})


// DELETE EMPTY PALLETS

app.delete('/pallets/empty', (req, res) => {

  let query_string = 
  `DELETE FROM product
    WHERE number_of_bags = 0;

  DELETE FROM pallet
    WHERE id IN (
      SELECT pallet.id AS empty_pallet_id FROM product
        RIGHT JOIN pallet ON pallet.id = product.pallet_id
          WHERE product.pallet_id IS NULL )
  `

  pool.query(query_string, (error, _) => {
    if (error) {
        res.status(422).send({ error: error.message })
    } else {
        res.send('empty pallets deleted')
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
  `

  let empty_pallets_string = 
  `
  DELETE FROM product
    WHERE number_of_bags = 0;

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
      pool.query(empty_pallets_string, (error, _) => {
        if (error) {
            res.status(422).send({ error: error.message })
        } else {
            res.send(`lot ${lot_code} deleted`)
        }
      })
    }
  })
})


////////////////////////////////////// UPDATE PRODUCT, LOT AND LOCATION ///////////////////////////////////////////

// UPDATE PRODUCT

app.put('/product/:product_id', (req, res) => {

  const product_id = req.params.product_id

  let query_string = 
  `UPDATE product
    SET 
      lot_id = (
        SELECT id 
          FROM lot
            WHERE lot_code = $1),
      bag_size = $2,
      number_of_bags = $3
        WHERE id = $4;  
      `

  let empty_pallets_string = 
  `
  DELETE FROM product
    WHERE number_of_bags = 0;

  DELETE FROM pallet
    WHERE id IN (
      SELECT pallet.id AS empty_pallet_id FROM product
        RIGHT JOIN pallet ON pallet.id = product.pallet_id
          WHERE product.pallet_id IS NULL )
  `

  pool.query(query_string, [req.body.lot_code, req.body.bag_size, req.body.number_of_bags, product_id], (error, _) => {
    if (error) {
        res.status(422).send({ error: error.message })
    } else {
      pool.query(empty_pallets_string, (error, _) => {
        if (error) {
            res.status(422).send({ error: error.message })
        } else {
            res.send(`product ${product_id} updated`)
        }
      })
    }
  })
})


// UPDATE LOT

app.put('/warehouse/:warehouse_id/lot/:lot_code', (req, res) => {

  const warehouse_id = req.params.warehouse_id
  const lot_code = req.params.lot_code

  let query_string = 
  `UPDATE lot
    SET 
      lot_code = $1,
      seed_id = (
        SELECT id
          FROM seed
            WHERE type = $2
            AND variety = $3)
    WHERE id = (
      SELECT lot.id FROM lot
        INNER JOIN warehouse ON lot.warehouse_id = warehouse.id
          WHERE lot_code = $4
          AND warehouse.id = $5 );
  `

  pool.query(query_string, [req.body.lot_code, req.body.seed_type, req.body.seed_variety, lot_code, warehouse_id], (error, _) => {
    if (error) {
        res.status(422).send({ error: error.message })
    } else {
        res.send(`lot ${lot_code} updated to ${req.body.lot_code}: ${req.body.seed_type} - ${req.body.seed_variety}`)
    }
  })
})

// UPDATE LOCATION

app.put('/warehouse/:warehouse_id/locations', (req, res) => {

  let warehouse_id = req.params.warehouse_id

  let query_string = 
  `UPDATE location
    SET location_type_id = CASE
      WHEN coord IN ( SELECT unnest($1::text[])) THEN $2
      WHEN coord IN ( SELECT unnest($3::text[])) THEN $4
      WHEN coord IN ( SELECT unnest($5::text[])) THEN $6
    ELSE location_type_id
    END
      WHERE coord IN (SELECT unnest($7::text[]))
      AND warehouse_id = $8;
    `

  pool.query(query_string, 
    [
      req.body.coordinates[0],
      req.body.location_type[0],
      req.body.coordinates[1],
      req.body.location_type[1],
      req.body.coordinates[2],
      req.body.location_type[2],
      req.body.coordinates.flat(),
      warehouse_id
    ], 
      (error, _) => {
      if (error) {
          res.status(422).send({ error: error.message })
      } else {
        res.send(`Warehouse ${warehouse_id} locations updated`)
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


// ADD PRODUCT TO EXISTING PALLET

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
    RETURNING product.id;
  `

  pool.query(query_string, 
    [
      pallet_id, 
      req.body.lot_code, 
      req.body.bag_size,
      req.body.number_of_bags
    ], (error, results) => {
      if (error) {
        if (error.message.includes('duplicate key value violates unique constraint "product_pallet_id_lot_id_bag_size_key"')) {
          res.send("Cannot add another product of the exact same lot code AND bag size, on the same pallet. Please simply adjust the volume of the product already on this pallet.")
        } else if (error.message.includes('insert or update on table \"product\" violates foreign key constraint \"fk_pallet\"')) {
          res.send("This method requires an existing pallet to add product to. Check params.")
        } else {
          res.status(422).send({ error: error.message }) }
      } else {

        // if no errors adding the product to existing pallet, then complete a select query to send back product information
        let product_id = results.rows[0].id
        let return_product_object_string = 
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
          
          WHERE product.id = $1        
        `

        pool.query(return_product_object_string, [ product_id ], 
          (error, results) => {

            if (error) {
                res.status(422).send({ error: error.message })
            } else {
                res.send(results.rows[0])
            }
          })
      }
  })
})


// CREATE NEW PRODUCT (NEW PALLET CREATED AT SAME TIME)

app.post('/warehouse/:warehouse_id/location/:location_coords/products', (req, res) => {

  const location_coords = req.params.location_coords
  const warehouse_id = req.params.warehouse_id

  let create_pallet = 
  `INSERT INTO pallet (location_id)
    VALUES (
      (SELECT id FROM location
        WHERE coord = $1
        AND warehouse_id = $2)
    );`

  let empty_pallets_string = 
  `
  DELETE FROM product
    WHERE number_of_bags = 0;

  DELETE FROM pallet
    WHERE id IN (
      SELECT pallet.id AS empty_pallet_id FROM product
        RIGHT JOIN pallet ON pallet.id = product.pallet_id
          WHERE product.pallet_id IS NULL )
  `

  let query_string = 
  `INSERT INTO product (pallet_id, lot_id, bag_size, number_of_bags)
  VALUES 
    (
      (
        SELECT id FROM pallet
          WHERE id IN (
            SELECT pallet.id AS empty_pallet_id FROM product
              RIGHT JOIN pallet ON pallet.id = product.pallet_id
                WHERE product.pallet_id IS NULL )
      ),
      (
        SELECT id
          FROM lot
            WHERE lot_code = $1
      ),
    $2,
    $3)
    RETURNING product.id
  `

  pool.query(create_pallet, [location_coords, warehouse_id], (error, _) => {
    if (error) {
        res.status(422).send({ error: error.message })
    } else {

      pool.query(query_string, [
        req.body.lot_code, 
        req.body.bag_size,
        req.body.number_of_bags
        ], (error, results) => {
          if (error) {

            // if there is an error with creating the product, then delete the empty pallet 
            pool.query(empty_pallets_string, (error, _) => {
              if (error) {
                  res.status(422).send({ error: error.message })
              } else {
                  res.send('empty pallets deleted')
              }
            })

            if (error.message.includes('duplicate key value violates unique constraint "product_pallet_id_lot_id_bag_size_key"')) {
              res.send("Cannot add another product of the exact same lot code AND bag size, on the same pallet. Please simply adjust the volume of the product already on this pallet.")
            } else {
              res.status(422).send({ error: error.message }) }
          } else {

              // if pallet plus product successfully added, return the new product object 

              let product_id = results.rows[0].id
              let return_product_object_string = 
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
                
                WHERE product.id = $1        
              `

              pool.query(return_product_object_string, [ product_id ], 
                (error, results) => {

                  if (error) {
                      res.status(422).send({ error: error.message })
                  } else {
                      res.send(results.rows[0])
                  }
                })
          }
        })
     }
  })
})


// CREATE WAREHOUSE 

app.post('/warehouse', (req, res) => {

  let query_string = 
  `INSERT INTO warehouse (name, rows, columns)
    VALUES ($1, $2, $3)
      RETURNING *
  `

  pool.query(query_string, [
    req.body.warehouse_name,
    req.body.rows,
    req.body.columns
  ], (error, results) => {
    
    if (error) {
      if (error.message.includes("duplicate key value violates unique constraint")) {
        res.send("This warehouse name already exists. Please choose another name")
      } else {
        res.status(422).send({ error: error.message }) }
    } else {
        res.send(results.rows[0])
    }
  })
})

module.exports = app

