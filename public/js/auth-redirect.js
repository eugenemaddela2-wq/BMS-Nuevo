/**
 * Auth Redirect Utility
 * Checks authentication and redirects to login if needed
 */

const AUTH_CONFIG = {
    ACCESS_TOKEN_KEY: 'accessToken',
    REFRESH_TOKEN_KEY: 'refreshToken',
    API_BASE: '/api',
};

/**
 * Check if user is authenticated
 * @returns {boolean} true if token exists
 */
function isAuthenticated() {
    return !!sessionStorage.getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
}

/**
 * Get the access token
 * @returns {string|null} access token or null
 */
function getAccessToken() {
    return sessionStorage.getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
}

/**
 * Get the refresh token
 * @returns {string|null} refresh token or null
 */
function getRefreshToken() {
    return sessionStorage.getItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
}

/**
 * Save authentication tokens
 * @param {string} accessToken
 * @param {string} refreshToken
 */
function saveAuthTokens(accessToken, refreshToken) {
    sessionStorage.setItem(AUTH_CONFIG.ACCESS_TOKEN_KEY, accessToken);
    sessionStorage.setItem(AUTH_CONFIG.REFRESH_TOKEN_KEY, refreshToken);
}

/**
 * Clear authentication
 */
function clearAuth() {
    sessionStorage.removeItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
}

/**
 * Verify authentication with backend
 * @returns {Promise<Object>} user data if valid, null otherwise
 */
async function verifyAuth() {
    const token = getAccessToken();
    
    if (!token) {
        return null;
    }

    try {
        const response = await fetch(`${AUTH_CONFIG.API_BASE}/auth/me`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            return result.user || result.data;
        } else {
            clearAuth();
            return null;
        }
    } catch (error) {
        console.error('Auth verification failed:', error);
        return null;
    }
}

/**
 * Redirect to login if not authenticated
 * Call this in DOMContentLoaded of protected pages
 */
async function redirectIfNotAuthenticated() {
    if (!isAuthenticated()) {
        console.log('No authentication token found. Redirecting to login...');
        window.location.href = '/login.html';
        return false;
    }

    // Verify with backend
    const user = await verifyAuth();
    if (!user) {
        console.log('Authentication verification failed. Redirecting to login...');
        window.location.href = '/login.html';
        return false;
    }

    return true;
}

/**
 * Redirect based on user role
 * @param {string} userRole - the user's role
 * @param {string} requiredRole - required role (optional)
 */
function redirectByRole(userRole, requiredRole = null) {
    if (!userRole) {
        window.location.href = '/login.html';
        return false;
    }

    // Check if user has required role
    if (requiredRole && userRole !== requiredRole) {
        alert(`Access denied. This page requires ${requiredRole} role.`);
        
        // Redirect to appropriate dashboard
        if (userRole === 'admin' || userRole === 'official') {
            window.location.href = '/official-dashboard.html';
        } else if (userRole === 'resident') {
            window.location.href = '/resident-dashboard.html';
        } else {
            window.location.href = '/login.html';
        }
        return false;
    }

    return true;
}

/**
 * Get user data from session
 * @returns {Object|null} stored user data
 */
function getUserFromSession() {
    try {
        const userData = sessionStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        return null;
    }
}

/**
 * Store user data in session
 * @param {Object} userData
 */
function storeUserInSession(userData) {
    try {
        sessionStorage.setItem('userData', JSON.stringify(userData));
    } catch (error) {
        console.error('Failed to store user data:', error);
    }
}

/**
 * Log out and redirect to login
 */
async function logout() {
    const token = getAccessToken();
    
    try {
        // Call logout API
        if (token) {
            await fetch(`${AUTH_CONFIG.API_BASE}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).catch(err => console.log('Logout API call failed (non-critical):', err));
        }
    } finally {
        // Clear local storage regardless of API result
        clearAuth();
        sessionStorage.removeItem('userData');
        window.location.href = '/login.html';
    }
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isAuthenticated,
        getAccessToken,
        getRefreshToken,
        saveAuthTokens,
        clearAuth,
        verifyAuth,
        redirectIfNotAuthenticated,
        redirectByRole,
        getUserFromSession,
        storeUserInSession,
        logout
    };
}
