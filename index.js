const app = require('./app')

const port = 5000 // for localhost

app.listen(port, () => {
    console.log(`Journal API listening at http://localhost:${port}`)
})