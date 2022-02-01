const res = require("express/lib/response")
const request = require("supertest")

const app = require("./app") // so also require what we are testing


/////////////////////////////////   GET REQUESTS //////////////////////////////////////////////


describe("App .get Request Tests", () => {

  /// 1 ///
  test("GET /", async () => {

    const res = await request(app).get("/") 

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/json/i)
  })


  /// 2 ///
  test("GET /seeds", async () => {

    const res = await request(app).get("/seeds") 

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/json/i)
    expect(res.body.length).toBe(22) 

  })


  /// 3 ///
  test("GET /warehouse/1/lots", async () => {

    const res = await request(app).get("/warehouse/1/lots")

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/json/i)
    // expect(res.body.length).toBe(20) // as lots can be added or removed, this value can change frequently

  })

  
  /// 4 ///
  test("GET /warehouse/1/locations", async () => {

    const res = await request(app).get("/warehouse/1/locations")

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/json/i)
    expect(res.body.length).toBe(16)

  })


  /// 5 ///
  test("GET /warehouse/1/locations", async () => {

    const res = await request(app).get("/warehouse/1/products")

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/json/i)

  })
})


/////////////////////////////////   POST REQUESTS //////////////////////////////////////////////



describe("App .post Request Tests", () => {


  /// 1 ///
  test("POST /warehouse", async () => {

    const res = await request(app)
    .post ("/warehouse")  // sets up the post request, but no data yet
    .send ({            // now we have the data
      warehouse_name: 'Warehouse_Test'
    }) 

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/json/i)
    expect(res.body.name).toMatch("Warehouse_Test")
  })

  /// 2 ///  Note that this will fail if the same ( lot_code + bag_size ) is already on the pallet
  test("POST /pallet/:pallet_id/products", async () => {

    let lot_code = "AUSN121013" // lot code needs to already exist, and not be represented on the same pallet in the same size bags

    const res = await request(app)
    .post ("/pallet/1/products") 
    .send ({         
      lot_code : lot_code,
      bag_size : 99,
      number_of_bags : 10.5
    }) 

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text/i)
    expect(res.text).toBe("new product successfully added")
  })


  /// 3 /// Note that duplicate lots cannot be created in the same warehouse
  test("POST /warehouse/:warehouse_id/lot/:lot_code", async () => {
    
    let lot_code = 'AUSN121112'
    
    const res = await request(app)
    
    .post (`/warehouse/1/lot/${lot_code}`) 
    .send ({         
      seed_type : "oats",
      seed_variety : "wintaroo"
    }) 

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text/i)
    expect(res.text).toBe(`lot code ${lot_code} added to warehouse database`)
  })


  /// 4 /// NEW PRODUCT (includes new pallet)
  test("POST /location/:location_coords/products'", async () => {

    let location_coords = '03_03'
   
    const res = await request(app)
    .post (`/location/${location_coords}/products`) 
    .send ({         
      lot_code : "AUSN121003",
      bag_size : 99,
      number_of_bags : 10.5
    }) 

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text/i)
    expect(res.text).toBe("new product successfully added")
  })

})



/////////////////////////////////   DELETE REQUESTS //////////////////////////////////////////////


describe("App .delete Request Tests", () => {


  /// 1 ///
  test("DELETE /pallet/:pallet_id", async () => {

    let pallet_id = 2

    const res = await request(app)
    .delete (`/pallet/${pallet_id}`)
    // no .send required at this stage, as information is passed directly through params

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text/i)
    expect(res.text).toBe(`pallet ${pallet_id} deleted`)
  })


  /// 2 ///
  test("DELETE /product/:product_id", async () => {

    let product_id = 3

    const res = await request(app)
    .delete (`/product/${product_id}`)
    // no .send required at this stage, as information is passed directly through params

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text/i)
    expect(res.text).toBe(`product ${product_id} deleted`)
  })


  /// 3 ///  At some stage this could potentially be combined with delete requests for lots and products
  test("DELETE /pallets/empty", async () => {

    const res = await request(app)
    .delete('/pallets/empty')
    // no .send required, this just runs the query to delete empty products and pallets

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text/i)
    expect(res.text).toBe(`empty pallets deleted`)
  })


  /// 4 ///  
  test("DELETE /warehouse/:warehouse_id/lot/:lot_code", async () => {

    let lot_code = 'AUSN121001'

    const res = await request(app)
    .delete(`/warehouse/1/lot/${lot_code}`)
    // no .send required at this stage, as information is passed directly through params

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text/i)
    expect(res.text).toBe(`lot ${lot_code} deleted`)
  })
})

  /////////////////////////////////  PUT REQUESTS //////////////////////////////////////////////


  describe("App .put Request Tests", () => {

    /// 1 /// 
    test("PUT /product/:product_id", async () => {
    
      let product_id = 18
      
      const res = await request(app)
      
      .put (`/product/${product_id}`) 
      .send ({         
        lot_id : 16,
        bag_size : 77,
        number_of_bags: 0
      }) 
  
      expect(res.status).toBe(200)
      expect(res.headers["content-type"]).toMatch(/text/i)
      expect(res.text).toBe(`product ${product_id} updated`)
    })


    /// 2 ///
    test("PUT /warehouse/:warehouse_id/lot/:lot_code", async () => {
    
      let original_lot_code = 'AUSN121009'
      let new_lot_code = 'TEST_LOT_99'
      let seed_type = 'oats'
      let seed_variety = 'yarran'
      
      const res = await request(app)
      
      .put (`/warehouse/1/lot/${original_lot_code}`) 
      .send ({         
        lot_code : new_lot_code,
        seed_type : seed_type,
        seed_variety: seed_variety
      }) 
  
      expect(res.status).toBe(200)
      expect(res.headers["content-type"]).toMatch(/text/i)
      expect(res.text).toBe(`lot ${original_lot_code} updated to ${new_lot_code}: ${seed_type} - ${seed_variety}`)
    })

  
  })