from flask import Flask, render_template, request, jsonify
import sqlite3
import json
import random
import os
from datetime import datetime
from database import get_db, init_db

app = Flask(__name__, static_folder='static', template_folder='templates')

# Ensure DB is created on startup
init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/stations', methods=['GET'])
def get_stations():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT code, name, city, state FROM stations ORDER BY city ASC')
    rows = cursor.fetchall()
    stations = [dict(row) for row in rows]
    conn.close()
    return jsonify({"success": True, "stations": stations})

@app.route('/api/trains', methods=['GET'])
def search_trains():
    from_code = request.args.get('from', '').strip().upper()
    to_code = request.args.get('to', '').strip().upper()
    travel_class = request.args.get('class', '').strip().upper()

    conn = get_db()
    cursor = conn.cursor()

    if from_code and to_code:
        # Search exact source and dest
        cursor.execute('''
        SELECT * FROM trains 
        WHERE (source_code = ? AND dest_code = ?)
           OR (source_code = ? AND dest_code = ?)
        ''', (from_code, to_code, to_code, from_code))
        rows = cursor.fetchall()

        exact_match = True
        # If no direct match, check if any trains serve this route or return all trains as suggestions
        if not rows:
            exact_match = False
            cursor.execute('SELECT * FROM trains ORDER BY rating DESC')
            rows = cursor.fetchall()
    else:
        exact_match = True
        cursor.execute('SELECT * FROM trains ORDER BY train_no ASC')
        rows = cursor.fetchall()

    trains = []
    for r in rows:
        t = dict(r)
        t['classes'] = json.loads(t['classes_data'])
        # Filter by class if requested
        if travel_class and travel_class != 'ALL':
            matched = any(c['code'] == travel_class for c in t['classes'])
            if not matched:
                continue
        trains.append(t)

    conn.close()
    return jsonify({
        "success": True, 
        "exact_match": exact_match, 
        "count": len(trains), 
        "trains": trains
    })

@app.route('/api/trains/<train_no>', methods=['GET'])
def get_train_details(train_no):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM trains WHERE train_no = ?', (train_no,))
    train_row = cursor.fetchone()
    if not train_row:
        conn.close()
        return jsonify({"success": False, "message": "Train not found"}), 404

    train = dict(train_row)
    train['classes'] = json.loads(train['classes_data'])

    cursor.execute('''
    SELECT * FROM train_routes 
    WHERE train_no = ? 
    ORDER BY stop_order ASC
    ''', (train_no,))
    route_rows = cursor.fetchall()
    train['route'] = [dict(r) for r in route_rows]

    conn.close()
    return jsonify({"success": True, "train": train})

