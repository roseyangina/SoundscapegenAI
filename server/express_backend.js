const fs = require('fs')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const app = express()
const port = 3001;
const redisClient = require('./db/redis');
const freesoundService = require('./services/freesoundService');

app.use(express.json())
app.use(cors())
app.use(express.static('public'));

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
            return res.status(500).json({
                success: false,
                message: "Internal server error: Cache service unavailable. Please try again later."
            });
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
                if (retries === 0) {
                    console.error("Failed to reach Python service after multiple attempts:", error);
                    return res.status(503).json({
                        success: false, 
                        message: "Service temporarily unavailable. Please try again later."
                    });
                }
                console.log(`Retrying Python service request... ${retries} attempts remaining`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }

        // Parse JSON response once
        let jsonResponse;
        try {
            jsonResponse = await response.json();
        } catch (error) {
            console.error("Failed to parse Python service response:", error);
            return res.status(500).json({
                success: false,
                message: "Error processing the soundscape request. Please try again."
            });
        }

        if (response.ok) {
            if (!jsonResponse.success) {
                console.log("Error in python response, success=false");
                return res.status(400).json({
                    success: false,
                    message: jsonResponse.message || "Unable to process your soundscape request.",
                    is_valid_input: jsonResponse.is_valid_input || false,
                    suggestions: jsonResponse.suggestions || [
                        "forest with birds and a stream",
                        "busy cafe with people talking",
                        "thunderstorm at night",
                        "ocean waves on a beach",
                        "spaceship engine room humming"
                    ]
                });
            }

            // Check if preview URLs are present
            if (jsonResponse && jsonResponse.success && jsonResponse.sounds) {
                console.log("Checking preview URLs in sounds:");
                jsonResponse.sounds.forEach((sound, index) => {
                    console.log(`Sound ${index} preview_url:`, sound.preview_url);
                });
            }

            // Cache result if success
            console.log("got keywords:");
            console.log(jsonResponse);
            
            if (jsonResponse && jsonResponse.success) {
                await redisClient.set(`keywords:${str}`, JSON.stringify(jsonResponse));
            }
            
            return res.status(200).json(jsonResponse);
        } else {
            // Non-OK response
            console.log("Python service returned non-OK response:", response.status);
            
            // Use the error message from the Python service if available
            return res.status(400).json({
                success: false,
                message: jsonResponse?.message || "Failed to process your soundscape request.",
                suggestions: [
                    "forest with birds and a stream",
                    "busy cafe with people talking",
                    "thunderstorm at night",
                    "ocean waves on a beach",
                    "spaceship engine room humming"
                ]
            });
        }
    } catch (error) {
        console.log("Error: ", error);
        return res.status(500).json({
            success: false, 
            message: "Server error processing the soundscape request. Please try again later.",
            suggestions: [
                "forest with birds and a stream",
                "busy cafe with people talking",
                "thunderstorm at night",
                "ocean waves on a beach",
                "spaceship engine room humming"
            ]
        });
    }
});

// Download a sound from Freesound API
app.post('/api/sounds/download', async (req, res) => {
    console.log("Received download request with body:", req.body);
    const { freesoundId, sourceUrl, name, description, previewUrl } = req.body;
    
    if (!freesoundId || !sourceUrl) {
        console.error("Missing required parameters:", { freesoundId, sourceUrl });
        return res.status(400).json({ 
            success: false, 
            message: 'Missing required parameters: freesoundId and sourceUrl are required' 
        });
    }
    
    try {
        // Check if the sound already exists in the database
        const existingSound = await freesoundService.getSoundByFreesoundId(freesoundId);
        
        if (existingSound) {
            console.log("Sound already exists in database:", existingSound);
            return res.status(200).json({ 
                success: true, 
                message: 'Sound already exists in the database',
                sound: existingSound
            });
        }
        
        console.log("Downloading sound:", { freesoundId, sourceUrl, name, previewUrl });
        const sound = await freesoundService.downloadAndSaveSound(
            freesoundId, 
            sourceUrl, 
            name || 'Unnamed Sound', 
            description || '',
            previewUrl
        );
        
        console.log("Sound downloaded and saved successfully:", sound);
        return res.status(201).json({ 
            success: true, 
            message: 'Sound downloaded and saved successfully',
            sound
        });
    } catch (error) {
        console.error('Error downloading sound:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error downloading sound: ' + error.message 
        });
    }
});

