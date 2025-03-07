"use client";

import React, { useEffect, useState, useRef } from "react";
import * as Tone from "tone";
import "./AudioMixer.css";
import { AudioTrack, AudioMixerProps } from "./types";

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

const AudioMixer: React.FC<AudioMixerProps> = ({ soundUrls }) => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [masterVolume, setMasterVolume] = useState<number>(0);
  const [loadedCount, setLoadedCount] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
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
        const player = getPlayer(url, index, () =>
          setLoadedCount((prev) => prev + 1)
        );
        const panner = new Tone.Panner(0);
        const volume = new Tone.Volume(0);

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
          volumeLevel: 0,
          panValue: 0,
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
  }, [soundUrls]);
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
          track.volume.volume.value = value;
          return { ...track, volumeLevel: value };
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
      masterVolumeNode.current.volume.value = value;
    }
    setMasterVolume(value);
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
              max="0"
              step="1"
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
                      max="0"
                      step="1"
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
    </div>
  );
};

export default AudioMixer;
