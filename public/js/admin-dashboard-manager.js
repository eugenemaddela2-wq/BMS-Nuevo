/**
 * AdminDashboardManager - Complete admin dashboard state management
 */

class AdminDashboardManager {
    constructor() {
        this.data = {
            residents: [],
            officials: [],
            events: [],
            announcements: [],
            complaints: [],
            users: [],
            auditLogs: [],
            imports: [],
            exports: [],
            activityFeed: [],
            sessions: [],
            pendingItems: []
        };
        this.baseAPI = '/api/admin';
        this.currentPage = 1;
        this.pageSize = 10;
        this.refreshIntervalId = null;
        this.sectionPollers = {}; // map of sectionName -> intervalId
        this.init();
    }

    // Dynamic token accessor reads the active session token from sessionStorage.
    get token() {
        return sessionStorage.getItem('accessToken');
    }

    async init() {
        console.debug('AdminDashboardManager init. Token found?', !!this.token);
        if (!this.token) {
            window.location.href = '/login.html';
            return;
        }

        this.setupNavigation();
        this.setupModalHandlers();
        this.setupSSE();
        await this.loadDashboardData();

        // Setup auto-refresh to keep summary cards realtime (every 30s)
        this.refreshIntervalId = setInterval(() => this.loadDashboardData(), 30000);
    }

    setupSSE() {
        if (!window.EventSource) return;
        try {
            const token = sessionStorage.getItem('accessToken');
            const es = new EventSource('/api/events/stream' + (token ? `?token=${encodeURIComponent(token)}` : ''));
            es.onopen = () => console.debug('SSE connected');
            es.onerror = (err) => { console.warn('SSE error:', err); es.close(); };
            es.onmessage = (e) => {
                try {
                    const msg = JSON.parse(e.data);
                    if (!msg || !msg.topic) return;
                    switch (msg.topic) {
                        case 'residents':
                            this.loadResidents();
                            break;
                        case 'officials':
                            this.loadOfficials();
                            break;
                        case 'events':
                            this.loadEvents();
                            break;
                        case 'announcements':
                            this.loadAnnouncements();
                            break;
                        case 'complaints':
                            this.loadComplaints();
                            break;
                        case 'users':
                            this.loadUsers();
                            break;
                        case 'imports':
                            this.loadImports();
                            break;
                        case 'exports':
                            this.loadExports();
                            break;
                        case 'activity':
                        case 'recentActivity':
                            this.loadDashboardData();
                            break;
                        default:
                            // Unknown topic - fallback to load dashboard
                            this.loadDashboardData();
                            break;
                    }
                } catch (err) {
                    console.warn('SSE message parse error', err);
                }
            };
        } catch (e) {
            console.warn('SSE not available or blocked', e.message || e);
        }
    }

    // Polling utilities
    startSectionPoller(section, loadFn, interval = 30000) {
        if (this.sectionPollers[section]) return; // already polling
        this.sectionPollers[section] = setInterval(() => loadFn.call(this), interval);
    }

    stopSectionPoller(section) {
        const id = this.sectionPollers[section];
        if (id) {
            clearInterval(id);
            delete this.sectionPollers[section];
        }
    }

    stopAllSectionPollers() {
        Object.keys(this.sectionPollers).forEach(s => this.stopSectionPoller(s));
    }

    clearRefreshInterval() {
        if (this.refreshIntervalId) {
            clearInterval(this.refreshIntervalId);
            this.refreshIntervalId = null;
        }
    }

