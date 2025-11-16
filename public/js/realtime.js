/**
 * Real-Time Clock and Calendar Utility
 * Updates clock every 1 second and calendar every 30 seconds
 */

class RealTimeUpdater {
    constructor() {
        this.clockIntervalId = null;
        this.calendarIntervalId = null;
    }

    /**
     * Format time as HH:MM:SS AM/PM
     */
    formatTime(date) {
        let hours = date.getHours();
        let minutes = date.getMinutes();
        let seconds = date.getSeconds();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12;
        hours = String(hours).padStart(2, '0');
        minutes = String(minutes).padStart(2, '0');
        seconds = String(seconds).padStart(2, '0');
        
        return `${hours}:${minutes}:${seconds} ${ampm}`;
    }

    /**
     * Format date as "Day, Month DD, YYYY"
     */
    formatDate(date) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    /**
     * Get ordinal suffix (st, nd, rd, th)
     */
    getOrdinalSuffix(num) {
        const j = num % 10;
        const k = num % 100;
        
        if (j === 1 && k !== 11) return num + 'st';
        if (j === 2 && k !== 12) return num + 'nd';
        if (j === 3 && k !== 13) return num + 'rd';
        return num + 'th';
    }

    /**
     * Format date as "Day, November 16th"
     */
    formatDateShort(date) {
        const options = { weekday: 'long', month: 'long' };
        const formatted = date.toLocaleDateString('en-US', options);
        const day = this.getOrdinalSuffix(date.getDate());
        return `${formatted.split(',')[0]}, ${formatted.split(' ')[0]} ${formatted.split(' ')[1]} ${day}`;
    }

    /**
     * Update all clock displays
     */
    updateClock() {
        const now = new Date();
        const timeString = this.formatTime(now);
        const dateString = this.formatDate(now);

        // Update all elements with data-clock attribute
        document.querySelectorAll('[data-clock]').forEach(element => {
            element.textContent = timeString;
        });

        // Update all elements with data-date attribute
        document.querySelectorAll('[data-date]').forEach(element => {
            element.textContent = dateString;
        });
    }

    /**
     * Update calendar displays (highlights today)
     */
    updateCalendar() {
        const today = new Date();
        const todayDate = today.getDate();

        // Highlight today's date in calendar
        document.querySelectorAll('.calendar-day').forEach(day => {
            // Remove previous highlight
            day.classList.remove('today', 'current-day');

            // Check if this day number matches today
            const dayText = day.textContent.trim().split('\n')[0].split(' ')[0];
            if (parseInt(dayText) === todayDate && !day.classList.contains('empty')) {
                day.classList.add('today');
                day.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                day.style.color = 'white';
                day.style.fontWeight = 'bold';
                day.style.borderRadius = '50%';
                day.style.animation = 'pulse 1.5s ease-in-out infinite';
            }
        });
    }

    /**
     * Start real-time updates
     */
    start() {
        // Initial update
        this.updateClock();
        
        // Update clock every 1 second
        this.clockIntervalId = setInterval(() => {
            this.updateClock();
        }, 1000);

        // Update calendar every 30 seconds
        this.calendarIntervalId = setInterval(() => {
            this.updateCalendar();
        }, 30000);

        // Initial calendar update
        this.updateCalendar();

        console.log('✓ Real-time clock and calendar started');
    }

    /**
     * Stop real-time updates
     */
    stop() {
        if (this.clockIntervalId) clearInterval(this.clockIntervalId);
        if (this.calendarIntervalId) clearInterval(this.calendarIntervalId);
        console.log('✓ Real-time updates stopped');
    }

    /**
     * Get current time string
     */
    getNow() {
        return this.formatTime(new Date());
    }

    /**
     * Get current date string
     */
    getToday() {
        return this.formatDate(new Date());
    }
}

// Create global instance
const realtimeUpdater = new RealTimeUpdater();

// Auto-start when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    realtimeUpdater.start();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    realtimeUpdater.stop();
});
