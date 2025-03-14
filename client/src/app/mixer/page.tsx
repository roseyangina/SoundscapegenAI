"use client";

import Navbar from "../../../components/Navbar/Navbar";
import AudioMixer from "../../../components/AudioMixer/AudioMixer";
import "./mixer.css";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getSoundscapeById } from "../services/soundscapeService";
import Link from "next/link";

const Mixer = () => {
  const searchParams = useSearchParams(); //get url parameters
  const [sounds, setSounds] = useState<string[]>([]);
  const [soundIds, setSoundIds] = useState<number[]>([]);
  const [soundVolumes, setSoundVolumes] = useState<number[]>([]);
  const [soundPans, setSoundPans] = useState<number[]>([]);
  const [user, setUser] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundscapeName, setSoundscapeName] = useState<string | null>(null);
  
  useEffect(() => {
    const soundsQueryParam = searchParams.get("sounds"); //get sounds from the urls
    const soundIdsQueryParam = searchParams.get("soundIds"); //get sound ids from the urls
    const soundscapeIdParam = searchParams.get("soundscapeId"); // get soundscape id from url
    
    // If we have a soundscape ID, load the soundscape
    if (soundscapeIdParam) {
      loadSoundscapeById(soundscapeIdParam);
      return;
    }
    
    // Otherwise, load from URL parameters as before
    if (soundsQueryParam) {
      try {
        const parsedSounds = JSON.parse(decodeURIComponent(soundsQueryParam)); // decode and parse sound urls
        console.log("Loaded Sounds:", parsedSounds);
        setSounds(parsedSounds.filter((sound: string) => sound)); // store sounds without null values
      } catch (err) {
        console.error("Error loading sound data:", err);
      }
    }
    
    if (soundIdsQueryParam) {
      try {
        const parsedSoundIds = JSON.parse(decodeURIComponent(soundIdsQueryParam)); // decode and parse sound ids
        console.log("Loaded Sound IDs:", parsedSoundIds);
        setSoundIds(parsedSoundIds); // store sound ids
      } catch (err) {
        console.error("Error loading sound ID data:", err);
      }
    }
  }, [searchParams]);

  // Function to load a soundscape by ID
  const loadSoundscapeById = async (soundscapeId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await getSoundscapeById(soundscapeId);
      
      if (!data.success) {
        throw new Error("Failed to load soundscape");
      }
      
      // Set the soundscape name
      setSoundscapeName(data.soundscape.name);
      
      // Extract sound file paths, IDs, volumes, and pans
      const soundPaths = data.sounds.map(sound => `http://localhost:3001${sound.file_path}`);
      const soundIds = data.sounds.map(sound => sound.sound_id);
      const volumes = data.sounds.map(sound => sound.volume || 1.0);
      const pans = data.sounds.map(sound => sound.pan || 0.0);
      
      // Update state with the soundscape data
      setSounds(soundPaths);
      setSoundIds(soundIds);
      setSoundVolumes(volumes);
      setSoundPans(pans);
    } catch (err) {
      console.error("Error loading soundscape:", err);
      setError("Failed to load soundscape. It may not exist or has been removed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <Navbar user={user} setUser={setUser} />

      <h1 className="mixer-heading">
        {soundscapeName ? `Editing: ${soundscapeName}` : "Create Your Soundscape"}
      </h1>
      
      <div className="mixer-container">
        {isLoading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading soundscape...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <h2>Error</h2>
            <p>{error}</p>
            <Link href="/" className="back-button">
              Back to Home
            </Link>
          </div>
        ) : sounds.length > 0 ? (
          <AudioMixer 
            soundUrls={sounds} 
            soundIds={soundIds} 
            initialVolumes={soundVolumes} 
            initialPans={soundPans}
          />
        ) : (
          <div className="no-sounds-message">
            <p>No sounds selected. Please go back and select some sounds to mix.</p>
            <Link href="/" className="back-button">
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mixer;