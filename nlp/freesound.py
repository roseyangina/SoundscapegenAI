import os
import requests
from dotenv import load_dotenv

# Load environment variable from .env
load_dotenv()
FREESOUND_API_KEY = os.environ.get("FREESOUND_API_KEY")

if not FREESOUND_API_KEY:
    print("Error: Freesound Api key is not loaded.")

def search_freesound(keywords, max_per_keyword=3):
    '''
    Perform multiple queries to FreeSound (one per keyword).
    Then combine results, removing duplicates if desired.
    '''
    all_results = []

    for kw in keywords:
        query = kw.strip() # remove spaces
        if not query:
            continue
        
        url = f"https://freesound.org/apiv2/search/text/?token={FREESOUND_API_KEY}"
        params = {
            "query": query,
            "fields": "id,name,description,download,previews",
            "sort": "score" # select by score
        }

        try:
            response = requests.get(url, params=params) # GET request to freesound api
            response.raise_for_status()
        except requests.exceptions.RequestException as e:
            print(f"FreeSound error searching for '{query}': {e}")
            continue

        data = response.json()
        results = data.get("results", [])

        # Download and preview URL for each result
        for result in results:
            if 'download' in result:
                result['download'] = f"{result['download']}?token={FREESOUND_API_KEY}"
            
            if 'previews' in result and 'preview-hq-mp3' in result['previews']:
                result['preview_url'] = result['previews']['preview-hq-mp3']
        
        # Take top N results for each keyword (max_per_keyword)
        top_n = results[:max_per_keyword]
        all_results.extend(top_n)
        
    return {"results": all_results}