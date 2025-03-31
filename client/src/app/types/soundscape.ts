export interface Sound {
  sound_number: string;
  name: string;
  description: string;
  sound_url: string;
  preview_url?: string;
  freesound_id?: string;
}

export interface SoundscapeResponse {
  success: boolean;
  message: string;
  soundscape: {
    soundscape_id: number;
    name: string;
    description: string;
  };
}

export interface SoundscapeDetails {
  success: boolean;
  soundscape: {
    soundscape_id: number;
    name: string;
    description: string;
  };
  sounds: Array<{
    sound_id: number;
    name: string;
    description: string;
    file_path: string;
  }>;
}

export interface KeywordResponse {
  success: boolean;
  message?: string;
  keywords?: string[];
  sounds?: Sound[];
  is_valid_input?: boolean;
  suggestions?: string[];
} 