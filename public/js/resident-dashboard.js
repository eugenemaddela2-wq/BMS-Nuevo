/* ============================================================
   RESIDENT DASHBOARD - JAVASCRIPT FUNCTIONALITY
   Handles Navigation, Modals, Form Submissions, API Calls
============================================================ */

// Configuration & Constants
const API_BASE_URL = '/api';
const RESIDENT_ID = localStorage.getItem('residentId') || '1'; // Get from auth context

// Initialize Dashboard
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

/**
 * Initialize Dashboard - Setup sidebar navigation
 */
function initializeDashboard() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const section = item.getAttribute('data-section');
            navigateToSection(section);
        });
    });
}

/**
 * Navigate between dashboard sections
 */
function navigateToSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    // Show selected section
    const sectionElement = document.getElementById(`${sectionName}-section`);
    if (sectionElement) {
        sectionElement.classList.add('active');
    }

    // Mark nav item as active
    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavItem) {
        activeNavItem.classList.add('active');
    }

    // Load section-specific data
    loadSectionData(sectionName);
}

/**
 * Load data for specific sections
 */
function loadSectionData(sectionName) {
    switch(sectionName) {
        case 'profile':
            loadProfileData();
            break;
        case 'household':
            loadHouseholdData();
            break;
        case 'documents':
            loadDocumentsData();
            break;
        case 'complaints':
            loadComplaintsData();
            break;
        case 'events':
            loadEventsData();
            break;
        case 'announcements':
            loadAnnouncementsData();
            break;
        case 'messages':
            loadMessagesData();
            break;
    }
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
    // Modal handling
    setupModalHandlers();
    
    // FAQ Toggle
    setupFAQHandlers();
    
    // Profile dropdown
    setupProfileDropdown();
    
    // Notification close buttons
    setupNotificationHandlers();
    
    // FAB Menu
    setupFABMenu();
}

/**
 * Setup Modal Handlers
 */
function setupModalHandlers() {
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Form submissions
    document.querySelectorAll('.modal-form').forEach(form => {
        form.addEventListener('submit', handleFormSubmit);
    });
}

/**
 * Open Modal
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Close Modal
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Handle Form Submissions
 */
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const formData = new FormData(form);
    const modalId = form.closest('.modal').id;
    
    // Get endpoint based on modal type
    let endpoint = '';
    let method = 'POST';
    
    if (modalId === 'complaintForm') {
        endpoint = `${API_BASE_URL}/complaints`;
    } else if (modalId === 'documentForm') {
        endpoint = `${API_BASE_URL}/documents/requests`;
    } else if (modalId === 'eventForm') {
        endpoint = `${API_BASE_URL}/events/register`;
    } else if (modalId === 'householdForm') {
        endpoint = `${API_BASE_URL}/residents/${RESIDENT_ID}/household`;
    }
    
    try {
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;
        
        // Submit form
        const response = await fetch(endpoint, {
            method: method,
            body: formData,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            showNotification('✓ Submitted successfully!', 'success');
            closeModal(modalId);
            form.reset();
            
            // Reload relevant data
            const sectionName = getActiveSectionName();
            loadSectionData(sectionName);
        } else {
            const error = await response.json();
            showNotification(`Error: ${error.message}`, 'error');
        }
        
        // Restore button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        
    } catch (error) {
        console.error('Form submission error:', error);
        showNotification('An error occurred. Please try again.', 'error');
    }
}

/**
 * Setup FAQ Handlers
 */
function setupFAQHandlers() {
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const faqItem = question.closest('.faq-item');
            faqItem.classList.toggle('open');
        });
    });
}

/**
 * Setup Profile Dropdown
 */
function setupProfileDropdown() {
    const avatar = document.querySelector('.avatar');
    if (avatar) {
        avatar.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
}

/**
 * Setup Notification Handlers
 */
function setupNotificationHandlers() {
    document.querySelectorAll('.notif-close').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.closest('.notification-item').style.display = 'none';
        });
    });
}

/**
 * Setup FAB Menu
 */
function setupFABMenu() {
    const fabMain = document.querySelector('.fab-main');
    if (fabMain) {
        fabMain.addEventListener('click', () => {
            const menu = document.querySelector('.fab-options');
            menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';
        });
    }
}

