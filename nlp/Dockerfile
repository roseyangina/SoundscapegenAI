FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt ./

RUN pip install --upgrade pip
RUN pip install torch==2.6.0 --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3002

CMD ["python", "python_backend.py"]
