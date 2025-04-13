import os
import re
import json
from mistralai import Mistral

API_KEY = os.getenv("MISTRAL_API_KEY")
MODEL_NAME = "mistral-large-latest"

mistral_client = Mistral(api_key=API_KEY)

def get_keywords(user_text: str, min_keywords: int = 6):
    """
    Calls Mistral to 'expand' or 'extrapolate' a list of relevant keywords for the user text.
    Returns a Python list of keywords (strings) or a dictionary with an error if input is invalid.
    """
    validation_prompt = f"""
    You are a soundscape validator. Determine if the following input is even remotely about sound or an audio environment.

    Input: "{user_text}"

    Be extremely lenient: Accept vague or short inputs like "river", "library", "give me soundscape for ocean", "sounds of wind", "rain", etc.
    Assume that if the input mentions a thing, place, or situation, it is asking for sound.

    Reject only clearly irrelevant inputs like questions unrelated to sound, programming help, math problems, or essays.
    For example, reject things like: "what is the capital of France", "solve this equation", "write an essay on the Cold War", or "how to code in Python".

    Respond with ONLY a JSON object with one field:
    {{"is_valid": true}} — if the input could relate to soundscapes or audio environments
    {{"is_valid": false}} — if it is clearly unrelated to sound

    Return ONLY the JSON. No explanation or extra text.
    """.strip()

    try:
        validation_response = mistral_client.chat.complete(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": validation_prompt}],
        )

        validation_text = validation_response.choices[0].message.content.strip()

        if "```" in validation_text:
            validation_text = validation_text.split("```")[-1].strip()

        try:
            validation_result = json.loads(validation_text)
            if not validation_result.get("is_valid", True):
                return {
                    "error": True,
                    "message": "Your input does not seem to describe a soundscape.",
                    "suggestions": [
                        "forest with birds and a stream",
                        "busy cafe with people talking",
                        "thunderstorm at night",
                        "ocean waves on a beach",
                        "spaceship engine room humming"
                    ]
                }
        except json.JSONDecodeError:
            print("Validation response could not be parsed; proceeding anyway.")

        prompt_str = f"""
        You are a sound design keyword generator. I will give you a description, and you need to extract 
        or generate relevant sound effect keywords that could be used to search a sound library.

        Description: "{user_text}"

        If the description is simple (like a single word such as "river", "cafe", "ocean"), expand it into multiple related sound keywords.
        For example:
        - For "river": ["flowing water", "river current", "stream bubbling", "water splash", "gentle brook", "river ambience"]
        - For "cafe": ["coffee shop ambience", "people chatting", "coffee machine", "cup clinking", "cafe background", "restaurant noise"]

        Generate exactly {min_keywords} keywords related to sounds described. Format your response as ONLY a JSON 
        array of strings. For example: ["spaceship hum", "engine rumble", "space atmosphere", "control panel beeps", 
        "airlock sound", "cosmic radiation"]

        Important: Return ONLY the JSON array, no other text or explanation.
        """.strip()

        response = mistral_client.chat.complete(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt_str}],
        )

        raw_text = response.choices[0].message.content.strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[-1].strip()

        try:
            expansions = json.loads(raw_text)
            if not isinstance(expansions, list):
                return []

            expansions = [k.strip() for k in expansions if k.strip()]
            return expansions

        except json.JSONDecodeError:
            fallback_keywords = re.findall(r'"([^"]+)"', raw_text)
            if fallback_keywords and len(fallback_keywords) >= 3:
                return fallback_keywords[:min_keywords]
            return []

    except Exception as e:
        print("Error calling Mistral:", e)
        return []

