# SalesPilot AI — Autonomous AI Sales Voice & Text Platform

SalesPilot AI is a multi-tenant AI-powered sales automation SaaS platform that communicates with customers via **real-time Voice (Deepgram STT + ElevenLabs TTS + Twilio/Exotel + Browser Mic)** and **Text Chat** using a shared **LangGraph.js** agentic AI engine, **MongoDB Atlas Vector Search** RAG, **BullMQ + Redis** background workers, **Google Calendar** autonomous booking, and an integrated **CRM & Analytics** suite.

## Architecture Overview

- **Frontend (`frontend/`)**: React 18, Vite, JavaScript, Tailwind CSS, React Router, TanStack Query, Zustand, Recharts, Lucide React, React Hook Form + Zod, Socket.IO Client.
- **Backend (`backend/`)**: Node.js (ES Modules), Express.js, Mongoose (MongoDB Atlas + Vector Search), JWT (HttpOnly Refresh Cookie Rotation), Socket.IO, WebSockets (`ws`), BullMQ + Redis, LangGraph.js + LangChain.js + OpenAI, Deepgram, ElevenLabs, Twilio/Exotel, Google Calendar, Nodemailer, Cloudinary.

## Local Setup (No Docker Required)

### 1. Prerequisites
- Node.js >= 20
- MongoDB Atlas cluster (or local MongoDB 7+ with Atlas Vector Search for vector queries; cosine fallback included)
- Redis server (local Redis or Upstash/Redis Cloud for BullMQ workers)

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET, OPENAI_API_KEY, etc.
npm install
npm run dev
```

In a second terminal, start the BullMQ background workers:
```bash
cd backend
npm run worker
```

### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

### 4. MongoDB Atlas Vector Search Index
Create a Vector Search index named `knowledge_chunks_vector_index` on the `knowledgechunks` collection:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "organizationId"
    },
    {
      "type": "filter",
      "path": "documentId"
    }
  ]
}
```
