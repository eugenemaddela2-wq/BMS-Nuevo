/* ==================== OFFICIAL DASHBOARD JAVASCRIPT ==================== */

// ==================== STATE MANAGEMENT ====================
const officialDashboard = {
    currentSection: 'dashboard',
    authToken: localStorage.getItem('authToken') || '',
    officialId: localStorage.getItem('officialId') || 'official-001',
    position: localStorage.getItem('officialPosition') || 'Barangay Chairperson',
    name: localStorage.getItem('officialName') || 'Juan dela Cruz',
};

// API Configuration
const API_CONFIG = {
    BASE_URL: 'http://localhost:3000/api',
    ENDPOINTS: {
        dashboard: '/officials/{id}/dashboard',
        tasks: '/officials/{id}/tasks',
        complaints: '/complaints',
        documents: '/documents',
        residents: '/residents',
        events: '/events',
        announcements: '/announcements',
        reports: '/reports/official/{id}',
        auditLogs: '/audit-logs',
    }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboard();
    setupEventListeners();
    loadDashboardData();
    startRealTimeClock();
    startLiveDataUpdates();
});

function initializeDashboard() {
    // Set official information
    document.getElementById('officialPosition').textContent = officialDashboard.position;
    document.getElementById('officialName').textContent = officialDashboard.name;
    
    // Activate dashboard section by default
    navigateToSection('dashboard');
    
    console.log('Official Dashboard Initialized', officialDashboard);
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Sidebar Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });

    // Profile Dropdown
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Notification Dismissal
    document.querySelectorAll('.dismiss-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.notification-item').remove();
        });
    });

    // Clear All Notifications
    const clearBtn = document.querySelector('.clear-btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.querySelectorAll('.notification-item').forEach(item => item.remove());
        });
    }

    // Task Filter
    const taskFilter = document.getElementById('taskFilter');
    if (taskFilter) {
        taskFilter.addEventListener('change', handleTaskFilter);
    }

    // Complaint Filter
    const complaintFilter = document.getElementById('complaintFilter');
    if (complaintFilter) {
        complaintFilter.addEventListener('change', handleComplaintFilter);
    }

    // Action Buttons
    setupActionButtons();

    // Calendar Navigation
    setupCalendarNavigation();

    // Task Card Actions
    setupTaskCardActions();

    // Event Card Actions
    setupEventCardActions();

    // Announcement Actions
    setupAnnouncementActions();

    // Header Button Listeners
    document.querySelector('.notifications-btn')?.addEventListener('click', () => {
        navigateToSection('dashboard');
        setTimeout(() => {
            document.querySelector('.notifications-list').scrollIntoView({ behavior: 'smooth' });
        }, 100);
    });

    document.querySelector('.messages-btn')?.addEventListener('click', () => {
        showNotification('Messages feature coming soon!', 'info');
    });
}

// ==================== SECTION NAVIGATION ====================
function navigateToSection(sectionName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.section === sectionName) {
            item.classList.add('active');
        }
    });

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionName);
    if (selectedSection) {
        selectedSection.classList.add('active');
        officialDashboard.currentSection = sectionName;
        
        // Load section-specific data
        loadSectionData(sectionName);
        
        // Scroll to top
        document.querySelector('.official-main').scrollTop = 0;
    }
}

function loadSectionData(section) {
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'tasks':
            loadTasksData();
            break;
        case 'calendar':
            loadCalendarData();
            break;
        case 'complaints':
            loadComplaintsData();
            break;
        case 'approvals':
            loadApprovalsData();
            break;
        case 'residents':
            loadResidentsData();
            break;
        case 'announcements':
            loadAnnouncementsData();
            break;
        case 'reports':
            loadReportsData();
            break;
        case 'documents':
            loadDocumentsData();
            break;
        case 'audit':
            loadAuditTrailData();
            break;
    }
}

// ==================== DATA LOADING FUNCTIONS ====================
function loadDashboardData() {
    console.log('Loading Dashboard Data...');
    
    // In a real app, fetch from API
    // fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.dashboard.replace('{id}', officialDashboard.officialId)}`)
    //     .then(response => response.json())
    //     .then(data => updateDashboardUI(data))
    //     .catch(error => console.error('Error loading dashboard:', error));
    
    // For now, data is pre-populated in HTML
}

