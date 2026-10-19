import json
from app import app

def run_tests():
    client = app.test_client()

    print("[1/8] Testing GET / (Homepage)...")
    res = client.get('/')
    assert res.status_code == 200, f"Failed: {res.status_code}"
    print(" -> PASSED: Homepage rendered successfully.")

    print("[2/8] Testing GET /api/stations...")
    res = client.get('/api/stations')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] and len(data['stations']) > 0
    print(f" -> PASSED: Found {len(data['stations'])} stations.")

    print("[3/8] Testing GET /api/trains?from=NDLS&to=BCT...")
    res = client.get('/api/trains?from=NDLS&to=BCT')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] and len(data['trains']) > 0
    print(f" -> PASSED: Found {len(data['trains'])} direct trains.")

    print("[4/8] Testing GET /api/trains/12952/route...")
    res = client.get('/api/trains/12952/route')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] and len(data['route']) > 0
    print(f" -> PASSED: Route has {len(data['route'])} stops.")

    print("[5/8] Testing GET /api/pnr/8492041235...")
    res = client.get('/api/pnr/8492041235')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] and data['booking']['pnr'] == '8492041235'
    print(f" -> PASSED: PNR lookup found train: {data['booking']['train_name']}.")

    print("[6/8] Testing POST /api/book...")
    book_payload = {
        'train_no': '22436',
        'travel_date': '2026-10-25',
        'travel_class': 'CC',
        'passengers': [
            {'name': 'Jane Doe', 'age': 25, 'gender': 'Female', 'berth': 'Window Seat'},
            {'name': 'John Doe', 'age': 28, 'gender': 'Male', 'berth': 'Aisle Seat'}
        ],
        'contact': {'name': 'Jane Doe', 'email': 'jane@example.com', 'phone': '+91 99999 88888'},
        'payment_method': 'RailPay UPI'
    }
    res = client.post('/api/book', json=book_payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] and 'pnr' in data
    new_pnr = data['pnr']
    print(f" -> PASSED: Ticket booked successfully. PNR: {new_pnr}, Grand Total: INR {data['booking']['total_fare']}.")

    print("[7/8] Testing POST /api/cancel...")
    res = client.post('/api/cancel', json={'pnr': new_pnr})
    assert res.status_code == 200
    data = res.get_json()
    assert data['success']
    print(f" -> PASSED: Ticket cancelled. Refund Amount: INR {data['refund_amount']}.")

    print("[8/8] Testing GET /api/live-status/22436...")
    res = client.get('/api/live-status/22436')
    assert res.status_code == 200
    data = res.get_json()
    assert data['success'] and 'current_speed' in data
    print(f" -> PASSED: Live speed: {data['current_speed']}, Delay: {data['delay_status']}.")

    print("\n==========================================")
    print(" ALL 8 BACKEND API TESTS COMPLETED 100%! ")
    print("==========================================")

if __name__ == '__main__':
    run_tests()
