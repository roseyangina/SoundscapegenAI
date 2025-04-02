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
    isMuted: boolean;
}

// An array of sound URLs is passed in as props to the AudioMixer component
export interface AudioMixexProps {
    soundUrls: string[];
    soundIds?: number[];
    initialVolumes?: number[];
    initialPans?: number[];
    title?: string;
    readOnly?: boolean;
} 