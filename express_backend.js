const fs = require('fs')
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
const port = 3000

app.use(express.json())

// this exists to separate the client from the server and gateway so that processing can be handled intermediately
// allows us to protect python/nlp side from invalid or malicious requests and to keep everything in one place

app.post('/keywords', async (req, res) => {
    console.log("Receiving POST request to /keywords endpoint")
    const { str } = req.body 
    console.log(req.body)

    const response = await fetch("http://localhost:3001/keywords", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({str})
    })

    var keywords

    if (response.ok) {
        keywords = await response.json()

        if (!keywords.success) {
            console.log("Error getting data from python")

            res.status(500).send({
                message: "Error with the server, unable to process input. Contact the developers if this problem persists after reloading and waiting 5 minutes."
            })
            return
        }
    }

    console.log("got keywords:")
    console.log(keywords)
    
    res.status(201).send({
        "keywords": keywords
    })
    return
})

app.listen(port, 'localhost', () => {
    console.log(`API is available on http://localhost:${port}`)
})