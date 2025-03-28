require('dotenv').config();
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const session = require('express-session')
const app = express()
const port = 3001;
const redisClient = require('./db/redis');
const freesoundService = require('./services/freesoundService');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const authService = require('./services/authService');

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cors({
  origin: 'http://localhost:3000', // Your client's URL
  credentials: true // Allow cookies to be sent
}))
app.use(express.static('public'));

// Add session middleware BEFORE passport initialization
app.use(session({
  secret: process.env.SESSION_SECRET || 'test-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax', // Allows cookies to be sent in cross-origin requests
    httpOnly: true // for security
  }
}));

// Initialize Passport AFTER session middleware
app.use(passport.initialize());
app.use(passport.session());

// Add this after passport initialization
passport.serializeUser((user, done) => {
  done(null, user.user_id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const db = require('./db/config');
    const result = await db.query(
      'SELECT * FROM "User" WHERE user_id = $1',
      [id]
    );
    
    // Get the first user from the result
    const user = result.rows[0];
    
    done(null, user);
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error, null);
  }
});

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
            
            // Check if preview URLs are present
            if (keywords && keywords.success && keywords.sounds) {
                console.log("Checking preview URLs in sounds:");
                keywords.sounds.forEach((sound, index) => {
                    console.log(`Sound ${index} preview_url:`, sound.preview_url);
                });
            }

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

// Configure Passport
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3001/api/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {
    try {
    const db = require('./db/config');
      // Check if user exists
      let user = await db.query(
        'SELECT * FROM "User" WHERE email = $1',
        [profile.emails[0].value]
      );

      if (user.rows.length === 0) {
        // Create new user if doesn't exist
        user = await db.query(
          'INSERT INTO "User" (username, email) VALUES ($1, $2) RETURNING *',
          [profile.displayName, profile.emails[0].value]
        );
      }

      return cb(null, user.rows[0]);
    } catch (error) {
      return cb(error, null);
    }
  }
));

// Google Auth routes
app.get('/api/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: 'http://localhost:3000/login?error=auth_failed' }),
  function(req, res) {
    // Successful authentication
    const token = authService.generateToken(req.user);
    
    // Send token and user data to the client via postMessage
    res.send(`
      <html>
        <body>
          <script>
            window.opener.postMessage(
              { 
                token: "${token}", 
                user: ${JSON.stringify(req.user)}
              }, 
              "http://localhost:3000"
            );
            window.close();
          </script>
        </body>
      </html>
    `);
  }
);

// Add this route to check if user is authenticated
app.get('/api/auth/status', (req, res) => {
  if (req.isAuthenticated()) {
    // User is authenticated, return user info (excluding sensitive data)
    const user = { ...req.user };
    
    // Remove sensitive information
    if (user.password) delete user.password;
    
    res.json({
      isAuthenticated: true,
      user: user
    });
  } else {
    // User is not authenticated
    res.json({
      isAuthenticated: false,
      user: null
    });
  }
});

// Add a logout route
app.get('/api/auth/logout', (req, res) => {
  req.logout(function(err) {
    if (err) {
      return res.status(500).json({ error: 'Error during logout' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Example of a protected route
app.get('/api/user/profile', isAuthenticated, (req, res) => {
  res.json({ user: req.user });
});

app.listen(port, async () => {
    console.log(`Node API is available on http://localhost:${port}`);
    await waitForPythonService();
});