    setupNavigation() {
        document.querySelectorAll('[data-section]').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.showSection(section);
            });
        });
    }

    setupModalHandlers() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal.id);
                }
            });
        });
    }

    showSection(sectionName) {
        // hide all sections
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        // show requested section
        const target = document.getElementById(`${sectionName}-section`);
        if (target) target.classList.add('active');

        // update nav active state
        document.querySelectorAll('[data-section]').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) item.classList.add('active');
        });

        // stop any previous section pollers
        this.stopAllSectionPollers();

        // Load and start poller for the requested section
        switch(sectionName) {
            case 'dashboard':
                this.loadDashboardData();
                this.startSectionPoller('dashboard', this.loadDashboardData, 30000);
                break;
            case 'residents':
                this.loadResidents();
                this.startSectionPoller('residents', this.loadResidents, 30000);
                break;
            case 'officials':
                this.loadOfficials();
                this.startSectionPoller('officials', this.loadOfficials, 30000);
                break;
            case 'events':
                this.loadEvents();
                this.startSectionPoller('events', this.loadEvents, 30000);
                break;
            case 'announcements':
                this.loadAnnouncements();
                this.startSectionPoller('announcements', this.loadAnnouncements, 30000);
                break;
            case 'complaints':
                this.loadComplaints();
                this.startSectionPoller('complaints', this.loadComplaints, 30000);
                break;
            case 'users':
                this.loadUsers();
                this.startSectionPoller('users', this.loadUsers, 30000);
                break;
            case 'audit':
                this.loadAuditLogs();
                this.startSectionPoller('audit', this.loadAuditLogs, 30000);
                break;
            case 'imports':
                this.loadImports();
                this.startSectionPoller('imports', this.loadImports, 30000);
                break;
            case 'exports':
                this.loadExports();
                this.startSectionPoller('exports', this.loadExports, 30000);
                break;
            default:
                // no-op
                break;
        }
    }

    // Resident updates are covered by per-section polling

    async loadDashboardData() {
        try {
            const response = await fetch(`${this.baseAPI}/dashboard`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load dashboard');
            
            const data = await response.json();
            
            // Update header
            const adminName = localStorage.getItem('adminName') || 'Administrator';
            document.getElementById('adminName').textContent = adminName;

            // Update summary cards
            document.getElementById('totalResidents').textContent = 
                data.statistics?.totalResidents?.toLocaleString() || '0';
            document.getElementById('pendingItems').textContent = 
                data.statistics?.pendingItems || '0';
            document.getElementById('activeSessions').textContent = 
                data.statistics?.activeSessions || '0';

            // Load activity feed
            this.data.activityFeed = data.recentActivity || [];
            this.renderActivityFeed();

            // Load pending queue
            this.data.pendingItems = data.pendingItems || [];
            this.renderPendingQueue();

            // Load audit snapshot
            this.renderAuditSnapshot(data.auditSnapshot || []);

            // Load sessions
            this.renderSessions(data.sessions || []);

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load dashboard');
        }
    }

    renderActivityFeed() {
        const container = document.getElementById('activityFeed');
        if (this.data.activityFeed.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 12px;">No recent activity</p>';
            return;
        }
        let html = '';
        this.data.activityFeed.forEach(activity => {
            const iconColor = activity.type === 'create' ? '#26d07c' : activity.type === 'update' ? '#667eea' : '#f5a623';
            const icon = activity.type === 'create' ? '+' : activity.type === 'update' ? '✎' : '!';
            html += `
                <div class="activity-item">
                    <div class="activity-icon" style="background: rgba(${this.hexToRgb(iconColor)}, 0.2);">${icon}</div>
                    <div class="activity-content">
                        <div class="activity-title">${activity.title}</div>
                        <div class="activity-meta">${activity.actor} • ${new Date(activity.timestamp).toLocaleString()}</div>
                        ${activity.description ? `<div style="font-size: 10px; color: var(--text-muted); margin-top: 3px;">${activity.description}</div>` : ''}
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    }

    renderPendingQueue() {
        const container = document.getElementById('pendingQueue');
        const filter = document.getElementById('pendingFilter')?.value || 'all';
        let items = this.data.pendingItems;
        if (filter !== 'all') {
            items = items.filter(item => item.category === filter);
        }
        if (items.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 12px;">No pending items</p>';
            return;
        }
        let html = '';
        items.slice(0, 6).forEach(item => {
            html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 11px;">' +
                '<div>' +
                    `<p style="margin: 0; font-weight: 600;">${item.title}</p>` +
                    `<p style="margin: 3px 0 0 0; color: var(--text-muted);">${item.category}</p>` +
                '</div>' +
                '<div style="display: flex; gap: 5px;">' +
                    '<button class="btn btn-primary btn-sm" onclick="this.parentElement.parentElement.style.display=\'none\'">Approve</button>' +
                    '<button class="btn btn-danger btn-sm" onclick="this.parentElement.parentElement.style.display=\'none\'">Reject</button>' +
                '</div>' +
            '</div>';
        });
        container.innerHTML = html;
    }

    renderAuditSnapshot(logs) {
        const container = document.getElementById('auditSnapshot');
        if (logs.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 12px;">No audit logs</p>';
            return;
        }
        let html = '';
        logs.slice(0, 5).forEach(log => {
            html += '<div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 10px;">' +
                '<div style="flex: 1;">' +
                    `<p style="margin: 0; font-weight: 500;">${log.actor} • ${log.action}</p>` +
                    `<p style="margin: 3px 0 0 0; color: var(--text-muted);">${log.targetType} #${log.targetId}</p>` +
                '</div>' +
                '<div style="color: var(--text-muted); text-align: right;">' +
                    `<p style="margin: 0; font-size: 10px;">${new Date(log.timestamp).toLocaleString()}</p>` +
                    `<p style="margin: 3px 0 0 0; font-size: 9px;">${log.ipAddress}</p>` +
                '</div>' +
            '</div>';
        });
        container.innerHTML = html;
    }

    renderSessions(sessions) {
        const container = document.getElementById('sessionList');
        if (sessions.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 12px;">No active sessions</p>';
            return;
        }
        let html = '';
        sessions.forEach(session => {
            const status = session.isCurrent ? 'Current' : 'Active';
            const statusColor = session.isCurrent ? '#26d07c' : '#667eea';
            html += '<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); font-size: 11px;">' +
                '<div>' +
                    `<p style="margin: 0; font-weight: 600;">${session.username}</p>` +
                    `<p style="margin: 3px 0 0 0; color: var(--text-muted); font-size: 10px;">${session.ipAddress} • ${new Date(session.loginAt).toLocaleString()}</p>` +
                '</div>' +
                '<div style="display: flex; align-items: center; gap: 8px;">' +
                    `<span style="background: rgba(${this.hexToRgb(statusColor)}, 0.2); color: ${statusColor}; padding: 3px 8px; border-radius: 3px; font-size: 10px; font-weight: 600;">${status}</span>` +
                    (!session.isCurrent ? `<button class="btn btn-danger btn-sm" onclick="adminDashboard.forceLogout('${session.sessionId}')">Sign Out</button>` : '') +
                '</div>' +
            '</div>';
        });
        container.innerHTML = html;
    }

    async loadResidents() {
        try {
            const response = await fetch(`${this.baseAPI}/residents`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load residents');
            
            const data = await response.json();
            this.data.residents = data.residents || [];
            this.renderResidents();

        } catch (error) {
            console.error('Error loading residents:', error);
            this.showError('Failed to load residents');
        }
    }

    renderResidents() {
            const tbody = document.querySelector('#residentsList tbody');
            if (this.data.residents.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No residents found</td></tr>';
                return;
            }
            let html = '';
            this.data.residents.forEach(resident => {
                const statusClass = `badge-${resident.status?.toLowerCase() || 'active'}`;
                html += `
                    <tr>
                        <td>${resident.resident_id}</td>
                        <td>${resident.first_name} ${resident.last_name}</td>
                        <td>${resident.date_of_birth ? new Date(resident.date_of_birth).toLocaleDateString() : '-'}</td>
                        <td>${resident.purok_zone || '-'}</td>
                        <td>${resident.contact_number || '-'}</td>
                        <td><span class="badge ${statusClass}">${resident.status || 'Active'}</span></td>
                        <td>
                            <button class="btn btn-secondary btn-sm view-btn" data-id="${resident.resident_id}">View</button>
                            <button class="btn btn-secondary btn-sm edit-btn" data-id="${resident.resident_id}">Edit</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            // Attach event listeners for buttons
            tbody.querySelectorAll('.view-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = btn.getAttribute('data-id');
                    this.viewResident(Number(id));
                });
            });
            tbody.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = btn.getAttribute('data-id');
                    this.editResident(Number(id));
                });
            });
    }

    async loadOfficials() {
        try {
            const response = await fetch(`${this.baseAPI}/officials`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load officials');
            
            const data = await response.json();
            this.data.officials = data.officials || [];
            this.renderOfficials();

        } catch (error) {
            console.error('Error loading officials:', error);
            this.showError('Failed to load officials');
        }
    }

    renderOfficials() {
        const tbody = document.querySelector('#officialsList tbody');
        
        if (this.data.officials.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No officials found</td></tr>';
            return;
        }

        let html = '';
        this.data.officials.forEach(official => {
            const statusClass = `badge-${official.status?.toLowerCase() || 'active'}`;
            html += `
                <tr>
                    <td>${official.full_name}</td>
                    <td>${official.position}</td>
                    <td>${official.term_start ? new Date(official.term_start).toLocaleDateString() : '-'}</td>
                    <td>${official.term_end ? new Date(official.term_end).toLocaleDateString() : '-'}</td>
                    <td>${official.contact_number || '-'}</td>
                    <td><span class="badge ${statusClass}">${official.status || 'Active'}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="adminDashboard.viewOfficial(${official.official_id})">View</button>
                        <button class="btn btn-secondary btn-sm" onclick="adminDashboard.editOfficial(${official.official_id})">Edit</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async loadEvents() {
        try {
            const response = await fetch(`${this.baseAPI}/events`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load events');
            
            const data = await response.json();
            this.data.events = data.events || [];
            this.renderEvents();

        } catch (error) {
            console.error('Error loading events:', error);
            this.showError('Failed to load events');
        }
    }

    renderEvents() {
        const tbody = document.querySelector('#eventsList tbody');
        
        if (this.data.events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No events found</td></tr>';
            return;
        }

        let html = '';
        this.data.events.forEach(event => {
            const statusClass = `badge-${event.status?.toLowerCase() || 'draft'}`;
            html += `
                <tr>
                    <td>${event.title}</td>
                    <td>${new Date(event.start_date_time).toLocaleDateString()}</td>
                    <td>${event.organizer}</td>
                    <td>${event.max_capacity}</td>
                    <td id="registered-${event.event_id}">${event.registered_count || 0}</td>
                    <td><span class="badge ${statusClass}">${event.status || 'Draft'}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="adminDashboard.viewEvent(${event.event_id})">View</button>
                        <button class="btn btn-secondary btn-sm" onclick="adminDashboard.editEvent(${event.event_id})">Edit</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async loadAnnouncements() {
        try {
            const response = await fetch(`${this.baseAPI}/announcements`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load announcements');
            
            const data = await response.json();
            this.data.announcements = data.announcements || [];
            this.renderAnnouncements();

        } catch (error) {
            console.error('Error loading announcements:', error);
            this.showError('Failed to load announcements');
        }
    }

    renderAnnouncements() {
        const tbody = document.querySelector('#announcementsList tbody');
        
        if (this.data.announcements.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No announcements found</td></tr>';
            return;
        }

        let html = '';
        this.data.announcements.forEach(ann => {
            const statusClass = `badge-${ann.status?.toLowerCase() || 'draft'}`;
            html += `
                <tr>
                    <td>${ann.title}</td>
                    <td>${ann.audience}</td>
                    <td>${ann.created_by}</td>
                    <td>${ann.start_date_time ? new Date(ann.start_date_time).toLocaleDateString() : '-'}</td>
                    <td>${ann.end_date_time ? new Date(ann.end_date_time).toLocaleDateString() : '-'}</td>
                    <td><span class="badge ${statusClass}">${ann.status || 'Draft'}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="adminDashboard.viewAnnouncement(${ann.announcement_id})">View</button>
                        <button class="btn btn-secondary btn-sm" onclick="adminDashboard.editAnnouncement(${ann.announcement_id})">Edit</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async loadComplaints() {
        try {
            const response = await fetch(`${this.baseAPI}/complaints`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load complaints');
            
            const data = await response.json();
            this.data.complaints = data.complaints || [];
            this.renderComplaints();

        } catch (error) {
            console.error('Error loading complaints:', error);
            this.showError('Failed to load complaints');
        }
    }

    renderComplaints() {
        const tbody = document.querySelector('#complaintsList tbody');
        
        if (this.data.complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--text-muted);">No complaints found</td></tr>';
            return;
        }

        let html = '';
        this.data.complaints.forEach(complaint => {
            const statusClass = `badge-${complaint.status?.toLowerCase() || 'new'}`;
            const priorityClass = complaint.priority === 'high' ? 'accent-red' : complaint.priority === 'medium' ? 'accent-orange' : 'accent-green';
            
            html += `
                <tr>
                    <td>${complaint.complaint_id}</td>
                    <td>${complaint.complainant_name}</td>
                    <td>${complaint.category}</td>
                    <td>${new Date(complaint.date_reported).toLocaleDateString()}</td>
                    <td>${complaint.assigned_to || '-'}</td>
                    <td><span style="color: var(--${priorityClass});">${complaint.priority || 'Medium'}</span></td>
                    <td><span class="badge ${statusClass}">${complaint.status || 'New'}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="adminDashboard.viewComplaint(${complaint.complaint_id})">View</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async loadUsers() {
        try {
            const response = await fetch(`${this.baseAPI}/users`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load users');
            
            const data = await response.json();
            this.data.users = data.users || [];
            this.renderUsers();

        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Failed to load users');
        }
    }

    renderUsers() {
        const tbody = document.querySelector('#usersList tbody');
        
        if (this.data.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--text-muted);">No users found</td></tr>';
            return;
        }

        let html = '';
        this.data.users.forEach(user => {
            const statusClass = `badge-${user.status?.toLowerCase() || 'active'}`;
            const mfaStatus = user.mfa_enabled ? '✓ Enabled' : '✗ Disabled';
            
            html += `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.email}</td>
                    <td>${user.full_name}</td>
                    <td>${user.role}</td>
                    <td>${user.last_login_at ? new Date(user.last_login_at).toLocaleString() : 'Never'}</td>
                    <td style="font-size: 10px; color: ${user.mfa_enabled ? '#26d07c' : '#f5a623'};">${mfaStatus}</td>
                    <td><span class="badge ${statusClass}">${user.status || 'Active'}</span></td>
                    <td>
                            <button class="btn btn-secondary btn-sm" onclick="adminDashboard.editUserRoles(${user.user_id})">Roles</button>
                            ${user.status && user.status.toLowerCase() === 'active' ? `<button class="btn btn-danger btn-sm" onclick="adminDashboard.disableUser(${user.user_id})">Disable</button>` : ''}
                            ${user.status && user.status.toLowerCase() === 'pending' ? `
                                <button class="btn btn-success btn-sm" onclick="adminDashboard.approveUser(${user.user_id})">Approve</button>
                                <button class="btn btn-danger btn-sm" onclick="adminDashboard.rejectUser(${user.user_id})">Reject</button>
                            ` : ''}
                        </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async loadAuditLogs() {
        try {
            const response = await fetch(`${this.baseAPI}/audit-logs`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load audit logs');
            
            const data = await response.json();
            this.data.auditLogs = data.logs || [];
            this.renderAuditLogs();

        } catch (error) {
            console.error('Error loading audit logs:', error);
            this.showError('Failed to load audit logs');
        }
    }

    renderAuditLogs() {
        const tbody = document.querySelector('#auditLogsList tbody');
        
        if (this.data.auditLogs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No audit logs found</td></tr>';
            return;
        }

        let html = '';
        this.data.auditLogs.forEach(log => {
            html += `
                <tr>
                    <td>${new Date(log.timestamp).toLocaleString()}</td>
                    <td>${log.actor_name}</td>
                    <td>${log.action_type}</td>
                    <td>${log.target_type}</td>
                    <td>${log.target_id}</td>
                    <td>${log.ip_address}</td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="adminDashboard.viewAuditDetail(${log.log_id})">Details</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async loadImports() {
        try {
            const response = await fetch(`${this.baseAPI}/imports`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load imports');
            
            const data = await response.json();
            this.data.imports = data.imports || [];
            this.renderImports();

        } catch (error) {
            console.error('Error loading imports:', error);
            this.showError('Failed to load imports');
        }
    }

    renderImports() {
        const tbody = document.querySelector('#importsList tbody');
        
        if (this.data.imports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 20px; color: var(--text-muted);">No imports yet</td></tr>';
            return;
        }

        let html = '';
        this.data.imports.forEach(imp => {
            const statusClass = `badge-${imp.status?.toLowerCase() || 'processing'}`;
            html += `
                <tr>
                    <td>${imp.import_id}</td>
                    <td>${imp.dataset_target}</td>
                    <td>${imp.file_name}</td>
                    <td>${imp.requested_by}</td>
                    <td>${new Date(imp.requested_at).toLocaleString()}</td>
                    <td>${imp.records_total}</td>
                    <td>${imp.records_imported}</td>
                    <td>${imp.records_failed}</td>
                    <td><span class="badge ${statusClass}">${imp.status}</span></td>
                    <td>
                        <button class="btn btn-secondary btn-sm" onclick="adminDashboard.viewImportReport(${imp.import_id})">Report</button>
                        ${imp.rollback_available ? `<button class="btn btn-secondary btn-sm" onclick="adminDashboard.rollbackImport(${imp.import_id})">Rollback</button>` : ''}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    async loadExports() {
        try {
            const response = await fetch(`${this.baseAPI}/exports`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load exports');
            
            const data = await response.json();
            this.data.exports = data.exports || [];
            this.renderExports();

        } catch (error) {
            console.error('Error loading exports:', error);
            this.showError('Failed to load exports');
        }
    }

    renderExports() {
        const tbody = document.querySelector('#exportsList tbody');
        
        if (this.data.exports.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--text-muted);">No exports yet</td></tr>';
            return;
        }

        let html = '';
        this.data.exports.forEach(exp => {
            const statusClass = `badge-${exp.status?.toLowerCase() || 'queued'}`;
            html += `
                <tr>
                    <td>${exp.export_id}</td>
                    <td>${exp.dataset}</td>
                    <td>${exp.format}</td>
                    <td>${exp.requested_by}</td>
                    <td>${new Date(exp.requested_at).toLocaleString()}</td>
                    <td>${exp.records_count}</td>
                    <td><span class="badge ${statusClass}">${exp.status}</span></td>
                    <td>
                        ${exp.status === 'Ready' ? `<button class="btn btn-primary btn-sm" onclick="adminDashboard.downloadExport(${exp.export_id})">Download</button>` : 'Processing...'}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
    }

    quickExport(dataset) {
        openModal('exportForm');
        const select = document.querySelector('#exportForm select[required]');
        if (select) select.value = dataset.charAt(0).toUpperCase() + dataset.slice(1);
    }

    exportAuditLogs() {
        this.showNotification('Exporting audit logs...');
        // Implementation would export audit logs
    }

    async forceLogout(sessionId) {
        if (confirm('Force sign out this session?')) {
            try {
                await fetch(`${this.baseAPI}/sessions/${sessionId}/signout`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${this.token}` }
                    });
                this.showNotification('Session terminated');
                this.loadDashboardData();
            } catch (error) {
                this.showError('Failed to terminate session');
            }
        }
    }

    // View/Edit methods
    viewResident(residentId) {
        const resident = this.data.residents.find(r => r.resident_id === residentId);
        if (resident) {
            console.log('Viewing resident:', resident);
            this.showNotification('Resident details loaded');
        }
    }

    editResident(residentId) {
        openModal('residentForm');
    }

    viewOfficial(officialId) {
        console.log('Viewing official:', officialId);
    }

    editOfficial(officialId) {
        openModal('officialForm');
    }

    viewEvent(eventId) {
        console.log('Viewing event:', eventId);
    }

    editEvent(eventId) {
        openModal('eventForm');
    }

    viewAnnouncement(announcementId) {
        console.log('Viewing announcement:', announcementId);
    }

    editAnnouncement(announcementId) {
        openModal('announcementForm');
    }

    viewComplaint(complaintId) {
        const complaint = this.data.complaints.find(c => c.complaint_id === complaintId);
        if (complaint) {
            console.log('Viewing complaint:', complaint);
        }
    }

    editUserRoles(userId) {
        const user = this.data.users.find(u => u.user_id === userId);
        if (user) {
            alert(`Editing roles for ${user.full_name}. This would open a role editor.`);
        }
    }

    disableUser(userId) {
        if (confirm('Disable this user?')) {
            this.showNotification('User disabled');
        }
    }

    async approveUser(userId) {
        if (!confirm('Approve this user and activate the account?')) return;
        try {
            const response = await fetch(`${this.baseAPI}/users/${userId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' }
            });

            if (!response.ok) throw new Error('Failed to approve user');
            this.showNotification('User approved');
            await this.loadUsers();
        } catch (error) {
            console.error('Error approving user:', error);
            this.showError('Failed to approve user');
        }
    }

    async rejectUser(userId) {
        const reason = prompt('Reason for rejecting this user (optional):');
        if (reason === null) return; // user cancelled prompt
        try {
            const response = await fetch(`${this.baseAPI}/users/${userId}/reject`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) throw new Error('Failed to reject user');
            this.showNotification('User rejected');
            await this.loadUsers();
        } catch (error) {
            console.error('Error rejecting user:', error);
            this.showError('Failed to reject user');
        }
    }

    viewAuditDetail(logId) {
        const log = this.data.auditLogs.find(l => l.log_id === logId);
        if (log) {
            console.log('Audit detail:', log);
        }
    }

    viewImportReport(importId) {
        const imp = this.data.imports.find(i => i.import_id === importId);
        if (imp) {
            console.log('Import report:', imp);
        }
    }

    rollbackImport(importId) {
        if (confirm('Rollback this import? This action cannot be undone.')) {
            this.showNotification('Import rollback initiated');
        }
    }

    downloadExport(exportId) {
        const exp = this.data.exports.find(e => e.export_id === exportId);
        if (exp) {
            this.showNotification('Download started');
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 0, 0';
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out forwards';
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }
}

// Global functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

async function logout() {
    if (!confirm('Sign out from admin dashboard?')) return;

    const token = sessionStorage.getItem('accessToken');
    const btns = document.querySelectorAll('.btn-logout');
    const prevTexts = [];
    btns.forEach(b => { prevTexts.push(b.innerHTML); b.disabled = true; b.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Signing out...'; });
    try {
        if (token) {
            await fetch('/api/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
        }
    } catch (err) {
        console.warn('Logout API call failed (non-critical):', err?.message || err);
        } finally {
        // restore logout buttons state
        btns.forEach((b, i) => {
            b.disabled = false;
            b.innerHTML = prevTexts[i] || 'Sign out';
        });

        // clear session and redirect
        // clear timers/pollers
        try { window.adminDashboard?.stopAllSectionPollers?.(); } catch (e) {}
        try { window.adminDashboard?.clearRefreshInterval?.(); } catch (e) {}
        sessionStorage.removeItem('accessToken');
        localStorage.removeItem('adminName');
        window.location.href = '/logout.html';
        }
    }

    // Instantiate the global adminDashboard manager after DOM is ready
    function initAdminDashboardManager() {
        try {
            // instantiate and expose globally
            window.adminDashboard = new AdminDashboardManager();
            // show section corresponding to currently active nav-item (if any)
            const activeNav = document.querySelector('.nav-item.active');
            const section = activeNav?.dataset?.section || 'dashboard';
            if (window.adminDashboard && typeof window.adminDashboard.showSection === 'function') {
                // ensure content is synced with nav state
                window.adminDashboard.showSection(section);
            }
        } catch (e) {
            console.error('Failed to initialize AdminDashboardManager:', e);
        }
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        // DOM already available
        initAdminDashboardManager();
    } else {
        document.addEventListener('DOMContentLoaded', initAdminDashboardManager);
    }
