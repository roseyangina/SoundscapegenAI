/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('SoundscapeSound').del();
  await knex('Sound').del();
  await knex('Soundscape').del();
  
  // Insert Sounds
  const sounds = [
    {
      sound_id: 1,
      source_url: 'https://cdn.freesound.org/previews/263/263950_4492515-hq.mp3',
      freesound_id: 0,
      file_path: '/sounds/0_1744645731796.mp3',
      name: 'Glass Water Bubbles',
      description: 'Sound from https://cdn.freesound.org/previews/263/263950_4492515-hq.mp3',
      preview_url: 'https://cdn.freesound.org/previews/263/263950_4492515-hq.mp3'
    },
    {
      sound_id: 2,
      source_url: 'https://cdn.freesound.org/previews/263/263947_4492515-hq.mp3',
      freesound_id: 0,
      file_path: '/sounds/0_1744645731773.mp3',
      name: 'Glass Water Bubbles',
      description: 'Sound from https://cdn.freesound.org/previews/263/263947_4492515-hq.mp3',
      preview_url: 'https://cdn.freesound.org/previews/263/263947_4492515-hq.mp3'
    },
    {
      sound_id: 3,
      source_url: 'https://cdn.freesound.org/previews/387/387950_1738686-hq.mp3',
      freesound_id: 0,
      file_path: '/sounds/0_1744645731568.mp3',
      name: 'Straw Water Bubbles',
      description: 'Sound from https://cdn.freesound.org/previews/387/387950_1738686-hq.mp3',
      preview_url: 'https://cdn.freesound.org/previews/387/387950_1738686-hq.mp3'
    },
    {
      sound_id: 4,
      source_url: 'https://cdn.freesound.org/previews/660/660258_11673893-hq.mp3',
      freesound_id: 0,
      file_path: '/sounds/0_1744645731763.mp3',
      name: 'Waterfall Into River',
      description: 'Sound from https://cdn.freesound.org/previews/660/660258_11673893-hq.mp3',
      preview_url: 'https://cdn.freesound.org/previews/660/660258_11673893-hq.mp3'
    },
    {
      sound_id: 5,
      source_url: 'https://cdn.freesound.org/previews/145/145395_2607024-hq.mp3',
      freesound_id: 0,
      file_path: '/sounds/0_1744645731802.mp3',
      name: 'Flowing River',
      description: 'Sound from https://cdn.freesound.org/previews/145/145395_2607024-hq.mp3',
      preview_url: 'https://cdn.freesound.org/previews/145/145395_2607024-hq.mp3'
    },
    {
      sound_id: 6,
      source_url: 'https://cdn.freesound.org/previews/758/758785_2061858-hq.mp3',
      freesound_id: 0,
      file_path: '/sounds/0_1744645731788.mp3',
      name: 'Forest River Bells Joggers',
      description: 'Sound from https://cdn.freesound.org/previews/758/758785_2061858-hq.mp3',
      preview_url: 'https://cdn.freesound.org/previews/758/758785_2061858-hq.mp3'
    }
  ];
  
  // Insert sounds into database
  await knex('Sound').insert(sounds);
  
  // Insert Soundscape
  const soundscapes = [
    {
      soundscape_id: 1,
      name: 'River Flowing',
      description: 'River Flowing Soundscape',
      is_preset: true,
      image_url: 'https://images.unsplash.com/photo-1642786842195-29e65bd0d0d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3MzY0OTh8MHwxfHNlYXJjaHwxfHxSaXZlciUyMGZsb3dpbmclMjAtJTIwV2F0ZXIlMjBidWJibGluZ3xlbnwwfHx8fDE3NDQ2NDU2NDh8MA&ixlib=rb-4.0.3&q=80&w=400'
    }
  ];
  
  // Insert soundscapes into database
  await knex('Soundscape').insert(soundscapes);
  
  // Insert SoundscapeSound associations
  const soundscapeSounds = [
    {
      soundscape_id: 1,
      sound_id: 1,
      volume: 3.00,
      pan: 0.00
    },
    {
      soundscape_id: 1,
      sound_id: 2,
      volume: -5.00,
      pan: 0.00
    },
    {
      soundscape_id: 1,
      sound_id: 3,
      volume: -1.00,
      pan: 0.00
    },
    {
      soundscape_id: 1,
      sound_id: 4,
      volume: -12.00,
      pan: 0.00
    },
    {
      soundscape_id: 1,
      sound_id: 5,
      volume: 13.00,
      pan: 0.00
    },
    {
      soundscape_id: 1,
      sound_id: 6,
      volume: 4.00,
      pan: 0.00
    }
  ];
  
  // Insert soundscape-sound associations into database
  await knex('SoundscapeSound').insert(soundscapeSounds);
}; 