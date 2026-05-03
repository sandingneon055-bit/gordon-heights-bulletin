# 🏛 Barangay Gordon Heights – Bulletin System
### Official Community Announcement and Information System
**Olongapo City, Zambales**

---

## 📁 Project Structure

```
gordon-heights/
├── app.py                  ← Flask backend (API + routing)
├── data/
│   └── db.json             ← JSON database (all data stored here)
├── templates/
│   └── index.html          ← Main HTML frontend (single-page app)
├── static/
│   ├── css/
│   │   └── styles.css      ← All styling and layout
│   └── js/
│       └── app.js          ← Frontend JavaScript (API calls, UI logic)
└── README.md               ← This file
```

---

## 🚀 How to Run

### 1. Install Flask (if not already installed)
```bash
pip install flask
```

### 2. Start the server
```bash
cd gordon-heights
python app.py
```

### 3. Open your browser
```
http://127.0.0.1:5000
```

---

## 🔐 Default Login Credentials

| Role  | Email                          | Password  |
|-------|-------------------------------|-----------|
| Admin | admin@gordonheights.gov.ph    | admin123  |

> Residents can register their own accounts from the login screen.

---

## ✅ Features

### Resident Features
- **Register & Login** – Create a personal resident account with purok, contact info
- **View Announcements** – Browse and search all official barangay announcements
- **Event Calendar** – See upcoming barangay events by month
- **Emergency Alerts** – View real-time emergency alerts with IoT sensor status
- **Emergency Hotlines** – Quick access to all important contact numbers
- **Submit Reports** – Report community issues with category, priority, and location
- **Track Reports** – View status updates on submitted reports
- **My Profile** – View personal account information

### Admin Features
- **Admin Dashboard** – Stats overview and engagement charts
- **Post Announcements** – Create, pin, publish/draft announcements
- **Manage Announcements** – Edit, pin/unpin, delete existing posts
- **Issue Reports** – View and update status of resident-submitted reports
- **Event Management** – Create and delete barangay events
- **Send Emergency Alerts** – Broadcast alerts with severity levels (Low/Medium/High)
- **Analytics** – Views by category, resident distribution by purok, top announcements
- **Resident Management** – View all registered residents, activate/deactivate accounts
- **IoT Sensors** – Monitor and update sensor readings (flood, weather, air quality)

---

## 🌐 API Endpoints

| Method | Endpoint                          | Description              |
|--------|----------------------------------|--------------------------|
| POST   | /api/auth/register               | Register new resident    |
| POST   | /api/auth/login                  | Login                    |
| POST   | /api/auth/logout                 | Logout                   |
| GET    | /api/auth/me                     | Get current user         |
| GET    | /api/announcements               | List announcements       |
| GET    | /api/announcements/:id           | Get + increment views    |
| POST   | /api/announcements               | Create (admin only)      |
| PUT    | /api/announcements/:id           | Update (admin only)      |
| DELETE | /api/announcements/:id           | Delete (admin only)      |
| POST   | /api/announcements/:id/pin       | Toggle pin (admin only)  |
| GET    | /api/reports                     | List reports             |
| POST   | /api/reports                     | Submit report            |
| PUT    | /api/reports/:id                 | Update status (admin)    |
| GET    | /api/events                      | List events              |
| POST   | /api/events                      | Create event (admin)     |
| DELETE | /api/events/:id                  | Delete event (admin)     |
| GET    | /api/alerts                      | List alerts              |
| POST   | /api/alerts                      | Send alert (admin)       |
| POST   | /api/alerts/:id/deactivate       | Deactivate alert (admin) |
| GET    | /api/hotlines                    | List hotlines            |
| GET    | /api/sensors                     | List IoT sensors         |
| PUT    | /api/sensors/:id                 | Update sensor (admin)    |
| GET    | /api/analytics                   | Analytics data (admin)   |
| GET    | /api/admin/users                 | List users (admin)       |
| POST   | /api/admin/users/:id/toggle      | Toggle user (admin)      |

---

## 🌍 SDG Alignment
- **SDG 11** – Sustainable Cities and Communities
- **SDG 16** – Peace, Justice, and Strong Institutions

## ⚡ Emerging Technologies
- **IoT** – Flood sensors, weather station, air quality monitoring
- **Data Analytics** – View tracking, engagement metrics, purok distribution

---

## 📞 Built-in Hotlines (Olongapo City)
- Barangay Gordon Heights Hall
- Barangay Tanod
- Olongapo City Fire Station
- Olongapo City Police Station
- James L. Gordon Memorial Hospital
- Olongapo CDRRMO
- Zambales Electric Cooperative (ZAMECO)
- Olongapo City Water District
- National Emergency Hotline: **911**
- Philippine Red Cross: **143**
