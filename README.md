# AI Mentor

Monorepo with three services:

| Service | Stack | Port |
|---|---|---|
| `client` | React + Vite + TailwindCSS | 5173 |
| `server` | Node.js + Express + MongoDB | 5000 |
| `ai-service` | Python FastAPI | 8000 |

## Prerequisites

- Node.js ≥ 18
- Python ≥ 3.10
- MongoDB (or Docker)

## Running Locally

### 1. Server

```bash
cd server
cp .env.example .env   # fill in values
npm install
npm run dev
```

### 2. Client

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

### 3. AI Service

```bash
cd ai-service
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Running with Docker Compose

```bash
# Copy env files
cp server/.env.example server/.env
cp client/.env.example client/.env
cp ai-service/.env.example ai-service/.env

docker-compose up --build
```

Services will be available at their respective ports listed above.