@app.route('/api/trains/<train_no>/route', methods=['GET'])
def get_train_route(train_no):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
    SELECT stop_order, station_code, station_name, arrival_time, departure_time, halt_mins, distance_km 
    FROM train_routes 
    WHERE train_no = ? 
    ORDER BY stop_order ASC
    ''', (train_no,))
    routes = [dict(r) for r in cursor.fetchall()]

    # If no custom intermediate route exists in DB, construct an intuitive 4-stop itinerary
    if not routes:
        cursor.execute('SELECT source_code, source_name, dest_code, dest_name, departure_time, arrival_time, distance_km FROM trains WHERE train_no = ?', (train_no,))
        tr = cursor.fetchone()
        if tr:
            routes = [
                {
                    "stop_order": 1,
                    "station_code": tr['source_code'],
                    "station_name": tr['source_name'],
                    "arrival_time": "Source",
                    "departure_time": tr['departure_time'],
                    "halt_mins": 0,
                    "distance_km": 0
                },
                {
                    "stop_order": 2,
                    "station_code": "MID1",
                    "station_name": "Midway Junction",
                    "arrival_time": "12:15",
                    "departure_time": "12:20",
                    "halt_mins": 5,
                    "distance_km": int(tr['distance_km'] * 0.45)
                },
                {
                    "stop_order": 3,
                    "station_code": "MID2",
                    "station_name": "Riverside Station",
                    "arrival_time": "15:40",
                    "departure_time": "15:45",
                    "halt_mins": 5,
                    "distance_km": int(tr['distance_km'] * 0.75)
                },
                {
                    "stop_order": 4,
                    "station_code": tr['dest_code'],
                    "station_name": tr['dest_name'],
                    "arrival_time": tr['arrival_time'],
                    "departure_time": "Destination",
                    "halt_mins": 0,
                    "distance_km": tr['distance_km']
                }
            ]

    conn.close()
    return jsonify({"success": True, "train_no": train_no, "route": routes})

@app.route('/api/book', methods=['POST'])
def book_ticket():
    data = request.get_json() or {}
    train_no = data.get('train_no')
    travel_date = data.get('travel_date')
    travel_class = data.get('travel_class')
    passengers = data.get('passengers', [])
    contact = data.get('contact', {})
    payment_method = data.get('payment_method', 'RailPay UPI')

    if not train_no or not travel_date or not travel_class or not passengers:
        return jsonify({"success": False, "message": "Missing required booking details."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM trains WHERE train_no = ?', (train_no,))
    train = cursor.fetchone()
    if not train:
        conn.close()
        return jsonify({"success": False, "message": "Train not found."}), 404

    classes = json.loads(train['classes_data'])
    selected_class_info = next((c for c in classes if c['code'] == travel_class), None)
    base_fare = selected_class_info['fare'] if selected_class_info else 1200
    class_name = selected_class_info['name'] if selected_class_info else travel_class

    # Generate coach code
    coach_prefixes = {"1A": "H", "2A": "A", "3A": "B", "SL": "S", "CC": "C", "EC": "E", "2S": "D"}
    coach_prefix = coach_prefixes.get(travel_class, "B")
    coach_num = random.randint(1, 4)
    coach_code = f"Coach {coach_prefix}{coach_num}"

    # Generate seats for each passenger
    assigned_passengers = []
    start_seat = random.randint(12, 55)
    berths = ["Lower Berth", "Upper Berth", "Middle Berth", "Side Lower", "Window Seat", "Aisle Seat"]

    for i, p in enumerate(passengers):
        preferred_berth = p.get('berth') or random.choice(berths)
        assigned_seat = f"{coach_prefix}{coach_num}-{start_seat + i}"
        assigned_passengers.append({
            "name": p.get('name', f"Passenger {i+1}"),
            "age": p.get('age', 28),
            "gender": p.get('gender', 'Male'),
            "berth": preferred_berth,
            "seat": assigned_seat,
            "status": "CONFIRMED"
        })

    # Calculations
    total_base = base_fare * len(passengers)
    taxes = round(total_base * 0.05, 2)  # 5% tax
    service_fee = 35.0
    grand_total = round(total_base + taxes + service_fee, 2)

    # Generate unique 10-digit PNR
    pnr = str(random.randint(2000000000, 9999999999))
    booking_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    contact_name = contact.get('name') or assigned_passengers[0]['name']
    contact_email = contact.get('email', 'guest@railpulse.express')
    contact_phone = contact.get('phone', '+1 (555) 019-2831')

    cursor.execute('''
    INSERT INTO bookings (
        pnr, train_no, train_name, source_code, source_name,
        dest_code, dest_name, travel_date, travel_class, class_name,
        passengers_data, total_fare, contact_name, contact_email,
        contact_phone, coach_assigned, payment_method, status, booking_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        pnr, train['train_no'], train['train_name'], train['source_code'], train['source_name'],
        train['dest_code'], train['dest_name'], travel_date, travel_class, class_name,
        json.dumps(assigned_passengers), grand_total, contact_name, contact_email,
        contact_phone, coach_code, payment_method, "CONFIRMED", booking_time
    ))
    conn.commit()

    # Retrieve created booking
    cursor.execute('SELECT * FROM bookings WHERE pnr = ?', (pnr,))
    saved_row = cursor.fetchone()
    booking_dict = dict(saved_row)
    booking_dict['passengers'] = json.loads(booking_dict['passengers_data'])
    conn.close()

    return jsonify({
        "success": True,
        "message": "Booking confirmed successfully!",
        "pnr": pnr,
        "booking": booking_dict
    })

