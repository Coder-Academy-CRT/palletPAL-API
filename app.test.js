const res = require("express/lib/response")
const request = require("supertest")

const app = require("./app") // so also require what we are testing

describe("App (API) Request Tests", () => {


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
    expect(res.body.length).toBe(20)

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