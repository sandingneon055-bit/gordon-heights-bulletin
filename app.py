"""
Barangay Gordon Heights – Bulletin System
Flask Backend API
Olongapo City, Zambales
"""

import json
import os
import uuid
import hashlib
import secrets
import base64
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, session, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room

# ─── App Setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', secrets.token_hex(32))
app.config['SESSION_COOKIE_SECURE']   = bool(os.environ.get('RENDER', False))
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.permanent_session_lifetime = timedelta(hours=8)
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='eventlet')

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'db.json')

# ─── Database Helpers ─────────────────────────────────────────────────────────
def load_db():
    with open(DB_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_db(data):
    with open(DB_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def now_str():
    return datetime.now().isoformat(timespec='seconds')

# ─── Auth Decorators ──────────────────────────────────────────────────────────
def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required', 'redirect': '/'}), 401
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        if session.get('role') != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated

# ─── Page Routes ──────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

# ─── AUTH ROUTES ──────────────────────────────────────────────────────────────
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    user_role_check = data.get('role', 'resident')
    # Address is only required for citizens/residents, not non-citizens
    if user_role_check == 'non_citizen':
        required = ['full_name', 'email', 'username', 'password', 'contact']
    else:
        required = ['full_name', 'email', 'username', 'password', 'address', 'contact']

    for field in required:
        if not data.get(field, '').strip():
            return jsonify({'error': f'{field.replace("_"," ").title()} is required'}), 400

    db = load_db()

    # Check duplicates
    for u in db['users']:
        if u['email'].lower() == data['email'].lower():
            return jsonify({'error': 'Email is already registered'}), 409
        if u['username'].lower() == data['username'].lower():
            return jsonify({'error': 'Username is already taken'}), 409

    user_role = data.get('role', 'resident')
    if user_role not in ['resident', 'non_citizen']:
        user_role = 'resident'

    new_user = {
        'id': f'usr-{uuid.uuid4().hex[:8]}',
        'username': data['username'].strip(),
        'email': data['email'].strip().lower(),
        'password': hash_password(data['password']),
        'role': user_role,
        'full_name': data['full_name'].strip(),
        'address': data.get('address', '').strip(),
        'contact': data['contact'].strip(),
        'created_at': now_str(),
        'is_active': True
    }
    db['users'].append(new_user)
    save_db(db)
    return jsonify({'message': 'Account created successfully! You may now log in.'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    identifier = data.get('identifier', '').strip()
    password    = data.get('password', '')

    if not identifier or not password:
        return jsonify({'error': 'Username/email and password are required'}), 400

    db = load_db()
    user = next((u for u in db['users']
                 if (u['email'].lower() == identifier.lower()
                     or u['username'].lower() == identifier.lower())
                 and u['password'] == hash_password(password)
                 and u['is_active']), None)

    if not user:
        return jsonify({'error': 'Invalid credentials. Please try again.'}), 401

    session.permanent = True
    session['user_id']   = user['id']
    session['role']      = user['role']
    session['full_name'] = user['full_name']
    session['username']  = user['username']

    return jsonify({
        'message': 'Login successful',
        'user': {
            'id':        user['id'],
            'full_name': user['full_name'],
            'username':  user['username'],
            'role':      user['role'],
            'address':   user.get('address', ''),
            'email':     user['email']
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/me', methods=['GET'])
@login_required
def me():
    db = load_db()
    user = next((u for u in db['users'] if u['id'] == session['user_id']), None)
    if not user:
        session.clear()
        return jsonify({'error': 'User not found'}), 404
    return jsonify({
        'id':        user['id'],
        'full_name': user['full_name'],
        'username':  user['username'],
        'role':      user['role'],
        'purok':     user.get('purok', ''),
        'address':   user.get('address', ''),
        'email':     user['email'],
        'contact':   user.get('contact', ''),
        'created_at':user['created_at']
    })

# ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────────
@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    db = load_db()
    category = request.args.get('category', 'all')
    search   = request.args.get('search', '').lower().strip()
    page     = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))

    include_drafts = request.args.get('include_drafts', 'false').lower() == 'true'

    if include_drafts and session.get('role') == 'admin':
        anns = db['announcements']  # admin sees all including drafts
    else:
        anns = [a for a in db['announcements'] if a['is_published']]  # residents see published only

    if category != 'all':
        anns = [a for a in anns if a['category'] == category]

    if search:
        anns = [a for a in anns
                if search in a['title'].lower() or search in a['content'].lower()]

    # Pinned first, then by date
    anns.sort(key=lambda x: (not x.get('is_pinned', False), x['created_at']), reverse=False)
    anns.sort(key=lambda x: not x.get('is_pinned', False))

    total = len(anns)
    start = (page - 1) * per_page
    end   = start + per_page
    page_anns = anns[start:end]

    return jsonify({
        'announcements': page_anns,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    })

@app.route('/api/announcements/<ann_id>', methods=['GET'])
def get_announcement(ann_id):
    db = load_db()
    ann = next((a for a in db['announcements'] if a['id'] == ann_id), None)
    if not ann:
        return jsonify({'error': 'Announcement not found'}), 404
    # Increment views
    ann['views'] = ann.get('views', 0) + 1
    save_db(db)
    return jsonify(ann)

@app.route('/api/announcements', methods=['POST'])
@admin_required
def create_announcement():
    data = request.get_json()
    if not data.get('title', '').strip():
        return jsonify({'error': 'Title is required'}), 400
    if not data.get('content', '').strip():
        return jsonify({'error': 'Content is required'}), 400

    db = load_db()
    new_ann = {
        'id':           f'ann-{uuid.uuid4().hex[:8]}',
        'title':        data['title'].strip(),
        'content':      data['content'].strip(),
        'category':     data.get('category', 'general'),
        'author':       session['full_name'],
        'author_id':    session['user_id'],
        'created_at':   now_str(),
        'updated_at':   now_str(),
        'is_pinned':    data.get('is_pinned', False),
        'is_published': data.get('is_published', True),
        'views':        0,
        'audience':     data.get('audience', 'All Residents')
    }
    db['announcements'].insert(0, new_ann)
    save_db(db)
    # Emit real-time notification to ALL connected clients
    socketio.emit('new_announcement', {
        'id':        new_ann['id'],
        'title':     new_ann['title'],
        'category':  new_ann['category'],
        'is_pinned': new_ann['is_pinned'],
        'created_at': new_ann['created_at']
    }, to='public')
    return jsonify({'message': 'Announcement posted successfully', 'announcement': new_ann}), 201

@app.route('/api/announcements/<ann_id>', methods=['PUT'])
@admin_required
def update_announcement(ann_id):
    db   = load_db()
    ann  = next((a for a in db['announcements'] if a['id'] == ann_id), None)
    if not ann:
        return jsonify({'error': 'Announcement not found'}), 404

    data = request.get_json()
    for field in ['title', 'content', 'category', 'audience', 'is_pinned', 'is_published']:
        if field in data:
            ann[field] = data[field]
    ann['updated_at'] = now_str()
    save_db(db)
    return jsonify({'message': 'Announcement updated', 'announcement': ann})

@app.route('/api/announcements/<ann_id>', methods=['DELETE'])
@admin_required
def delete_announcement(ann_id):
    db = load_db()
    before = len(db['announcements'])
    db['announcements'] = [a for a in db['announcements'] if a['id'] != ann_id]
    if len(db['announcements']) == before:
        return jsonify({'error': 'Announcement not found'}), 404
    save_db(db)
    return jsonify({'message': 'Announcement deleted'})

@app.route('/api/announcements/<ann_id>/pin', methods=['POST'])
@admin_required
def toggle_pin(ann_id):
    db  = load_db()
    ann = next((a for a in db['announcements'] if a['id'] == ann_id), None)
    if not ann:
        return jsonify({'error': 'Announcement not found'}), 404
    ann['is_pinned'] = not ann.get('is_pinned', False)
    ann['updated_at'] = now_str()
    save_db(db)
    return jsonify({'message': 'Pinned' if ann['is_pinned'] else 'Unpinned', 'is_pinned': ann['is_pinned']})

# ─── REPORTS ─────────────────────────────────────────────────────────────────
@app.route('/api/reports', methods=['GET'])
@login_required
def get_reports():
    db = load_db()
    if session['role'] == 'admin':
        reports = db['reports']
    else:
        reports = [r for r in db['reports'] if r['submitted_by'] == session['user_id']]
    reports = sorted(reports, key=lambda x: x['created_at'], reverse=True)

    status = request.args.get('status')
    if status:
        reports = [r for r in reports if r['status'] == status]
    return jsonify({'reports': reports, 'total': len(reports)})

@app.route('/api/reports', methods=['POST'])
@login_required
def submit_report():
    data = request.get_json()
    required = ['category', 'title', 'description', 'priority', 'location']
    for field in required:
        if not data.get(field, '').strip():
            return jsonify({'error': f'{field.title()} is required'}), 400

    db = load_db()
    report = {
        'id':           f'rpt-{uuid.uuid4().hex[:8]}',
        'category':     data['category'].strip(),
        'title':        data['title'].strip(),
        'description':  data['description'].strip(),
        'priority':     data['priority'],
        'location':     data['location'].strip(),
        'landmark':     data.get('landmark', '').strip(),
        'status':       'Pending',
        'submitted_by': session['user_id'],
        'submitter_name': session['full_name'],
        'created_at':   now_str(),
        'updated_at':   now_str(),
        'admin_notes':  ''
    }
    db['reports'].insert(0, report)
    save_db(db)
    return jsonify({'message': 'Report submitted successfully', 'report': report}), 201

@app.route('/api/reports/<report_id>', methods=['PUT'])
@admin_required
def update_report(report_id):
    db     = load_db()
    report = next((r for r in db['reports'] if r['id'] == report_id), None)
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    data = request.get_json()
    for field in ['status', 'admin_notes']:
        if field in data:
            report[field] = data[field]
    report['updated_at'] = now_str()
    save_db(db)
    return jsonify({'message': 'Report updated', 'report': report})

# ─── EVENTS ──────────────────────────────────────────────────────────────────
@app.route('/api/events', methods=['GET'])
def get_events():
    db = load_db()
    month = request.args.get('month')
    events = sorted(db['events'], key=lambda x: x['date'])
    if month:
        events = [e for e in events if e['date'].startswith(month)]
    return jsonify({'events': events})

@app.route('/api/events', methods=['POST'])
@admin_required
def create_event():
    data = request.get_json()
    required = ['title', 'date', 'location']
    for field in required:
        if not data.get(field, '').strip():
            return jsonify({'error': f'{field.title()} is required'}), 400
    db = load_db()
    event = {
        'id':          f'evt-{uuid.uuid4().hex[:8]}',
        'title':       data['title'].strip(),
        'description': data.get('description', '').strip(),
        'date':        data['date'].strip(),
        'time':        data.get('time', '').strip(),
        'location':    data['location'].strip(),
        'category':    data.get('category', 'general'),
        'created_by':  session['user_id'],
        'created_at':  now_str()
    }
    db['events'].append(event)
    save_db(db)
    return jsonify({'message': 'Event created', 'event': event}), 201

@app.route('/api/events/<event_id>', methods=['DELETE'])
@admin_required
def delete_event(event_id):
    db = load_db()
    before = len(db['events'])
    db['events'] = [e for e in db['events'] if e['id'] != event_id]
    if len(db['events']) == before:
        return jsonify({'error': 'Event not found'}), 404
    save_db(db)
    return jsonify({'message': 'Event deleted'})

# ─── ALERTS ──────────────────────────────────────────────────────────────────
@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    db = load_db()
    alerts = sorted(db['alerts'], key=lambda x: x['created_at'], reverse=True)
    return jsonify({'alerts': alerts})

@app.route('/api/alerts', methods=['POST'])
@admin_required
def send_alert():
    data = request.get_json()
    if not data.get('title', '').strip():
        return jsonify({'error': 'Alert title is required'}), 400
    if not data.get('message', '').strip():
        return jsonify({'error': 'Alert message is required'}), 400

    db = load_db()
    alert = {
        'id':          f'alt-{uuid.uuid4().hex[:8]}',
        'title':       data['title'].strip(),
        'message':     data['message'].strip(),
        'severity':    data.get('severity', 'medium').upper(),
        'area':        data.get('area', 'All Residents').strip(),
        'issued_by':   session['full_name'],
        'issuer_id':   session['user_id'],
        'created_at':  now_str(),
        'is_active':   True
    }
    db['alerts'].insert(0, alert)
    save_db(db)
    # Emit real-time notification to ALL connected clients
    socketio.emit('new_alert', {
        'id':        alert['id'],
        'title':     alert['title'],
        'message':   alert['message'],
        'severity':  alert['severity'],
        'area':      alert['area'],
        'issued_by': alert['issued_by'],
        'created_at': alert['created_at']
    }, to='public')
    return jsonify({'message': 'Emergency alert broadcasted!', 'alert': alert}), 201

@app.route('/api/alerts/<alert_id>/deactivate', methods=['POST'])
@admin_required
def deactivate_alert(alert_id):
    db = load_db()
    alert = next((a for a in db['alerts'] if a['id'] == alert_id), None)
    if not alert:
        return jsonify({'error': 'Alert not found'}), 404
    alert['is_active'] = False
    save_db(db)
    socketio.emit('alert_deactivated', {'id': alert_id}, to='public')
    return jsonify({'message': 'Alert deactivated'})

# ─── HOTLINES ────────────────────────────────────────────────────────────────
@app.route('/api/hotlines', methods=['GET'])
def get_hotlines():
    db = load_db()
    return jsonify({'hotlines': db['hotlines']})

# ─── IOT SENSORS ─────────────────────────────────────────────────────────────
@app.route('/api/sensors', methods=['GET'])
def get_sensors():
    db = load_db()
    return jsonify({'sensors': db['iot_sensors']})

@app.route('/api/sensors/<sensor_id>', methods=['PUT'])
@admin_required
def update_sensor(sensor_id):
    db     = load_db()
    sensor = next((s for s in db['iot_sensors'] if s['id'] == sensor_id), None)
    if not sensor:
        return jsonify({'error': 'Sensor not found'}), 404
    data = request.get_json()
    for field in ['status', 'reading']:
        if field in data:
            sensor[field] = data[field]
    sensor['last_updated'] = now_str()
    save_db(db)
    return jsonify({'message': 'Sensor updated', 'sensor': sensor})



# ─── CITIZEN PHOTO REPORT ────────────────────────────────────────────────────
@app.route('/api/citizen-photo-report', methods=['POST'])
@login_required
def citizen_photo_report():
    if session.get('role') not in ['resident', 'admin']:
        return jsonify({'error': 'Only citizens can use this endpoint'}), 403

    data = request.get_json()
    if not data.get('description', '').strip():
        return jsonify({'error': 'Description is required'}), 400
    if not data.get('photo'):
        return jsonify({'error': 'Photo is required'}), 400

    db = load_db()

    photo_data = data.get('photo', '')
    if ',' in photo_data:
        photo_data = photo_data.split(',')[1]

    report = {
        'id':            f'grpt-{uuid.uuid4().hex[:8]}',
        'type':          'citizen_photo_report',
        'reporter_name': session['full_name'],
        'reporter_id':   session['user_id'],
        'reporter_contact': '',
        'description':   data['description'].strip(),
        'photo':         photo_data,
        'latitude':      data.get('latitude'),
        'longitude':     data.get('longitude'),
        'location_name': data.get('location_name', 'Gordon Heights, Olongapo City').strip(),
        'status':        'Pending',
        'admin_notes':   '',
        'created_at':    now_str(),
        'submitted_by':  session['full_name'],
    }
    if 'guest_reports' not in db:
        db['guest_reports'] = []
    db['guest_reports'].insert(0, report)
    save_db(db)

    socketio.emit('new_guest_report', {
        'id':            report['id'],
        'reporter_name': report['reporter_name'],
        'description':   report['description'][:80],
        'location_name': report['location_name'],
        'created_at':    report['created_at'],
        'type':          'citizen_photo_report'
    }, to='public')

    return jsonify({'message': 'Photo report submitted successfully!', 'report': report}), 201

# ─── GUEST / NON-CITIZEN QUICK REPORT ────────────────────────────────────────
@app.route('/api/guest-report', methods=['POST'])
def guest_report():
    data = request.get_json()
    if not data.get('reporter_name', '').strip():
        return jsonify({'error': 'Your name is required'}), 400
    if not data.get('description', '').strip():
        return jsonify({'error': 'Description is required'}), 400
    if not data.get('photo'):
        return jsonify({'error': 'Photo is required'}), 400

    db = load_db()

    # Save photo as base64 string
    photo_data = data.get('photo', '')
    if ',' in photo_data:
        photo_data = photo_data.split(',')[1]

    report = {
        'id':            f'grpt-{uuid.uuid4().hex[:8]}',
        'type':          'guest_report',
        'reporter_name': data['reporter_name'].strip(),
        'reporter_contact': data.get('reporter_contact', '').strip(),
        'description':   data['description'].strip(),
        'photo':         photo_data,
        'latitude':      data.get('latitude'),
        'longitude':     data.get('longitude'),
        'location_name': data.get('location_name', 'Gordon Heights, Olongapo City').strip(),
        'status':        'Pending',
        'admin_notes':   '',
        'created_at':    now_str(),
        'submitted_by':  'Guest / Non-Citizen',
    }
    if 'guest_reports' not in db:
        db['guest_reports'] = []
    db['guest_reports'].insert(0, report)
    save_db(db)

    # Notify admin via SocketIO
    socketio.emit('new_guest_report', {
        'id':            report['id'],
        'reporter_name': report['reporter_name'],
        'description':   report['description'][:80],
        'location_name': report['location_name'],
        'created_at':    report['created_at']
    }, to='public')

    return jsonify({'message': 'Report submitted successfully! Barangay officials have been notified.'}), 201


@app.route('/api/guest-reports', methods=['GET'])
@admin_required
def get_guest_reports():
    db = load_db()
    reports = db.get('guest_reports', [])
    status = request.args.get('status')
    if status:
        reports = [r for r in reports if r['status'] == status]
    return jsonify({'reports': sorted(reports, key=lambda x: x['created_at'], reverse=True), 'total': len(reports)})


@app.route('/api/guest-reports/<report_id>', methods=['PUT'])
@admin_required
def update_guest_report(report_id):
    db = load_db()
    report = next((r for r in db.get('guest_reports', []) if r['id'] == report_id), None)
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    data = request.get_json()
    for field in ['status', 'admin_notes']:
        if field in data:
            report[field] = data[field]
    report['updated_at'] = now_str()
    save_db(db)
    return jsonify({'message': 'Report updated', 'report': report})

@app.route('/api/guest-reports/<report_id>', methods=['DELETE'])
@admin_required
def delete_guest_report(report_id):
    db = load_db()
    before = len(db.get('guest_reports', []))
    db['guest_reports'] = [r for r in db.get('guest_reports', []) if r['id'] != report_id]
    if len(db['guest_reports']) == before:
        return jsonify({'error': 'Report not found'}), 404
    save_db(db)
    return jsonify({'message': 'Photo report deleted successfully'})

# ─── ANALYTICS ───────────────────────────────────────────────────────────────
@app.route('/api/analytics', methods=['GET'])
@admin_required
def get_analytics():
    db = load_db()
    anns    = db['announcements']
    reports = db['reports']
    users   = [u for u in db['users'] if u['role'] == 'resident']
    alerts  = db['alerts']

    # Category breakdown
    categories = {}
    for a in anns:
        cat = a.get('category', 'general')
        categories[cat] = categories.get(cat, {'count': 0, 'views': 0})
        categories[cat]['count'] += 1
        categories[cat]['views'] += a.get('views', 0)

    # Top announcements
    top_anns = sorted(anns, key=lambda x: x.get('views', 0), reverse=True)[:5]

    # Report breakdown
    report_status = {}
    for r in reports:
        s = r['status']
        report_status[s] = report_status.get(s, 0) + 1

    report_priority = {}
    for r in reports:
        p = r['priority']
        report_priority[p] = report_priority.get(p, 0) + 1

    # Address/street distribution
    purok_dist = {}
    for u in users:
        p = u.get('address', u.get('purok', 'Unknown'))
        purok_dist[p] = purok_dist.get(p, 0) + 1

    return jsonify({
        'totals': {
            'announcements': len(anns),
            'residents':     len(users),
            'reports':       len(reports),
            'alerts_sent':   len(alerts),
            'total_views':   sum(a.get('views', 0) for a in anns),
            'pending_reports': report_status.get('Pending', 0)
        },
        'by_category':      categories,
        'top_announcements': [{'title': a['title'], 'views': a.get('views', 0)} for a in top_anns],
        'report_status':    report_status,
        'report_priority':  report_priority,
        'purok_distribution': purok_dist,
        'recent_activity':  sorted(
            [{'type': 'announcement', 'title': a['title'], 'time': a['created_at']} for a in anns[:3]] +
            [{'type': 'report',       'title': r['title'], 'time': r['created_at']} for r in reports[:3]],
            key=lambda x: x['time'], reverse=True
        )[:6]
    })

# ─── ADMIN – USER MANAGEMENT ─────────────────────────────────────────────────
@app.route('/api/admin/users', methods=['GET'])
@admin_required
def get_users():
    db = load_db()
    users = [{'id': u['id'], 'full_name': u['full_name'], 'username': u['username'],
              'email': u['email'], 'role': u['role'], 'address': u.get('address', u.get('purok','')),
              'contact': u.get('contact',''), 'created_at': u['created_at'],
              'is_active': u['is_active']} for u in db['users']]
    return jsonify({'users': users, 'total': len(users)})

@app.route('/api/admin/users/<user_id>/toggle', methods=['POST'])
@admin_required
def toggle_user(user_id):
    if user_id == session['user_id']:
        return jsonify({'error': 'Cannot deactivate yourself'}), 400
    db   = load_db()
    user = next((u for u in db['users'] if u['id'] == user_id), None)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    user['is_active'] = not user['is_active']
    save_db(db)
    return jsonify({'message': 'Active' if user['is_active'] else 'Deactivated', 'is_active': user['is_active']})

# ─── MISC ────────────────────────────────────────────────────────────────────
@app.route('/api/puroks', methods=['GET'])
def get_puroks():
    db = load_db()
    return jsonify({'puroks': db.get('puroks', [])})

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'barangay': 'Gordon Heights', 'city': 'Olongapo City', 'time': now_str()})

# ─── SocketIO Events ─────────────────────────────────────────────────────────
@socketio.on('connect')
def on_connect():
    join_room('public')
    emit('connected', {'message': 'Connected to Barangay Gordon Heights real-time server'})

@socketio.on('disconnect')
def on_disconnect():
    leave_room('public')

@socketio.on('ping_server')
def on_ping():
    emit('pong_server', {'time': now_str()})

# ─── Run ──────────────────────────────────────────────────────────────────────
if __name__ == '__main__':
    print("=" * 55)
    print("  Barangay Gordon Heights – Bulletin System")
    print("  Olongapo City, Zambales")
    print("=" * 55)
    print(f"  Server : http://127.0.0.1:5000")
    print(f"  Admin  : admin@gordonheights.gov.ph / admin123")
    print("=" * 55)
    port = int(os.environ.get('PORT', 5000))
    debug = not os.environ.get('RENDER', False)
    socketio.run(app, debug=debug, host='0.0.0.0', port=port)
