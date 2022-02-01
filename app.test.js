const res = require("express/lib/response")
const request = require("supertest")

const app = require("./app") // so also require what we are testing

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
    expect(res.body.length).toBe(20) // likely true only at time of testing

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

  test("POST /pallet/1/products", async () => {

    const res = await request(app)
    .post ("/pallet/1/products") 
    .send ({         
      lot_code : "AUSN121013",
      bag_size : 99,
      number_of_bags : 10.5
    }) 

    expect(res.status).toBe(200)
    expect(res.headers["content-type"]).toMatch(/text/i)
    expect(res.text).toBe("new product successfully added")
  })

})