def generate_track_names(sounds_info):
    if not sounds_info:
        return []

    prompt_parts = []
    for idx, sound in enumerate(sounds_info):
        sound_name = sound.get("name", "Unnamed Sound")
        sound_description = sound.get("description", "No description")
        if len(sound_description) > 300:
            sound_description = sound_description[:300] + "..."

        prompt_parts.append(f"""Sound {idx+1}:
Name: "{sound_name}"
Description: "{sound_description}"
""")

    sounds_data = "\n\n".join(prompt_parts)

    prompt = f"""You are a sound naming expert. Give each sound below a short, descriptive name (2-4 words) that clearly describes what the sound is.

The names should be concise, descriptive, and focused on what the sound actually is (not poetic or abstract).
Ignore any irrelevant details in the description. Focus on creating practical, useful names that accurately describe the sound content.

{sounds_data}

Format your response as a JSON array of strings containing ONLY the new names in the same order as the sounds above.
For example: ["Wind Through Pines", "Ocean Waves Crashing", "Distant Thunder", "City Traffic", "Coffee Shop Ambience", "Computer Server Room"]

IMPORTANT: Return ONLY the JSON array, no other text or explanation.
"""

    try:
        response = mistral_client.chat.complete(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt}],
        )

        raw_text = response.choices[0].message.content.strip()
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[-1].strip()

        try:
            track_names = json.loads(raw_text)
            if not isinstance(track_names, list):
                return sounds_info

            if len(track_names) != len(sounds_info):
                if len(track_names) < len(sounds_info):
                    track_names.extend([s.get("name", f"Sound {i+1+len(track_names)}") 
                                       for i, s in enumerate(sounds_info[len(track_names):])])
                else:
                    track_names = track_names[:len(sounds_info)]

            result = []
            for i, sound in enumerate(sounds_info):
                sound_copy = dict(sound)
                sound_copy["freesound_name"] = sound.get("name", "Unnamed Sound")
                sound_copy["name"] = track_names[i]
                result.append(sound_copy)

            return result

        except json.JSONDecodeError:
            return sounds_info

    except Exception as e:
        print("Error calling Mistral for track names:", e)
        return sounds_info

# Updated: Using Mistral to generate description based on user input and track's name
def generate_description(user_text: str) -> str:
    """
    Use Mistral to generate a descriptive paragraph of 3-4 sentences
    about how a sound might sound, based on a list of track names

    Args:
        track_names: The names of the sound tracks

    Returns:
        A string containing the description, or an empty string if something went wrong.
    """

    prompt_str = f"""
    You are a specialized description generator. The user input has provided the sentence
    that includes all track names that sepeareted by comma:"{user_text}"

    Write a single paragraph (3-4 sentences) describing how this blended soundscape could sound.
    Mention some detailed sound and explain how the sounds merge or complement one another.
    Maintain a concise style.

    - Please return ONLY a valid JSON object with one key: "description".
    - "description" should be a pragraph about 3-4 sentences, evocative text describing the scene or content.

    Example response:
    {{
      "description": "This blended soundscape transports listeners to the edge of a vast, dynamic ocean,
                      where the rhythmic crashing of waves on a sandy beach creates a steady, soothing pulse.
                      The sounds of heavy, frequent waves from the Baltic Sea add depth and power, merging with
                      the pacific ocean's expansive resonance to create a sense of endless motion.
                      The occasional splashes of water running and breaking add a lively, textured layer, complementing
                      the consistent wave sounds with a touch of unpredictability, resulting in an immersive and natural coastal atmosphere."

    }}

    Return ONLY valid JSON, with no extra text, code fences, or disclaimers.
    """.strip()

    try:
        response = mistral_client.chat.complete(
            model=MODEL_NAME,
            messages=[{"role": "user", "content": prompt_str}],
        )

        # Raw text from Mistral
        raw_text = response.choices[0].message.content.strip()
        if "```" in raw_text:
            raw_text = raw_text.split("```")[-1].strip()

        # Parse JSON
        data = json.loads(raw_text)
        if not isinstance(data, dict) or "description" not in data:
            raise ValueError("Missing 'description' in Mistral response.")

        return data["description"]

    except Exception as e:
        print("Error generating description with Mistral:", e)
        return ""  # fallback: return an empty string or handle as needed