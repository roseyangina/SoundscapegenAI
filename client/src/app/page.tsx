"use client";
import { useState } from "react";
import { KeywordResponse, SoundscapeDetails, SoundscapeResponse } from "./types/soundscape";
import { getKeywords, downloadSound, createSoundscape, getSoundscapeById } from "./services/soundscapeService";

export default function Home() {
  const [inputString, setInputString] = useState("");
  const [response, setResponse] = useState<KeywordResponse | null>(null);
  const [isCreatingSoundscape, setIsCreatingSoundscape] = useState(false);
  const [soundscapeResult, setSoundscapeResult] = useState<SoundscapeResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "view">("create");
  const [soundscapeId, setSoundscapeId] = useState("");
  const [soundscapeDetails, setSoundscapeDetails] = useState<SoundscapeDetails | null>(null);
  const [isLoadingSoundscape, setIsLoadingSoundscape] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();

    try {
      const data = await getKeywords(inputString);
      setResponse(data);
      setSoundscapeResult(null);
    } catch (err) {
      console.error("Error fetching data:", (err as Error).message);
    }
  }

  async function handleCreateSoundscape() { // create soundscape for each sound we get from response
    if (!response?.sounds || response.sounds.length === 0) {
      return;
    }

    setIsCreatingSoundscape(true);
    try {
      const downloadedSounds = await Promise.all(
        response.sounds.map(async (sound) => {
          return await downloadSound(sound);
        })
      );
      const soundIds = downloadedSounds.map(result => ({
        sound_id: result.sound.sound_id,
        volume: 1.0,
        pan: 0.0
      }));

      const result = await createSoundscape(inputString, inputString, soundIds);
      setSoundscapeResult(result);
    } catch (err) {
      console.error("Error creating soundscape:", (err as Error).message);
    } finally {
      setIsCreatingSoundscape(false);
    }
  }

  async function fetchSoundscape(e: React.FormEvent<HTMLFormElement>) { // fetch soundscape from db
    e.preventDefault();
    if (!soundscapeId) return;

    setIsLoadingSoundscape(true);
    setSoundscapeDetails(null);

    try {
      const data = await getSoundscapeById(soundscapeId);
      setSoundscapeDetails(data);
    } catch (err) {
      console.error("Error fetching soundscape:", (err as Error).message);
    } finally {
      setIsLoadingSoundscape(false);
    }
  }

  return (
    <div>
      <h1>SoundscapeGen</h1>
      
      <div className="tabs">
        <button 
          onClick={() => setActiveTab("create")}
          className={activeTab === "create" ? "active" : ""}
        >
          Create Soundscape
        </button>
        <button 
          onClick={() => setActiveTab("view")}
          className={activeTab === "view" ? "active" : ""}
        >
          View Soundscape
        </button>
      </div>

      {activeTab === "create" ? (
        <div>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={inputString}
              onChange={e => setInputString(e.target.value)}
              placeholder="Describe your soundscape..."
            />
            <button type="submit">Get Keywords</button>
          </form>

          {response?.sounds && response.sounds.length > 0 && (
            <div>
              <h2>Found {response.sounds.length} sounds</h2>
              <button 
                onClick={handleCreateSoundscape} 
                disabled={isCreatingSoundscape}
              >
                {isCreatingSoundscape ? 'Creating Soundscape...' : 'Create Soundscape'}
              </button>
            </div>
          )}

          {soundscapeResult && (
            <div>
              <h2>Soundscape Created!</h2>
              <p>Name: {soundscapeResult.soundscape.name}</p>
              <p>ID: {soundscapeResult.soundscape.soundscape_id}</p>
            </div>
          )}

          {/* Display JSON response of both Keywords and Sounds  */}
          {response?.keywords?.length ? <pre>{JSON.stringify(response, null, 2)}</pre> : null}
        </div>
      ) : (
        <div>
          <form onSubmit={fetchSoundscape}>
            <input
              type="text"
              value={soundscapeId}
              onChange={e => setSoundscapeId(e.target.value)}
              placeholder="Enter Soundscape ID..."
            />
            <button type="submit" disabled={isLoadingSoundscape}>
              {isLoadingSoundscape ? 'Loading...' : 'View Soundscape'}
            </button>
          </form>

          {soundscapeDetails && (
            <div>
              <h2>Soundscape: {soundscapeDetails.soundscape.name}</h2>
              <p>Description: {soundscapeDetails.soundscape.description}</p>
              <h3>Sounds:</h3>
              <ul>
                {soundscapeDetails.sounds.map(sound => (
                  <li key={sound.sound_id}>
                    <h4>{sound.name}</h4>
                    <p>{sound.description}</p>
                    {sound.file_path && (
                      <audio controls src={`http://localhost:3001${sound.file_path}`} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}