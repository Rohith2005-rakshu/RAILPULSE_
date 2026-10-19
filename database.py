import sqlite3
import json
import os
import random
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), 'train_app.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    # Create Stations table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS stations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL
    )
    ''')

    # Create Trains table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS trains (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        train_no TEXT UNIQUE NOT NULL,
        train_name TEXT NOT NULL,
        train_type TEXT NOT NULL,
        source_code TEXT NOT NULL,
        source_name TEXT NOT NULL,
        dest_code TEXT NOT NULL,
        dest_name TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        arrival_time TEXT NOT NULL,
        duration TEXT NOT NULL,
        days_running TEXT NOT NULL,
        classes_data TEXT NOT NULL,
        rating REAL DEFAULT 4.8,
        food_included INTEGER DEFAULT 1,
        wifi_available INTEGER DEFAULT 1,
        distance_km INTEGER NOT NULL,
        FOREIGN KEY (source_code) REFERENCES stations (code),
        FOREIGN KEY (dest_code) REFERENCES stations (code)
    )
    ''')

    # Create Train Routes / Stops table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS train_routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        train_no TEXT NOT NULL,
        stop_order INTEGER NOT NULL,
        station_code TEXT NOT NULL,
        station_name TEXT NOT NULL,
        arrival_time TEXT NOT NULL,
        departure_time TEXT NOT NULL,
        halt_mins INTEGER NOT NULL,
        distance_km INTEGER NOT NULL,
        FOREIGN KEY (train_no) REFERENCES trains (train_no)
    )
    ''')

    # Create Bookings table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS bookings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pnr TEXT UNIQUE NOT NULL,
        train_no TEXT NOT NULL,
        train_name TEXT NOT NULL,
        source_code TEXT NOT NULL,
        source_name TEXT NOT NULL,
        dest_code TEXT NOT NULL,
        dest_name TEXT NOT NULL,
        travel_date TEXT NOT NULL,
        travel_class TEXT NOT NULL,
        class_name TEXT NOT NULL,
        passengers_data TEXT NOT NULL,
        total_fare REAL NOT NULL,
        contact_name TEXT NOT NULL,
        contact_email TEXT NOT NULL,
        contact_phone TEXT NOT NULL,
        coach_assigned TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'CONFIRMED',
        booking_time TEXT NOT NULL
    )
    ''')

    conn.commit()

    # Seed Stations if empty
    cursor.execute('SELECT COUNT(*) FROM stations')
    if cursor.fetchone()[0] == 0:
        seed_stations = [
            ("NDLS", "New Delhi Central", "New Delhi", "Delhi"),
            ("BCT", "Mumbai Central", "Mumbai", "Maharashtra"),
            ("HWH", "Howrah Junction", "Kolkata", "West Bengal"),
            ("MAS", "Chennai Central", "Chennai", "Tamil Nadu"),
            ("SBC", "KSR Bengaluru City", "Bengaluru", "Karnataka"),
            ("PNBE", "Patna Junction", "Patna", "Bihar"),
            ("HYB", "Hyderabad Deccan", "Hyderabad", "Telangana"),
            ("ADI", "Ahmedabad Junction", "Ahmedabad", "Gujarat"),
            ("GOA", "Madgaon Junction", "Goa", "Goa"),
            ("JAT", "Jammu Tawi", "Jammu", "Jammu & Kashmir"),
            ("BSB", "Varanasi Cantt", "Varanasi", "Uttar Pradesh"),
            ("PUNE", "Pune Junction", "Pune", "Maharashtra"),
            ("LKO", "Lucknow Charbagh", "Lucknow", "Uttar Pradesh"),
            ("CNB", "Kanpur Central", "Kanpur", "Uttar Pradesh"),
            ("BPL", "Bhopal Junction", "Bhopal", "Madhya Pradesh"),
            ("SUR", "Surat City", "Surat", "Gujarat")
        ]
        cursor.executemany('INSERT INTO stations (code, name, city, state) VALUES (?, ?, ?, ?)', seed_stations)
        conn.commit()

    # Seed Trains if empty
    cursor.execute('SELECT COUNT(*) FROM trains')
    if cursor.fetchone()[0] == 0:
        seed_trains = [
            (
                "12952", "New Delhi - Mumbai Tejas Rajdhani", "Superfast Tejas Express",
                "NDLS", "New Delhi Central", "BCT", "Mumbai Central",
                "16:55", "08:35", "15h 40m", "Daily",
                json.dumps([
                    {"code": "1A", "name": "AC First Class", "fare": 3480, "seats": 14, "status": "Available 8"},
                    {"code": "2A", "name": "AC 2-Tier", "fare": 2350, "seats": 48, "status": "Available 26"},
                    {"code": "3A", "name": "AC 3-Tier", "fare": 1620, "seats": 78, "status": "Available 45"}
                ]),
                4.9, 1, 1, 1384
            ),
            (
                "12951", "Mumbai - New Delhi Tejas Rajdhani", "Superfast Tejas Express",
                "BCT", "Mumbai Central", "NDLS", "New Delhi Central",
                "17:00", "08:32", "15h 32m", "Daily",
                json.dumps([
                    {"code": "1A", "name": "AC First Class", "fare": 3480, "seats": 16, "status": "Available 11"},
                    {"code": "2A", "name": "AC 2-Tier", "fare": 2350, "seats": 50, "status": "Available 30"},
                    {"code": "3A", "name": "AC 3-Tier", "fare": 1620, "seats": 80, "status": "Available 52"}
                ]),
                4.9, 1, 1, 1384
            ),
            (
                "22436", "Vande Bharat Bullet Express", "Semi-High Speed Bullet",
                "NDLS", "New Delhi Central", "BSB", "Varanasi Cantt",
                "06:00", "14:00", "08h 00m", "Tue, Wed, Fri, Sat, Sun",
                json.dumps([
                    {"code": "EC", "name": "Executive Luxury Class", "fare": 2750, "seats": 24, "status": "Available 15"},
                    {"code": "CC", "name": "AC Chair Car", "fare": 1750, "seats": 90, "status": "Available 62"}
                ]),
                4.9, 1, 1, 759
            ),
            (
                "20608", "Vande Bharat Express (South Coast)", "Semi-High Speed Bullet",
                "SBC", "KSR Bengaluru City", "MAS", "Chennai Central",
                "05:45", "10:10", "04h 25m", "Mon, Wed, Thu, Fri, Sat, Sun",
                json.dumps([
                    {"code": "EC", "name": "Executive Luxury Class", "fare": 1850, "seats": 32, "status": "Available 22"},
                    {"code": "CC", "name": "AC Chair Car", "fare": 1020, "seats": 110, "status": "Available 74"}
                ]),
                4.8, 1, 1, 359
            ),
            (
                "12051", "Jan Shatabdi Ocean Express", "Superfast Scenic Express",
                "BCT", "Mumbai Central", "GOA", "Madgaon Junction",
                "05:25", "14:05", "08h 40m", "Daily",
                json.dumps([
                    {"code": "CC", "name": "AC Chair Car", "fare": 1180, "seats": 60, "status": "Available 34"},
                    {"code": "2S", "name": "Second Seating", "fare": 350, "seats": 120, "status": "Available 80"}
                ]),
                4.7, 0, 1, 570
            ),
            (
                "12302", "Howrah New Delhi Rajdhani Express", "Superfast Rajdhani",
                "HWH", "Howrah Junction", "NDLS", "New Delhi Central",
                "16:50", "10:05", "17h 15m", "Daily",
                json.dumps([
                    {"code": "1A", "name": "AC First Class", "fare": 3650, "seats": 12, "status": "Available 6"},
                    {"code": "2A", "name": "AC 2-Tier", "fare": 2480, "seats": 44, "status": "Available 18"},
                    {"code": "3A", "name": "AC 3-Tier", "fare": 1720, "seats": 75, "status": "Available 40"}
                ]),
                4.8, 1, 1, 1450
            ),
            (
                "12626", "Kerala Grand Express", "Long Distance Superfast",
                "NDLS", "New Delhi Central", "MAS", "Chennai Central",
                "20:10", "04:30", "32h 20m", "Daily",
                json.dumps([
                    {"code": "2A", "name": "AC 2-Tier", "fare": 2890, "seats": 40, "status": "Available 19"},
                    {"code": "3A", "name": "AC 3-Tier", "fare": 1940, "seats": 80, "status": "Available 42"},
                    {"code": "SL", "name": "Sleeper Class", "fare": 760, "seats": 150, "status": "RAC 8"}
                ]),
                4.6, 1, 0, 2180
            ),
            (
                "12908", "Gujarat Sampark Kranti Express", "Superfast Express",
                "ADI", "Ahmedabad Junction", "BCT", "Mumbai Central",
                "07:15", "13:20", "06h 05m", "Daily",
                json.dumps([
                    {"code": "1A", "name": "AC First Class", "fare": 1820, "seats": 20, "status": "Available 14"},
                    {"code": "2A", "name": "AC 2-Tier", "fare": 1220, "seats": 55, "status": "Available 39"},
                    {"code": "3A", "name": "AC 3-Tier", "fare": 850, "seats": 90, "status": "Available 68"},
                    {"code": "CC", "name": "AC Chair Car", "fare": 690, "seats": 85, "status": "Available 50"}
                ]),
                4.8, 1, 1, 492
            ),
            (
                "22691", "Bengaluru Rajdhani Express", "Superfast Rajdhani",
                "SBC", "KSR Bengaluru City", "NDLS", "New Delhi Central",
                "20:00", "05:30", "33h 30m", "Daily",
                json.dumps([
                    {"code": "1A", "name": "AC First Class", "fare": 4350, "seats": 10, "status": "Available 4"},
                    {"code": "2A", "name": "AC 2-Tier", "fare": 3120, "seats": 36, "status": "Available 15"},
                    {"code": "3A", "name": "AC 3-Tier", "fare": 2180, "seats": 70, "status": "Available 33"}
                ]),
                4.7, 1, 1, 2365
            ),
            (
                "12137", "Punjab Mail Heritage Superfast", "Heritage Express",
                "BCT", "Mumbai Central", "JAT", "Jammu Tawi",
                "19:35", "06:10", "34h 35m", "Daily",
                json.dumps([
                    {"code": "2A", "name": "AC 2-Tier", "fare": 2780, "seats": 42, "status": "Available 20"},
                    {"code": "3A", "name": "AC 3-Tier", "fare": 1890, "seats": 84, "status": "Available 55"},
                    {"code": "SL", "name": "Sleeper Class", "fare": 710, "seats": 140, "status": "Available 60"}
                ]),
                4.6, 0, 1, 1925
            ),
            (
                "12004", "Lucknow Shatabdi Express", "Daytime High Speed",
                "NDLS", "New Delhi Central", "LKO", "Lucknow Charbagh",
                "06:10", "12:40", "06h 30m", "Daily",
                json.dumps([
                    {"code": "EC", "name": "Executive Luxury Class", "fare": 1950, "seats": 28, "status": "Available 18"},
                    {"code": "CC", "name": "AC Chair Car", "fare": 1160, "seats": 110, "status": "Available 75"}
                ]),
                4.8, 1, 1, 513
            ),
            (
                "12246", "Howrah - Bengaluru Duronto Express", "Non-Stop High Speed",
                "HWH", "Howrah Junction", "SBC", "KSR Bengaluru City",
                "10:50", "16:00", "29h 10m", "Tue, Wed, Fri, Sun",
                json.dumps([
                    {"code": "1A", "name": "AC First Class", "fare": 3950, "seats": 12, "status": "Available 7"},
                    {"code": "2A", "name": "AC 2-Tier", "fare": 2680, "seats": 40, "status": "Available 21"},
                    {"code": "3A", "name": "AC 3-Tier", "fare": 1850, "seats": 75, "status": "Available 44"},
                    {"code": "SL", "name": "Sleeper Class", "fare": 690, "seats": 120, "status": "Available 35"}
                ]),
                4.7, 1, 1, 1944
            )
        ]
        cursor.executemany('''
        INSERT INTO trains (
            train_no, train_name, train_type, source_code, source_name,
            dest_code, dest_name, departure_time, arrival_time, duration,
            days_running, classes_data, rating, food_included, wifi_available, distance_km
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', seed_trains)
        conn.commit()

    # Seed intermediate stops for 12952 (NDLS -> BCT)
    cursor.execute('SELECT COUNT(*) FROM train_routes')
    if cursor.fetchone()[0] == 0:
        routes_data = [
            # 12952 NDLS to BCT
            ("12952", 1, "NDLS", "New Delhi Central", "Source", "16:55", 0, 0),
            ("12952", 2, "CNB", "Kanpur Central", "20:30", "20:35", 5, 440),
            ("12952", 3, "BPL", "Bhopal Junction", "00:15", "00:20", 5, 700),
            ("12952", 4, "SUR", "Surat City", "05:40", "05:45", 5, 1120),
            ("12952", 5, "BCT", "Mumbai Central", "08:35", "Destination", 0, 1384),

            # 22436 NDLS to VSB
            ("22436", 1, "NDLS", "New Delhi Central", "Source", "06:00", 0, 0),
            ("22436", 2, "CNB", "Kanpur Central", "10:08", "10:10", 2, 440),
            ("22436", 3, "PNBE", "Prayagraj Junction", "12:08", "12:10", 2, 634),
            ("22436", 4, "BSB", "Varanasi Cantt", "14:00", "Destination", 0, 759),

            # 20608 SBC to MAS
            ("20608", 1, "SBC", "KSR Bengaluru City", "Source", "05:45", 0, 0),
            ("20608", 2, "KJM", "Krishnarajapuram", "06:00", "06:02", 2, 14),
            ("20608", 3, "KPD", "Katpadi Junction", "08:28", "08:30", 2, 229),
            ("20608", 4, "MAS", "Chennai Central", "10:10", "Destination", 0, 359),

            # 12051 BCT to GOA
            ("12051", 1, "BCT", "Mumbai Central", "Source", "05:25", 0, 0),
            ("12051", 2, "TNA", "Thane Junction", "06:00", "06:02", 2, 34),
            ("12051", 3, "RN", "Ratnagiri", "10:15", "10:20", 5, 335),
            ("12051", 4, "GOA", "Madgaon Junction", "14:05", "Destination", 0, 570)
        ]
        cursor.executemany('''
        INSERT INTO train_routes (
            train_no, stop_order, station_code, station_name,
            arrival_time, departure_time, halt_mins, distance_km
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', routes_data)
        conn.commit()

    # Seed 2 Sample Bookings for showcase
    cursor.execute('SELECT COUNT(*) FROM bookings')
    if cursor.fetchone()[0] == 0:
        sample_passengers = [
            {"name": "Alex Carter", "age": 29, "gender": "Male", "berth": "Lower Berth", "seat": "B2-14"},
            {"name": "Sophia Carter", "age": 27, "gender": "Female", "berth": "Window Seat", "seat": "B2-15"}
        ]
        sample_date = (datetime.now() + timedelta(days=2)).strftime('%Y-%m-%d')
        cursor.execute('''
        INSERT INTO bookings (
            pnr, train_no, train_name, source_code, source_name,
            dest_code, dest_name, travel_date, travel_class, class_name,
            passengers_data, total_fare, contact_name, contact_email,
            contact_phone, coach_assigned, payment_method, status, booking_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            "8492041235", "12952", "New Delhi - Mumbai Tejas Rajdhani",
            "NDLS", "New Delhi Central", "BCT", "Mumbai Central",
            sample_date, "2A", "AC 2-Tier",
            json.dumps(sample_passengers), 4700.0,
            "Alex Carter", "alex.carter@example.com", "+1 (555) 382-9912",
            "Coach B2", "RailPay UPI", "CONFIRMED",
            datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        ))
        conn.commit()

    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully.")