/**
 * Show Notification
 */
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-item notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <div>
            <p class="notif-title">${message}</p>
            <p class="notif-time">Just now</p>
        </div>
        <button class="notif-close"><i class="fas fa-times"></i></button>
    `;
    
    const notificationList = document.querySelector('.notification-list');
    if (notificationList) {
        notificationList.insertBefore(notification, notificationList.firstChild);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.display = 'none';
        }, 5000);
    }
}

/**
 * Load Dashboard Data (Home Section)
 */
async function loadDashboardData() {
    try {
        const response = await fetch(`${API_BASE_URL}/residents/${RESIDENT_ID}/dashboard`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateDashboardSummary(data);
        }
    } catch (error) {
        console.error('Dashboard data loading error:', error);
    }
}

/**
 * Update Dashboard Summary Cards
 */
function updateDashboardSummary(data) {
    // This would be called with real data from API
    // Example: document.querySelector('.card-requests .card-count').textContent = data.activeRequests;
}

/**
 * Load Profile Data
 */
async function loadProfileData() {
    try {
        const response = await fetch(`${API_BASE_URL}/residents/${RESIDENT_ID}/profile`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Update profile fields with real data
        }
    } catch (error) {
        console.error('Profile loading error:', error);
    }
}

/**
 * Edit Profile
 */
function editProfile() {
    alert('Edit profile functionality coming soon!');
    // This would open an edit form or redirect to edit page
}

/**
 * Load Household Data
 */
async function loadHouseholdData() {
    try {
        const response = await fetch(`${API_BASE_URL}/residents/${RESIDENT_ID}/household`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const members = await response.json();
            // Update household table with real data
        }
    } catch (error) {
        console.error('Household data loading error:', error);
    }
}

/**
 * Load Documents Data
 */
async function loadDocumentsData() {
    try {
        const response = await fetch(`${API_BASE_URL}/residents/${RESIDENT_ID}/documents`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const documents = await response.json();
            // Update documents table with real data
        }
    } catch (error) {
        console.error('Documents loading error:', error);
    }
}

/**
 * Load Complaints Data
 */
async function loadComplaintsData() {
    try {
        const response = await fetch(`${API_BASE_URL}/residents/${RESIDENT_ID}/complaints`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const complaints = await response.json();
            // Update complaints list with real data
        }
    } catch (error) {
        console.error('Complaints loading error:', error);
    }
}

/**
 * Load Events Data
 */
async function loadEventsData() {
    try {
        const response = await fetch(`${API_BASE_URL}/events`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const events = await response.json();
            // Update events list with real data
            updateLiveCalendar();
        }
    } catch (error) {
        console.error('Events loading error:', error);
    }
}

/**
 * Load Announcements Data
 */
async function loadAnnouncementsData() {
    try {
        const response = await fetch(`${API_BASE_URL}/announcements`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const announcements = await response.json();
            // Update announcements list with real data
        }
    } catch (error) {
        console.error('Announcements loading error:', error);
    }
}

/**
 * Load Messages Data
 */
async function loadMessagesData() {
    try {
        const response = await fetch(`${API_BASE_URL}/residents/${RESIDENT_ID}/messages`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const messages = await response.json();
            // Update messages list with real data
        }
    } catch (error) {
        console.error('Messages loading error:', error);
    }
}

/**
 * Register for Event
 */
async function registerEvent(eventId) {
    try {
        const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                resident_id: RESIDENT_ID,
                attendees: 1
            })
        });
        
        if (response.ok) {
            showNotification('✓ Successfully registered for event!', 'success');
            loadEventsData();
        } else {
            showNotification('Failed to register for event', 'error');
        }
    } catch (error) {
        console.error('Event registration error:', error);
        showNotification('An error occurred', 'error');
    }
}

/**
 * Unregister from Event
 */
async function unregisterEvent(eventId) {
    if (confirm('Are you sure you want to cancel your registration?')) {
        try {
            const response = await fetch(`${API_BASE_URL}/events/${eventId}/register`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });
            
            if (response.ok) {
                showNotification('✓ Registration cancelled', 'success');
                loadEventsData();
            }
        } catch (error) {
            console.error('Unregister error:', error);
        }
    }
}

/**
 * View Announcements (navigate to section)
 */
function viewAnnouncements() {
    navigateToSection('announcements');
}

/**
 * Open Announcement Detail
 */
function openAnnouncement(announcementId) {
    // Navigate to detail view or open modal
    navigateToSection('announcements');
}

/**
 * Get Currently Active Section
 */
function getActiveSectionName() {
    const activeSection = document.querySelector('.content-section.active');
    if (!activeSection) return 'home';
    
    const id = activeSection.id;
    return id.replace('-section', '');
}

/**
 * Logout
 */
function logout() {
    if (confirm('Are you sure you want to sign out?')) {
        // Clear all stored data from both storage systems
        localStorage.removeItem('authToken');
        localStorage.removeItem('residentId');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('userData');

        // Call logout API if token exists
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('accessToken');
        if (token) {
            try {
                fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token }
                }).catch(err => console.log('Logout API call failed (non-critical):', err));
            } catch(err) {
                console.log('Logout API call failed (non-critical):', err);
            }
        }

        window.location.href = '/login.html';
    }
}

/**
 * Utility: Format Date
 */
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Utility: Calculate Age from DOB
 */
function calculateAge(dob) {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    return age;
}

/**
 * Admin Helper: Approve/Reject Document
 */
async function approveDocument(documentId) {
    try {
        const response = await fetch(`${API_BASE_URL}/documents/${documentId}/approve`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            showNotification('✓ Document approved', 'success');
            loadDocumentsData();
        }
    } catch (error) {
        console.error('Approval error:', error);
    }
}

/**
 * Admin Helper: Reject Document
 */
async function rejectDocument(documentId, reason) {
    try {
        const response = await fetch(`${API_BASE_URL}/documents/${documentId}/reject`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason })
        });
        
        if (response.ok) {
            showNotification('✓ Document rejected', 'success');
            loadDocumentsData();
        }
    } catch (error) {
        console.error('Rejection error:', error);
    }
}

/**
 * Admin Helper: Update Complaint Status
 */
async function updateComplaintStatus(complaintId, status) {
    try {
        const response = await fetch(`${API_BASE_URL}/complaints/${complaintId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });
        
        if (response.ok) {
            showNotification('✓ Complaint status updated', 'success');
            loadComplaintsData();
        }
    } catch (error) {
        console.error('Status update error:', error);
    }
}

