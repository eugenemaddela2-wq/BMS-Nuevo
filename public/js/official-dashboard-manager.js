class OfficialDashboardManager {
    constructor() {
        this.officialId = null;
        this.officialData = null;
        this.token = null;
        this.apiBaseUrl = '/api/official';
        this.currentPage = {};
        this.pageSize = 20;
    }

    async init() {
        try {
            // Check authentication
            this.token = localStorage.getItem('token');
            const userRole = localStorage.getItem('userRole');
            const userId = localStorage.getItem('userId');

            if (!this.token || userRole !== 'official') {
                window.location.href = '/login.html';
                return;
            }

            this.officialId = userId;

            // Setup navigation
            this.setupNavigation();
            this.setupModalHandlers();

            // Load official data
            await this.loadOfficialProfile();
            
            // Load dashboard data
            await this.loadDashboardData();

            // Setup auto-refresh
            setInterval(() => this.loadDashboardData(), 30000); // Refresh every 30 seconds
        } catch (error) {
            console.error('Dashboard initialization failed:', error);
            this.showError('Failed to initialize dashboard');
        }
    }

    setupNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.showSection(section);

                navItems.forEach(ni => ni.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    setupModalHandlers() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(`${sectionName}-section`);
        if (targetSection) {
            targetSection.classList.add('active');

            // Load section data
            this.loadSectionData(sectionName);
        }
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'tasks':
                await this.loadTasks();
                break;
            case 'complaints':
                await this.loadComplaints();
                break;
            case 'approvals':
                await this.loadApprovals();
                break;
            case 'events':
                await this.loadEvents();
                break;
            case 'announcements':
                await this.loadAnnouncements();
                break;
            case 'residents':
                await this.loadResidents();
                break;
            case 'reports':
                await this.loadReports();
                break;
        }
    }

    async loadOfficialProfile() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/profile`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load profile');

            this.officialData = await response.json();

            // Update header
            document.getElementById('officialName').textContent = this.officialData.full_name || 'Official';
            document.getElementById('officialPosition').textContent = this.officialData.position || 'Position';

            // Update profile section
            document.getElementById('profileName').textContent = this.officialData.full_name || '-';
            document.getElementById('profilePosition').textContent = this.officialData.position || '-';
            document.getElementById('profileOfficialId').textContent = this.officialData.official_id || '-';
            document.getElementById('profileStatus').textContent = this.officialData.status || '-';
            document.getElementById('profileTermStart').textContent = this.formatDate(this.officialData.term_start) || '-';
            document.getElementById('profileTermEnd').textContent = this.formatDate(this.officialData.term_end) || '-';
            document.getElementById('profileContact').textContent = this.officialData.contact_number || '-';
            document.getElementById('profileEmail').textContent = this.officialData.email || '-';
            document.getElementById('profileOfficeHours').textContent = this.officialData.office_hours || '-';
            document.getElementById('profilePuroks').textContent = this.officialData.assigned_puroks?.join(', ') || '-';
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/dashboard`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load dashboard data');

            const data = await response.json();

            // Update summary cards
            document.getElementById('complaintCount').textContent = data.complaintCount || 0;
            document.getElementById('approvalCount').textContent = data.approvalCount || 0;
            document.getElementById('eventCount').textContent = data.eventCount || 0;
            document.getElementById('announcementCount').textContent = data.announcementCount || 0;
            document.getElementById('messageCount2').textContent = data.messageCount || 0;

            // Update stats
            document.getElementById('totalResidents').textContent = data.totalResidents || 0;
            document.getElementById('newRegistrations').textContent = data.newRegistrations || 0;
            document.getElementById('flaggedHouseholds').textContent = data.flaggedHouseholds || 0;
            document.getElementById('pendingDocuments').textContent = data.pendingDocuments || 0;

            // Update notifications
            document.getElementById('notifCount').textContent = (data.complaintCount || 0) + (data.approvalCount || 0);
            document.getElementById('messageCount').textContent = data.messageCount || 0;

            // Render task queue
            this.renderTaskQueuePreview(data.tasks || []);

            // Render activity feed
            this.renderActivityFeed(data.activities || []);

            // Render notifications
            this.renderNotifications(data.notifications || []);

            // Render calendar preview
            this.renderCalendarPreview(data.upcomingEvents || []);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadTasks() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/tasks?page=1&limit=${this.pageSize}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load tasks');

            const data = await response.json();
            this.renderTasks(data.tasks || []);
        } catch (error) {
            console.error('Error loading tasks:', error);
            this.showError('Failed to load tasks');
        }
    }

    async loadComplaints() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/complaints?page=1&limit=${this.pageSize}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load complaints');

            const data = await response.json();
            this.renderComplaints(data.complaints || []);
        } catch (error) {
            console.error('Error loading complaints:', error);
            this.showError('Failed to load complaints');
        }
    }

    async loadApprovals() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/approvals?status=pending&page=1&limit=${this.pageSize}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load approvals');

            const data = await response.json();
            this.renderApprovals(data.approvals || []);
        } catch (error) {
            console.error('Error loading approvals:', error);
            this.showError('Failed to load approvals');
        }
    }

    async loadEvents() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/events?page=1&limit=${this.pageSize}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load events');

            const data = await response.json();
            this.renderEvents(data.events || []);

            // Populate event select in modal
            this.populateEventSelect(data.events || []);
        } catch (error) {
            console.error('Error loading events:', error);
            this.showError('Failed to load events');
        }
    }

    async loadAnnouncements() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/announcements?page=1&limit=${this.pageSize}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load announcements');

            const data = await response.json();
            this.renderAnnouncements(data.announcements || []);
        } catch (error) {
            console.error('Error loading announcements:', error);
            this.showError('Failed to load announcements');
        }
    }

    async loadResidents() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/residents?page=1&limit=${this.pageSize}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load residents');

            const data = await response.json();
            this.renderResidents(data.residents || []);
        } catch (error) {
            console.error('Error loading residents:', error);
            this.showError('Failed to load residents');
        }
    }

    async loadReports() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/reports`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load reports');

            const data = await response.json();
            this.renderReports(data);
        } catch (error) {
            console.error('Error loading reports:', error);
            this.showError('Failed to load reports');
        }
    }

    // RENDER METHODS

    renderTaskQueuePreview(tasks) {
        const preview = document.getElementById('taskQueuePreview');
        if (!tasks || tasks.length === 0) {
            preview.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 11px;">No pending tasks</p>';
            return;
        }

        preview.innerHTML = tasks.slice(0, 5).map(task => `
            <div class="task-item" onclick="officialDashboard.viewTask(${task.id})">
                <div class="task-item-info">
                    <div class="task-item-title">${task.title}</div>
                    <div class="task-item-meta">${this.formatDate(task.assigned_date)}</div>
                </div>
                <span class="badge badge-${task.status.toLowerCase()}">${task.status}</span>
            </div>
        `).join('');
    }

    renderActivityFeed(activities) {
        const feed = document.getElementById('activityFeed');
        if (!activities || activities.length === 0) {
            feed.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 11px;">No recent activity</p>';
            return;
        }

        feed.innerHTML = activities.slice(0, 8).map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${this.getActivityIcon(activity.action_type)}</div>
                <div class="activity-content">
                    <div class="activity-title">${activity.description}</div>
                    <div class="activity-meta">${this.formatTime(activity.timestamp)}</div>
                </div>
            </div>
        `).join('');
    }

    renderNotifications(notifications) {
        const notifList = document.getElementById('notificationsList');
        if (!notifications || notifications.length === 0) {
            notifList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px; font-size: 11px;">No alerts</p>';
            return;
        }

        notifList.innerHTML = notifications.map(notif => `
            <div class="task-item" onclick="officialDashboard.viewNotification(${notif.id})">
                <div class="task-item-info">
                    <div class="task-item-title">${notif.title}</div>
                    <div class="task-item-meta">${this.formatTime(notif.created_at)}</div>
                </div>
                <span class="badge badge-${notif.priority.toLowerCase()}">${notif.priority}</span>
            </div>
        `).join('');
    }

    renderCalendarPreview(events) {
        const calendar = document.getElementById('calendarPreview');
        
        // Simple calendar display
        const today = new Date();
        const daysHtml = [];
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() + i);
            const dayNum = date.getDate();
            const hasEvent = events.some(e => new Date(e.event_date).toDateString() === date.toDateString());
            
            daysHtml.push(`
                <div class="calendar-day ${hasEvent ? 'has-event' : ''}">
                    <div class="calendar-day-num">${dayNum}</div>
                    ${hasEvent ? '<div class="calendar-day-events">📅</div>' : ''}
                </div>
            `);
        }
        
        calendar.innerHTML = `<div class="calendar-grid">${daysHtml.join('')}</div>`;
    }

    renderTasks(tasks) {
        const tbody = document.getElementById('tasksList');
        if (!tasks || tasks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">No tasks</td></tr>';
            return;
        }

        tbody.innerHTML = tasks.map(task => `
            <tr>
                <td>${task.type}</td>
                <td>${task.title}</td>
                <td>${this.formatDate(task.assigned_date)}</td>
                <td><span class="badge badge-${task.status.toLowerCase()}">${task.status}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="officialDashboard.viewTask(${task.id})">View</button>
                </td>
            </tr>
        `).join('');
    }

    renderComplaints(complaints) {
        const tbody = document.getElementById('complaintsList');
        if (!complaints || complaints.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No complaints assigned</td></tr>';
            return;
        }

        tbody.innerHTML = complaints.map(complaint => `
            <tr>
                <td>#${complaint.complaint_id}</td>
                <td>${complaint.complainant_name}</td>
                <td>${complaint.category}</td>
                <td>${this.formatDate(complaint.date_reported)}</td>
                <td><span class="badge badge-${complaint.status.toLowerCase()}">${complaint.status}</span></td>
                <td><span class="badge badge-${complaint.priority.toLowerCase()}">${complaint.priority}</span></td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="officialDashboard.viewComplaint(${complaint.complaint_id})">View</button>
                    <button class="btn btn-secondary btn-sm" onclick="officialDashboard.updateComplaintStatus(${complaint.complaint_id})">Update</button>
                </td>
            </tr>
        `).join('');
    }

    renderApprovals(approvals) {
        const tbody = document.getElementById('approvalsList');
        if (!approvals || approvals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px; color: var(--text-muted);">No pending approvals</td></tr>';
            return;
        }

        tbody.innerHTML = approvals.map(approval => `
            <tr>
                <td>${approval.document_type}</td>
                <td>${approval.requester_name}</td>
                <td>${this.formatDate(approval.date_requested)}</td>
                <td>${approval.purpose}</td>
                <td><span class="badge badge-pending">${approval.status}</span></td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="officialDashboard.approveDocument(${approval.id})">Approve</button>
                    <button class="btn btn-danger btn-sm" onclick="officialDashboard.rejectDocument(${approval.id})">Reject</button>
                </td>
            </tr>
        `).join('');
    }

    renderEvents(events) {
        const tbody = document.getElementById('eventsList');
        if (!events || events.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No events</td></tr>';
            return;
        }

        tbody.innerHTML = events.map(event => `
            <tr>
                <td>${event.title}</td>
                <td>${this.formatDateTime(event.event_date)}</td>
                <td>${event.venue}</td>
                <td>${event.organizer}</td>
                <td>${event.participant_count || 0}</td>
                <td>${event.official_rsvp || 'Not Responded'}</td>
                <td>
                    <button class="btn btn-primary btn-sm" onclick="officialDashboard.viewEvent(${event.id})">View</button>
                </td>
            </tr>
        `).join('');
    }

    renderAnnouncements(announcements) {
        const container = document.getElementById('announcementsList');
        if (!announcements || announcements.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No announcements</p>';
            return;
        }

        container.innerHTML = announcements.map(ann => `
            <div style="background: rgba(255,255,255,0.05); padding: 12px; margin-bottom: 10px; border-radius: 6px; border-left: 3px solid var(--accent-cyan);">
                <div style="font-weight: 600; margin-bottom: 5px;">${ann.title}</div>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 8px;">${ann.content}</div>
                <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 10px;">By ${ann.creator} • ${this.formatDate(ann.created_at)}</div>
                <button class="btn btn-secondary btn-sm" onclick="officialDashboard.viewAnnouncement(${ann.id})">View More</button>
            </div>
        `).join('');
    }

    renderResidents(residents) {
        const tbody = document.getElementById('residentsList');
        if (!residents || residents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No residents</td></tr>';
            return;
        }

        tbody.innerHTML = residents.map(resident => {
            const age = this.calculateAge(resident.date_of_birth);
            return `
                <tr>
                    <td>${resident.first_name} ${resident.last_name}</td>
                    <td>${age}</td>
                    <td>${resident.purok}</td>
                    <td>${resident.contact_number || '-'}</td>
                    <td><span class="badge badge-${resident.status.toLowerCase()}">${resident.status}</span></td>
                    <td>${resident.flags?.join(', ') || 'None'}</td>
                    <td>
                        <button class="btn btn-primary btn-sm" onclick="officialDashboard.viewResident(${resident.resident_id})">View</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderReports(data) {
        // Update complaint stats
        document.getElementById('totalComplaints').textContent = data.totalComplaints || 0;
        document.getElementById('resolvedComplaints').textContent = data.resolvedComplaints || 0;
        document.getElementById('inProgressComplaints').textContent = data.inProgressComplaints || 0;
        document.getElementById('escalatedComplaints').textContent = data.escalatedComplaints || 0;

        // Update response time metrics
        document.getElementById('avgResponseTime').textContent = data.avgResponseTime || '0 hours';
        document.getElementById('slaCompliance').textContent = data.slaCompliance || '0%';

        // Render audit trail
        const auditTbody = document.getElementById('auditTrailList');
        if (!data.auditTrail || data.auditTrail.length === 0) {
            auditTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 15px; color: var(--text-muted);">No audit records</td></tr>';
            return;
        }

        auditTbody.innerHTML = data.auditTrail.map(record => `
            <tr>
                <td>${this.formatTime(record.timestamp)}</td>
                <td>${record.action}</td>
                <td>${record.record_type} #${record.record_id}</td>
                <td>${record.details || '-'}</td>
            </tr>
        `).join('');
    }

    // UTILITY METHODS

    getActivityIcon(actionType) {
        const icons = {
            'approved': '✅',
            'rejected': '❌',
            'assigned': '📌',
            'updated': '📝',
            'resolved': '✔️',
            'escalated': '⬆️',
            'commented': '💬',
            'created': '✨'
        };
        return icons[actionType] || '•';
    }

    populateEventSelect(events) {
        const select = document.getElementById('eventSelectForRsvp');
        if (!events || events.length === 0) {
            select.innerHTML = '<option>No upcoming events</option>';
            return;
        }

        select.innerHTML = events.map(event => `
            <option value="${event.id}">${event.title} - ${this.formatDate(event.event_date)}</option>
        `).join('');
    }

    calculateAge(dateOfBirth) {
        if (!dateOfBirth) return '-';
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    formatDateTime(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    formatTime(date) {
        if (!date) return '-';
        const now = new Date();
        const eventDate = new Date(date);
        const diffMs = now - eventDate;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        
        const diffHours = Math.floor(diffMins / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        
        const diffDays = Math.floor(diffHours / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return this.formatDate(date);
    }

    // ACTION METHODS

    viewTask(id) {
        console.log('Viewing task:', id);
    }

    viewComplaint(id) {
        console.log('Viewing complaint:', id);
    }

    updateComplaintStatus(id) {
        console.log('Updating complaint status:', id);
    }

    viewEvent(id) {
        console.log('Viewing event:', id);
    }

    viewAnnouncement(id) {
        console.log('Viewing announcement:', id);
    }

    viewResident(id) {
        console.log('Viewing resident:', id);
    }

    viewNotification(id) {
        console.log('Viewing notification:', id);
    }

    approveDocument(id) {
        console.log('Approving document:', id);
        this.showNotification('Document approved successfully');
    }

    rejectDocument(id) {
        console.log('Rejecting document:', id);
        this.showNotification('Document rejected');
    }

    async submitRsvp() {
        try {
            const eventSelect = document.getElementById('eventSelectForRsvp');
            const eventId = eventSelect.value;
            const response = await fetch(`${this.apiBaseUrl}/events/${eventId}/rsvp`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    response: 'attending'
                })
            });

            if (response.ok) {
                this.showNotification('RSVP submitted successfully');
                closeModal('eventResponseForm');
            } else {
                this.showError('Failed to submit RSVP');
            }
        } catch (error) {
            console.error('Error submitting RSVP:', error);
            this.showError('Failed to submit RSVP');
        }
    }

    async publishAnnouncement() {
        try {
            const form = document.querySelector('#announcementForm form');
            const formData = new FormData(form);

            const response = await fetch(`${this.apiBaseUrl}/announcements`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: form.querySelector('input[type="text"]').value,
                    content: form.querySelector('textarea').value
                })
            });

            if (response.ok) {
                this.showNotification('Announcement published successfully');
                closeModal('announcementForm');
                await this.loadAnnouncements();
            } else {
                this.showError('Failed to publish announcement');
            }
        } catch (error) {
            console.error('Error publishing announcement:', error);
            this.showError('Failed to publish announcement');
        }
    }

    showNotification(message) {
        const notif = document.createElement('div');
        notif.className = 'notification';
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 3000);
    }

    showError(message) {
        const notif = document.createElement('div');
        notif.className = 'notification error';
        notif.textContent = message;
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 4000);
    }
}

// GLOBAL FUNCTIONS

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function logout() {
    if (confirm('Are you sure you want to sign out?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        window.location.href = '/login.html';
    }
}

// Initialize dashboard when DOM is ready
const officialDashboard = new OfficialDashboardManager();
document.addEventListener('DOMContentLoaded', () => officialDashboard.init());
