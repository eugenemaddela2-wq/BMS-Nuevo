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
    BASE_URL: '/api',  // Use relative path for API calls
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
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication first
    const isAuth = await redirectIfNotAuthenticated();
    if (!isAuth) return;
    
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
        section.hidden = true;
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionName);
    if (selectedSection) {
        selectedSection.classList.add('active');
        selectedSection.hidden = false;
        officialDashboard.currentSection = sectionName;
        
        // Load section-specific data
        loadSectionData(sectionName);
        
        // Scroll to top
        const mainContainer = document.querySelector('.official-main');
        if (mainContainer) {
            mainContainer.scrollTop = 0;
        }
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
    
    // Load all dashboard data in parallel
    Promise.all([
        makeAPIRequest('/api/complaints'),
        makeAPIRequest('/api/residents'),
        makeAPIRequest('/api/events'),
        makeAPIRequest('/api/announcements')
    ]).then(([complaints, residents, events, announcements]) => {
        updateDashboardUI({
            complaints: complaints || [],
            residents: residents || [],
            events: events || [],
            announcements: announcements || []
        });
        // Also load summary cards
        loadSummaryCards(complaints, residents, events, announcements);
    }).catch(err => {
        console.error('Error loading dashboard:', err);
        showNotification('Failed to load dashboard data', 'error');
    });
}

function loadSummaryCards(complaints, residents, events, announcements) {
    const container = document.getElementById('summaryCards');
    if (!container) return;
    
    const complaintCount = complaints ? complaints.length : 0;
    const residentsCount = residents ? residents.length : 0;
    const eventsCount = events ? events.length : 0;
    const announcementsCount = announcements ? announcements.length : 0;
    
    container.innerHTML = `
        <div class="summary-card" onclick="navigateToSection('complaints')">
            <div class="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
            </div>
            <div class="card-content">
                <h3>Assigned Complaints</h3>
                <p class="card-count">${complaintCount}</p>
            </div>
        </div>

        <div class="summary-card" onclick="navigateToSection('approvals')">
            <div class="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
            <div class="card-content">
                <h3>Pending Approvals</h3>
                <p class="card-count">${residentsCount}</p>
            </div>
        </div>

        <div class="summary-card" onclick="navigateToSection('calendar')">
            <div class="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
            </div>
            <div class="card-content">
                <h3>Upcoming Events</h3>
                <p class="card-count">${eventsCount}</p>
            </div>
        </div>

        <div class="summary-card" onclick="navigateToSection('announcements')">
            <div class="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            </div>
            <div class="card-content">
                <h3>Public Announcements</h3>
                <p class="card-count">${announcementsCount}</p>
            </div>
        </div>

        <div class="summary-card" onclick="showNotification('Messages feature coming soon', 'info')">
            <div class="card-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
            </div>
            <div class="card-content">
                <h3>Constituent Messages</h3>
                <p class="card-count">0</p>
            </div>
        </div>
    `;
}

function loadTasksData() {
    console.log('Loading Tasks Data...');
    
    // Load tasks from API - combining complaints and approvals
    Promise.all([
        makeAPIRequest('/api/complaints'),
        makeAPIRequest('/api/residents')
    ]).then(([complaints, residents]) => {
        updateTasksUI(complaints || []);
    }).catch(err => {
        console.error('Error loading tasks:', err);
        showNotification('Failed to load tasks', 'error');
    });
}

