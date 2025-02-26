const fs = require('fs')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()
const port = 3001;
const redisClient = require('./db/redis');

app.use(express.json())
app.use(cors())

async function waitForPythonService(maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch("http://soundscape-python:3002/health", {
                method: "GET"
            });
            if (response.ok) {
                console.log("Python service is ready");
                return true;
            }
        } catch (error) {
            console.log(`Waiting for Python service... attempt ${i + 1}/${maxAttempts}`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    console.log("Warning: Python service not ready after all attempts, but continuing startup...");
    return false;
}

app.post('/api/keywords', async (req, res) => {
    console.log("Receiving POST request to /keywords endpoint")
    const { str } = req.body 
    console.log(req.body)

    try {
        if (!redisClient.isReady) {
            console.error("Redis client not ready");
            throw new Error("Redis client not ready");
        }

        console.log("Checking Redis cache for:", `keywords:${str}`);
        const cachedResult = await redisClient.get(`keywords:${str}`);
        
        if (cachedResult){
            console.log("Cache HIT - Returning cached result");
            return res.status(200).json(JSON.parse(cachedResult));
        }
        console.log("Cache MISS - Fetching from Python service");

        // Attempt up to 3 times
        let retries = 3;
        let response;
        while (retries > 0) {
            try {
                response = await fetch("http://soundscape-python:3002/api/keywords", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ str })
                });
                break; // If successful, stop retry loop
            } catch (error) {
                retries--;
                if (retries === 0) throw error;
                console.log(`Retrying Python service request... ${retries} attempts remaining`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        let keywords;
        if (response.ok) {
            keywords = await response.json()
            if (!keywords.success) {
                console.log("Error in python response, success=false");
                return res.status(500).send({
                    message: "Error from the Python server."
                });
            }

            // Cache result if success
            console.log("got keywords:")
            console.log(keywords)

            if (keywords && keywords.success) {
                await redisClient.set(`keywords:${str}`, JSON.stringify(keywords));
            }
            
            return res.status(201).json(keywords);
        } else {
            // Non-OK response
            console.log("Python service returned non-OK response:", response.status);
            return res.status(response.status).send({
                message: "Error processing request"
            });
        }
    } catch (error) {
        console.log("Error: ", error);
        return res.status(500).send({message: "Error with the server, unable to process input"});
    }
});

app.listen(port, async () => {
    console.log(`Node API is available on http://localhost:${port}`);
    await waitForPythonService();
});