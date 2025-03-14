"use client";

import React, { useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import "./AudioMixer.css";
import { AudioTrack, AudioMixerProps } from "./types";
import { createSoundscape } from "../../src/app/services/soundscapeService";
import { SoundscapeResponse, Sound } from "../../src/app/types/soundscape";
import { downloadSound } from "../../src/app/services/soundscapeService";

// We create a cache to store Tone.Player instances keyed by their URL. This is to ensure that each sound loads exactly once
const playerCache = new Map<string, Tone.Player>();

// Provides a Tone.Player instance for a given URL
const getPlayer = (
  url: string,
  index: number,
  onLoadCallback: () => void
): Tone.Player => {
  if (playerCache.has(url)) {
    return playerCache.get(url)!;
  }
  const player = new Tone.Player({
    url,
    loop: true,
    autostart: false,
    onload: () => {
      console.log(`Track ${index} loaded`);
      onLoadCallback();
    },
  });
  playerCache.set(url, player);
  return player;
};

// Analyzes audio buffer to determine its peak amplitude for audio normalization
const analyzeAudioLevel = (buffer: AudioBuffer): number => {
  const channelData = buffer.getChannelData(0);
  let max = 0;
  
  for (let i = 0; i < channelData.length; i++) { // Iterate through the buffer to find the maximum amplitude
    const absValue = Math.abs(channelData[i]);
    if (absValue > max) {
      max = absValue;
    }
  }
  
  // Convert to dB (using 1.0 as reference) and avoid log(0) by using a small value for silent tracks
  const dbValue = 20 * Math.log10(Math.max(max, 0.0001));
  return Math.round(dbValue);
};

// Normalization of audio levels to a target level around -12dB
const calculateNormalizedVolume = (peakDb: number): number => {
  const targetDb = -12;

  let adjustment = targetDb - peakDb;
  adjustment = Math.max(-20, Math.min(18, adjustment));
  
  return Math.round(adjustment);
};

const AudioMixer: React.FC<AudioMixerProps> = ({ 
  soundUrls, 
  soundIds = [], 
  initialVolumes = [], 
  initialPans = [],
  readOnly = false
}) => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [masterVolume, setMasterVolume] = useState<number>(0);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [soundscapeName, setSoundscapeName] = useState<string>("");
  const [soundscapeDescription, setSoundscapeDescription] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<SoundscapeResponse | null>(null);
  const didInitialize = useRef(false);
  const masterVolumeNode = useRef<Tone.Volume | null>(null);
  const analyzerRef = useRef<Tone.Analyser | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (didInitialize.current) return;
    didInitialize.current = true;

    const initAudio = () => { // Initialize the audio context
      masterVolumeNode.current = new Tone.Volume(0).toDestination();

      analyzerRef.current = new Tone.Analyser("waveform", 256);
      masterVolumeNode.current.connect(analyzerRef.current);

      const newTracks: AudioTrack[] = soundUrls.map((url, index) => {
        // get initial volume and pan values if available
        const initialVolume = initialVolumes[index] !== undefined ? initialVolumes[index] : 0;
        const initialPan = initialPans[index] !== undefined ? initialPans[index] : 0;
        
        const player = getPlayer(url, index, () => {
          try {
            const playerAny = player as any;
            if (playerAny.buffer && playerAny.buffer.get) { // checking buffer is loaded
              const buffer = playerAny.buffer.get();
              if (buffer) {
                // analyze when initival vol is not set
                if (initialVolumes[index] === undefined) {
                  const peakDb = analyzeAudioLevel(buffer); // analyze audio level
                  const normalizedVolume = calculateNormalizedVolume(peakDb); // normalize volume
                  
                  setTracks(prev => 
                    prev.map(track => {
                      if (track.id === index) {
                        track.volume.volume.value = normalizedVolume;
                        return { ...track, volumeLevel: normalizedVolume };
                      }
                      return track;
                    })
                  );
                }
              }
            }
          } catch (error) {
            console.error("Error analyzing audio:", error);
          }
          
          setLoadedCount((prev) => prev + 1);
        });
        
        const panner = new Tone.Panner(initialPan);
        const volume = new Tone.Volume(initialVolume);

        player.connect(panner);
        panner.connect(volume);
        volume.connect(masterVolumeNode.current!);

        return {
          id: index,
          url,
          player,
          panner,
          volume,
          isPlaying: false,
          volumeLevel: initialVolume,
          panValue: initialPan,
          pendingStartTimer: null,
        };
      });

      setTracks(newTracks);
    };

    initAudio();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setTracks([]);
      masterVolumeNode.current?.dispose();
      analyzerRef.current?.dispose();
      didInitialize.current = false;
    };
  }, [soundUrls, initialVolumes, initialPans]);
  useEffect(() => { // All tracks loaded, set isLoaded to true so mixer can render
    if (loadedCount >= soundUrls.length && soundUrls.length > 0) {
      setIsLoaded(true);
    }
  }, [loadedCount, soundUrls.length]);

  useEffect(() => { // Waveform figure drawing
    if (!isLoaded || !canvasRef.current || !analyzerRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawWaveform = () => {
      const data = analyzerRef.current!.getValue() as Float32Array;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#4CAF50";

      // We amplify waveform so that it's louder
      const amplification = 1.5;
      const sliceWidth = width / data.length;
      let x = 0;

      for (let i = 0; i < data.length; i++) {
        const sample = Math.max(-1, Math.min(1, data[i] * amplification));
        const y = ((sample + 1) / 2) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }

      ctx.stroke();
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
    };

    drawWaveform();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLoaded]);

  const scheduleStartWithDelay = (trackId: number, delayMs: number) => { // add small delay so that we have all tracks loaded before starting
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;
        track.player.stop();
        if (track.pendingStartTimer !== null) {
          clearTimeout(track.pendingStartTimer);
          track.pendingStartTimer = null;
        }
        const timerId = window.setTimeout(() => {
          try {
            track.player.start();
          } catch (err) {
            console.error(`Error .start() track ${track.id}:`, err);
          }
        }, delayMs);
        return { ...track, pendingStartTimer: timerId };
      })
    );
  };

  const togglePlay = (trackId: number) => { // play/stop any singular track
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id !== trackId) return track;
        const willPlay = !track.isPlaying;
        if (willPlay) {
          if (Tone.context.state !== "running") {
            Tone.start().catch((err) =>
              console.error("Error starting Tone:", err)
            );
          }
          return { ...track, isPlaying: true };
        } else {
          track.player.stop();
          if (track.pendingStartTimer) {
            clearTimeout(track.pendingStartTimer);
          }
          return { ...track, isPlaying: false, pendingStartTimer: null };
        }
      })
    );

    setTracks((prev) => // track is set to play, so we schedule it to start with a small delay
      prev.map((track) => {
        if (track.id === trackId && track.isPlaying) {
          scheduleStartWithDelay(trackId, 200);
        }
        return track;
      })
    );
  };

  const handleVolumeChange = (trackId: number, value: number) => { // handle change in volume for any singular track
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === trackId) {
          const roundedValue = Math.round(value);
          track.volume.volume.value = roundedValue;
          return { ...track, volumeLevel: roundedValue };
        }
        return track;
      })
    );
  };

  const handlePanChange = (trackId: number, value: number) => { // handle change in pan for any singular track
    setTracks((prev) =>
      prev.map((track) => {
        if (track.id === trackId) {
          track.panner.pan.value = value;
          return { ...track, panValue: value };
        }
        return track;
      })
    );
  };

  const handleMasterVolumeChange = (value: number) => { // handle change in master volume
    if (masterVolumeNode.current) {
      const roundedValue = Math.round(value);
      masterVolumeNode.current.volume.value = roundedValue;
      setMasterVolume(roundedValue);
    }
  };

  const playAll = async () => { // play all tracks at once
    if (Tone.context.state !== "running") {
      await Tone.start().catch((err) =>
        console.error("Error starting audio context:", err)
      );
    }
    setTracks((prev) => {
      prev.forEach((t) => {
        t.player.stop();
        if (t.pendingStartTimer) {
          clearTimeout(t.pendingStartTimer);
        }
      });
      return prev.map((t) => ({
        ...t,
        isPlaying: true,
        pendingStartTimer: null,
      }));
    });
    setTracks((prev) => {
      prev.forEach((t) => {
        scheduleStartWithDelay(t.id, 200);
      });
      return prev;
    });
  };

  const stopAll = () => { // stop all tracks at once
    setTracks((prev) => {
      prev.forEach((t) => {
        t.player.stop();
        if (t.pendingStartTimer) {
          clearTimeout(t.pendingStartTimer);
        }
      });
      return prev.map((t) => ({
        ...t,
        isPlaying: false,
        pendingStartTimer: null,
      }));
    });
  };

  const handleFinalize = () => {
    setShowSaveModal(true);
  };

  const handleSaveSoundscape = async () => {
    if (!soundscapeName.trim()) {
      alert("Please enter a name for your soundscape");
      return;
    }

    setIsSaving(true);
    setSaveSuccess(null);

    try { // check if all sounds are downloaded
      const downloadPromises = soundUrls.map(async (url, index) => {
        const soundObj: Sound = {
          sound_number: String(index),
          name: `Track ${index + 1}`,
          description: `Sound from ${url}`,
          sound_url: url,
          preview_url: url,
          freesound_id: String(soundIds[index] || '0')
        };
        
        try { // download and return the sound
          const downloadResult = await downloadSound(soundObj);
          return {
            original_id: soundIds[index] || 0,
            downloaded_id: downloadResult.sound.sound_id,
            volume: tracks[index].volumeLevel,
            pan: tracks[index].panValue
          };
        } catch (error) {
          console.error(`Error downloading sound ${index}:`, error);
          return {
            original_id: soundIds[index] || 0,
            downloaded_id: soundIds[index] || 0,
            volume: tracks[index].volumeLevel,
            pan: tracks[index].panValue
          };
        }
      });
      
      // wait for downloads to complete before creating soundscape
      const downloadedSounds = await Promise.all(downloadPromises);
      
      // use the downloaded sound IDs for creating the soundscape
      const soundsWithSettings = downloadedSounds.map(result => ({
        sound_id: result.downloaded_id,
        volume: result.volume,
        pan: result.pan
      }));

      // call the soundscape service to save the soundscape
      const result = await createSoundscape(
        soundscapeName,
        soundscapeDescription,
        soundsWithSettings
      );
      
      console.log('Soundscape saved successfully:', result);
      setSaveSuccess(result);
      
      // don't close the modal automatically - let the user see the success message and ID
    } catch (error) {
      console.error('Error saving soundscape:', error);
      setSaveSuccess(null);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelSave = () => {
    setShowSaveModal(false);
    setSoundscapeName("");
    setSoundscapeDescription("");
    setSaveSuccess(null);
  };

  if (!isLoaded) { // draw loading spinner until all tracks are loaded
    return (
      <div className="loader-container">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="audio-mixer">
      <div className="waveform-container">
        <canvas
          ref={canvasRef}
          className="waveform-display"
          width={600}
          height={200}
        />
      </div>

      <div className="master-area">
        <h3>Master</h3>
        <div className="master-controls">
          <div className="control-group">
            <label>Master Volume</label>
            <input
              type="range"
              min="-60"
              max="18"
              step="0.5"
              value={masterVolume}
              onChange={(e) => handleMasterVolumeChange(Number(e.target.value))}
              className="master-volume-slider"
            />
            <span className="value-display">{masterVolume} dB</span>
          </div>

          <div className="transport-controls">
            <button className="transport-button play-all" onClick={playAll}>
              Play All
            </button>
            <button className="transport-button stop-all" onClick={stopAll}>
              Stop All
            </button>
            {!readOnly && (
              <button className="transport-button finalize" onClick={handleFinalize}>
                Finalize Soundscape
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="tracks-container">
        {Array.from({ length: Math.ceil(tracks.length / 2) }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="tracks-row">
            {tracks.slice(rowIndex * 2, rowIndex * 2 + 2).map((track) => (
              <div key={track.id} className="track">
                <div className="track-header">
                  <button
                    className={`play-button ${track.isPlaying ? "playing" : ""}`}
                    onClick={() => togglePlay(track.id)}
                  >
                    {track.isPlaying ? "❚❚" : "▶"}
                  </button>
                  <span className="track-name">Track {track.id + 1}</span>
                </div>

                <div className="track-controls">
                  <div className="control-group">
                    <label>Volume</label>
                    <input
                      type="range"
                      min="-60"
                      max="18"
                      step="0.5"
                      value={track.volumeLevel}
                      onChange={(e) =>
                        handleVolumeChange(track.id, Number(e.target.value))
                      }
                      className="volume-slider"
                    />
                    <span className="value-display">{track.volumeLevel} dB</span>
                  </div>

                  <div className="control-group">
                    <label>Pan</label>
                    <input
                      type="range"
                      min="-1"
                      max="1"
                      step="0.1"
                      value={track.panValue}
                      onChange={(e) =>
                        handlePanChange(track.id, Number(e.target.value))
                      }
                      className="pan-slider"
                    />
                    <span className="value-display">
                      {track.panValue < 0 ? "L" : track.panValue > 0 ? "R" : "C"}
                      {track.panValue !== 0
                        ? Math.abs(track.panValue).toFixed(1)
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Save Soundscape Modal - Only show in edit mode */}
      {!readOnly && showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Save Your Soundscape</h2>
            
            {saveSuccess === null ? (
              <>
                <div className="form-group">
                  <label htmlFor="soundscape-name">Name</label>
                  <input
                    id="soundscape-name"
                    type="text"
                    value={soundscapeName}
                    onChange={(e) => setSoundscapeName(e.target.value)}
                    placeholder="Enter a name for your soundscape"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="soundscape-description">Description (optional)</label>
                  <textarea
                    id="soundscape-description"
                    value={soundscapeDescription}
                    onChange={(e) => setSoundscapeDescription(e.target.value)}
                    placeholder="Describe your soundscape"
                    disabled={isSaving}
                  />
                </div>
                
                <div className="modal-actions">
                  <button 
                    className="modal-button cancel" 
                    onClick={handleCancelSave}
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button 
                    className="modal-button save" 
                    onClick={handleSaveSoundscape}
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save Soundscape'}
                  </button>
                </div>
              </>
            ) : saveSuccess ? (
              <div className="success-message">
                <p>Soundscape saved successfully!</p>
                {saveSuccess.soundscape && (
                  <div className="soundscape-info">
                    <p>Soundscape ID: <strong>{saveSuccess.soundscape.soundscape_id}</strong></p>
                    <p>You can access your soundscape at:</p>
                    <div className="soundscape-link">
                      <a 
                        href={`/soundscape/${saveSuccess.soundscape.soundscape_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {window.location.origin}/soundscape/{saveSuccess.soundscape.soundscape_id}
                      </a>
                      <button 
                        className="copy-button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/soundscape/${saveSuccess.soundscape.soundscape_id}`
                          );
                          alert('Link copied to clipboard!');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    <div className="modal-actions">
                      <button 
                        className="modal-button view" 
                        onClick={() => {
                          window.open(
                            `/soundscape/${saveSuccess.soundscape.soundscape_id}`,
                            '_blank'
                          );
                        }}
                      >
                        View Soundscape
                      </button>
                      <button 
                        className="modal-button close" 
                        onClick={handleCancelSave}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="error-message">
                <p>Failed to save soundscape. Please try again.</p>
                <button 
                  className="modal-button retry" 
                  onClick={() => setSaveSuccess(null)}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioMixer;
