CREATE TABLE "User" (
    user_id SERIAL PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Soundscape" (
    soundscape_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES "User"(user_id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_preset BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Sound" (
    sound_id SERIAL PRIMARY KEY,
    source_url TEXT NOT NULL,
    freesound_id INTEGER,
    file_path VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "SoundscapeSound" (
    soundscapesounds_id SERIAL PRIMARY KEY,
    soundscape_id INTEGER REFERENCES "Soundscape"(soundscape_id),
    sound_id INTEGER REFERENCES "Sound"(sound_id),
    volume DECIMAL(5,2) DEFAULT 1.0,
    pan DECIMAL(5,2) DEFAULT 0.0,
    UNIQUE(soundscape_id, sound_id)
);