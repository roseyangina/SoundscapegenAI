const fs = require('fs')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()
const port = 3001;

app.use(express.json())
app.use(cors())

// this exists to separate the client from the server and gateway so that processing can be handled intermediately
// allows us to protect python/nlp side from invalid or malicious requests and to keep everything in one place

app.post('/api/keywords', async (req, res) => {
    console.log("Receiving POST request to /keywords endpoint")
    const { str } = req.body 
    console.log(req.body)

    const response = await fetch("http://soundscape-python:3002/api/keywords", {
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
    
    res.status(201).json(keywords)
    //return
})

app.listen(port, '0.0.0.0', () => {
    console.log(`API is available on http://localhost:${port}`);
  });