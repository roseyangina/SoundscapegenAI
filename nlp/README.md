I would recommend using a python virtual environment 

On running docker-compose up –build in the root, 
it will take a few minutes as the pytorch package is large.

After build is successful and docker is up, go to browser and run:
[http://localhost:3000/](http://localhost:3000/)

You can test any sentence and it will extract some key words:
For example: 'I would like a soothing piano track' , 'A futuristic soundscape with electronic beats.'

Currently nlp_model.py applies a fine tuned [distilbert model](https://huggingface.co/ml6team/keyphrase-extraction-distilbert-inspec) which is a better performing one. There is some text processing to aid the model to recognize music keywords as it is tested on unknown data hence may not recognize all possible words in this domain. If keywords extracted are more than 3 it returns the top 3 words scored for the purposes of the freesound api.
