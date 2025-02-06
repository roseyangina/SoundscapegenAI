from flask import Flask, request, jsonify
from flask_cors import CORS
from nlp_model import extract_keywords

app = Flask(__name__)
CORS(app)

@app.route('/api/keywords', methods=['POST'])
def keywords():
    data = request.get_json()
    
    if not data or 'str' not in data:
        return jsonify(success=False, message="Missing 'str' parameter in the request."), 400

    input_str = data['str']
    
    try:
        # BERT-based function
        keywords_result = extract_keywords(input_str)

        if not keywords_result:
            return jsonify(success=False, message="Sorry, I didn't catch that. Could you describe it in a different way?"), 400

        
        return jsonify(success=True, keywords=keywords_result), 200
    except Exception as e:
        return jsonify(success=False, message=str(e)), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3002)