/**
 * Real-Time Clock Updates
 */
function startRealTimeClock() {
    // Update clock every second
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
    
    // Update all clock displays if they exist
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
 * Live Data Updates - Refresh data periodically
 */
function startLiveDataUpdates() {
    // Refresh dashboard data every 30 seconds
    setInterval(() => {
        const activeSection = getActiveSectionName();
        loadSectionData(activeSection);
        updateLiveActivityFeed();
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
            day.style.backgroundColor = '#0066cc';
            day.style.color = 'white';
            day.style.fontWeight = 'bold';
        }
    });
    
    // Update calendar month/year
    const monthYear = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const calendarMonthEl = document.getElementById('calendarMonth');
    if (calendarMonthEl) {
        calendarMonthEl.textContent = monthYear;
    }
}

/**
 * Update Live Activity Feed
 */
async function updateLiveActivityFeed() {
    try {
        const response = await fetch(`${API_BASE_URL}/residents/${RESIDENT_ID}/activity-feed`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        
        if (response.ok) {
            const activities = await response.json();
            updateActivityTimeline(activities);
        }
    } catch (error) {
        console.error('Activity feed update error:', error);
    }
}

/**
 * Update Activity Timeline with Latest Data
 */
function updateActivityTimeline(activities) {
    const timeline = document.querySelector('.timeline');
    if (!timeline) return;
    
    // Keep most recent 5 items
    const items = timeline.querySelectorAll('.timeline-item');
    if (items.length > 5) {
        items[items.length - 1].remove();
    }
}

// Export functions for use in HTML
window.openModal = openModal;
window.closeModal = closeModal;
window.editProfile = editProfile;
window.registerEvent = registerEvent;
window.unregisterEvent = unregisterEvent;
window.viewAnnouncements = viewAnnouncements;
window.openAnnouncement = openAnnouncement;
window.logout = logout;
window.toggleFAQ = (element) => {
    element.closest('.faq-item').classList.toggle('open');
};
window.updateClockDisplay = updateClockDisplay;
window.startRealTimeClock = startRealTimeClock;
window.startLiveDataUpdates = startLiveDataUpdates;
};
