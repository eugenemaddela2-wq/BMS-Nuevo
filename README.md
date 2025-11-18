# BMS-Nuevo: Building Management System

A comprehensive building management system with real-time dashboards for residents, officials, and administrators.

## 📋 Features

### 🏢 Three Main Dashboards
1. **Resident Dashboard** - For building residents to view their personal data and building information
2. **Official Dashboard** - For building officials to manage and monitor building operations
3. **Admin Dashboard** - For system administrators to manage users, settings, and system-wide operations

### ⏰ Real-Time Features
- **Live Clock** - Real-time clock display updated every second across all dashboards
- **Live Calendar** - Calendar that updates every 30 seconds with today's date highlighted
- **Pulsing Animation** - Visual indicator on today's date with smooth pulsing animation
- **Live Data Updates** - Automatic refresh of activity feeds and data every 30 seconds

### 🔐 Security Features
- User authentication (login system)
- Role-based access control (Resident, Official, Admin)
- Secure data handling
- Password management

### 📊 Dashboard Components
- Activity feeds
- Event calendars
- User management
- Building information
- Reports and analytics
- Real-time status indicators

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Git
- A code editor (VS Code recommended)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/BMS-Nuevo.git
   cd BMS-Nuevo
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment Variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```
   NODE_ENV=development
   PORT=5000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=yourpassword
   DB_NAME=bms_database
   ```

4. **Setup Database**
   ```bash
   npm run init-db
   ```

5. **Start the Server**
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

6. **Access the Application**
   Open your browser and go to: `http://localhost:5000`

   ### 🔁 Auto-seeding for Demo
   If you'd like to seed the demo accounts (admin, official, resident) automatically on startup, set the environment variable `SEED_DEMO_USERS=true` before starting the server. Example:

   ```bash
   SEED_DEMO_USERS=true npm start
   ```

   You can also run the seed script manually:
   ```bash
   npm run seed
   ```

## 📁 Project Structure

```
BMS-Nuevo/
├── public/                          # Frontend files
│   ├── index.html                   # Landing page
│   ├── login.html                   # Login page
│   ├── resident-dashboard.html      # Resident dashboard
│   ├── official-dashboard.html      # Official dashboard
│   ├── admin/
│   │   ├── admin-dashboard.html     # Admin dashboard
│   │   ├── admin-dashboard.js       # Admin dashboard logic
│   │   └── admin-dashboard.css      # Admin dashboard styles
│   ├── css/
│   │   ├── index.css                # Landing page styles
│   │   ├── login.css                # Login page styles
│   │   ├── resident-dashboard.css   # Resident dashboard styles
│   │   ├── official-dashboard.css   # Official dashboard styles
│   │   └── theme.css                # Global theme
│   └── js/
│       ├── resident-dashboard.js    # Resident dashboard logic
│       └── official-dashboard.js    # Official dashboard logic
├── scripts/
│   └── init-db.js                   # Database initialization
├── server.js                         # Main server file
├── package.json                      # Project dependencies
├── .env.example                      # Environment variables template
├── render.yaml                       # Render deployment config
└── README.md                         # This file
```

## 🔧 Available Scripts

```bash
# Start the server
npm start

# Start with development mode (auto-reload)
npm run dev

# Initialize database
npm run init-db
```

## 🏗️ Technology Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MySQL** - Database

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling with animations
- **Vanilla JavaScript** - No framework (lightweight)

### Real-Time Features
- **JavaScript setInterval** - Clock and data refresh timers
- **DOM API** - Dynamic element updates
- **CSS Animations** - Pulsing effects and transitions

## 📊 Dashboard Details

### Resident Dashboard (`/resident-dashboard.html`)
**URL:** `http://localhost:5000/resident-dashboard.html`

Features:
- View personal dashboard
- Check activity feed
- View calendar of events
- Building announcements
- Real-time clock and date
- Live calendar with today highlighting

### Official Dashboard (`/official-dashboard.html`)
**URL:** `http://localhost:5000/official-dashboard.html`

Features:
- Building management overview
- Officer-specific data
- Activity monitoring
- Event management
- Real-time statistics
- Live clock and calendar

### Admin Dashboard (`/admin/admin-dashboard.html`)
**URL:** `http://localhost:5000/admin/admin-dashboard.html`

Features:
- User management
- System settings
- Audit logs
- System monitoring
- Database management
- Real-time system status

## 🔑 Login Credentials

For testing purposes, use these credentials:

- **Resident:** 
  - Username: resident1
  - Password: password

- **Official:**
  - Username: official1
  - Password: password

- **Admin:**
  - Username: admin
  - Password: admin123

## ⏱️ Real-Time Features Explained

### Clock Updates
- Updates every **1 second**
- Displays time in 12-hour format (HH:MM:SS AM/PM)
- Shows current date in full format
- Visible in header and sidebar

### Calendar Updates
- Updates every **30 seconds**
- Automatically highlights today's date
- Pulsing animation on current date
- Smooth 2-second pulse animation cycle

### Data Refresh
- Activity feed updates every **30 seconds**
- Fetches latest data from server
- Synchronized with calendar updates
- No page reload required

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Change port in .env file
PORT=5001
```

### Database Connection Error
- Verify MySQL is running
- Check .env credentials
- Run `npm run init-db` to initialize

### Clock Not Updating
- Check browser console for errors
- Ensure JavaScript is enabled
- Clear browser cache and refresh
- Check if browser tab is active

### Real-Time Features Not Working
1. Open browser Developer Tools (F12)
2. Check Console tab for errors
3. Verify all JavaScript files loaded (Network tab)
4. Clear cache and hard refresh (Ctrl+Shift+R)

## 📝 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout

### Resident API
- `GET /api/residents/:id/dashboard` - Get resident dashboard data
- `GET /api/residents/:id/activity-feed` - Get activity feed

### Official API
- `GET /api/officials/:id/dashboard` - Get official dashboard data
- `GET /api/officials/:id/summary` - Get summary data

### Admin API
- `GET /api/admin/users` - List all users
- `GET /api/admin/settings` - System settings
- `GET /api/admin/audit-logs` - Audit logs

## 🌐 Deployment

### Deploy to Render.com
Follow the comprehensive guide in `DEPLOY_RENDER.md` for step-by-step deployment instructions.

Quick summary:
1. Push code to GitHub
2. Create Render account and connect repository
3. Set environment variables
4. Deploy service

For detailed instructions, see **DEPLOY_RENDER.md**

## 📞 Support & Contact

For issues, questions, or contributions:
- Create an issue on GitHub
- Submit a pull request
- Contact the development team

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Contributors

- Development Team

## 🙏 Acknowledgments

- Built with Node.js and Express
- Styled with CSS3
- Powered by MySQL

---

**Last Updated:** November 16, 2025
**Version:** 1.0.0
**Status:** Production Ready

For deployment instructions, see [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)