function loadTasksData() {
    console.log('Loading Tasks Data...');
    
    // fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.tasks.replace('{id}', officialDashboard.officialId)}`)
    //     .then(response => response.json())
    //     .then(data => updateTasksUI(data))
    //     .catch(error => console.error('Error loading tasks:', error));
}

function loadComplaintsData() {
    console.log('Loading Complaints Data...');
    
    // fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.complaints}?status=all`)
    //     .then(response => response.json())
    //     .then(data => updateComplaintsUI(data))
    //     .catch(error => console.error('Error loading complaints:', error));
}

function loadApprovalsData() {
    console.log('Loading Approvals Data...');
    
    // fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.documents}`)
    //     .then(response => response.json())
    //     .then(data => updateApprovalsUI(data))
    //     .catch(error => console.error('Error loading approvals:', error));
}

function loadResidentsData() {
    console.log('Loading Residents Data...');
    
    // fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.residents}`)
    //     .then(response => response.json())
    //     .then(data => updateResidentsUI(data))
    //     .catch(error => console.error('Error loading residents:', error));
}

function loadAnnouncementsData() {
    console.log('Loading Announcements Data...');
    
    // fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.announcements}`)
    //     .then(response => response.json())
    //     .then(data => updateAnnouncementsUI(data))
    //     .catch(error => console.error('Error loading announcements:', error));
}

function loadCalendarData() {
    console.log('Loading Calendar Data...');
    
    // fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.events}`)
    //     .then(response => response.json())
    //     .then(data => updateCalendarUI(data))
    //     .catch(error => console.error('Error loading calendar:', error));
}

function loadReportsData() {
    console.log('Loading Reports Data...');
    
    // fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.reports.replace('{id}', officialDashboard.officialId)}`)
    //     .then(response => response.json())
    //     .then(data => updateReportsUI(data))
    //     .catch(error => console.error('Error loading reports:', error));
}

function loadDocumentsData() {
    console.log('Loading Documents Data...');
    
    // Documents are typically static files served from a server
    // Files would include: Oath of Office, Appointment Letter, Official ID, Templates
}

function loadAuditTrailData() {
    console.log('Loading Audit Trail Data...');
    
    // fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.auditLogs}?officialId=${officialDashboard.officialId}`)
    //     .then(response => response.json())
    //     .then(data => updateAuditUI(data))
    //     .catch(error => console.error('Error loading audit trail:', error));
}

// ==================== ACTION BUTTON HANDLERS ====================
function setupActionButtons() {
    // View Detail Buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const card = btn.closest('.task-card, .event-card, .complaint-card');
            const title = card?.querySelector('h3, h4')?.textContent;
            showNotification(`Viewing details for: ${title}`, 'info');
        });
    });

    // Update Status Buttons
    document.querySelectorAll('.update-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showStatusUpdateDialog(btn);
        });
    });

    // Approve Buttons
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const card = btn.closest('.task-card, .event-card');
            const id = card?.dataset.id || 'item';
            handleApproval(id, 'approved');
        });
    });

    // Reject Buttons
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const card = btn.closest('.task-card, .event-card');
            const id = card?.dataset.id || 'item';
            handleApproval(id, 'rejected');
        });
    });

    // Add Note Buttons
    document.querySelectorAll('.note-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showAddNoteDialog(btn);
        });
    });
}

function showStatusUpdateDialog(btn) {
    const status = prompt('Enter new status (Pending, In Progress, Escalated, Resolved):', 'In Progress');
    if (status) {
        const card = btn.closest('.task-card');
        const id = card?.querySelector('h3')?.textContent;
        
        // In real app: POST /complaints/{id}/status
        handleStatusUpdate(id, status);
    }
}

function showAddNoteDialog(btn) {
    const note = prompt('Add a note to this task:');
    if (note) {
        const card = btn.closest('.task-card');
        const id = card?.querySelector('h3')?.textContent;
        
        // In real app: POST /complaints/{id}/comment
        handleAddNote(id, note);
    }
}

