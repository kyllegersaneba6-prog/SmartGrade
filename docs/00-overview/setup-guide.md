# Setup Guide

## Prerequisites

- Node.js v20+
- npm
- Supabase project (or local PostgreSQL)

## Installation

```bash
# Clone and enter the project
cd SmartGrade-master

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

## Configuration

Create `backend/.env` and `frontend/.env` with:

```
PORT=5000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-service-role-key
JWT_SECRET=your-secret-key
```

## Database Setup

1. Run `backend/sql/schema.sql` in your Supabase SQL editor to create tables and seed data.
2. Run migration files in `backend/sql/` in order for any additional features.
3. Default superadmin: username `admin`, password `admin123`.

## Running

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Backend runs on `http://localhost:5000`, frontend on `http://localhost:5173`.

## Common Errors

| Error | Fix |
|---|---|
| `supabaseUrl is required` | Missing or empty `.env` file |
| `relation "public.departments" does not exist` | Run `schema.sql` first |
| Port already in use | Change `PORT` in `backend/.env` |
| CORS errors | Ensure backend is on `:5000` and frontend on `:5173` |
