// ============================================================================
// BMS Login System - Frontend with Full Backend Integration
// Connected to CockroachDB via API
// ============================================================================

// Configuration
const API_CONFIG = {
    BASE_URL: '/api',
    TIMEOUT: 10000,
};

// Session state (kept in memory, synced with server via tokens)
const session = {
    accessToken: null,
    refreshToken: null,
    user: null,
    registrationReferenceId: null,
    registrationEmail: null,
};

// ============================================================================
// DOM Elements
// ============================================================================

const elements = {
    loginForm: document.getElementById('loginForm'),
    registerForm: document.getElementById('registerForm'),
    registerCard: document.getElementById('registerCard'),
    pendingCard: document.getElementById('pendingCard'),
    
    // Login form elements
    loginUsername: document.getElementById('loginUsername'),
    loginPassword: document.getElementById('loginPassword'),
    loginErrorMsg: document.getElementById('loginErrorMsg'),
    toggleLoginPassword: document.getElementById('toggleLoginPassword'),
    rememberMe: document.getElementById('rememberMe'),
    forgotPasswordLink: document.getElementById('forgotPasswordLink'),
    
    // Register form elements
    regFirstName: document.getElementById('regFirstName'),
    regLastName: document.getElementById('regLastName'),
    regDOB: document.getElementById('regDOB'),
    regPurok: document.getElementById('regPurok'),
    regPhone: document.getElementById('regPhone'),
    regUsername: document.getElementById('regUsername'),
    regEmail: document.getElementById('regEmail'),
    regPassword: document.getElementById('regPassword'),
    regConfirmPassword: document.getElementById('regConfirmPassword'),
    regTerms: document.getElementById('regTerms'),
    regPrivacy: document.getElementById('regPrivacy'),
    regCaptcha: document.getElementById('regCaptcha'),
    regErrorMsg: document.getElementById('regErrorMsg'),
    
    // Password visibility toggles
    toggleRegPassword: document.getElementById('toggleRegPassword'),
    toggleConfirmPassword: document.getElementById('toggleConfirmPassword'),
    
    // Error messages
    dobError: document.getElementById('dobError'),
    phoneError: document.getElementById('phoneError'),
    usernameError: document.getElementById('usernameError'),
    emailError: document.getElementById('emailError'),
    passwordMatchError: document.getElementById('passwordMatchError'),
    
    // Password requirements
    reqLength: document.getElementById('req-length'),
    reqUppercase: document.getElementById('req-uppercase'),
    reqLowercase: document.getElementById('req-lowercase'),
    reqNumber: document.getElementById('req-number'),
    reqSpecial: document.getElementById('req-special'),
    
    // Navigation links
    toRegisterLink: document.getElementById('toRegisterLink'),
    toLoginLink: document.getElementById('toLoginLink'),
    cancelRegisterBtn: document.getElementById('cancelRegisterBtn'),
    
    // Pending form elements
    pendingRefId: document.getElementById('pendingRefId'),
    pendingEmail: document.getElementById('pendingEmail'),
    checkStatusBtn: document.getElementById('checkStatusBtn'),
    backToMainFromPending: document.getElementById('backToMainFromPending'),
    backToLoginFromPending: document.getElementById('backToLoginFromPending'),
    resendVerificationLink: document.getElementById('resendVerificationLink'),
    cancelRegistrationLink: document.getElementById('cancelRegistrationLink'),
    signOutFromPending: document.getElementById('signOutFromPending'),
    
    // Social buttons
    googleSignIn: document.getElementById('googleSignIn'),
    phoneSignIn: document.getElementById('phoneSignIn'),
};

// ============================================================================
// API Helper Functions
// ============================================================================

