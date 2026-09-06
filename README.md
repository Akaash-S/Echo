# Echo — Conversational AI Reflection Journal

[![Cloud Run](https://img.shields.io/badge/Google_Cloud-Cloud_Run-4285F4?logo=googlecloud&logoColor=white)](https://cloud.google.com/run)
[![Gemini](https://img.shields.io/badge/Google-Gemini_2.5_Flash-8E75B2?logo=googlegemini&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/Frontend-React_19_+_Vite-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_+_Python_3.12-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)

**Echo** is an empathetic, perceptive personal AI journal companion designed to help you untangle complex decisions, explore recurring emotional themes, and brainstorm freely. Powered by **Google Gemini 2.5 Flash**, Echo remembers continuous themes across your sessions, generates proactive reflection inquiries, and synthesizes location-aware place retrospectives when you return to familiar spaces.

---

## 🌟 Key Features

1. **Continuous Memory & Themed Starters**: Remembers themes and forward-looking questions from prior reflections, greeting you with contextual callbacks.
2. **Zero-Latency Reflection Space**: Instant interactive chat with starter prompts for mental headspace, dilemma untangling, and priorities.
3. **Automated Reflection Synthesis**: At session end, extracts core themes, concise executive summaries, and forward-looking questions.
4. **Location-Anchored Retrospectives**: Discovers geographic clusters (~5km) across visits to surface AI retrospectives on your state of mind over time.
5. **Strict Multi-User Isolation**: Every dialogue, theme, and coordinate is securely locked under the authenticated user's path `/users/{uid}` in Google Cloud Firestore.
6. **Unified Single-Origin Architecture**: FastAPI serves both the REST API and the built React SPA from a single Cloud Run container with no CORS overhead.

---

## 🏗️ Architecture Summary

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Google Cloud Run (Unified Origin)                    │
│                                                                        │
│  ┌───────────────────────────────┐   ┌──────────────────────────────┐  │
│  │   React 19 + Tailwind SPA     │   │     FastAPI Python Backend   │  │
│  │   (Static Assets / SPA Catch) │◄──┤   (REST API / Endpoints)     │  │
│  └───────────────────────────────┘   └──────────────┬───────────────┘  │
└─────────────────────────────────────────────────────┼──────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │     Google Cloud GenAI    │                                 │   Cloud Firestore & Auth  │
         │   (Gemini 2.5 Flash API)  │                                 │   (/users/{uid}/sessions) │
         └───────────────────────────┘                                 └───────────────────────────┘
```

---

## 🚀 Live Cloud Run Deployment

- **Public Live Application**: [https://echo-journal-189366956706.asia-south1.run.app](https://echo-journal-189366956706.asia-south1.run.app)
- **Deployment Region**: `asia-south1` (Mumbai)
- **Mandatory Submission Label**: `dev-tutorial=cloud-run-ai-challenge`

---

## 🛠️ Step-by-Step Deployment Guide

### 1. Prerequisites & GCP Project Configuration
```bash
# Set healthy project
gcloud config set project echo--gemni-journal

# Enable required Google Cloud APIs
gcloud services enable run.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

### 2. Secret Manager Configuration
```bash
# Store Gemini API Key securely in Secret Manager
gcloud secrets create gemini-api-key --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
```

### 3. Service Account & IAM Permissions
```bash
# Create dedicated runtime service account
gcloud iam service-accounts create echo-run-sa \
  --display-name="Echo Cloud Run runtime"

# Grant Secret Manager Accessor
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:echo-run-sa@echo--gemni-journal.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Grant Firestore/Datastore User
gcloud projects add-iam-policy-binding echo--gemni-journal \
  --member="serviceAccount:echo-run-sa@echo--gemni-journal.iam.gserviceaccount.com" \
  --role="roles/datastore.user"
```

### 4. Build & Deploy to Cloud Run
```bash
gcloud run deploy echo-journal \
  --source . \
  --region asia-south1 \
  --platform managed \
  --allow-unauthenticated \
  --service-account echo-run-sa@echo--gemni-journal.iam.gserviceaccount.com \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest \
  --set-env-vars FIREBASE_PROJECT_ID=echo--gemni-journal \
  --labels dev-tutorial=cloud-run-ai-challenge \
  --min-instances 0 \
  --max-instances 3
```

### 5. Deploy Firestore Security Rules
```bash
firebase deploy --only firestore:rules --project echo--gemni-journal
```

---

## 🔒 Security Constitution (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Strict multi-tenant isolation: Users can only read/write their own records
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

---

## 💻 Local Development Setup

### Backend (FastAPI)
```bash
# Activate virtual environment
python -m venv venv
source venv/bin/activate # or venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Run server
uvicorn main:app --reload --port 8000
```

### Frontend (React + Vite)
```bash
# Install packages
npm install

# Start Vite dev server
npm run dev
```

---

## 📄 License
MIT License. Built for the Google Cloud Run & Gemini Ideathon Challenge.
