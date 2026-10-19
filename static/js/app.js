/**
 * RailPulse Express - Modern Client-Side Controller
 */

// Application State
let appState = {
    stations: [],
    trains: [],
    currentSearchResults: [],
    selectedTrain: null,
    selectedClass: null,
    passengers: [{ name: '', age: '', gender: 'Male', berth: 'Lower Berth' }],
    selectedSeats: []
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    initDatePicker();
    loadStations();
    loadAllTrains();
    setupEventListeners();
});

/* ==========================================================================
   1. Clocks & Date Helpers
   ========================================================================== */
function initClock() {
    function update() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
        const clockEl = document.getElementById('railway-clock');
        if (clockEl) clockEl.textContent = timeStr;
    }
    update();
    setInterval(update, 1000);
}

function initDatePicker() {
    const dateInput = document.getElementById('journeyDate');
    if (!dateInput) return;
    
    const today = new Date();
    // Default to tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const formatDate = (d) => d.toISOString().split('T')[0];
    dateInput.min = formatDate(today);
    dateInput.value = formatDate(tomorrow);
}

/* ==========================================================================
   2. Data Loading (Stations & Trains)
   ========================================================================== */
async function loadStations() {
    try {
        const res = await fetch('/api/stations');
        const data = await res.json();
        if (data.success) {
            appState.stations = data.stations;
            populateStationDropdowns(data.stations);
        }
    } catch (err) {
        console.error('Failed to load stations:', err);
        showToast('Unable to load station database.', 'error');
    }
}

function populateStationDropdowns(stations) {
    const fromSelect = document.getElementById('fromStation');
    const toSelect = document.getElementById('toStation');
    
    if (!fromSelect || !toSelect) return;
    
    // Clear existing except first disabled option
    fromSelect.innerHTML = '<option value="" disabled selected>Select Origin Station</option>';
    toSelect.innerHTML = '<option value="" disabled selected>Select Destination</option>';
    
    stations.forEach(s => {
        const optFrom = document.createElement('option');
        optFrom.value = s.code;
        optFrom.textContent = `${s.city} (${s.code}) - ${s.name}`;
        fromSelect.appendChild(optFrom);

        const optTo = document.createElement('option');
        optTo.value = s.code;
        optTo.textContent = `${s.city} (${s.code}) - ${s.name}`;
        toSelect.appendChild(optTo);
    });

    // Default select
    fromSelect.value = 'NDLS';
    toSelect.value = 'BCT';
}

async function loadAllTrains() {
    try {
        const res = await fetch('/api/trains');
        const data = await res.json();
        if (data.success) {
            appState.trains = data.trains;
            populateLiveTrainDropdown(data.trains);
            // Pre-display trains on page load
            renderTrainCards(data.trains, true);
        }
    } catch (err) {
        console.error('Failed to load trains:', err);
    }
}

function populateLiveTrainDropdown(trains) {
    const select = document.getElementById('liveTrainSelect');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>Choose a train to track...</option>';
    trains.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.train_no;
        opt.textContent = `${t.train_no} - ${t.train_name} (${t.source_code} ➔ ${t.dest_code})`;
        select.appendChild(opt);
    });
}

/* ==========================================================================
   3. Search & Route Helpers
   ========================================================================== */
function swapStations() {
    const fromSelect = document.getElementById('fromStation');
    const toSelect = document.getElementById('toStation');
    const temp = fromSelect.value;
    fromSelect.value = toSelect.value;
    toSelect.value = temp;
}

function quickSelectRoute(fromCode, toCode) {
    const fromSelect = document.getElementById('fromStation');
    const toSelect = document.getElementById('toStation');
    fromSelect.value = fromCode;
    toSelect.value = toCode;
    switchTab('search-tab');
    handleTrainSearch(new Event('submit'));
}