async function apiCall(endpoint, method = 'GET', data = null, useAuth = false) {
    try {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: API_CONFIG.TIMEOUT,
        };

        if (useAuth && session.accessToken) {
            options.headers.Authorization = `Bearer ${session.accessToken}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `HTTP ${response.status}`);
        }

        return result;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error.message);
        throw error;
    }
}

// ============================================================================
// Initialization
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    restoreSessionIfExists();
});

function initializeEventListeners() {
    // Login form
    elements.loginForm.addEventListener('submit', handleLoginSubmit);
    elements.toggleLoginPassword.addEventListener('click', () => togglePasswordVisibility('loginPassword'));
    elements.toRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('register');
    });
    elements.forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        handleForgotPassword();
    });
    elements.googleSignIn.addEventListener('click', handleGoogleSignIn);
    elements.phoneSignIn.addEventListener('click', handlePhoneSignIn);
    
    // Register form
    elements.registerForm.addEventListener('submit', handleRegisterSubmit);
    elements.toLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('login');
    });
    elements.cancelRegisterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('login');
    });
    elements.toggleRegPassword.addEventListener('click', () => togglePasswordVisibility('regPassword'));
    elements.toggleConfirmPassword.addEventListener('click', () => togglePasswordVisibility('regConfirmPassword'));
    
    // Register field validations
    elements.regDOB.addEventListener('change', validateDOB);
    elements.regPhone.addEventListener('input', validatePhone);
    elements.regPhone.addEventListener('blur', validatePhone);
    elements.regUsername.addEventListener('blur', validateUsername);
    elements.regEmail.addEventListener('blur', validateEmail);
    elements.regPassword.addEventListener('input', validatePasswordStrength);
    elements.regConfirmPassword.addEventListener('input', validatePasswordMatch);
    
    // Pending form
    elements.checkStatusBtn.addEventListener('click', checkRegistrationStatus);
    elements.backToMainFromPending.addEventListener('click', () => window.location.href = '/');
    elements.backToLoginFromPending.addEventListener('click', (e) => {
        e.preventDefault();
        switchForm('login');
    });
    elements.resendVerificationLink.addEventListener('click', handleResendVerification);
    elements.cancelRegistrationLink.addEventListener('click', handleCancelRegistration);
    elements.signOutFromPending.addEventListener('click', handleSignOut);
}

// ============================================================================
// Session Management
// ============================================================================

function restoreSessionIfExists() {
    const token = sessionStorage.getItem('accessToken');
    if (token) {
        session.accessToken = token;
        session.refreshToken = sessionStorage.getItem('refreshToken');
        // Verify token is still valid by fetching profile
        verifySession();
    }
}

async function verifySession() {
    try {
        const result = await apiCall('/auth/me', 'GET', null, true);
        if (result.success) {
            session.user = result.user;
            redirectToDashboard();
        }
    } catch (error) {
        clearSession();
    }
}

function saveSession(accessToken, refreshToken, userData) {
    session.accessToken = accessToken;
    session.refreshToken = refreshToken;
    session.user = userData;
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('refreshToken', refreshToken);
    if (userData) {
        sessionStorage.setItem('userData', JSON.stringify(userData));
    }
}

function clearSession() {
    session.accessToken = null;
    session.refreshToken = null;
    session.user = null;
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refreshToken');
}

function redirectToDashboard() {
    if (session.user?.role === 'admin' || session.user?.role === 'official' || session.user?.role === 'clerk') {
        window.location.href = '/official-dashboard.html';
    } else if (session.user?.role === 'resident') {
        window.location.href = '/resident-dashboard.html';
    } else {
        window.location.href = '/admin/admin-dashboard.html';
    }
}

// ============================================================================
// Form Switching
// ============================================================================

function switchForm(formName) {
    clearAllErrors();
    
    // Hide all forms
    elements.loginForm.style.display = 'none';
    elements.registerCard.classList.add('hidden');
    elements.pendingCard.classList.add('hidden');
    
    // Show selected form
    switch(formName) {
        case 'login':
            elements.loginForm.style.display = 'block';
            elements.loginUsername.focus();
            break;
        case 'register':
            elements.registerCard.classList.remove('hidden');
            elements.regFirstName.focus();
            break;
        case 'pending':
            elements.pendingCard.classList.remove('hidden');
            break;
    }
}

// ============================================================================
// LOGIN FUNCTIONALITY
// ============================================================================

async function handleLoginSubmit(e) {
    e.preventDefault();
    clearLoginErrors();
    
    const username = elements.loginUsername.value.trim();
    const password = elements.loginPassword.value;
    const rememberMe = elements.rememberMe.checked;
    
    if (!username || !password) {
        showLoginError('Username/Email and Password are required.');
        return;
    }
    
    performLogin(username, password, rememberMe);
}

async function performLogin(username, password, rememberMe) {
    const submitBtn = elements.loginForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Signing In...';
    
    try {
        const result = await apiCall('/auth/login', 'POST', {
            username: username.toLowerCase(),
            password,
            rememberMe
        });

        if (result.success) {
            saveSession(result.accessToken, result.refreshToken, result.user);
            session.user = result.user;
            redirectToDashboard();
        }
    } catch (error) {
        if (error.message.includes('Account pending approval')) {
            showLoginError('Your account is pending admin approval. Please check your email for updates.');
        } else if (error.message.includes('Account')) {
            showLoginError(error.message);
        } else {
            showLoginError('Invalid credentials. Please try again.');
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa fa-sign-in-alt"></i> Sign In';
    }
}

function handleForgotPassword() {
    const email = prompt('Enter your email address:');
    if (email && validateEmailFormat(email)) {
        showLoginError('Password reset link has been sent to ' + email);
        // TODO: Implement password reset flow via API
    }
}

function handleGoogleSignIn() {
    console.log('Google Sign-In initiated');
    showLoginError('Google Sign-In coming soon.');
}

function handlePhoneSignIn() {
    console.log('Phone OTP Sign-In initiated');
    showLoginError('Phone OTP Sign-In coming soon.');
}

// ============================================================================
// REGISTER FUNCTIONALITY
// ============================================================================

async function handleRegisterSubmit(e) {
    e.preventDefault();
    clearRegisterErrors();
    
    const isValid = 
        validateDOB() &&
        validatePhone() &&
        validateUsername() &&
        validateEmail() &&
        validatePasswordStrength() &&
        validatePasswordMatch() &&
        validateTermsAndConditions();
    
    if (!isValid) {
        return;
    }
    
    const formData = {
        firstName: elements.regFirstName.value.trim(),
        lastName: elements.regLastName.value.trim(),
        dateOfBirth: elements.regDOB.value,
        purok: elements.regPurok.value.trim(),
        phoneNumber: elements.regPhone.value.trim(),
        username: elements.regUsername.value.trim(),
        email: elements.regEmail.value.trim().toLowerCase(),
        password: elements.regPassword.value,
        acceptedTerms: elements.regTerms.checked,
        acceptedPrivacy: elements.regPrivacy.checked,
    };
    
    performRegistration(formData);
}

async function performRegistration(formData) {
    const submitBtn = elements.registerForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creating Account...';
    
    try {
        const result = await apiCall('/auth/register', 'POST', formData);

        if (result.success) {
            session.registrationReferenceId = result.referenceId;
            session.registrationEmail = result.email;
            
            // Store for status checking
            sessionStorage.setItem('registrationRefId', result.referenceId);
            sessionStorage.setItem('registrationEmail', result.email);
            
            switchForm('pending');
            elements.pendingRefId.textContent = result.referenceId;
            elements.pendingEmail.textContent = result.email;
        }
    } catch (error) {
        showRegisterError(error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fa fa-user-plus"></i> Register';
    }
}

// ============================================================================
// PENDING REGISTRATION FUNCTIONALITY
// ============================================================================

async function checkRegistrationStatus() {
    const refId = session.registrationReferenceId || sessionStorage.getItem('registrationRefId');
    
    if (!refId) {
        showCheckStatusMessage('No registration reference found.');
        return;
    }
    
    try {
        const result = await apiCall(`/auth/status/${refId}`, 'GET');

        if (result.success) {
            if (result.status === 'active') {
                showCheckStatusMessage('✓ Account approved! Redirecting...');
                setTimeout(() => {
                    switchForm('login');
                    showLoginError('Your account has been approved! Please log in.');
                }, 2000);
            } else if (result.status === 'rejected') {
                showCheckStatusMessage(`✗ Application rejected: ${result.rejectionReason}`);
            } else {
                showCheckStatusMessage(`Still pending... (Last checked: ${new Date().toLocaleTimeString()})`);
            }
        }
    } catch (error) {
        showCheckStatusMessage('Unable to check status. Please try again.');
    }
}

async function handleResendVerification(e) {
    e.preventDefault();
    const email = elements.pendingEmail.textContent;
    try {
        // TODO: Implement resend verification via API
        showCheckStatusMessage('Verification email resent to ' + email);
    } catch (error) {
        showCheckStatusMessage('Failed to resend. Please try again.');
    }
}

async function handleCancelRegistration(e) {
    e.preventDefault();
    if (confirm('Are you sure you want to cancel your registration?')) {
        try {
            // TODO: Implement cancel registration via API
            sessionStorage.removeItem('registrationRefId');
            sessionStorage.removeItem('registrationEmail');
            switchForm('login');
            showLoginError('Registration cancelled.');
        } catch (error) {
            showCheckStatusMessage('Failed to cancel. Please try again.');
        }
    }
}

async function handleSignOut(e) {
    e.preventDefault();
    try {
        await apiCall('/auth/logout', 'POST', null, true);
    } catch (error) {
        console.error('Logout error (non-critical):', error);
    } finally {
        clearSession();
        sessionStorage.removeItem('registrationRefId');
        sessionStorage.removeItem('registrationEmail');
        window.location.href = '/index.html';
    }
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

function validateDOB() {
    const dobValue = elements.regDOB.value;
    elements.dobError.classList.add('hidden');
    
    if (!dobValue) {
        showError(elements.dobError, 'Date of Birth is required.');
        return false;
    }
    
    const dob = new Date(dobValue);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    
    if (age < 16) {
        showError(elements.dobError, 'You must be at least 16 years old.');
        return false;
    }
    
    if (age > 90) {
        showError(elements.dobError, 'Age cannot exceed 90.');
        return false;
    }
    
    return true;
}

function validatePhone() {
    const phone = elements.regPhone.value.trim();
    elements.phoneError.classList.add('hidden');
    
    if (!phone) {
        showError(elements.phoneError, 'Phone number is required.');
        return false;
    }
    
    const phoneDigits = phone.replace(/\D/g, '');
    
    if (phoneDigits.length < 10 || phoneDigits.length > 12) {
        showError(elements.phoneError, 'Invalid phone number format.');
        return false;
    }
    
    return true;
}

async function validateUsername() {
    const username = elements.regUsername.value.trim();
    elements.usernameError.classList.add('hidden');
    
    if (!username) {
        showError(elements.usernameError, 'Username is required.');
        return false;
    }
    
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        showError(elements.usernameError, 'Username: 3-20 chars, alphanumeric and _ only.');
        return false;
    }
    
    try {
        const result = await apiCall(`/auth/check-username/${encodeURIComponent(username)}`, 'GET');
        if (!result.available) {
            showError(elements.usernameError, 'Username already taken.');
            return false;
        }
    } catch (error) {
        showError(elements.usernameError, 'Unable to verify username availability.');
        return false;
    }
    
    return true;
}

async function validateEmail() {
    const email = elements.regEmail.value.trim();
    elements.emailError.classList.add('hidden');
    
    if (!email) {
        showError(elements.emailError, 'Email is required.');
        return false;
    }
    
    if (!validateEmailFormat(email)) {
        showError(elements.emailError, 'Invalid email format.');
        return false;
    }
    
    try {
        const result = await apiCall(`/auth/check-email/${encodeURIComponent(email)}`, 'GET');
        if (!result.available) {
            showError(elements.emailError, 'Email already registered.');
            return false;
        }
    } catch (error) {
        showError(elements.emailError, 'Unable to verify email availability.');
        return false;
    }
    
    return true;
}

function validateEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validatePasswordStrength() {
    const password = elements.regPassword.value;
    const requirements = [
        { id: 'req-length', test: password.length >= 8 },
        { id: 'req-uppercase', test: /[A-Z]/.test(password) },
        { id: 'req-lowercase', test: /[a-z]/.test(password) },
        { id: 'req-number', test: /\d/.test(password) },
        { id: 'req-special', test: /[!@#$%^&*]/.test(password) },
    ];
    
    requirements.forEach(req => {
        const element = document.getElementById(req.id);
        if (req.test) {
            element.classList.add('met');
            element.innerHTML = '<i class="fa fa-check"></i> ' + element.textContent.replace(/.*\s/, '');
        } else {
            element.classList.remove('met');
            element.innerHTML = '<i class="fa fa-times"></i> ' + element.textContent.replace(/.*\s/, '');
        }
    });
    
    return requirements.every(req => req.test);
}

function validatePasswordMatch() {
    const password = elements.regPassword.value;
    const confirmPassword = elements.regConfirmPassword.value;
    elements.passwordMatchError.classList.add('hidden');
    
    if (confirmPassword && password !== confirmPassword) {
        showError(elements.passwordMatchError, 'Passwords do not match.');
        return false;
    }
    
    return true;
}

function validateTermsAndConditions() {
    if (!elements.regTerms.checked) {
        showRegisterError('You must agree to the Terms & Conditions.');
        return false;
    }
    
    if (!elements.regPrivacy.checked) {
        showRegisterError('You must agree to the Privacy Policy.');
        return false;
    }
    
    return true;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function togglePasswordVisibility(fieldId) {
    const field = document.getElementById(fieldId);
    const icon = event.target.closest('.btn-icon').querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

function showError(element, message) {
    element.textContent = message;
    element.classList.remove('hidden');
}

function showLoginError(message) {
    showError(elements.loginErrorMsg, message);
}

function showRegisterError(message) {
    showError(elements.regErrorMsg, message);
}

function showCheckStatusMessage(message) {
    const btn = elements.checkStatusBtn;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa fa-info-circle"></i> ' + message;
    setTimeout(() => {
        btn.innerHTML = originalText;
    }, 4000);
}

function clearLoginErrors() {
    elements.loginErrorMsg.classList.add('hidden');
}

function clearRegisterErrors() {
    elements.regErrorMsg.classList.add('hidden');
    elements.dobError.classList.add('hidden');
    elements.phoneError.classList.add('hidden');
    elements.usernameError.classList.add('hidden');
    elements.emailError.classList.add('hidden');
    elements.passwordMatchError.classList.add('hidden');
}

function clearAllErrors() {
    clearLoginErrors();
    clearRegisterErrors();
}

// ============================================================================
// Page Unload Handler
// ============================================================================

window.addEventListener('beforeunload', () => {
    // Clear sensitive data on page unload
    elements.regPassword.value = '';
    elements.regConfirmPassword.value = '';
});