function handleApproval(itemId, status) {
    const message = status === 'approved' ? 'approved' : 'rejected';
    showNotification(`Item ${message} successfully: ${itemId}`, 'success');
    
    // In real app: PATCH /documents/{id} or similar endpoint
}

function handleStatusUpdate(itemId, status) {
    showNotification(`Status updated to: ${status}`, 'success');
    
    // In real app: PATCH /complaints/{id}/status
    // updateItem(itemId, { status: status });
}

function handleAddNote(itemId, note) {
    showNotification(`Note added: "${note.substring(0, 30)}..."`, 'success');
    
    // In real app: POST /complaints/{id}/comment
    // addComment(itemId, { comment: note, authorId: officialDashboard.officialId });
}

// ==================== TASK FILTERS ====================
function handleTaskFilter(e) {
    const filterValue = e.target.value;
    const taskCards = document.querySelectorAll('.task-card');
    
    taskCards.forEach(card => {
        if (filterValue === 'all') {
            card.style.display = 'flex';
        } else {
            const badge = card.querySelector('.task-badge');
            if (badge && badge.textContent.toLowerCase().includes(filterValue)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        }
    });
}

function handleComplaintFilter(e) {
    const filterValue = e.target.value;
    const tableRows = document.querySelectorAll('.data-table tbody tr');
    
    tableRows.forEach(row => {
        if (filterValue === 'all') {
            row.style.display = 'table-row';
        } else {
            const statusBadge = row.querySelector('.badge');
            if (statusBadge && statusBadge.textContent.toLowerCase().includes(filterValue)) {
                row.style.display = 'table-row';
            } else {
                row.style.display = 'none';
            }
        }
    });
}

// ==================== CALENDAR FUNCTIONS ====================
function setupCalendarNavigation() {
    document.querySelector('.prev-month')?.addEventListener('click', () => {
        showNotification('Previous month navigation (feature in progress)', 'info');
    });

    document.querySelector('.next-month')?.addEventListener('click', () => {
        showNotification('Next month navigation (feature in progress)', 'info');
    });
}

// ==================== TASK CARD ACTIONS ====================
function setupTaskCardActions() {
    document.querySelectorAll('.task-card').forEach(card => {
        const id = Math.random().toString(36).substr(2, 9);
        card.dataset.id = id;
    });
}

// ==================== EVENT CARD ACTIONS ====================
function setupEventCardActions() {
    document.querySelectorAll('.event-card').forEach(card => {
        card.querySelectorAll('.action-btn').forEach(btn => {
            if (btn.textContent.includes('Confirm')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const eventName = card.querySelector('h4').textContent;
                    handleEventRSVP(eventName, 'confirmed');
                    btn.textContent = 'Cancel RSVP';
                    card.querySelector('.your-status').textContent = '✓ You\'re attending';
                    card.querySelector('.your-status').classList.remove('pending');
                    card.querySelector('.your-status').classList.add('confirmed');
                });
            } else if (btn.textContent.includes('Cancel')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const eventName = card.querySelector('h4').textContent;
                    handleEventRSVP(eventName, 'cancelled');
                    btn.textContent = 'Confirm Attendance';
                    card.querySelector('.your-status').textContent = '⏳ Pending response';
                    card.querySelector('.your-status').classList.remove('confirmed');
                    card.querySelector('.your-status').classList.add('pending');
                });
            }
        });
    });
}

function handleEventRSVP(eventName, status) {
    const message = status === 'confirmed' ? 'confirmed attendance for' : 'cancelled RSVP for';
    showNotification(`You have ${message}: ${eventName}`, 'success');
    
    // In real app: GET /events/{id}/rsvp or POST /events/{id}/rsvp
}

// ==================== ANNOUNCEMENT ACTIONS ====================
function setupAnnouncementActions() {
    document.querySelectorAll('.announcement-actions').forEach(actions => {
        const editBtn = actions.querySelector('.action-btn-small:nth-child(1)');
        const unpublishBtn = actions.querySelector('.action-btn-small:nth-child(2)');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                showNotification('Edit announcement feature (in progress)', 'info');
            });
        }

        if (unpublishBtn) {
            unpublishBtn.addEventListener('click', () => {
                const card = actions.closest('.announcement-card');
                card.style.opacity = '0.5';
                showNotification('Announcement unpublished', 'success');
                setTimeout(() => {
                    card.remove();
                }, 500);
            });
        }
    });
}

