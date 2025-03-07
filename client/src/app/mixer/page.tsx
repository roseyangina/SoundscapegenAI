"use client";

import Navbar from "../../../components/Navbar/Navbar";
import AudioMixer from "../../../components/AudioMixer/AudioMixer";
import "./mixer.css";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const Mixer = () => {
  const searchParams = useSearchParams(); //get url parameters
  const [sounds, setSounds] = useState<string[]>([]);
  const [user, setUser] = useState(false);
  useEffect(() => {
    const soundsQueryParam = searchParams.get("sounds"); //get sounds from the urls
    if (soundsQueryParam) {
      try {
        const parsedSounds = JSON.parse(decodeURIComponent(soundsQueryParam)); // decode and parse sound urls
        console.log("Loaded Sounds:", parsedSounds);
        setSounds(parsedSounds.filter((sound: string) => sound)); // store sounds without null values
      } catch (err) {
        console.error("Error loading sound data:", err);
      }
    }
  }, [searchParams]);

  return (
    <div>
      <Navbar user={user} setUser={setUser} />

      <h1 className="mixer-heading">Finalize Your Mixer</h1>
      <div className="mixer-container">
        {sounds.length > 0 ? (
          <AudioMixer soundUrls={sounds} />
        ) : (
          <div className="no-sounds-message">
            <p>No sounds selected. Please go back and select some sounds to mix.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Mixer;