async function handleTrainSearch(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const fromCode = document.getElementById('fromStation').value;
    const toCode = document.getElementById('toStation').value;
    const travelClass = document.getElementById('travelClass').value;
    const date = document.getElementById('journeyDate').value;

    if (!fromCode || !toCode) {
        showToast('Please select both Origin and Destination stations.', 'error');
        return;
    }

    if (fromCode === toCode) {
        showToast('Origin and Destination cannot be the same station.', 'error');
        return;
    }

    const submitBtn = document.getElementById('searchSubmitBtn');
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Searching...';
    submitBtn.disabled = true;

    try {
        const res = await fetch(`/api/trains?from=${fromCode}&to=${toCode}&class=${travelClass}`);
        const data = await res.json();
        
        submitBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Search Trains';
        submitBtn.disabled = false;

        if (data.success) {
            appState.currentSearchResults = data.trains;
            renderTrainCards(data.trains, data.exact_match);
            
            // Scroll down smoothly to results
            const resultsSection = document.getElementById('resultsSection');
            resultsSection.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });

            if (data.exact_match) {
                showToast(`Found ${data.count} direct train(s) for your selected route!`, 'success');
            } else {
                showToast(`No direct trains for this pairing today. Showing ${data.count} popular express options.`, 'info');
            }
        }
    } catch (err) {
        submitBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Search Trains';
        submitBtn.disabled = false;
        console.error('Search error:', err);
        showToast('Error searching for trains. Please try again.', 'error');
    }
}

/* ==========================================================================
   4. Render Train Cards
   ========================================================================== */
