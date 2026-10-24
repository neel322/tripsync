# ✈️ TripSync

> **Collaborative trip-planning web application for groups — real-time itinerary, voting polls, expense splitting, and budget management.**  
> *Developed as an engineering task during an internship.*

---

## 📌 Internship Context
This project was developed as an internship full-stack engineering project task designed to explore and demonstrate:
- Real-time multi-user synchronization and presence using **Socket.IO** rooms.
- Group decision-making mechanisms with live voting polls.
- Fair financial debt-settlement algorithms (calculating dynamic net debts and who owes whom).
- Responsive UI/UX with **React 18**, **Tailwind CSS**, and modern component patterns.
- Backend database integration and Row Level Security with **Supabase (PostgreSQL)**.

---

## 🧩 Features

| Feature | Description |
|---|---|
| 🗓️ Itinerary | Day-by-day activity planner with types, times & costs |
| 🗳️ Polls | Group voting on decisions; organizer can close polls |
| 💰 Expenses | Track who paid what; auto-calculates who owes whom |
| 💵 Budget | Visual budget tracker with category breakdowns |
| 👥 Members | Invite via code; organizer vs. member roles |
| 📡 Real-time | Socket.IO pushes itinerary/poll/expense changes live |

---

## 🏗️ Stack

```
frontend/   → React 18 + Vite + Tailwind CSS
backend/    → Node.js + Express + Socket.IO
database/   → Supabase (PostgreSQL)
auth        → JWT (custom, bcrypt passwords)
```

---

## 🚀 Getting Started

### 1. Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire contents of `backend/supabase/schema.sql`
3. Copy your **Project URL** and **service_role secret key** from Settings → API

### 2. Backend

```bash
cd backend
cp .env.example .env
# Fill in your SUPABASE_URL, SUPABASE_SERVICE_KEY, and JWT_SECRET
npm install
npm run dev
```

Server starts on **http://localhost:5000**

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App opens on **http://localhost:5173**

---

## 📁 Project Structure

```
tripsync/
├── backend/
│   ├── src/
│   │   ├── config/         supabase.js
│   │   ├── controllers/    auth, trip, itinerary, poll, expense
│   │   ├── middleware/     auth.js (JWT)
│   │   ├── routes/         auth.js, trips.js
│   │   ├── socket/         socketHandler.js
│   │   ├── app.js          express configuration
│   │   └── server.js       entry point
│   ├── supabase/
│   │   └── schema.sql      full DB schema
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── layout/     Navbar, TripSidebar, AppLayout
    │   │   └── ui/         Modal, Avatar, Loader, EmptyState
    │   ├── context/        AuthContext
    │   ├── hooks/          useSocket, useSocketEvent
    │   ├── lib/            api.js, socket.js, utils.js
    │   └── pages/
    │       ├── auth/       Login, Register
    │       └── trips/      Dashboard, CreateTrip, JoinTrip,
    │                       TripOverview, Itinerary, Polls,
    │                       Expenses, Budget, Members
    └── .env.example
```

---

## 🔌 API Reference

All endpoints prefixed with `/api`. Protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT token |
| GET | `/auth/me` | Current user |

### Trips
| Method | Endpoint | Description |
|---|---|---|
| GET | `/trips` | My trips |
| POST | `/trips` | Create trip |
| POST | `/trips/join` | Join via invite code |
| GET | `/trips/:id` | Trip details + members |
| PATCH | `/trips/:id` | Update (organizer only) |

### Itinerary
| Method | Endpoint |
|---|---|
| GET | `/trips/:id/itinerary` |
| POST | `/trips/:id/itinerary` |
| PATCH | `/trips/:id/itinerary/:itemId` |
| DELETE | `/trips/:id/itinerary/:itemId` |

### Polls
| Method | Endpoint |
|---|---|
| GET | `/trips/:id/polls` |
| POST | `/trips/:id/polls` |
| POST | `/trips/:id/polls/:pollId/vote` |
| PATCH | `/trips/:id/polls/:pollId/close` |
| DELETE | `/trips/:id/polls/:pollId` |

### Expenses & Budget
| Method | Endpoint |
|---|---|
| GET | `/trips/:id/expenses` |
| POST | `/trips/:id/expenses` |
| PATCH | `/trips/:id/expenses/:expId` |
| DELETE | `/trips/:id/expenses/:expId` |
| GET | `/trips/:id/budget` |

---

## 📡 Socket.IO Events

| Event (client → server) | Description |
|---|---|
| `join_trip` | Join a trip room |
| `leave_trip` | Leave a trip room |
| `itinerary_change` | Notify others of itinerary update |
| `poll_change` | Notify others of poll update |
| `expense_change` | Notify others of expense update |

| Event (server → client) | Description |
|---|---|
| `itinerary_update` | Itinerary changed by another member |
| `poll_update` | Poll changed or voted on |
| `expense_update` | Expense added/changed |
| `member_online` | A member connected |

---

## 👥 Roles

| Role | Permissions |
|---|---|
| **Organizer** | Full control — create/edit/delete everything, close polls |
| **Member** | Add activities & expenses, vote in polls, view all |

---

## 🏷️ Tags
`#internship` `#webdevelopment` `#reactjs` `#nodejs` `#socketio` `#postgresql` `#supabase` `#tailwindcss` `#traveltech` `#realtime` `#fullstack`

