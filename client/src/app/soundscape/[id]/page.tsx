"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "../../../../components/Navbar/Navbar";
import AudioMixer from "../../../../components/AudioMixer/AudioMixer";
import { getSoundscapeById } from "../../services/soundscapeService";
import { SoundscapeDetails } from "../../types/soundscape";
import Link from "next/link";
import "./soundscape.css";

export default function SoundscapePage() {
  const params = useParams();
  const soundscapeId = params.id as string;
  
  const [user, setUser] = useState(false);
  const [soundscapeDetails, setSoundscapeDetails] = useState<SoundscapeDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prepare data for AudioMixer
  const [soundUrls, setSoundUrls] = useState<string[]>([]);
  const [soundIds, setSoundIds] = useState<number[]>([]);
  const [soundVolumes, setSoundVolumes] = useState<number[]>([]);
  const [soundPans, setSoundPans] = useState<number[]>([]);

  useEffect(() => { // fetch soundscape details and prepare data for AudioMixer
    async function fetchSoundscape() {
      if (!soundscapeId) return;

      setIsLoading(true);
      setError(null);

      try {
        const data = await getSoundscapeById(soundscapeId);
        setSoundscapeDetails(data);
        
        if (data.sounds && data.sounds.length > 0) { // retrieve data from db for AudioMixer
          const urls = data.sounds.map(sound => `http://localhost:3001${sound.file_path}`);
          const ids = data.sounds.map(sound => sound.sound_id);
          const volumes = data.sounds.map(sound => sound.volume || 0);
          const pans = data.sounds.map(sound => sound.pan || 0);
          
          setSoundUrls(urls);
          setSoundIds(ids);
          setSoundVolumes(volumes);
          setSoundPans(pans);
        }
      } catch (err) {
        console.error("Error fetching soundscape:", err);
        setError("Failed to load soundscape. It may not exist or has been removed.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchSoundscape();
  }, [soundscapeId]);

  return (
    <div className="soundscape-page">
      <Navbar user={user} setUser={setUser} />

      <div className="soundscape-container">
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
        ) : soundscapeDetails ? (
          <div className="soundscape-details">
            <h1>{soundscapeDetails.soundscape.name}</h1>
            
            {soundscapeDetails.soundscape.description && (
              <p className="description">{soundscapeDetails.soundscape.description}</p>
            )}
            
            <div className="actions">
              <Link 
                href={`/mixer?soundscapeId=${soundscapeDetails.soundscape.soundscape_id}`} 
                className="edit-button"
              >
                Edit in Mixer
              </Link>
              <button 
                className="share-button" 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied to clipboard!");
                }}
              >
                Share Soundscape
              </button>
            </div>
            
            <div className="mixer-container">
              {soundUrls.length > 0 ? (
                <AudioMixer 
                  soundUrls={soundUrls} 
                  soundIds={soundIds} 
                  initialVolumes={soundVolumes} 
                  initialPans={soundPans}
                  readOnly={true}
                />
              ) : (
                <p>No sounds available in this soundscape.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="not-found">
            <h2>Soundscape Not Found</h2>
            <p>The soundscape you're looking for doesn't exist or has been removed.</p>
            <Link href="/" className="back-button">
              Back to Home
            </Link>
          </div>
        )}
      </div>
    </div>
  );
} 