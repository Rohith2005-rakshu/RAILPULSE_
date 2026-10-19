# 🚆 RailPulse Express - Modern Smart Railway Booking & Tracking Platform

A full-stack, responsive, and aesthetically pleasing Train Reservation & Live Tracking web application built with **Python Flask**, **SQLite**, and a **modern Glassmorphism UI** styled with custom CSS and interactive JavaScript.

---

## ✨ Key Features

### 🎨 Frontend & User Interface
- **Next-Gen Railway Dashboard**: Dark space navy aesthetics with glowing gradients, smooth micro-interactions, and responsive layout for mobile, tablet, and desktop screens.
- **Real-Time Live Railway Clock**: Displays synchronized 24-hour railway time in the navbar.
- **Smart Train Search**:
  - Origin & Destination station selectors with automatic swap button (`⇄`).
  - Travel date picker with automatic tomorrow default.
  - Class filters (All Classes, 1A, 2A, 3A, CC, EC, SL).
  - Quotas (General, Tatkal, Ladies, Senior Citizen).
  - One-click popular route chips (e.g. *Delhi ⇄ Mumbai*, *Bengaluru ⇄ Chennai*, *Mumbai ⇄ Goa*).
- **Interactive Coach Seat Picker**:
  - Visual coach layout (Coach B2 / AC 3-Tier) showing Lower Berth, Upper Berth, Middle Berth, Window Seats, and occupied vs available seats.
- **Express Multi-Passenger Booking & Checkout**:
  - Add up to 6 passengers with berth preferences.
  - Dynamic fare calculation with railway tax and instant breakdown.
  - Simulated payment options (RailPay UPI, Cards, Net Banking).
- **Printable E-Ticket / Boarding Pass**:
  - Authentic railway reservation slip with QR code, barcode, unique 10-digit PNR, coach, seat numbers, and passenger manifest.
  - One-click "Print / Save PDF" with print-optimized CSS (`@media print`).
- **Live PNR Status Tracker**:
  - Enter any 10-digit PNR to check real-time reservation and berth allocation status.
  - Pre-seeded sample PNR (`8492041235`) for instant testing.
- **Satellite GPS Live Train Running Status**:
  - Real-time GPS progress bar showing current speed, journey completion percentage, delay status ("On Time" / "5 mins delay"), and station-by-station timeline.
- **My Bookings & Instant Cancellation**:
  - View all past bookings stored in SQLite.
  - Instant 1-click cancellation with automated 90% refund computation.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.13, Flask, SQLite3
- **Frontend**: HTML5, Modern CSS3 (CSS Variables, Flexbox, CSS Grid, Glassmorphism), Vanilla JavaScript (ES6+ Async/Await)
- **Icons & Fonts**: FontAwesome 6, Google Fonts (*Plus Jakarta Sans* & *JetBrains Mono*)

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
python -m pip install -r requirements.txt
```

### 2. Initialize Database & Seed Data
```bash
python database.py
```

### 3. Run the Web Server
```bash
python app.py
```
*Or double-click `start.bat` on Windows.*

### 4. Open in Browser
Visit: [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 📡 REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the web application |
| `GET` | `/api/stations` | Retrieves list of transit stations |
| `GET` | `/api/trains` | Search trains with `from`, `to`, and `class` filters |
| `GET` | `/api/trains/<train_no>/route` | Get route timetable and intermediate stops |
| `POST` | `/api/book` | Books ticket, allocates coach/seats, generates 10-digit PNR |
| `GET` | `/api/pnr/<pnr>` | Retrieve live ticket status by PNR |
| `GET` | `/api/bookings` | Retrieve all bookings stored in database |
| `POST` | `/api/cancel` | Cancel booking and process refund |
| `GET` | `/api/live-status/<train_no>` | Retrieve simulated satellite GPS live tracking |

---

## 🧪 Automated Testing
Run the comprehensive test suite to verify all 8 backend endpoints:
```bash
python test_app.py
```
