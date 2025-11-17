/**
 * ResidentDashboardManager - Complete dashboard state management and UI control
 */

class ResidentDashboardManager {
    constructor() {
        this.data = {
            profile: null,
            household: [],
            complaints: [],
            documents: [],
            events: [],
            announcements: [],
            messages: []
        };
        // token now read using getter to remain consistent during the session
        this.baseAPI = '/api/resident';
        this.init();
    }

    get token() {
        return sessionStorage.getItem('accessToken');
    }

    async init() {
        // Check if authenticated
        if (!this.token) {
            window.location.href = '/login.html';
            return;
        }

        // Setup event listeners
        this.setupNavigation();
        this.setupClock();
        
        // Load initial data
        await this.loadDashboardData();
        
        // Setup modal close on background click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    closeModal(modal.id);
                }
            });
        });
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

    setupClock() {
        const updateClock = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit',
                hour12: false 
            });
            const clockElement = document.querySelector('[data-clock]');
            if (clockElement) clockElement.textContent = timeStr;
        };
        
        updateClock();
        setInterval(updateClock, 1000);
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const section = document.querySelector(`#${sectionName}-section`);
        if (section) {
            section.classList.add('active');
        }

        // Update nav items
        document.querySelectorAll('[data-section]').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
            }
        });

        // Load section-specific data
        switch(sectionName) {
            case 'profile':
                this.populateProfile();
                break;
            case 'household':
                this.loadHousehold();
                break;
            case 'documents':
                this.loadDocuments();
                break;
            case 'complaints':
                this.loadComplaints();
                break;
            case 'events':
                this.loadEvents();
                break;
            case 'announcements':
                this.loadAnnouncements();
                break;
            case 'messages':
                this.loadMessages();
                break;
        }
    }

    async loadDashboardData() {
        try {
            const response = await fetch(`${this.baseAPI}/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (!response.ok) throw new Error('Failed to load dashboard');
            
            const data = await response.json();
            
            // Update profile
            this.data.profile = data.profile || {};
            document.getElementById('resFullName').textContent = 
                `${this.data.profile.first_name || ''} ${this.data.profile.last_name || ''}`;
            
            // Update counters
            document.getElementById('documentCount').textContent = 
                data.statistics?.active_document_requests || 0;
            document.getElementById('complaintCount').textContent = 
                data.statistics?.total_complaints || 0;
            document.getElementById('eventCount').textContent = 
                data.statistics?.upcoming_events || 0;
            document.getElementById('announcementCount').textContent = 
                data.statistics?.announcements || 0;

            // Populate recent activity
            this.populateRecentActivity(data.recent_activity || []);
            
            this.populateProfile();

        } catch (error) {
            console.error('Error loading dashboard:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    populateProfile() {
        const p = this.data.profile;
        
        document.getElementById('resId').textContent = p.resident_id || '-';
        document.getElementById('resName').textContent = 
            `${p.first_name || ''} ${p.middle_name || ''} ${p.last_name || ''}`.trim();
        document.getElementById('resDOB').textContent = p.date_of_birth || '-';
        document.getElementById('resSex').textContent = p.sex || '-';
        document.getElementById('resPurok').textContent = p.purok_zone || '-';
        document.getElementById('resAddress').textContent = p.address || '-';
        document.getElementById('resContact').textContent = p.contact_number || '-';
        document.getElementById('resEmail').textContent = p.email || '-';
        document.getElementById('resHouseholdId').textContent = p.household_id || '-';
        document.getElementById('resOccupation').textContent = p.occupation || '-';
        document.getElementById('resMaritalStatus').textContent = p.marital_status || '-';
    }

    async loadHousehold() {
        try {
            const response = await fetch(`${this.baseAPI}/household`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load household');
            
            const data = await response.json();
            this.data.household = data.household || [];
            this.renderHousehold();

        } catch (error) {
            console.error('Error loading household:', error);
            this.showError('Failed to load household members');
        }
    }

    renderHousehold() {
        const container = document.getElementById('householdList');
        
        if (this.data.household.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No household members added yet.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Name</th><th>Relation</th><th>Date of Birth</th><th>Age</th><th>Sex</th></tr></thead><tbody>';
        
        this.data.household.forEach(member => {
            const age = this.calculateAge(member.date_of_birth);
            html += `
                <tr>
                    <td>${member.first_name} ${member.last_name}</td>
                    <td>${member.relation || '-'}</td>
                    <td>${member.date_of_birth || '-'}</td>
                    <td>${age}</td>
                    <td>${member.sex || '-'}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    async loadDocuments() {
        try {
            const response = await fetch(`${this.baseAPI}/documents`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load documents');
            
            const data = await response.json();
            this.data.documents = data.documents || [];
            this.renderDocuments();

        } catch (error) {
            console.error('Error loading documents:', error);
            this.showError('Failed to load documents');
        }
    }

    renderDocuments() {
        const container = document.getElementById('documentsList');
        
        if (this.data.documents.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No document requests yet.</p>';
            return;
        }

        let html = '<table><thead><tr><th>Type</th><th>Date Requested</th><th>Status</th><th>Date Ready</th></tr></thead><tbody>';
        
        this.data.documents.forEach(doc => {
            const statusClass = this.getStatusColor(doc.status);
            html += `
                <tr>
                    <td><strong>${doc.document_type || '-'}</strong></td>
                    <td>${new Date(doc.date_requested).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${statusClass}">${doc.status}</span></td>
                    <td>${doc.date_ready ? new Date(doc.date_ready).toLocaleDateString() : '-'}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
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
        const container = document.getElementById('complaintsList');
        
        if (this.data.complaints.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No complaints filed yet.</p>';
            return;
        }

        let html = '';
        
        this.data.complaints.forEach(complaint => {
            const statusClass = this.getStatusColor(complaint.status);
            html += `
                <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <div>
                            <h4 style="margin: 0 0 5px 0; font-size: 12px; font-weight: 600;">${complaint.subject}</h4>
                            <p style="margin: 0; color: var(--text-muted); font-size: 11px;">${complaint.category} • ${new Date(complaint.date_filed).toLocaleDateString()}</p>
                        </div>
                        <span class="status-badge status-${statusClass}">${complaint.status}</span>
                    </div>
                    <p style="margin: 0; font-size: 12px; color: var(--text-muted);">${complaint.description}</p>
                    ${complaint.location ? `<p style="margin: 8px 0 0 0; font-size: 11px; color: var(--text-muted);"><strong>Location:</strong> ${complaint.location}</p>` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html || '<p style="color: var(--text-muted);">No complaints to display.</p>';
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
        const container = document.getElementById('eventsList');
        
        if (this.data.events.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No upcoming events.</p>';
            return;
        }

        let html = '';
        
        this.data.events.forEach((event, idx) => {
            html += `
                <div style="background: linear-gradient(135deg, rgba(79,195,220,0.1), rgba(38,208,124,0.1)); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 15px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 5px 0; font-size: 12px; font-weight: 600;">${event.event_name}</h4>
                            <p style="margin: 0; color: var(--text-muted); font-size: 11px;">📅 ${new Date(event.event_date).toLocaleDateString()}</p>
                            <p style="margin: 5px 0 0 0; color: var(--text-muted); font-size: 11px;">📍 ${event.location || 'TBA'}</p>
                        </div>
                        <button class="btn btn-primary" style="font-size: 11px; padding: 6px 12px;" onclick="openEventModal(${event.event_id})">
                            <i class="fas fa-ticket-alt"></i> Register
                        </button>
                    </div>
                    <p style="margin: 10px 0 0 0; font-size: 11px; color: var(--text-muted);">${event.description}</p>
                </div>
            `;
        });
        
        // Populate event select dropdown
        let eventOptions = '<option>Select event...</option>';
        this.data.events.forEach(event => {
            eventOptions += `<option value="${event.event_id}">${event.event_name}</option>`;
        });
        const eventSelect = document.getElementById('eventSelect');
        if (eventSelect) eventSelect.innerHTML = eventOptions;
        
        container.innerHTML = html || '<p style="color: var(--text-muted);">No events to display.</p>';
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
        const container = document.getElementById('announcementsList');
        
        if (this.data.announcements.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No announcements yet.</p>';
            return;
        }

        let html = '';
        
        this.data.announcements.forEach(ann => {
            html += `
                <div style="background: rgba(255,255,255,0.05); border-left: 3px solid #4fc3dc; border-radius: 8px; padding: 15px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                        <h4 style="margin: 0; font-size: 12px; font-weight: 600; color: #4fc3dc;">${ann.title}</h4>
                        <span style="font-size: 11px; color: var(--text-muted);">${new Date(ann.date_posted).toLocaleDateString()}</span>
                    </div>
                    <p style="margin: 0; font-size: 12px; color: var(--text-muted);">${ann.content}</p>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async loadMessages() {
        try {
            const response = await fetch(`${this.baseAPI}/messages`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) throw new Error('Failed to load messages');
            
            const data = await response.json();
            this.data.messages = data.messages || [];
            this.renderMessages();

        } catch (error) {
            console.error('Error loading messages:', error);
            this.showError('Failed to load messages');
        }
    }

    renderMessages() {
        const container = document.getElementById('messagesList');
        
        if (this.data.messages.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No messages yet.</p>';
            return;
        }

        let html = '<table><thead><tr><th>From</th><th>Subject</th><th>Date</th><th>Status</th></tr></thead><tbody>';
        
        this.data.messages.forEach(msg => {
            const statusClass = msg.is_read ? 'completed' : 'pending';
            html += `
                <tr>
                    <td>${msg.sender_name || 'System'}</td>
                    <td>${msg.subject}</td>
                    <td>${new Date(msg.date_sent).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${statusClass}">${msg.is_read ? 'Read' : 'Unread'}</span></td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
    }

    populateRecentActivity(activities) {
        const container = document.getElementById('recentActivityList');
        
        if (activities.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">No recent activity.</p>';
            return;
        }

        let html = '';
        activities.forEach(activity => {
            let icon = '📌';
            if (activity.type.includes('complaint')) icon = '⚠️';
            if (activity.type.includes('document')) icon = '📋';
            if (activity.type.includes('event')) icon = '🎉';
            
            html += `
                <div style="display: flex; gap: 12px; padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <div style="font-size: 18px;">${icon}</div>
                    <div style="flex: 1;">
                        <p style="margin: 0 0 3px 0; font-size: 12px; font-weight: 500;">${activity.title}</p>
                        <p style="margin: 0; font-size: 11px; color: var(--text-muted);">${new Date(activity.date).toLocaleDateString()}</p>
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted);">${activity.status}</div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    async submitComplaint() {
        try {
            const form = document.querySelector('#complaintForm form');
            const formData = new FormData(form);

            const response = await fetch(`${this.baseAPI}/complaints`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    category: formData.get('category'),
                    subject: formData.get('subject'),
                    description: formData.get('description'),
                    location: formData.get('location'),
                    is_confidential: form.querySelector('[name="confidential"]').checked
                })
            });

            if (!response.ok) throw new Error('Failed to submit complaint');

            this.showNotification('Complaint filed successfully');
            closeModal('complaintForm');
            form.reset();
            this.loadComplaints();

        } catch (error) {
            console.error('Error submitting complaint:', error);
            this.showError('Failed to submit complaint');
        }
    }

    async submitDocumentRequest() {
        try {
            const form = document.querySelector('#documentForm form');
            const formData = new FormData(form);

            const response = await fetch(`${this.baseAPI}/documents`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    document_type: formData.get('documentType'),
                    purpose: formData.get('purpose')
                })
            });

            if (!response.ok) throw new Error('Failed to submit request');

            this.showNotification('Document request submitted successfully');
            closeModal('documentForm');
            form.reset();
            this.loadDocuments();

        } catch (error) {
            console.error('Error submitting document request:', error);
            this.showError('Failed to submit document request');
        }
    }

    async submitEventRegistration() {
        try {
            const eventSelect = document.getElementById('eventSelect');
            const attendeeCount = document.getElementById('attendeeCountField');
            const specialRequirements = document.getElementById('specialRequirementsField');
            
            const eventId = eventSelect.value;
            
            if (!eventId || eventId === 'Select event...') {
                this.showError('Please select an event');
                return;
            }

            const response = await fetch(`${this.baseAPI}/events/${eventId}/register`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    number_of_attendees: parseInt(attendeeCount.value),
                    special_requirements: specialRequirements.value
                })
            });

            if (!response.ok) throw new Error('Failed to register event');

            this.showNotification('Event registration successful');
            closeModal('eventForm');
            eventSelect.value = 'Select event...';
            attendeeCount.value = '1';
            specialRequirements.value = '';

        } catch (error) {
            console.error('Error registering event:', error);
            this.showError('Failed to register event');
        }
    }

    async submitHouseholdMember() {
        try {
            const form = document.querySelector('#householdForm form');
            const formData = new FormData(form);

            const response = await fetch(`${this.baseAPI}/household`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    first_name: formData.get('firstName'),
                    last_name: formData.get('lastName'),
                    date_of_birth: formData.get('dateOfBirth'),
                    sex: formData.get('sex'),
                    relation: formData.get('relation')
                })
            });

            if (!response.ok) throw new Error('Failed to add household member');

            this.showNotification('Household member added successfully');
            closeModal('householdForm');
            form.reset();
            this.loadHousehold();

        } catch (error) {
            console.error('Error adding household member:', error);
            this.showError('Failed to add household member');
        }
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

    getStatusColor(status) {
        const statusMap = {
            'pending': 'pending',
            'processing': 'processing',
            'approved': 'approved',
            'completed': 'completed',
            'rejected': 'rejected',
            'in-progress': 'in-progress'
        };
        return statusMap[status?.toLowerCase()] || 'pending';
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

// Global functions for HTML onclick handlers
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

function openEventModal(eventId) {
    document.getElementById('eventIdField').value = eventId;
    openModal('eventForm');
}

async function logout() {
    if (!confirm('Are you sure you want to sign out?')) return;

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
        console.warn('Logout API failed (non-critical):', err?.message || err);
    } finally {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('userData');
        localStorage.removeItem('token');
        residentDashboard?.showNotification?.('Signed out successfully');
        btns.forEach((b, i) => { b.disabled = false; b.innerHTML = prevTexts[i] || 'Sign Out'; });
        window.location.href = '/login.html';
    }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.residentDashboard = new ResidentDashboardManager();
});
