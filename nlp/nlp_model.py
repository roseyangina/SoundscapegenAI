import os
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"  # Suppress TensorFlow logging

import re
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification

# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained("ml6team/keyphrase-extraction-distilbert-inspec")
model = AutoModelForTokenClassification.from_pretrained("ml6team/keyphrase-extraction-distilbert-inspec")

pipe = pipeline("token-classification", model=model, tokenizer=tokenizer)

# Predefined music-related words that may not be part of bert model data
MUSIC_KEYWORDS = {
    "piano", "rain", "storm", "jazz", "soundscape", "guitar", "ocean", "waves",
    "birds", "fireplace", "wind", "meditation", "flute", "cello", "nature",
    "thunder", "thunderstorm", "river", "breeze", "forest", "drums", "whale", "harp", "choir",
    "lo-fi", "electronic", "classical", "smooth", "relaxing", "ambient", "lofi", "hum",
    "chill", "soft", "hiphop", "hip-hop", "hip hop", "rap", "rock", "metal"
}

# Helper 1
def merge_tokens(words):
    """
    Merges tokens/words that BERT doesn't recognize (subwords).
    E.g. ['sp', '##ook', '##y'] -> ['spooky']
    """
    final_keywords = []
    current_word = ""

    for word in words:
        if word.startswith("##"):
            current_word += word[2:]
        else:
            if current_word:
                final_keywords.append(current_word)
            current_word = word

    if current_word:
        final_keywords.append(current_word)

    return final_keywords

# Helper 2
def preprocess_text(input_text):
    """
    Removes unnecessary phrases and punctuation, and expands sentence if its too short
    for BERT to recognize
    """
    NOISE_PHRASES = [
        "i want", "i need", "i would like", "can you play", "play me", "give me", "soundscape",
        "let me hear", "please play", "i'd like", "could you", "please", "of", "the",
        "sound", "sounds", "music", "track"
    ]

    cleaned_text = input_text.lower()

    for phrase in NOISE_PHRASES:
        cleaned_text = cleaned_text.replace(phrase, "").strip()

    # Remove punctuation
    cleaned_text = re.sub(r"[^\w\s]", "", cleaned_text)

    # If it's very short, expand for bert to better recognize key words
    if len(cleaned_text.split()) <= 3:
        cleaned_text = f"Give context on {cleaned_text}"

    return cleaned_text

# Main
def get_keywords(input_text):
    print(f"Received input: {input_text}") 
    """
    Uses the DistilBERT-based pipeline to extract keywords from user input.
    """

    # 1: Preprocess the text
    cleaned_text = preprocess_text(input_text)
    print(f"After preprocessing: {cleaned_text}")  # Debugging print

    # 2: Running the token classification pipeline on the preprocessed text
    extracted_kw_dict = pipe(cleaned_text)    # List of dictionaries containing extracted keywords
    print(f"Raw extracted keywords: {extracted_kw_dict}")

    # 3: Collecting the token 'word' fields in the list
    kw_scores_tuple = []  
    for word_dict in extracted_kw_dict:       
        extracted_word = word_dict['word']          # Get the value of 'word' key
        confidence = word_dict['score']
        kw_scores_tuple.append((extracted_word, confidence))  

    # Sorting keywords by the confidence score (highest first)
    kw_scores_tuple.sort(key=lambda x: x[1], reverse=True)  

    # Extracting only the top 3 scored words (if more than 3 exist)
    top_kw = []  
    for word_tuple in kw_scores_tuple[:3]:  
        top_kw.append(word_tuple[0])

    # 4: Merging subword tokens in the case of unrecognized words ('##' pieces)
    final_keywords = merge_tokens(top_kw)

    # 5: Including predefined MUSIC_KEYWORDS if they appear in the original text
    for word in input_text.split():
        word = word.lower()
        if word in MUSIC_KEYWORDS and word not in final_keywords:
            final_keywords.append(word)      

    #---------------------------- Further processing -----------------------------------------
    
    # Remove words with length 2 or 3 only if there are at least 2 extracted keywords
    filtered_keywords = []
    if len(final_keywords) >= 2:
        for word in final_keywords:
            if len(word) > 3:
                filtered_keywords.append(word)
    else:
        filtered_keywords = final_keywords  

    final_keywords = filtered_keywords

    # Only the top 3 keywords are returned (remove shortest word if more than 3)
    while len(final_keywords) > 3:
        shortest_word = min(final_keywords, key=len)
        final_keywords.remove(shortest_word)

    # Empty results (no keywords extracted)
    if not final_keywords:
        print("Empty results in nlp_model. No final keywords found.")
        return []    

    # For logging purposes
    print(f"Searching for sounds related to {', '.join(final_keywords)}...")

    return final_keywords
