import os
import requests
from dotenv import load_dotenv

# Load environment variable from .env
load_dotenv()
FREESOUND_API_KEY = os.environ.get("FREESOUND_API_KEY")

if not FREESOUND_API_KEY:
    print("Error: Freesound Api key is not loaded.")

def search_freesound(keywords):
    '''
    This function is called by python_backend.py & takes the list of keywords from the model 
    and queries the FreeSound API, returning the sounds that match.
    '''

    # Joining keywords into a single string for searching
    query = " ".join(keywords)

    url = "https://freesound.org/apiv2/search/text/"
    params = {
        "query": query,
        "fields": "name,description,download",
        "token": FREESOUND_API_KEY
    }

    try:
        response = requests.get(url, params=params) # GET request to freesound api
        response.raise_for_status() 
    except requests.exceptions.RequestException as e:
        raise

    # Parsing JSON data containing sounds name, url, description    
    matching_sounds = response.json()
    return matching_sounds