// Retrieve all sounds from the database
app.get('/api/sounds', async (req, res) => {
    try {
        const db = require('./db/config');
        const result = await db.query('SELECT * FROM "Sound" ORDER BY created_at DESC');
        
        return res.status(200).json({ 
            success: true, 
            sounds: result.rows 
        });
    } catch (error) {
        console.error('Error getting sounds:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Error getting sounds: ' + error.message 
        });
    }
});

// Create a new soundscape
app.post('/api/soundscapes', async (req, res) => {
    const { name, description, user_id, sound_ids } = req.body;
    
    if (!name || !sound_ids || !Array.isArray(sound_ids)) {
        return res.status(400).json({
            success: false,
            message: 'Missing required parameters: name and sound_ids array are required'
        });
    }
    
    const db = require('./db/config');
    
    try {
        await db.query('BEGIN');
        
        const soundscapeResult = await db.query( // insert soundscape into db
            'INSERT INTO "Soundscape" (name, description, user_id) VALUES ($1, $2, $3) RETURNING *',
            [name, description || '', user_id || null]
        );
        
        const soundscape = soundscapeResult.rows[0]; // get the soundscape id
        
        for (const soundItem of sound_ids) { // insert each sound into the soundscape
            const { sound_id, volume = 1.0, pan = 0.0 } = soundItem;
            
            await db.query(
                'INSERT INTO "SoundscapeSound" (soundscape_id, sound_id, volume, pan) VALUES ($1, $2, $3, $4)',
                [soundscape.soundscape_id, sound_id, volume, pan]
            );
        }
        
        await db.query('COMMIT');
        
        return res.status(201).json({
            success: true,
            message: 'Soundscape created successfully',
            soundscape
        });
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error creating soundscape:', error);
        return res.status(500).json({
            success: false,
            message: 'Error creating soundscape: ' + error.message
        });
    }
});

// Get a soundscape by ID with its associated sounds
app.get('/api/soundscapes/:id', async (req, res) => {
    const soundscapeId = req.params.id;
    
    if (!soundscapeId) {
        return res.status(400).json({
            success: false,
            message: 'Soundscape ID is required'
        });
    }
    
    const db = require('./db/config');
    
    try {
        const soundscapeResult = await db.query( // retrieve soundscape from db
            'SELECT * FROM "Soundscape" WHERE soundscape_id = $1',
            [soundscapeId]
        );
        
        if (soundscapeResult.rows.length === 0) { // if soundscape not found
            return res.status(404).json({
                success: false,
                message: 'Soundscape not found'
            });
        }
        
        const soundscape = soundscapeResult.rows[0];
        
        const soundsResult = await db.query( // retrieve each sound in the soundscape
            `SELECT s.*, ss.volume, ss.pan 
             FROM "Sound" s
             JOIN "SoundscapeSound" ss ON s.sound_id = ss.sound_id
             WHERE ss.soundscape_id = $1`,
            [soundscapeId]
        );
        
        return res.status(200).json({
            success: true,
            soundscape,
            sounds: soundsResult.rows
        });
    } catch (error) {
        console.error('Error getting soundscape:', error);
        return res.status(500).json({
            success: false,
            message: 'Error getting soundscape: ' + error.message
        });
    }
});

app.listen(port, async () => {
    console.log(`Node API is available on http://localhost:${port}`);
    await waitForPythonService();
});

// redis homepage

app.get('/api/homepage-sounds', async (req, res) => {
    const cacheKey = 'homepage:sounds';
    try {
      // Check if the sounds are cached in Redis
      if (redisClient.isReady) {
        const cachedSounds = await redisClient.get(cacheKey);
        if (cachedSounds) {
          console.log('Cache hit for homepage sounds');
          return res.status(200).json({ success: true, sounds: JSON.parse(cachedSounds) });
        }
      } else {
        console.warn('Redis client not ready, skipping cache check');
      }
  
      // If not cached, query the database.
      const db = require('./db/config');
      const result = await db.query('SELECT * FROM "Sound" LIMIT 3');
      
      // Cache the result in Redis for one hour (3600 seconds)
      if (redisClient.isReady) {
        await redisClient.set(cacheKey, JSON.stringify(result.rows), { EX: 3600 });
      }
      
      return res.status(200).json({ success: true, sounds: result.rows });
    } catch (error) {
      console.error('Error fetching homepage sounds:', error);
      return res.status(500).json({ success: false, message: 'Error fetching homepage sounds: ' + error.message });
    }
  });
  