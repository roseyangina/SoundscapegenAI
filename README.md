You need python and node installed to use this.

When you have both, run setup.bat and it will install the dependencies (currently flask and express) for you

To run it, open two command prompts and run `node express_backend.js` in one and `python python_backend.py` in the other
To test what will happen when it's called by the server (will have to change because it currently accepts raw json rather than
form data), use postman or curl (or whatever else you can use to hit a localhost http api endpoint) and send a request with Content-Type application/json and a body with an item called `str` that has a string. Right now the functionality isn't implemented so it just returns the unique words in the string, as a list.