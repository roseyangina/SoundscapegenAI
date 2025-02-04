from flask import Flask, request, jsonify

app = Flask(__name__)

def getKeywords(text):
    """
    Dummy implementation for extracting keywords.
    Replace this function's implementation with your actual keyword extraction logic.
    """
    words = text.split()
    return list(set(words))

@app.route('/keywords', methods=['POST'])
def keywords():
    data = request.get_json()
    
    if not data or 'str' not in data:
        return jsonify(success=False, message="Missing 'str' parameter in the request."), 400

    input_str = data['str']
    
    try:
        keywords_result = getKeywords(input_str)
        
        return jsonify(success=True, keywords=keywords_result), 200
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=3001)