@app.route('/api/pnr/<pnr>', methods=['GET'])
def get_pnr_status(pnr):
    pnr_clean = pnr.strip()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM bookings WHERE pnr = ?', (pnr_clean,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return jsonify({"success": False, "message": f"PNR {pnr_clean} not found. Please check the 10-digit number."}), 404

    booking = dict(row)
    booking['passengers'] = json.loads(booking['passengers_data'])
    conn.close()
    return jsonify({"success": True, "booking": booking})

@app.route('/api/bookings', methods=['GET'])
def get_all_bookings():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM bookings ORDER BY id DESC')
    rows = cursor.fetchall()
    bookings = []
    for r in rows:
        b = dict(r)
        b['passengers'] = json.loads(b['passengers_data'])
        bookings.append(b)
    conn.close()
    return jsonify({"success": True, "bookings": bookings})

@app.route('/api/cancel', methods=['POST'])
def cancel_booking():
    data = request.get_json() or {}
    pnr = data.get('pnr', '').strip()
    if not pnr:
        return jsonify({"success": False, "message": "PNR is required for cancellation."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM bookings WHERE pnr = ?', (pnr,))
    booking = cursor.fetchone()
    if not booking:
        conn.close()
        return jsonify({"success": False, "message": f"Booking with PNR {pnr} not found."}), 404

    if booking['status'] == 'CANCELLED':
        conn.close()
        return jsonify({"success": False, "message": "This ticket is already cancelled."}), 400

    # Refund calculation (90% refund, 10% cancellation fee)
    fare = float(booking['total_fare'])
    cancellation_fee = round(fare * 0.10, 2)
    refund_amount = round(fare - cancellation_fee, 2)

    cursor.execute("UPDATE bookings SET status = 'CANCELLED' WHERE pnr = ?", (pnr,))
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "message": f"Ticket #{pnr} has been cancelled successfully.",
        "refund_amount": refund_amount,
        "cancellation_fee": cancellation_fee
    })

@app.route('/api/live-status/<train_no>', methods=['GET'])
def get_live_status(train_no):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM trains WHERE train_no = ?', (train_no,))
    train = cursor.fetchone()
    if not train:
        conn.close()
        return jsonify({"success": False, "message": "Train not found"}), 404

    cursor.execute('SELECT * FROM train_routes WHERE train_no = ? ORDER BY stop_order ASC', (train_no,))
    stops = [dict(s) for s in cursor.fetchall()]
    conn.close()

    # Dynamic simulation of live location based on current minute
    curr_min = datetime.now().minute
    progress_pct = (curr_min * 3) % 85 + 10  # between 10% and 95%
    speed_kmh = random.choice([110, 118, 125, 130, 145, 160])
    delay_options = ["On Time", "5 mins delay", "10 mins delay", "Right Time", "2 mins ahead"]
    status_text = delay_options[curr_min % len(delay_options)]

    return jsonify({
        "success": True,
        "train_no": train['train_no'],
        "train_name": train['train_name'],
        "source": train['source_name'],
        "destination": train['dest_name'],
        "departure_time": train['departure_time'],
        "arrival_time": train['arrival_time'],
        "current_speed": f"{speed_kmh} km/h",
        "progress_pct": progress_pct,
        "delay_status": status_text,
        "is_delayed": "delay" in status_text.lower(),
        "last_updated": datetime.now().strftime('%H:%M:%S'),
        "stops": stops
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Server starting on http://127.0.0.1:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
