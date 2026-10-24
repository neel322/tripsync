# TripSync — how it works

## Architecture
React (Vite, Tailwind) frontend  ──HTTP /api──▶  Express backend  ──▶  Supabase (Postgres)
                                 ◀──Socket.IO──▶  (rooms per trip)

- The backend uses the Supabase **service key** and does its own authorisation
  (JWT + a membership check on every trip route). Supabase Auth / RLS is not used.
- Vite proxies `/api` and `/socket.io` to `localhost:5000` in development.

## Features and where they live
| Feature | Frontend | Backend |
|---|---|---|
| Register / login (bcrypt + JWT, 7 days) | pages/auth/*, context/AuthContext.jsx | controllers/authController.js, middleware/auth.js |
| Trips: create, list, status (Pending / Completed / Cancelled), delete | Dashboard.jsx, CreateTrip.jsx, Members.jsx (Trip Settings) | tripController.js |
| Invite codes (6 chars) + join | JoinTrip.jsx, TripOverview.jsx (copy code) | tripController.joinTrip |
| Roles: organizer / member, remove members | Members.jsx, TripSidebar.jsx | tripController.removeMember |
| Itinerary by day, types, estimated cost | Itinerary.jsx | itineraryController.js |
| Polls: vote / change vote / un-vote, close, delete | Polls.jsx | pollController.js |
| Expenses with "who was present" splitting + settle-up suggestions | Expenses.jsx | expenseController.js |
| Budget overview (budget vs spent vs planned) | Budget.jsx | expenseController.getBudgetOverview |
| Live updates (Socket.IO rooms `trip:<id>`) | hooks/useSocket.js | socket/socketHandler.js |

## Expense splitting
- Each expense may have rows in `expense_splits` (one per person who shared it).
- No rows -> split equally among everyone in the trip.
- Balance per person = (what they paid) − (their share of every expense they were part of).
- Settle-up suggestions use a greedy algorithm: repeatedly match the biggest debtor with the
  biggest creditor, which keeps the number of payments small.

## Error handling (added in this update)
Backend
- `utils/errors.js` — `sendError`, `handleError` (maps Postgres codes and "database unreachable"
  to friendly messages) and small validators (uuid, real calendar date, email).
- `utils/membership.js` — `getMembership()` throws on real DB failures instead of treating them
  as "not a member".
- `routes/trips.js` — every `:id` style parameter is checked to be a UUID (clear "Invalid trip ID").
- `server.js` — malformed JSON -> 400, unknown route -> 404 with method + path.
- Every controller validates input and returns specific messages; queries on itinerary items,
  polls and expenses are now scoped to the trip in the URL.
Frontend
- `lib/errors.js` — `getErrorMessage(err, fallback)` picks the server's message, or explains
  offline / server down / timeout / permission / not found.
- `lib/api.js` — 20 s timeout; a wrong password no longer triggers the "session expired"
  redirect that used to wipe the message; real expiries show a reason on the login page.
- Forms validate before sending, with one specific message per problem.
