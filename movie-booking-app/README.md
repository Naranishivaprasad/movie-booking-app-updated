# 🎬 CineBook — Movie Ticket Booking System

A full-stack MERN movie ticket booking app with high integrity features:
atomic transactions, idempotent APIs, infinite scroll, dynamic pricing, JWT auth, and role-based access.

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally on port 27017
  - Install: https://www.mongodb.com/try/download/community
  - Start: `mongod` (or as a service)

---

### 1. Backend Setup

```bash
cd backend
npm install
```

Optionally edit `.env` (defaults work for local):
```
MONGO_URI=mongodb://127.0.0.1:27017/movieDB
JWT_SECRET=your_super_secret_key
PORT=5000
```

Seed demo data (users + 8 movies):
```bash
npm run seed
```

Start the backend:
```bash
npm run dev       # with nodemon (auto-restart)
# or
npm start         # plain node
```

Server runs on: **http://localhost:5000**

---

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

App opens at: **http://localhost:3000**

---

## 🔑 Demo Credentials

| Role  | Email                  | Password   |
|-------|------------------------|------------|
| Admin | admin@cinema.com       | admin123   |
| User  | john@example.com       | user1234   |

---

## ✅ Features

### Booking Integrity
- ✅ **No duplicate bookings** — compound DB index on (showId + seats) with partial filter
- ✅ **Atomic transactions** — MongoDB multi-document session (all-or-nothing)
- ✅ **Idempotent API** — unique idempotency key prevents double-submit
- ✅ **Race condition protection** — DB-level unique constraint catches concurrent bookings
- ✅ **Booking expiry** — pending bookings auto-expire after 15 min (cron job)
- ✅ **Booking status** — pending → confirmed / failed / expired / cancelled

### Pricing
- ✅ **Dynamic pricing** — server-side only (cannot be spoofed)
- ✅ **Discount slabs**: 3–4 seats → 5%, 5–7 → 10%, 8+ → 15%
- ✅ **Time surcharge**: Peak (6pm–11pm) → +20%, Morning (<12pm) → −10%
- ✅ **Live price preview** on seat selection

### Auth & Security
- ✅ **Password hashing** — bcrypt (12 rounds)
- ✅ **JWT authentication** — Bearer token
- ✅ **Role-based access** — user / admin routes protected
- ✅ **Backend validation** — express-validator on all inputs
- ✅ **No frontend trust** — all prices, roles, seat checks done server-side

### UX
- ✅ **Infinite scroll** — cursor-based pagination (not offset-based)
- ✅ **Breadcrumb navigation** — on all inner pages
- ✅ **Search + genre filter** — debounced search, genre chips
- ✅ **Interactive seat picker** — visual seat map with booked/selected states
- ✅ **Booking ticket view** — with barcode-style display
- ✅ **Admin dashboard** — manage shows, view all bookings, add new shows
- ✅ **Toast notifications** — for all actions
- ✅ **Responsive design** — mobile-friendly

---

## 📁 Structure

```
movie-booking-app/
├── backend/
│   ├── config/db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── showController.js
│   │   └── bookingController.js
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── validate.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Show.js
│   │   └── Booking.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── showRoutes.js
│   │   └── bookingRoutes.js
│   ├── utils/
│   │   ├── pricing.js
│   │   └── expireBookings.js
│   ├── seed.js
│   ├── server.js
│   └── .env
│
└── frontend/
    ├── public/index.html
    └── src/
        ├── components/
        │   ├── Navbar.js
        │   ├── Breadcrumb.js
        │   ├── MovieCard.js
        │   ├── SeatPicker.js
        │   └── ProtectedRoute.js
        ├── context/AuthContext.js
        ├── pages/
        │   ├── Login.js
        │   ├── Register.js
        │   ├── Shows.js
        │   ├── ShowDetail.js
        │   ├── BookingDetail.js
        │   ├── MyBookings.js
        │   └── Admin.js
        ├── utils/
        │   ├── api.js
        │   └── helpers.js
        └── App.js
```

---

## 🌐 API Endpoints

| Method | Route                     | Auth     | Description              |
|--------|---------------------------|----------|--------------------------|
| POST   | /api/auth/register        | Public   | Register user            |
| POST   | /api/auth/login           | Public   | Login, get JWT           |
| GET    | /api/auth/me              | User     | Get current user         |
| GET    | /api/shows                | Public   | List shows (paginated)   |
| GET    | /api/shows/:id            | Public   | Show + booked seats      |
| POST   | /api/shows                | Admin    | Create show              |
| DELETE | /api/shows/:id            | Admin    | Deactivate show          |
| POST   | /api/bookings             | User     | Create booking           |
| GET    | /api/bookings/my          | User     | My bookings (paginated)  |
| GET    | /api/bookings/:id         | User     | Get single booking       |
| PATCH  | /api/bookings/:id/cancel  | User     | Cancel booking           |
| GET    | /api/bookings/admin/all   | Admin    | All bookings (paginated) |
