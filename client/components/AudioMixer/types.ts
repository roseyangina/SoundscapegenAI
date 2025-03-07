import * as Tone from "tone";

// AudioTrack is a single audio track that can be played, stopped, and has a volume and pan
export interface AudioTrack {
  id: number;
  url: string;
  player: Tone.Player;
  panner: Tone.Panner;
  volume: Tone.Volume;
  isPlaying: boolean;
  volumeLevel: number;
  panValue: number;
  pendingStartTimer: number | null;
}

// An array of sound URLs is passed in as props to the AudioMixer component
export interface AudioMixerProps {
  soundUrls: string[];
} 