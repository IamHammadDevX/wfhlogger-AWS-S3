# Time Tracker System

A full-featured, enterprise-grade time tracking and productivity monitoring solution. This system consists of a robust backend, a responsive web dashboard for management, and a secure desktop client for automated time and activity tracking.

## 🚀 Key Features

### 🖥️ Web Dashboard (Manager/Admin)
- **Real-Time Live View**: Monitor active employee sessions in real-time via WebSockets.
- **Comprehensive Reporting**: Generate detailed reports filtered by employee and date ranges.
- **Activity Monitoring**: View work sessions, productivity metrics, and captured screenshots.
- **Work Hours Management**: Configure and track expected work schedules.
- **Role-Based Access Control**:
  - **Super Admin**: Full system control, user management, and global settings.
  - **Manager**: Team oversight, report generation, and activity monitoring.
  - **Employee**: View own stats (if permitted).
- **Responsive Design**: Fully optimized for desktop, tablet, and mobile devices.
- **Downloads Section**: Easy access to the desktop client installer.

### ⏱️ Desktop Client (Employee)
- **Automated Tracking**: Simple "Start/Stop" interface for employees.
- **Activity Logging**: Tracks active application usage and idle time.
- **Screenshot Capture**: Securely captures periodic screenshots for proof of work.
- **Offline Capable**: Queues data when offline and syncs when connection is restored.
- **Professional Installer**: Easy-to-use Windows installer (`.exe`) for quick deployment.
- **Secure Authentication**: JWT-based login directly from the client.

### ⚙️ Backend API
- **RESTful API**: Node.js/Express architecture serving data to web and desktop clients.
- **Real-Time Engine**: Socket.IO integration for live status updates.
- **Dual Storage Engine**:
  - **SQLite**: Primary, high-performance local database (using `better-sqlite3`).
  - **JSON Fallback**: Zero-dependency fallback for development environments.
  - **MongoDB**: Optional support for scalable cloud deployment.
- **Secure File Handling**: Managed storage for screenshot uploads and evidence.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, Tailwind CSS, React Router v6.
- **Backend**: Node.js, Express, Socket.IO, Better-SQLite3.
- **Desktop Client**: Python (packaged as EXE), Native Windows APIs.
- **Database**: SQLite (default) or MongoDB.

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- npm (Node Package Manager)

### 1. Backend Setup
The backend handles API requests, authentication, and data storage.

```bash
cd backend
npm install
# For production performance, ensure native modules are built:
npm install better-sqlite3
```

**Environment Variables** (`backend/.env`):
Create a `.env` file in the `backend` directory:
```env
PORT=4000
HOST=127.0.0.1
JWT_SECRET=your_super_secure_secret_key
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
UPLOAD_DIR=uploads
DATA_DIR=data
# Optional:
# MONGO_URI=mongodb://localhost:27017/timetracker
# SUPERADMIN_EMAIL=admin@example.com
# SUPERADMIN_PASSWORD=admin123
```

Start the backend:
```bash
npm start
```

### 2. Web Frontend Setup
The web interface for managers and admins.

```bash
cd web
npm install
```

**Environment Variables** (`web/.env`):
Create a `.env` file in the `web` directory:
```env
VITE_API_URL=http://localhost:4000
```

Start the development server:
```bash
npm run dev
```
Access the dashboard at `http://localhost:5173`.

### 3. Desktop Client
The client application is located in `desktop/`. Users can download the compiled installer directly from the Web Dashboard's "Downloads" section.

To compile the installer manually (if modifying client source):
1. Install [Inno Setup](https://jrsoftware.org/isdl.php).
2. Navigate to `backend/public/downloads`.
3. Open `TimeTrackerSetup.iss` and compile.

---

## 📖 Usage Guide

### For Administrators
1. Log in with Super Admin credentials.
2. Navigate to **Setup** to configure organization details.
3. Use **Admin** panel to create Manager and Employee accounts.
4. Distribute credentials to your team.

### For Managers
1. Log in to the Web Dashboard.
2. Use **Live View** to see who is currently working.
3. Check **Reports** for weekly/monthly productivity summaries.
4. Review **Activity** for detailed timelines and screenshots.

### For Employees
1. Download the **Time Tracker Client** from the provided link.
2. Install and run the application.
3. Log in with your email and password.
4. Click **Start** to begin your work session.

---

## 🏗️ Production Deployment

1. **Build the Frontend**:
   ```bash
   cd web
   npm run build
   ```
   The backend is configured to serve the static files from `web/dist` automatically.

2. **Run Backend**:
   Use a process manager like PM2 for stability.
   ```bash
   cd backend
   pm2 start src/server.js --name "time-tracker"
   pm2 save
   ```

3. **Reverse Proxy (Nginx/Apache)**:
   Set up a reverse proxy to forward traffic from port 80/443 to `http://localhost:4000`.

---

## 📂 Directory Structure

```
├── backend/            # Express Server & API
│   ├── src/            # Source code (models, routes, db)
│   ├── uploads/        # Stored screenshots
│   └── public/         # Public assets & downloads
├── web/                # React Frontend
│   ├── src/            # Components, Pages, Hooks
│   └── dist/           # Compiled production assets
├── desktop/            # Python Client Source
└── data/               # SQLite Database & JSON fallbacks
```

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/amazing-feature`).
3. Commit your changes.
4. Push to the branch.
5. Open a Pull Request.

---
© 2026 Time Tracker System. All rights reserved.
