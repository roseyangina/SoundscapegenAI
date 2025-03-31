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
    # First, validate if the input is related to a soundscape
    validation_prompt = f"""
    You are a soundscape validator. Determine if the following text describes a soundscape or sounds that could be used to create an audio environment.
    
    Input: "{user_text}"
    
    Respond with ONLY a JSON object with two fields:
    1. "is_valid": true if the input describes a soundscape or sounds, false otherwise
    2. "reason": explanation of why it's valid or invalid
    
    Examples of valid inputs: "forest with birds and a stream", "busy cafe with people talking and coffee machines", "thunderstorm at night"
    Examples of invalid inputs: "what is the capital of France", "write an essay about climate change", "how to program in Python"
    
    Return ONLY the JSON object, no other text.
    """.strip()
    
    try:
        # First validate the input
        validation_response = mistral_client.chat.complete(
            model=MODEL_NAME,
            messages=[
                {"role": "user", "content": validation_prompt}
            ],
        )
        
        validation_text = validation_response.choices[0].message.content.strip()
        print(f"Validation response: {validation_text}")
        
        # Clean up response if needed
        if "```json" in validation_text:
            validation_text = validation_text.split("```json")[1].split("```")[0].strip()
        elif "```" in validation_text:
            validation_text = validation_text.split("```")[1].strip()
            
        try:
            validation_result = json.loads(validation_text)
            
            # If the input is not valid, return error
            if not validation_result.get("is_valid", True):
                print(f"Invalid input detected: {validation_result.get('reason')}")
                return {
                    "error": True,
                    "message": validation_result.get('reason', "Your input does not seem to describe a soundscape."),
                    "suggestions": [
                        "forest with birds and a stream",
                        "busy cafe with people talking",
                        "thunderstorm at night",
                        "ocean waves on a beach",
                        "spaceship engine room humming"
                    ]
                }
                
        except json.JSONDecodeError:
            print("Failed to parse validation result, proceeding with keyword generation")
    
        # If valid or we couldn't determine validity, proceed with keyword generation
        # A prompt instructing Mistral to output ONLY a JSON array of min_keywords keywords
        prompt_str = f"""
        You are a sound design keyword generator. I will give you a description, and you need to extract 
        or generate relevant sound effect keywords that could be used to search a sound library.
        
        Description: "{user_text}"
        
        Generate exactly {min_keywords} keywords related to sounds described. Format your response as ONLY a JSON 
        array of strings. For example: ["spaceship hum", "engine rumble", "space atmosphere", "control panel beeps", 
        "airlock sound", "cosmic radiation"]
        
        Important: Return ONLY the JSON array, no other text or explanation.
        """.strip()

        response = mistral_client.chat.complete(
            model=MODEL_NAME,
            messages=[
                {"role": "user", "content": prompt_str}
            ],
        )

        raw_text = response.choices[0].message.content.strip()
        print(f"Mistral raw response: {raw_text}")  # Add debugging
        
        # Clean up response - sometimes models add markdown code blocks
        if "```json" in raw_text:
            raw_text = raw_text.split("```json")[1].split("```")[0].strip()
        elif "```" in raw_text:
            raw_text = raw_text.split("```")[1].strip()
            
        # Try to parse JSON
        try:
            expansions = json.loads(raw_text)
            if not isinstance(expansions, list):
                print("Mistral returned valid JSON but not a list:", expansions)
                return []
                
            expansions = [k.strip() for k in expansions if k.strip()]
            print(f"Successfully extracted keywords: {expansions}")
            return expansions
            
        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            print("Raw text that failed parsing:", raw_text)
            # If parsing fails, try a simple fallback (extract quoted terms)
            fallback_keywords = re.findall(r'"([^"]+)"', raw_text)
            if fallback_keywords and len(fallback_keywords) >= 3:
                print(f"Using fallback extraction: {fallback_keywords}")
                return fallback_keywords[:min_keywords]
            return []

    except Exception as e:
        print("Error calling Mistral:", e)
        return []