function renderTrainCards(trains, isExactMatch = true) {
    const container = document.getElementById('trainsList');
    const resultsSection = document.getElementById('resultsSection');
    const subtitle = document.getElementById('resultsSubtitle');
    
    if (!container) return;
    resultsSection.style.display = 'block';

    if (!isExactMatch) {
        subtitle.innerHTML = '<span style="color: #f59e0b;"><i class="fa-solid fa-circle-info"></i> Direct route not found for this specific pairing. Displaying all available premium express trains below:</span>';
    } else {
        subtitle.textContent = `Showing live scheduled trains with confirmed seat availability`;
    }

    if (!trains || trains.length === 0) {
        container.innerHTML = `
            <div class="text-center" style="padding: 3rem; background: var(--bg-card); border-radius: var(--radius-md);">
                <i class="fa-solid fa-train fa-3x" style="color: var(--text-muted); margin-bottom: 1rem;"></i>
                <h3>No Trains Found</h3>
                <p style="color: var(--text-secondary);">Try adjusting your date or travel class filter.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = trains.map(train => {
        const classesHtml = train.classes.map((cls, idx) => `
            <div class="class-card ${idx === 0 ? 'selected' : ''}" 
                 onclick="selectClassForTrain(event, '${train.train_no}', '${cls.code}', ${cls.fare}, '${cls.name}')">
                <div class="class-code">
                    <span>${cls.code}</span>
                    <i class="fa-solid fa-chevron-right" style="font-size: 0.7rem;"></i>
                </div>
                <div class="class-fare">₹${cls.fare.toLocaleString()}</div>
                <span class="class-status ${cls.status.includes('RAC') ? 'status-rac' : 'status-available'}">
                    ${cls.status}
                </span>
            </div>
        `).join('');

        return `
            <div class="train-card" id="train-card-${train.train_no}">
                <!-- Header Row -->
                <div class="train-header-row">
                    <div class="train-identity">
                        <span class="train-name-badge">${train.train_name}</span>
                        <span class="train-number-tag">#${train.train_no}</span>
                        <span class="train-type-pill">${train.train_type}</span>
                        <span class="train-run-days"><i class="fa-regular fa-calendar"></i> Runs: ${train.days_running}</span>
                    </div>
                    <div class="train-rating-badge">
                        <i class="fa-solid fa-star"></i> ${train.rating}
                    </div>
                </div>

                <!-- Timeline Row -->
                <div class="train-timeline-row">
                    <div class="time-box">
                        <h3>${train.departure_time}</h3>
                        <div class="station-title">${train.source_name}</div>
                        <div class="station-code">${train.source_code}</div>
                    </div>

                    <div class="journey-path">
                        <div class="duration-tag">${train.duration}</div>
                        <div class="track-animation">
                            <div class="track-line"></div>
                            <div class="track-train-icon"><i class="fa-solid fa-train"></i></div>
                        </div>
                        <div class="distance-tag">${train.distance_km} KM • High Speed</div>
                    </div>

                    <div class="time-box text-right">
                        <h3>${train.arrival_time}</h3>
                        <div class="station-title">${train.dest_name}</div>
                        <div class="station-code">${train.dest_code}</div>
                    </div>
                </div>

                <!-- Classes Grid -->
                <div class="classes-grid">
                    ${classesHtml}
                </div>

                <!-- Bottom Amenities & Actions -->
                <div class="card-bottom-actions">
                    <div class="amenities-list">
                        ${train.food_included ? '<span class="amenity-tag"><i class="fa-solid fa-utensils"></i> Food Included</span>' : ''}
                        ${train.wifi_available ? '<span class="amenity-tag"><i class="fa-solid fa-wifi"></i> 5G Wi-Fi</span>' : ''}
                        <span class="amenity-tag"><i class="fa-solid fa-charging-station"></i> Power Sockets</span>
                        <span class="amenity-tag"><i class="fa-solid fa-shield-virus"></i> Sanitized</span>
                    </div>

                    <div class="action-buttons">
                        <button class="btn btn-secondary btn-sm" onclick="viewTrainRoute('${train.train_no}')">
                            <i class="fa-solid fa-route"></i> Route Stops
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="openSeatPicker('${train.train_no}')">
                            <i class="fa-solid fa-couch"></i> Seat Map
                        </button>
                        <button class="btn btn-primary btn-sm" onclick="initiateBooking('${train.train_no}')">
                            <i class="fa-solid fa-ticket"></i> Book Ticket
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function selectClassForTrain(event, trainNo, classCode, fare, className) {
    const card = document.getElementById(`train-card-${trainNo}`);
    if (!card) return;
    const classCards = card.querySelectorAll('.class-card');
    classCards.forEach(c => c.classList.remove('selected'));
    
    const target = event.currentTarget;
    if (target) target.classList.add('selected');

    // Update state
    appState.selectedClass = { code: classCode, fare: fare, name: className };
}

/* ==========================================================================
   5. Sorting Filter
   ========================================================================== */
function applySorting() {
    const sortBy = document.getElementById('sortBy').value;
    let list = [...(appState.currentSearchResults.length ? appState.currentSearchResults : appState.trains)];
    
    if (sortBy === 'departure') {
        list.sort((a, b) => a.departure_time.localeCompare(b.departure_time));
    } else if (sortBy === 'duration') {
        list.sort((a, b) => a.duration.localeCompare(b.duration));
    } else if (sortBy === 'fare') {
        list.sort((a, b) => a.classes[0].fare - b.classes[0].fare);
    } else if (sortBy === 'rating') {
        list.sort((a, b) => b.rating - a.rating);
    }
    
    renderTrainCards(list, true);
}

/* ==========================================================================
   6. Booking Flow & Checkout
   ========================================================================== */
function initiateBooking(trainNo) {
    const train = (appState.currentSearchResults.length ? appState.currentSearchResults : appState.trains)
        .find(t => t.train_no === trainNo);

    if (!train) {
        showToast('Train details not found.', 'error');
        return;
    }

    appState.selectedTrain = train;
    
    // Default class if not set
    if (!appState.selectedClass) {
        const defaultClass = train.classes[0];
        appState.selectedClass = { code: defaultClass.code, fare: defaultClass.fare, name: defaultClass.name };
    }

    // Populate modal summary
    document.getElementById('modalTrainTitle').textContent = `${train.train_no} - ${train.train_name}`;
    document.getElementById('modalSource').textContent = `${train.source_code} (${train.departure_time})`;
    document.getElementById('modalDest').textContent = `${train.dest_code} (${train.arrival_time})`;
    document.getElementById('modalDuration').textContent = train.duration;
    
    const quota = document.getElementById('quotaType').value;
    document.getElementById('modalClassBadge').textContent = `${appState.selectedClass.code} (${appState.selectedClass.name}) • ${quota} Quota`;

    // Reset passenger state with 1 default passenger
    appState.passengers = [{ name: '', age: '', gender: 'Male', berth: 'Lower Berth' }];
    renderPassengerInputs();
    updateFareBreakdown();

    // Open Modal
    openModal('bookingModal');
}

function renderPassengerInputs() {
    const container = document.getElementById('passengersContainer');
    if (!container) return;

    container.innerHTML = appState.passengers.map((p, idx) => `
        <div class="passenger-row" id="pass-row-${idx}">
            <div class="form-group">
                <input type="text" class="form-control" placeholder="Full Name (as on ID)" value="${p.name}" 
                       oninput="updatePassengerData(${idx}, 'name', this.value)" required>
            </div>
            <div class="form-group">
                <input type="number" class="form-control" placeholder="Age" min="1" max="110" value="${p.age}"
                       oninput="updatePassengerData(${idx}, 'age', this.value)" required>
            </div>
            <div class="form-group">
                <select class="form-control" onchange="updatePassengerData(${idx}, 'gender', this.value)">
                    <option value="Male" ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
                    <option value="Female" ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
                    <option value="Other" ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
                </select>
            </div>
            <div class="form-group">
                <select class="form-control" onchange="updatePassengerData(${idx}, 'berth', this.value)">
                    <option value="Lower Berth" ${p.berth === 'Lower Berth' ? 'selected' : ''}>Lower Berth</option>
                    <option value="Upper Berth" ${p.berth === 'Upper Berth' ? 'selected' : ''}>Upper Berth</option>
                    <option value="Middle Berth" ${p.berth === 'Middle Berth' ? 'selected' : ''}>Middle Berth</option>
                    <option value="Side Lower" ${p.berth === 'Side Lower' ? 'selected' : ''}>Side Lower</option>
                    <option value="Window Seat" ${p.berth === 'Window Seat' ? 'selected' : ''}>Window Seat</option>
                </select>
            </div>
            <div>
                ${idx > 0 ? `
                    <button type="button" class="btn btn-secondary btn-sm" onclick="removePassengerField(${idx})" title="Remove Passenger">
                        <i class="fa-solid fa-trash-can" style="color: var(--danger);"></i>
                    </button>
                ` : `
                    <span style="color: var(--text-muted); font-size: 0.75rem;">Lead</span>
                `}
            </div>
        </div>
    `).join('');
}

function updatePassengerData(index, field, value) {
    if (appState.passengers[index]) {
        appState.passengers[index][field] = value;
        // Auto-fill lead contact name
        if (index === 0 && field === 'name') {
            const contactInput = document.getElementById('contactName');
            if (contactInput && !contactInput.value) contactInput.value = value;
        }
    }
}

function addPassengerField() {
    if (appState.passengers.length >= 6) {
        showToast('Maximum 6 passengers allowed per booking slip.', 'info');
        return;
    }
    appState.passengers.push({ name: '', age: '', gender: 'Male', berth: 'Window Seat' });
    renderPassengerInputs();
    updateFareBreakdown();
}

function removePassengerField(index) {
    if (appState.passengers.length <= 1) return;
    appState.passengers.splice(index, 1);
    renderPassengerInputs();
    updateFareBreakdown();
}

function updateFareBreakdown() {
    if (!appState.selectedClass) return;
    
    const count = appState.passengers.length;
    const baseUnitFare = appState.selectedClass.fare;
    const totalBase = baseUnitFare * count;
    const taxes = Math.round(totalBase * 0.05);
    const fee = 35;
    const grandTotal = totalBase + taxes + fee;

    document.getElementById('farePassengerCount').textContent = count;
    document.getElementById('fareBaseAmount').textContent = `₹${totalBase.toLocaleString()}`;
    document.getElementById('fareTaxes').textContent = `₹${taxes.toLocaleString()}`;
    document.getElementById('fareFee').textContent = `₹${fee.toLocaleString()}`;
    document.getElementById('fareGrandTotal').textContent = `₹${grandTotal.toLocaleString()}`;
}

async function submitBooking() {
    // Validate passengers
    for (let i = 0; i < appState.passengers.length; i++) {
        const p = appState.passengers[i];
        if (!p.name || !p.age) {
            showToast(`Please enter passenger name and age for Passenger #${i+1}.`, 'error');
            return;
        }
    }

    const contactName = document.getElementById('contactName').value.trim() || appState.passengers[0].name;
    const contactEmail = document.getElementById('contactEmail').value.trim() || 'passenger@railpulse.express';
    const contactPhone = document.getElementById('contactPhone').value.trim() || '+91 98765 43210';
    const travelDate = document.getElementById('journeyDate').value;
    const payMethod = document.querySelector('input[name="payMethod"]:checked')?.value || 'RailPay UPI';

    const payBtn = document.getElementById('confirmPayBtn');
    payBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing Payment...';
    payBtn.disabled = true;

    try {
        const payload = {
            train_no: appState.selectedTrain.train_no,
            travel_date: travelDate,
            travel_class: appState.selectedClass.code,
            passengers: appState.passengers,
            contact: {
                name: contactName,
                email: contactEmail,
                phone: contactPhone
            },
            payment_method: payMethod
        };

        const res = await fetch('/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        payBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Pay & Confirm Ticket';
        payBtn.disabled = false;

        if (data.success) {
            closeModal('bookingModal');
            showToast(`Ticket Confirmed! PNR: ${data.pnr}`, 'success');
            displayTicketBoardingPass(data.booking);
            // Refresh bookings tab data
            loadUserBookings();
        } else {
            showToast(data.message || 'Booking failed.', 'error');
        }
    } catch (err) {
        payBtn.innerHTML = '<i class="fa-solid fa-lock"></i> Pay & Confirm Ticket';
        payBtn.disabled = false;
        console.error('Booking submission error:', err);
        showToast('Payment system timeout. Please retry.', 'error');
    }
}

/* ==========================================================================
   7. Printable E-Ticket Modal
   ========================================================================== */
function displayTicketBoardingPass(booking) {
    document.getElementById('ticketPnr').textContent = booking.pnr;
    document.getElementById('ticketTrainName').textContent = `${booking.train_no} - ${booking.train_name}`;
    document.getElementById('ticketDate').textContent = booking.travel_date;
    document.getElementById('ticketSource').textContent = `${booking.source_name} (${booking.source_code})`;
    document.getElementById('ticketDest').textContent = `${booking.dest_name} (${booking.dest_code})`;
    document.getElementById('ticketClass').textContent = `${booking.class_name} • ${booking.coach_assigned}`;
    document.getElementById('ticketFare').textContent = `₹${booking.total_fare.toLocaleString()}`;

    const tbody = document.getElementById('ticketPassengerRows');
    tbody.innerHTML = booking.passengers.map((p, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><strong>${p.name}</strong></td>
            <td>${p.age}</td>
            <td>${p.gender}</td>
            <td><span class="badge-class" style="font-size:0.75rem;">${p.seat} (${p.berth})</span></td>
            <td><span class="status-available">${p.status || 'CONFIRMED'}</span></td>
        </tr>
    `).join('');

    openModal('ticketModal');
}

function printTicket() {
    window.print();
}

/* ==========================================================================
   8. Coach Seat Map Visualizer
   ========================================================================== */
function openSeatPicker(trainNo) {
    const train = (appState.trains || []).find(t => t.train_no === trainNo);
    if (!train) return;

    document.getElementById('seatCoachTitle').textContent = `${train.train_name} (#${train.train_no}) - Coach B2 AC Map`;
    
    const container = document.getElementById('coachInterior');
    container.innerHTML = '';
    
    // Generate 32 interactive seats
    for (let i = 1; i <= 32; i++) {
        const seat = document.createElement('div');
        const isOccupied = (i % 5 === 0 || i % 7 === 0);
        const berthType = (i % 3 === 0) ? 'UB' : (i % 2 === 0 ? 'MB' : 'LB');
        
        seat.className = `seat-unit ${isOccupied ? 'occupied' : 'available'}`;
        seat.dataset.seatNo = `B2-${i}`;
        seat.innerHTML = `<span>${i}</span><small style="font-size:0.6rem;">${berthType}</small>`;
        
        if (!isOccupied) {
            seat.onclick = () => toggleSeatSelection(seat, `B2-${i}`);
        }
        
        container.appendChild(seat);
    }

    openModal('seatPickerModal');
}

function toggleSeatSelection(seatEl, seatNo) {
    if (seatEl.classList.contains('selected')) {
        seatEl.classList.remove('selected');
        appState.selectedSeats = appState.selectedSeats.filter(s => s !== seatNo);
    } else {
        if (appState.selectedSeats.length >= 6) {
            showToast('Max 6 seats can be selected.', 'info');
            return;
        }
        seatEl.classList.add('selected');
        appState.selectedSeats.push(seatNo);
    }

    const label = document.getElementById('selectedSeatsLabel');
    if (label) {
        label.textContent = appState.selectedSeats.length 
            ? appState.selectedSeats.join(', ')
            : 'None (Auto-allocation active)';
    }
}

/* ==========================================================================
   9. Route Stops Timeline Modal
   ========================================================================== */
async function viewTrainRoute(trainNo) {
    try {
        const res = await fetch(`/api/trains/${trainNo}/route`);
        const data = await res.json();

        if (data.success) {
            document.getElementById('routeModalTitle').textContent = `Train #${trainNo} Route Schedule`;
            const timeline = document.getElementById('routeStopsTimeline');
            
            timeline.innerHTML = `
                <div class="timeline-stops-list">
                    ${data.route.map((stop, idx) => `
                        <div class="stop-item ${idx === 0 ? 'current' : ''}">
                            <div class="stop-node">${idx + 1}</div>
                            <div class="stop-info">
                                <strong>${stop.station_name} (${stop.station_code})</strong>
                                <div style="font-size: 0.8rem; color: var(--text-muted);">
                                    Arr: ${stop.arrival_time} • Dep: ${stop.departure_time} • Halt: ${stop.halt_mins}m
                                </div>
                            </div>
                            <div class="stop-dist" style="font-size: 0.8rem; color: var(--primary-light);">
                                ${stop.distance_km} KM
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            openModal('routeModal');
        }
    } catch (err) {
        console.error('Route error:', err);
        showToast('Unable to fetch timetable for this train.', 'error');
    }
}

/* ==========================================================================
   10. PNR Status Lookup
   ========================================================================== */
async function handlePnrLookup(e) {
    if (e && e.preventDefault) e.preventDefault();
    const pnrInput = document.getElementById('pnrInput');
    const pnr = pnrInput.value.trim();

    if (!pnr || pnr.length < 10) {
        showToast('Please enter a valid 10-digit PNR number.', 'error');
        return;
    }

    try {
        const res = await fetch(`/api/pnr/${pnr}`);
        const data = await res.json();
        const resultWrap = document.getElementById('pnrResult');
        resultWrap.style.display = 'block';

        if (data.success) {
            const b = data.booking;
            resultWrap.innerHTML = `
                <div class="pnr-card" style="margin-top: 1.5rem; border-color: rgba(16, 185, 129, 0.4);">
                    <div class="train-header-row">
                        <div>
                            <span class="pill-tag">PNR: ${b.pnr}</span>
                            <h3 style="margin-top: 0.5rem;">${b.train_name} (#${b.train_no})</h3>
                            <p style="color: var(--text-secondary); font-size: 0.9rem;">
                                ${b.source_name} ➔ ${b.dest_name} | Travel Date: <strong>${b.travel_date}</strong>
                            </p>
                        </div>
                        <div>
                            <span class="booking-status-tag ${b.status === 'CONFIRMED' ? 'status-confirmed' : 'status-cancelled'}">
                                ${b.status}
                            </span>
                        </div>
                    </div>

                    <div style="margin: 1.5rem 0;">
                        <h4 style="margin-bottom: 0.75rem;"><i class="fa-solid fa-users"></i> Passengers & Coach Allocation</h4>
                        <table class="ticket-table">
                            <thead>
                                <tr>
                                    <th>Passenger</th>
                                    <th>Age/Sex</th>
                                    <th>Coach</th>
                                    <th>Seat / Berth</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${b.passengers.map(p => `
                                    <tr>
                                        <td><strong>${p.name}</strong></td>
                                        <td>${p.age} / ${p.gender}</td>
                                        <td>${b.coach_assigned}</td>
                                        <td><span class="badge-class">${p.seat} (${p.berth})</span></td>
                                        <td><span class="${b.status === 'CONFIRMED' ? 'status-available' : 'status-rac'}">${p.status || b.status}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="card-bottom-actions">
                        <span style="font-size: 0.85rem; color: var(--text-muted);">
                            Class: <strong>${b.class_name}</strong> | Booked On: ${b.booking_time}
                        </span>
                        <div>
                            <button class="btn btn-primary btn-sm" onclick="displayTicketBoardingPass(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(b))}')))">
                                <i class="fa-solid fa-file-invoice"></i> View E-Ticket
                            </button>
                        </div>
                    </div>
                </div>
            `;
            showToast('PNR status fetched successfully!', 'success');
        } else {
            resultWrap.innerHTML = `
                <div class="pnr-card text-center" style="border-color: rgba(239, 68, 68, 0.4);">
                    <i class="fa-solid fa-circle-exclamation fa-3x" style="color: var(--danger); margin-bottom: 1rem;"></i>
                    <h3>PNR Not Found</h3>
                    <p style="color: var(--text-secondary); margin-top: 0.5rem;">${data.message}</p>
                </div>
            `;
        }
    } catch (err) {
        console.error('PNR query error:', err);
        showToast('Error querying PNR server.', 'error');
    }
}

function lookupSamplePnr(demoPnr) {
    document.getElementById('pnrInput').value = demoPnr;
    handlePnrLookup(new Event('submit'));
}

/* ==========================================================================
   11. Live Satellite Running Tracker
   ========================================================================== */
async function fetchLiveStatus(trainNo) {
    if (!trainNo) return;
    try {
        const res = await fetch(`/api/live-status/${trainNo}`);
        const data = await res.json();
        
        const container = document.getElementById('liveStatusContainer');
        container.style.display = 'block';

        if (data.success) {
            container.innerHTML = `
                <!-- Overview Row -->
                <div class="live-overview-strip">
                    <div class="live-stat-box">
                        <span class="label">Train Name & No</span>
                        <div class="value">${data.train_no} - ${data.train_name}</div>
                    </div>
                    <div class="live-stat-box">
                        <span class="label">Live Speed</span>
                        <div class="value" style="color: var(--primary-light);"><i class="fa-solid fa-gauge-high"></i> ${data.current_speed}</div>
                    </div>
                    <div class="live-stat-box">
                        <span class="label">Running Status</span>
                        <div class="value ${data.is_delayed ? 'text-warning' : 'text-success'}">
                            <i class="fa-solid ${data.is_delayed ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i> ${data.delay_status}
                        </div>
                    </div>
                    <div class="live-stat-box">
                        <span class="label">Last GPS Ping</span>
                        <div class="value" style="font-family: var(--font-mono);">${data.last_updated}</div>
                    </div>
                </div>

                <!-- GPS Progress Bar -->
                <div>
                    <div class="flex-between" style="display:flex; justify-content:space-between; font-size:0.85rem; color: var(--text-secondary);">
                        <span>${data.source} (${data.departure_time})</span>
                        <span>${data.progress_pct}% Completed</span>
                        <span>${data.destination} (${data.arrival_time})</span>
                    </div>
                    <div class="gps-progress-bar-wrap">
                        <div class="gps-progress-fill" style="width: ${data.progress_pct}%;">
                            <div class="gps-train-pin"><i class="fa-solid fa-train"></i></div>
                        </div>
                    </div>
                </div>

                <!-- Route Stops -->
                <div style="margin-top: 2rem;">
                    <h4 style="margin-bottom: 1rem;"><i class="fa-solid fa-location-crosshairs"></i> Stations En Route</h4>
                    <div class="timeline-stops-list">
                        ${(data.stops && data.stops.length) ? data.stops.map((s, idx) => `
                            <div class="stop-item ${idx < 2 ? 'passed' : (idx === 2 ? 'current' : '')}">
                                <div class="stop-node">${idx < 2 ? '✓' : (idx + 1)}</div>
                                <div>
                                    <strong>${s.station_name} (${s.station_code})</strong>
                                    <div style="font-size: 0.8rem; color: var(--text-muted);">
                                        Arr: ${s.arrival_time} • Dep: ${s.departure_time}
                                    </div>
                                </div>
                                <div style="font-size: 0.85rem; font-weight:600; color: ${idx < 2 ? 'var(--success)' : 'var(--text-muted)'};">
                                    ${idx < 2 ? 'Passed' : (idx === 2 ? 'Approaching Now' : 'Upcoming')}
                                </div>
                            </div>
                        `).join('') : `
                            <div class="stop-item passed">
                                <div class="stop-node">✓</div>
                                <div><strong>${data.source}</strong><div style="font-size:0.8rem; color:var(--text-muted);">Departed On Time</div></div>
                                <div style="color: var(--success); font-weight:600;">Departed</div>
                            </div>
                            <div class="stop-item current">
                                <div class="stop-node"><i class="fa-solid fa-satellite-dish" style="font-size:0.6rem;"></i></div>
                                <div><strong>Midway Transit Section</strong><div style="font-size:0.8rem; color:var(--text-muted);">Cruising at ${data.current_speed}</div></div>
                                <div style="color: var(--primary-light); font-weight:600;">Active En Route</div>
                            </div>
                            <div class="stop-item">
                                <div class="stop-node">3</div>
                                <div><strong>${data.destination}</strong><div style="font-size:0.8rem; color:var(--text-muted);">ETA: ${data.arrival_time}</div></div>
                                <div style="color: var(--text-muted);">Destination</div>
                            </div>
                        `}
                    </div>
                </div>
            `;
            showToast(`Live location updated for Train #${data.train_no}`, 'info');
        }
    } catch (err) {
        console.error('Live status error:', err);
        showToast('Unable to retrieve GPS status.', 'error');
    }
}

function refreshCurrentLiveStatus() {
    const val = document.getElementById('liveTrainSelect').value;
    if (val) {
        fetchLiveStatus(val);
    } else {
        showToast('Please select a train to track first.', 'info');
    }
}

/* ==========================================================================
   12. My Bookings & Instant Cancellation
   ========================================================================== */
async function loadUserBookings() {
    try {
        const res = await fetch('/api/bookings');
        const data = await res.json();
        const container = document.getElementById('myBookingsList');
        if (!container) return;

        if (data.success && data.bookings.length) {
            container.innerHTML = data.bookings.map(b => `
                <div class="booking-ticket-card">
                    <span class="booking-status-tag ${b.status === 'CONFIRMED' ? 'status-confirmed' : 'status-cancelled'}">
                        ${b.status}
                    </span>

                    <div style="margin-bottom: 1rem;">
                        <span class="pill-tag" style="font-size: 0.7rem;">PNR: ${b.pnr}</span>
                        <h3 style="margin-top: 0.5rem; font-size: 1.15rem;">${b.train_name} (#${b.train_no})</h3>
                        <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 0.25rem;">
                            <i class="fa-solid fa-arrow-right-arrow-left"></i> ${b.source_name} ➔ ${b.dest_name}
                        </div>
                    </div>

                    <div style="background: rgba(255, 255, 255, 0.02); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 1rem; font-size: 0.85rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.35rem;">
                            <span style="color: var(--text-muted);">Travel Date:</span>
                            <strong>${b.travel_date}</strong>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.35rem;">
                            <span style="color: var(--text-muted);">Class & Coach:</span>
                            <span>${b.travel_class} • ${b.coach_assigned}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.35rem;">
                            <span style="color: var(--text-muted);">Passengers:</span>
                            <span>${b.passengers.length} Passenger(s)</span>
                        </div>
                        <div style="display:flex; justify-content:space-between;">
                            <span style="color: var(--text-muted);">Paid Amount:</span>
                            <strong style="color: var(--primary-light);">₹${b.total_fare.toLocaleString()}</strong>
                        </div>
                    </div>

                    <div class="card-bottom-actions" style="padding-top: 0.5rem;">
                        <button class="btn btn-secondary btn-sm" onclick="displayTicketBoardingPass(JSON.parse(decodeURIComponent('${encodeURIComponent(JSON.stringify(b))}')))">
                            <i class="fa-solid fa-print"></i> E-Ticket
                        </button>
                        ${b.status === 'CONFIRMED' ? `
                            <button class="btn btn-secondary btn-sm" style="color: var(--danger); border-color: rgba(239, 68, 68, 0.3);" 
                                    onclick="cancelTicketPrompt('${b.pnr}', ${b.total_fare})">
                                <i class="fa-solid fa-ban"></i> Cancel Ticket
                            </button>
                        ` : `
                            <span style="font-size: 0.8rem; color: var(--danger);"><i class="fa-solid fa-circle-xmark"></i> Cancelled & Refunded</span>
                        `}
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-md);">
                    <i class="fa-solid fa-ticket fa-3x" style="color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3>No Bookings Recorded Yet</h3>
                    <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Search and book your train journey to view confirmed e-tickets here.</p>
                    <button class="btn btn-primary" onclick="switchTab('search-tab')">
                        <i class="fa-solid fa-magnifying-glass"></i> Book a Journey Now
                    </button>
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to load user bookings:', err);
    }
}

async function cancelTicketPrompt(pnr, fare) {
    const refundEst = Math.round(fare * 0.90);
    const confirmCancel = confirm(`Are you sure you want to cancel ticket #${pnr}?\n\nEstimated Refund: ₹${refundEst.toLocaleString()} (90% source refund).`);
    
    if (!confirmCancel) return;

    try {
        const res = await fetch('/api/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pnr: pnr })
        });
        const data = await res.json();
        if (data.success) {
            showToast(`Ticket cancelled! Refund of ₹${data.refund_amount.toLocaleString()} initiated.`, 'success');
            loadUserBookings();
        } else {
            showToast(data.message || 'Cancellation failed.', 'error');
        }
    } catch (err) {
        console.error('Cancellation error:', err);
        showToast('Unable to process cancellation right now.', 'error');
    }
}

/* ==========================================================================
   13. Tab & Modal Navigation
   ========================================================================== */
function switchTab(tabId) {
    // Nav buttons
    document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
        if (btn.dataset.tab === tabId || btn.getAttribute('onclick')?.includes(tabId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });

    const activePane = document.getElementById(tabId);
    if (activePane) {
        activePane.classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (tabId === 'bookings-tab') {
        loadUserBookings();
    }
}

function scrollToSearch() {
    switchTab('search-tab');
    const widget = document.getElementById('searchWidget');
    if (widget) widget.scrollIntoView({ behavior: 'smooth' });
}

function toggleMobileNav() {
    const nav = document.getElementById('mobileNav');
    if (nav) nav.classList.toggle('open');
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

// Close modals when clicking backdrop
window.onclick = function(event) {
    if (event.target.classList.contains('modal-backdrop')) {
        event.target.style.display = 'none';
    }
};

/* ==========================================================================
   14. Toast Notification System
   ========================================================================== */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'fa-circle-info';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function setupEventListeners() {
    // Any global listeners can be initialized here
}
