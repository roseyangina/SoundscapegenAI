# SoundscapeGen

A web application that generates soundscapes from natural language.

## Installation and Setup

### 1. Install Docker
Ensure you have [Docker installed](https://www.docker.com/products/docker-desktop).

### 2. Clone the Repository
```bash
git clone https://github.com/Soundscapegen/project.git
cd project
```

### 3. Start the Project
```bash
docker-compose up --build
```
This will automatically start:

- **Frontend (Next.js)** -> `http://localhost:3000`
- **Backend (Express.js)** -> `http://localhost:3001`
- **NLP Service (Flask)** -> `http://localhost:3002`

### 4. Stop the Project
Press `CTRL + C` or run:
```bash
docker-compose down
```