function updateTasksUI(tasks) {
    const container = document.querySelector('#tasks .tasks-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!tasks || tasks.length === 0) {
        container.innerHTML = '<p style="padding: 20px; text-align: center;">No tasks available</p>';
        return;
    }
    
    tasks.forEach((task, index) => {
        const card = document.createElement('div');
        card.className = 'task-card';
        card.innerHTML = `
            <div class="task-header">
                <h3>${task.ref || 'Task ' + (index + 1)}</h3>
                <span class="task-badge ${task.status?.toLowerCase() || 'pending'}">${task.status || 'Pending'}</span>
            </div>
            <div class="task-body">
                <p class="task-type"><strong>Category:</strong> ${task.category || 'General'}</p>
                <p class="task-description">${task.title || task.complainantName || 'Task description'}</p>
                <p class="task-info"><strong>Filed by:</strong> ${task.complainantName || 'N/A'} | <strong>Date:</strong> ${new Date(task.dateReported || task.timestamp).toLocaleDateString()}</p>
                <p class="task-status"><strong>Current Status:</strong> ${task.status || 'Pending'}</p>
            </div>
            <div class="task-actions">
                <button class="action-btn view-btn">View Details</button>
                <button class="action-btn update-btn">Update Status</button>
                <button class="action-btn note-btn">Add Note</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function loadComplaintsData() {
    console.log('Loading Complaints Data...');
    
    makeAPIRequest('/api/complaints')
        .then(complaints => {
            updateComplaintsUI(complaints || []);
        })
        .catch(err => {
            console.error('Error loading complaints:', err);
            showNotification('Failed to load complaints', 'error');
        });
}

function loadApprovalsData() {
    console.log('Loading Approvals Data...');
    // For approvals, we load from residents which have pending status
    makeAPIRequest('/api/residents')
        .then(residents => {
            updateApprovalsUI(residents || []);
        })
        .catch(err => {
            console.error('Error loading approvals:', err);
            showNotification('Failed to load approvals', 'error');
        });
}

function updateApprovalsUI(approvals) {
    const tbody = document.querySelector('#approvals .data-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (!approvals || approvals.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No approval requests available</td></tr>';
        return;
    }
    
    approvals.forEach(approval => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>Certificate of Residency</td>
            <td>${approval.firstName} ${approval.lastName}</td>
            <td>General Request</td>
            <td>${new Date(approval.registeredAt || new Date()).toLocaleDateString()}</td>
            <td><span class="badge status-warning">Pending</span></td>
            <td class="action-cell">
                <button class="action-btn-small">View</button>
                <button class="action-btn-small">Approve</button>
                <button class="action-btn-small reject">Info</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function loadResidentsData() {
    console.log('Loading Residents Data...');
    
    makeAPIRequest('/api/residents')
        .then(residents => {
            updateResidentsUI(residents || []);
        })
        .catch(err => {
            console.error('Error loading residents:', err);
            showNotification('Failed to load residents', 'error');
        });
}

function loadAnnouncementsData() {
    console.log('Loading Announcements Data...');
    
    makeAPIRequest('/api/announcements')
        .then(announcements => {
            updateAnnouncementsUI(announcements || []);
        })
        .catch(err => {
            console.error('Error loading announcements:', err);
            showNotification('Failed to load announcements', 'error');
        });
}

function loadCalendarData() {
    console.log('Loading Calendar Data...');
    
    makeAPIRequest('/api/events')
        .then(events => {
            updateCalendarUI(events || []);
        })
        .catch(err => {
            console.error('Error loading calendar:', err);
            showNotification('Failed to load events', 'error');
        });
}

function loadReportsData() {
    console.log('Loading Reports Data...');
    
    // Load all data to generate reports
    Promise.all([
        makeAPIRequest('/api/complaints'),
        makeAPIRequest('/api/residents'),
        makeAPIRequest('/api/announcements')
    ]).then(([complaints, residents, announcements]) => {
        updateReportsUI({
            complaints: complaints || [],
            residents: residents || [],
            announcements: announcements || []
        });
    }).catch(err => {
        console.error('Error loading reports:', err);
        showNotification('Failed to load reports', 'error');
    });
}

function updateReportsUI(data) {
    const container = document.querySelector('#reports .reports-grid');
    if (!container) return;
    
    container.innerHTML = '';
    
    const complaints = data.complaints || [];
    const residents = data.residents || [];
    
    // Complaint Summary Report
    const complaintCard = document.createElement('div');
    complaintCard.className = 'report-card';
    complaintCard.innerHTML = `
        <h3>Complaint Summary</h3>
        <div class="report-stats">
            <div class="stat">
                <span class="stat-label">Total Filed</span>
                <span class="stat-value">${complaints.length}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Resolved</span>
                <span class="stat-value">${complaints.filter(c => c.status === 'Resolved' || c.status === 'resolved').length}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Pending</span>
                <span class="stat-value">${complaints.filter(c => c.status === 'Pending' || c.status === 'pending').length}</span>
            </div>
            <div class="stat">
                <span class="stat-label">In Progress</span>
                <span class="stat-value">${complaints.filter(c => c.status === 'In Progress' || c.status === 'in-progress').length}</span>
            </div>
        </div>
        <div class="report-actions">
            <button class="action-btn-small">View Details</button>
            <button class="action-btn-small">Export</button>
        </div>
    `;
    container.appendChild(complaintCard);
    
    // Residents Report
    const residentsCard = document.createElement('div');
    residentsCard.className = 'report-card';
    residentsCard.innerHTML = `
        <h3>Residents Summary</h3>
        <div class="report-stats">
            <div class="stat">
                <span class="stat-label">Total Residents</span>
                <span class="stat-value">${residents.length}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Active</span>
                <span class="stat-value">${residents.filter(r => r.status === 'Active' || r.status === 'active').length}</span>
            </div>
            <div class="stat">
                <span class="stat-label">Registered This Month</span>
                <span class="stat-value">${residents.filter(r => {
                    const regDate = new Date(r.registeredAt);
                    const today = new Date();
                    return regDate.getMonth() === today.getMonth() && regDate.getFullYear() === today.getFullYear();
                }).length}</span>
            </div>
        </div>
        <div class="report-actions">
            <button class="action-btn-small">View Details</button>
            <button class="action-btn-small">Export</button>
        </div>
    `;
    container.appendChild(residentsCard);
    
    // System Performance Report
    const perfCard = document.createElement('div');
    perfCard.className = 'report-card';
    perfCard.innerHTML = `
        <h3>System Performance</h3>
        <div class="report-stats">
            <div class="stat">
                <span class="stat-label">Average Response Time</span>
                <span class="stat-value">2.3 days</span>
            </div>
            <div class="stat">
                <span class="stat-label">SLA Compliance</span>
                <span class="stat-value">94%</span>
            </div>
            <div class="stat">
                <span class="stat-label">System Uptime</span>
                <span class="stat-value">99.9%</span>
            </div>
        </div>
        <div class="report-actions">
            <button class="action-btn-small">View Details</button>
            <button class="action-btn-small">Export</button>
        </div>
    `;
    container.appendChild(perfCard);
}

function loadDocumentsData() {
    console.log('Loading Documents Data...');
    updateDocumentsUI();
}

function updateDocumentsUI() {
    const container = document.querySelector('#documents .documents-grid');
    if (!container) return;
    
    container.innerHTML = `
        <div class="document-card">
            <div class="document-icon">📄</div>
            <h3>Oath of Office</h3>
            <p>Original oath of office document</p>
            <button class="action-btn-small">Download</button>
        </div>

        <div class="document-card">
            <div class="document-icon">📋</div>
            <h3>Appointment Letter</h3>
            <p>Official appointment document</p>
            <button class="action-btn-small">Download</button>
        </div>

        <div class="document-card">
            <div class="document-icon">🆔</div>
            <h3>Official ID</h3>
            <p>Barangay official identification</p>
            <button class="action-btn-small">Download</button>
        </div>

        <div class="document-card">
            <div class="document-icon">📄</div>
            <h3>Letter Template</h3>
            <p>Official letter template for correspondence</p>
            <button class="action-btn-small">Download</button>
        </div>

        <div class="document-card">
            <div class="document-icon">🎖️</div>
            <h3>Certificate Template</h3>
            <p>Barangay certificate template</p>
            <button class="action-btn-small">Download</button>
        </div>

        <div class="document-card">
            <div class="document-icon">📝</div>
            <h3>Memo Template</h3>
            <p>Official memo template</p>
            <button class="action-btn-small">Download</button>
        </div>
    `;
}

function loadAuditTrailData() {
    console.log('Loading Audit Trail Data...');
    
    makeAPIRequest('/api/audit-logs')
        .then(logs => {
            updateAuditUI(logs || []);
        })
        .catch(err => {
            console.error('Error loading audit trail:', err);
            showNotification('Failed to load audit logs', 'error');
        });
}

// ==================== UPDATE UI FUNCTIONS ====================
function updateDashboardUI(data) {
    console.log('Updating Dashboard UI with data:', data);
    // Dashboard summary cards are already in HTML, this is where we'd update them
    // with real data from the API
}

function updateComplaintsUI(complaints) {
    const tbody = document.querySelector('#complaints .data-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    complaints.forEach(complaint => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${complaint.ref || complaint.id}</td>
            <td>${complaint.category || 'General'}</td>
            <td>${complaint.title || complaint.complainantName || 'N/A'}</td>
            <td>${complaint.complainantName || 'N/A'}</td>
            <td>${new Date(complaint.dateReported).toLocaleDateString()}</td>
            <td><span class="badge status-${complaint.status?.toLowerCase() || 'pending'}">${complaint.status || 'Pending'}</span></td>
            <td class="action-cell">
                <button class="action-btn-small">View</button>
                <button class="action-btn-small">Update</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateResidentsUI(residents) {
    const tbody = document.querySelector('#residents .data-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    residents.forEach(resident => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${resident.firstName} ${resident.lastName}</td>
            <td>${resident.purok || 'N/A'}</td>
            <td>${resident.contact_number || resident.contact || 'N/A'}</td>
            <td>${resident.status === 'Head' ? 'Yes' : 'No'}</td>
            <td><span class="badge status-active">${resident.status || 'Active'}</span></td>
            <td>None</td>
            <td class="action-cell">
                <button class="action-btn-small">View Profile</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateAnnouncementsUI(announcements) {
    const container = document.querySelector('#announcements .announcements-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    announcements.forEach(announcement => {
        const card = document.createElement('div');
        card.className = 'announcement-card';
        card.innerHTML = `
            <div class="announcement-header">
                <h3>${announcement.title}</h3>
                <span class="badge status-info">${announcement.status || 'Published'}</span>
            </div>
            <p class="announcement-content">${announcement.content || 'No content available'}</p>
            <div class="announcement-meta">
                <span>Published: ${new Date(announcement.start).toLocaleDateString()}</span>
            </div>
            <div class="announcement-actions">
                <button class="action-btn-small">Edit</button>
                <button class="action-btn-small">Unpublish</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateCalendarUI(events) {
    const container = document.querySelector('#calendar .events-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    events.forEach(event => {
        const card = document.createElement('div');
        card.className = 'event-card';
        card.innerHTML = `
            <div class="event-date">${new Date(event.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div class="event-content">
                <h4>${event.title || 'Event'}</h4>
                <p class="event-time">⏰ ${event.start ? new Date(event.start).toLocaleTimeString() : 'TBD'}</p>
                <p class="event-description">${event.description || event.venue || 'Event details'}</p>
                <div class="event-rsvp">
                    <span class="rsvp-count">Event by: ${event.organizer || 'Barangay'}</span>
                </div>
            </div>
            <div class="event-actions">
                <button class="action-btn">View Details</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function updateAuditUI(logs) {
    const tbody = document.querySelector('#audit .data-table tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(log.timestamp).toLocaleString()}</td>
            <td>${log.actionType || log.action || 'N/A'}</td>
            <td>${log.targetId || log.resourceId || 'N/A'}</td>
            <td>${log.details?.description || log.details || 'N/A'}</td>
        `;
        tbody.appendChild(tr);
    });
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
        // Clear all stored data from both storage systems
        localStorage.removeItem('authToken');
        localStorage.removeItem('officialId');
        localStorage.removeItem('officialPosition');
        localStorage.removeItem('officialName');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('userData');

        // Call logout API if token exists
        if (officialDashboard.authToken) {
            try {
                fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + officialDashboard.authToken }
                }).catch(err => console.log('Logout API call failed (non-critical):', err));
            } catch(err) {
                console.log('Logout API call failed (non-critical):', err);
            }
        }

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
            }
        };

        // Add auth token if available
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('accessToken');
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        if (data && (method === 'POST' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        // Use full URL if endpoint starts with http, otherwise prepend /api
        const url = endpoint.startsWith('http') ? endpoint : `/api${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        
        const response = await fetch(url, options);

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
}

console.log('Official Dashboard JavaScript Loaded');