// ==================== SUMMARY CARD CLICKS ====================
document.querySelectorAll('.summary-card').forEach(card => {
    card.addEventListener('click', () => {
        const link = card.dataset.link;
        if (link) {
            navigateToSection(link);
        }
    });
});

// ==================== NOTIFICATIONS ====================
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification-item ${type}`;
    notification.innerHTML = `
        <div class="notification-icon">
            ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
        </div>
        <div class="notification-content">
            <h4>${capitalizeFirstLetter(type)}</h4>
            <p>${message}</p>
        </div>
        <button class="dismiss-btn">×</button>
    `;

    // Add to notifications list
    const notificationsList = document.querySelector('.notifications-list');
    if (notificationsList) {
        notificationsList.insertBefore(notification, notificationsList.firstChild);
        
        // Setup dismiss button
        notification.querySelector('.dismiss-btn').addEventListener('click', () => {
            notification.remove();
        });

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// ==================== AUTHENTICATION ====================
function handleLogout() {
    if (confirm('Are you sure you want to sign out?')) {
        // Clear stored data
        localStorage.removeItem('authToken');
        localStorage.removeItem('officialId');
        localStorage.removeItem('officialPosition');
        localStorage.removeItem('officialName');

        // In real app: POST /auth/logout
        showNotification('Signed out successfully', 'success');
        
        // Redirect to login after 1 second
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1000);
    }
}

// ==================== UTILITY FUNCTIONS ====================
function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(date) {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function calculateAge(birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function getActiveSectionName() {
    return officialDashboard.currentSection;
}

// ==================== API HELPER FUNCTIONS ====================
async function makeAPIRequest(endpoint, method = 'GET', data = null) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${officialDashboard.authToken}`
            }
        };

        if (data && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, options);

        if (!response.ok) {
            if (response.status === 401) {
                handleLogout();
            }
            throw new Error(`API Error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        showNotification('An error occurred. Please try again.', 'error');
        return null;
    }
}

// ==================== EXPORT FUNCTIONS ====================
// Functions available for global use
window.officialDashboard = {
    navigateToSection,
    showNotification,
    makeAPIRequest,
    formatDate,
    handleLogout,
    getActiveSectionName
};

/**
 * Real-Time Clock Updates
 */
function startRealTimeClock() {
    updateClockDisplay();
    setInterval(updateClockDisplay, 1000);
}

function updateClockDisplay() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
    
    const dateString = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Update all clock displays
    const clockElements = document.querySelectorAll('[data-clock]');
    clockElements.forEach(el => {
        el.textContent = timeString;
    });
    
    const dateElements = document.querySelectorAll('[data-date]');
    dateElements.forEach(el => {
        el.textContent = dateString;
    });
}

/**
 * Live Data Updates - Refresh every 30 seconds
 */
function startLiveDataUpdates() {
    setInterval(() => {
        const activeSection = officialDashboard.currentSection || 'dashboard';
        loadSectionData(activeSection);
        updateLiveCalendar();
    }, 30000);
}

/**
 * Update Live Calendar
 */
function updateLiveCalendar() {
    const today = new Date();
    const calendarDays = document.querySelectorAll('.calendar-day');
    
    calendarDays.forEach(day => {
        day.classList.remove('today');
        const dayNum = parseInt(day.textContent);
        if (dayNum === today.getDate() && !day.classList.contains('empty')) {
            day.classList.add('today');
            day.style.backgroundColor = '#667eea';
            day.style.color = 'white';
            day.style.fontWeight = 'bold';
        }
    });
    
    // Update calendar month/year
    const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const calendarMonthEls = document.querySelectorAll('.calendar-header span');
    calendarMonthEls.forEach(el => {
        if (!el.textContent.includes('<') && !el.textContent.includes('>')) {
            el.textContent = monthYear;
        }
    });
}\n\nconsole.log('Official Dashboard JavaScript Loaded');
