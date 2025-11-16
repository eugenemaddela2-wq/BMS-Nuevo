# Resident Dashboard - Comprehensive System Design Document

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Visual Design System](#visual-design-system)
3. [Component Architecture](#component-architecture)
4. [Data Flow & API Integration](#data-flow--api-integration)
5. [Database Design](#database-design)
6. [UI/UX Specifications](#uiux-specifications)
7. [Responsive Design Strategy](#responsive-design-strategy)
8. [Security & Privacy](#security--privacy)
9. [Performance Optimization](#performance-optimization)
10. [Error Handling & Notifications](#error-handling--notifications)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Resident Dashboard (HTML5 + Vanilla JS + CSS3)  │   │
│  │ - ResidentDashboardManager (Class-based)        │   │
│  │ - 9 Content Sections (Embedded)                 │   │
│  │ - 4 Modal Forms                                 │   │
│  │ - Real-time Live Clock                          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓ (HTTPS/JWT)
┌─────────────────────────────────────────────────────────┐
│                   API Layer (Express.js)                │
│  ┌──────────────────────────────────────────────────┐   │
│  │ /api/resident/dashboard          (GET)          │   │
│  │ /api/resident/profile            (GET/PATCH)    │   │
│  │ /api/resident/household          (GET/POST)     │   │
│  │ /api/resident/complaints         (GET/POST)     │   │
│  │ /api/resident/documents          (GET/POST)     │   │
│  │ /api/resident/events             (GET/POST)     │   │
│  │ /api/resident/announcements      (GET)          │   │
│  │ /api/resident/messages           (GET/POST)     │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            ↓ (Connection Pool)
┌─────────────────────────────────────────────────────────┐
│              Database Layer (CockroachDB)               │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Residents Table (Primary Identity)              │   │
│  │ Household Members (One-to-Many)                 │   │
│  │ Complaints (Transaction Logs)                   │   │
│  │ Document Requests (Status Tracking)             │   │
│  │ Events & Registrations (Join Tables)            │   │
│  │ Announcements (Broadcast)                       │   │
│  │ Messages (Conversation Storage)                 │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | HTML5, CSS3, Vanilla ES6+ JS | UI Rendering & Interaction |
| Styling | CSS Custom Properties, Gradients | Glass-morphism Design |
| State | ResidentDashboardManager Class | State Management |
| API | Express.js with JWT | RESTful Backend |
| Database | CockroachDB | Distributed SQL Storage |
| Caching | In-memory (localStorage) | Client-side Optimization |
| Authentication | JWT Bearer Tokens | Secure Access Control |

---

## Visual Design System

### Color Palette

```css
/* Primary Colors - Gradient Background */
--color-primary: #667eea          /* Vibrant Purple */
--color-primary-light: #764ba2    /* Deep Purple */

/* Accent Colors - Interactive Elements */
--accent-cyan: #4fc3dc            /* Bright Cyan */
--accent-green: #26d07c           /* Vibrant Green */
--accent-teal: #7ee1c7            /* Teal */

/* Glass Effect - Transparency & Blur */
--glass-bg: rgba(255, 255, 255, 0.08)        /* 8% opacity white */
--glass-border: rgba(255, 255, 255, 0.15)    /* 15% opacity white */
--glass-overlay: rgba(0, 0, 0, 0.3)          /* 30% opacity black */

/* Text Colors - Contrast */
--text-strong: #ffffff                       /* Strong text */
--text-muted: rgba(255, 255, 255, 0.7)      /* Muted text */

/* Status Colors */
--status-pending: rgba(245, 165, 35, 0.2)   /* Orange */
--status-approved: rgba(38, 208, 124, 0.2)  /* Green */
--status-rejected: rgba(245, 86, 124, 0.2)  /* Red */
--status-processing: rgba(102, 126, 234, 0.2) /* Blue */
```

### Typography

```css
Font Family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif

/* Sizes */
--text-xl: 24px (Section Headers)
--text-lg: 18px (Modal Headers)
--text-base: 14px (Body Text)
--text-sm: 13px (Label & Helper Text)
--text-xs: 11px (Status Badges & Small Labels)

/* Weights */
400 - Regular Text
600 - Labels & Emphasized Text
700 - Headers & Bold Text

/* Line Heights */
1.4 - Comfortable reading
1.6 - Headers
1.2 - Compact labels
```

### Spacing System

```css
--space-xs: 0.5rem (4px)
--space-sm: 1rem (8px)
--space-md: 1.5rem (12px)
--space-lg: 2rem (16px)
--space-xl: 3rem (24px)

/* Applied Hierarchy */
Padding - Interior spacing
Margin - Exterior spacing
Gap - Between flex/grid items
```

### Border Radius

```css
--radius-sm: 6px      (Input fields, small buttons)
--radius-md: 12px     (Cards, medium panels)
--radius-lg: 16px     (Large containers)
--radius-xl: 20px     (Hero sections)
```

### Shadows (Elevated Elements)

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.3)
--shadow-md: 0 4px 6px rgba(0,0,0,0.2)
--shadow-lg: 0 10px 15px rgba(0,0,0,0.3)
--shadow-xl: 0 20px 25px rgba(0,0,0,0.4)
```

### Transitions

```css
--transition-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1)
--transition-base: 0.3s cubic-bezier(0.4, 0, 0.2, 1)
--transition-slow: 0.5s cubic-bezier(0.4, 0, 0.2, 1)
```

---

## Component Architecture

### 1. Layout Components

#### Container
```css
.container {
    display: flex;
    height: 100vh;
    overflow: hidden;
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
}
```

#### Sidebar Navigation
```css
aside {
    width: 280px;
    background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.2) 100%);
    border-right: 1px solid var(--glass-border);
    backdrop-filter: blur(10px);
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}
```

**Features:**
- Fixed positioning
- Backdrop blur for glass effect
- Scrollable on overflow
- Active state indicator with left border

#### Main Content Area
```css
main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.content-wrapper {
    flex: 1;
    overflow-y: auto;
    padding: 30px;
}
```

**Features:**
- Flex-based responsive layout
- Scrollable content area
- Consistent padding

### 2. Header Component

```css
header {
    background: rgba(0,0,0,0.2);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--glass-border);
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.icon-btn {
    width: 40px;
    height: 40px;
    border: none;
    background: rgba(255,255,255,0.1);
    color: var(--text-strong);
    border-radius: 8px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-base);
    position: relative;
}

.icon-btn:hover {
    background: rgba(255,255,255,0.2);
    transform: translateY(-2px);
}

.icon-btn .badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #f5576c;
    color: white;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: bold;
}
```

### 3. Summary Cards

```css
.summary-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 15px;
    margin-bottom: 30px;
}

.summary-card {
    background: linear-gradient(135deg, var(--glass-bg), rgba(255,255,255,0.12));
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    padding: 20px;
    cursor: pointer;
    transition: all var(--transition-base);
    text-align: center;
    text-decoration: none;
    color: inherit;
}

.summary-card:hover {
    transform: translateY(-5px);
    border-color: rgba(255,255,255,0.3);
    background: linear-gradient(135deg, rgba(255,255,255,0.12), rgba(255,255,255,0.18));
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
}

.summary-card .icon {
    font-size: 32px;
    margin-bottom: 10px;
    display: block;
}

.summary-card h3 {
    font-size: 13px;
    color: var(--text-muted);
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.summary-card .number {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-strong);
}
```

### 4. Content Section

```css
.content-section {
    display: none;
    animation: fadeIn 0.3s ease-out;
}

.content-section.active {
    display: block;
}

@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    flex-wrap: wrap;
    gap: 15px;
}

.section-header h2 {
    font-size: 24px;
    font-weight: 700;
    margin: 0;
}
```

### 5. Form Components

#### Form Container
```css
.form-group {
    margin-bottom: 15px;
}

.form-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-strong);
}

.form-group input,
.form-group select,
.form-group textarea {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    background: var(--glass-bg);
    color: var(--text-strong);
    font-family: inherit;
    font-size: 13px;
    transition: all var(--transition-fast);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
    outline: none;
    border-color: rgba(255,255,255,0.3);
    background: rgba(255,255,255,0.12);
    box-shadow: 0 0 0 3px rgba(79, 195, 220, 0.2);
}

.form-group input::placeholder,
.form-group textarea::placeholder {
    color: var(--text-muted);
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}
```

#### Input Field States
- **Default**: `--glass-bg` with `--glass-border`
- **Focus**: Slightly brighter background, cyan glow
- **Error**: Red border with error message
- **Disabled**: Reduced opacity, no interaction

### 6. Button Components

```css
.btn-primary {
    background: linear-gradient(135deg, var(--accent-cyan), var(--accent-green));
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all var(--transition-base);
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.2);
}

.btn-primary:active {
    transform: translateY(0);
}

.btn-secondary {
    background: rgba(255,255,255,0.1);
    color: white;
    border: 1px solid var(--glass-border);
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
    transition: all var(--transition-base);
}

.btn-secondary:hover {
    background: rgba(255,255,255,0.2);
}
```

### 7. Data Tables

```css
table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

table th {
    background: rgba(255,255,255,0.1);
    padding: 12px;
    text-align: left;
    font-weight: 600;
    border-bottom: 1px solid var(--glass-border);
}

table td {
    padding: 12px;
    border-bottom: 1px solid var(--glass-border);
}

table tbody tr:hover {
    background: rgba(255,255,255,0.05);
}

table tbody tr:nth-child(even) {
    background: rgba(255,255,255,0.03);
}
```

### 8. Status Badges

```css
.status-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.status-pending {
    background: rgba(245, 165, 35, 0.2);
    color: #f5a623;
}

.status-approved {
    background: rgba(38, 208, 124, 0.2);
    color: #26d07c;
}

.status-processing {
    background: rgba(102, 126, 234, 0.2);
    color: #667eea;
}

.status-completed {
    background: rgba(38, 208, 124, 0.2);
    color: #26d07c;
}

.status-rejected {
    background: rgba(245, 86, 124, 0.2);
    color: #f5576c;
}

.status-in-progress {
    background: rgba(102, 126, 234, 0.2);
    color: #667eea;
}
```

### 9. Modal Component

```css
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    align-items: center;
    justify-content: center;
    backdrop-filter: blur(2px);
}

.modal.active {
    display: flex;
    animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.modal-content {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%);
    border-radius: var(--radius-lg);
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
    border: 1px solid var(--glass-border);
    box-shadow: 0 20px 25px rgba(0,0,0,0.3);
}

.modal-header {
    padding: 20px;
    border-bottom: 1px solid var(--glass-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h2 {
    margin: 0;
    font-size: 18px;
}

.modal-close {
    background: none;
    border: none;
    color: var(--text-strong);
    font-size: 24px;
    cursor: pointer;
    transition: all var(--transition-fast);
}

.modal-close:hover {
    transform: rotate(90deg);
    color: #f5576c;
}

.modal-body {
    padding: 20px;
}
```

### 10. Notification Component

```css
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, rgba(38, 208, 124, 0.9), rgba(79, 195, 220, 0.9));
    color: white;
    padding: 15px 20px;
    border-radius: var(--radius-sm);
    z-index: 10000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideInRight 0.3s ease-out;
}

.notification.error {
    background: linear-gradient(135deg, rgba(245, 86, 124, 0.9), rgba(245, 165, 35, 0.9));
}

@keyframes slideInRight {
    from {
        opacity: 0;
        transform: translateX(400px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}
```

---

## Data Flow & API Integration

### Request/Response Lifecycle

```
┌─ User Action ─→ ResidentDashboardManager ─→ Validate Input ─→ Show Loading State
│
├─ POST/GET Request with JWT Token ─→ Express API Layer
│                                     ├─ Verify JWT
│                                     ├─ Validate Resident ID
│                                     └─ Route to Handler
│
├─ Database Query ─→ CockroachDB ─→ Execute Transaction
│                    ├─ Connection Pool (10 connections)
│                    ├─ Query Optimization Index
│                    └─ Return Result Set
│
└─ Response ─→ Client Parser ─→ Update DOM ─→ Show Notification
               ├─ Parse JSON
               ├─ Validate Schema
               └─ Handle Errors
```

### API Endpoint Specifications

#### GET /api/resident/dashboard
**Purpose**: Fetch complete dashboard summary
**Request Headers**: `Authorization: Bearer <token>`
**Response Schema**:
```json
{
  "resident": {
    "id": "string",
    "fullName": "string",
    "firstName": "string",
    "lastName": "string",
    "dateOfBirth": "ISO8601",
    "sex": "M|F",
    "purok": "string",
    "address": "string",
    "contact": "string",
    "email": "string",
    "householdId": "string",
    "occupation": "string",
    "maritalStatus": "string"
  },
  "summary": {
    "activeComplaints": "integer",
    "pendingDocuments": "integer",
    "upcomingEvents": "integer",
    "unreadMessages": "integer",
    "unreadAnnouncements": "integer"
  },
  "upcomingEvents": [
    {
      "id": "string",
      "title": "string",
      "event_date": "ISO8601",
      "venue": "string"
    }
  ],
  "announcements": [
    {
      "id": "string",
      "title": "string",
      "created_at": "ISO8601"
    }
  ],
  "recentActivity": [
    {
      "type": "complaint|document|message",
      "id": "string",
      "status": "string",
      "created_at": "ISO8601"
    }
  ]
}
```

#### PATCH /api/resident/profile
**Purpose**: Update resident profile information
**Request Body**:
```json
{
  "occupation": "string (optional)",
  "maritalStatus": "string (optional)",
  "contactNumber": "string (optional)",
  "email": "string (optional)"
}
```

#### POST /api/resident/complaints
**Purpose**: File a new complaint
**Request Body**:
```json
{
  "category": "Infrastructure|Noise|Safety|Services|Other",
  "subject": "string (max 100)",
  "description": "string (required)",
  "location": "string (optional)",
  "attachments": "string[] (URLs)",
  "confidential": "boolean (optional)"
}
```

**Response**:
```json
{
  "id": "string",
  "resident_id": "string",
  "category": "string",
  "subject": "string",
  "status": "pending",
  "created_at": "ISO8601"
}
```

#### GET /api/resident/complaints
**Purpose**: Fetch resident complaints
**Query Parameters**: `status=pending|in-progress|resolved|closed` (optional)
**Response**: Array of complaint objects

#### POST /api/resident/documents
**Purpose**: Request a document
**Request Body**:
```json
{
  "documentType": "Barangay Clearance|Residency|Business Permit|Certificate",
  "purpose": "string (required)",
  "attachments": "string[] (URLs)"
}
```

#### GET /api/resident/household
**Purpose**: Fetch household members
**Response**: Array of household member objects

#### POST /api/resident/household
**Purpose**: Add new household member
**Request Body**:
```json
{
  "firstName": "string (required)",
  "lastName": "string (required)",
  "dateOfBirth": "ISO8601 (required)",
  "sex": "M|F",
  "relation": "Spouse|Child|Parent|Sibling|Other"
}
```

#### GET /api/resident/events
**Purpose**: Fetch upcoming events
**Response**: Array of event objects

#### POST /api/resident/events/:id/register
**Purpose**: Register for event
**Request Body**:
```json
{
  "attendeeCount": "integer (1-20)",
  "specialRequirements": "string (optional)"
}
```

#### GET /api/resident/announcements
**Purpose**: Fetch announcements
**Query Parameters**: `purok=string` (optional)
**Response**: Array of announcement objects

#### GET /api/resident/messages
**Purpose**: Fetch inbox messages
**Response**: Array of message objects

#### POST /api/resident/messages
**Purpose**: Send message
**Request Body**:
```json
{
  "recipientId": "string",
  "subject": "string",
  "message": "string"
}
```

### Error Response Format
```json
{
  "error": "string (error message)",
  "code": "string (error code)",
  "timestamp": "ISO8601"
}
```

---

## Database Design

### Core Schema (CockroachDB)

#### residents
```sql
CREATE TABLE residents (
    id UUID PRIMARY KEY DEFAULT gen_uuid(),
    user_id UUID UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    sex CHAR(1) CHECK (sex IN ('M', 'F')),
    purok VARCHAR(50) NOT NULL,
    address VARCHAR(255) NOT NULL,
    contact_number VARCHAR(20) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    household_id UUID NOT NULL,
    occupation VARCHAR(100),
    marital_status VARCHAR(20),
    national_id_encrypted BYTEA,
    photo_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE RESTRICT,
    INDEX idx_purok (purok),
    INDEX idx_user_id (user_id),
    INDEX idx_household_id (household_id)
);
```

#### households
```sql
CREATE TABLE households (
    id UUID PRIMARY KEY DEFAULT gen_uuid(),
    barangay_id UUID NOT NULL,
    address VARCHAR(255) NOT NULL,
    purok VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (barangay_id) REFERENCES barangays(id),
    INDEX idx_purok (purok),
    INDEX idx_barangay_id (barangay_id)
);
```

#### household_members
```sql
CREATE TABLE household_members (
    id UUID PRIMARY KEY DEFAULT gen_uuid(),
    household_id UUID NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    sex CHAR(1) CHECK (sex IN ('M', 'F')),
    relation VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deceased')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
    INDEX idx_household_id (household_id),
    INDEX idx_status (status)
);
```

#### complaints
```sql
CREATE TABLE complaints (
    id UUID PRIMARY KEY DEFAULT gen_uuid(),
    resident_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(255),
    attachments JSONB DEFAULT 'null'::jsonb,
    confidential BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved', 'closed')),
    assigned_to UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES officials(id) ON DELETE SET NULL,
    INDEX idx_resident_id (resident_id),
    INDEX idx_status (status),
    INDEX idx_created_at DESC (created_at),
    INDEX idx_category (category)
);
```

#### document_requests
```sql
CREATE TABLE document_requests (
    id UUID PRIMARY KEY DEFAULT gen_uuid(),
    resident_id UUID NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    purpose TEXT NOT NULL,
    attachments JSONB DEFAULT 'null'::jsonb,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
    submitted_at TIMESTAMPTZ DEFAULT now(),
    expected_date DATE,
    completed_at TIMESTAMPTZ,
    file_url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    INDEX idx_resident_id (resident_id),
    INDEX idx_status (status),
    INDEX idx_document_type (document_type),
    INDEX idx_submitted_at DESC (submitted_at)
);
```

#### events
```sql
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    event_date TIMESTAMPTZ NOT NULL,
    venue VARCHAR(255) NOT NULL,
    attendee_limit INTEGER,
    photo_url VARCHAR(500),
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (created_by) REFERENCES officials(id),
    INDEX idx_event_date (event_date),
    INDEX idx_title (title)
);
```

#### event_registrations
```sql
CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_uuid(),
    event_id UUID NOT NULL,
    resident_id UUID NOT NULL,
    attendee_count INTEGER NOT NULL CHECK (attendee_count >= 1 AND attendee_count <= 20),
    special_requirements TEXT,
    registered_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    UNIQUE(event_id, resident_id),
    INDEX idx_event_id (event_id),
    INDEX idx_resident_id (resident_id),
    INDEX idx_registered_at (registered_at)
);
```

#### announcements
```sql
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    purok VARCHAR(50),
    attachments JSONB DEFAULT 'null'::jsonb,
    author_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (author_id) REFERENCES officials(id),
    INDEX idx_purok (purok),
    INDEX idx_created_at DESC (created_at)
);
```

#### messages
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_uuid(),
    sender_id UUID NOT NULL,
    recipient_id UUID NOT NULL,
    subject VARCHAR(255),
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES residents(id) ON DELETE CASCADE,
    INDEX idx_recipient_id (recipient_id),
    INDEX idx_created_at DESC (created_at),
    INDEX idx_read_at (read_at) WHERE read_at IS NULL
);
```

### Indexing Strategy

| Table | Index | Reason |
|-------|-------|--------|
| residents | idx_purok | Frequent filtering by zone |
| residents | idx_user_id | FK lookup |
| residents | idx_household_id | FK lookup |
| complaints | idx_resident_id | Query by user |
| complaints | idx_status | Filter by status |
| complaints | idx_created_at DESC | Recent items |
| document_requests | idx_resident_id | Query by user |
| document_requests | idx_status | Track application state |
| event_registrations | idx_event_id | Event attendee query |
| announcements | idx_purok | Targeted announcements |
| messages | idx_recipient_id | Inbox queries |
| messages | idx_read_at | Unread count |

### Data Access Patterns

**High-Frequency Queries:**
1. `SELECT * FROM residents WHERE user_id = $1` - Profile lookup
2. `SELECT * FROM complaints WHERE resident_id = $1 ORDER BY created_at DESC` - Complaint history
3. `SELECT * FROM messages WHERE recipient_id = $1 AND read_at IS NULL` - Unread count
4. `SELECT * FROM announcements WHERE purok = $1 OR purok IS NULL` - Zone announcements

**Optimization Techniques:**
- Covering indexes for frequently accessed columns
- Partial indexes for filtered queries (e.g., unread messages)
- Connection pooling with 10 active connections
- Query result caching in localStorage (5 min TTL)

---

## UI/UX Specifications

### Section 1: Home Dashboard

**Layout**: 2-column responsive grid

**Components:**
- Welcome message with resident name
- Quick action buttons (4 in row, stacking on mobile)
  - File Complaint
  - Request Document
  - Register Event
  - View News

- Recent Activity Timeline
  - Card-based layout
  - Status badge with color coding
  - Timestamp for each item
  - Click to view details

**Interactions:**
- Buttons trigger modal forms
- Activity cards expandable
- Loading states with skeleton screens

---

### Section 2: Profile Page

**Layout**: 2-column (image + form data)

**Components:**
- Profile photo (placeholder if not uploaded)
- Upload photo button
- Editable fields
  - Resident ID (read-only)
  - Name, DOB, Sex
  - Purok, Address, Contact
  - Email, Household ID
  - Occupation, Marital Status
  - National ID (masked with reveal button)

- Privacy Settings
  - Checkbox toggles
  - Directory visibility
  - Notification preferences
  - 2FA option

**Interactions:**
- Edit Profile button opens editing mode
- Fields show inline validation
- Save changes trigger PATCH request
- Success notification on update

---

### Section 3: Household Members

**Layout**: Responsive table

**Columns:**
- Name (sortable)
- Relation
- DOB (with auto age calculation)
- Sex
- Actions (Edit, Delete)

**Features:**
- Add Member button triggers modal
- Form validation for required fields
- Date picker for DOB
- Confirmation before delete

**Mobile Variant:**
- Card-based layout
- Actions in dropdown menu
- Horizontal scroll for details

---

### Section 4: Documents & Requests

**Layout**: Responsive table with filter

**Columns:**
- Document Type
- Status (color-coded badge)
- Submitted Date
- Expected Date
- Actions (View, Download)

**Filter Options:**
- All Status
- Pending
- Processing
- Completed
- Rejected

**Modal Form:**
- Document type dropdown
- Purpose textarea
- File upload for supporting docs
- Submit button

---

### Section 5: Complaints

**Layout**: Card-based list

**Card Contents:**
- Complaint title (bold)
- Category label
- Status badge (right-aligned)
- Brief description
- Complaint info (assigned to, filed date, expected resolution)
- Action buttons: View Details, Add Note

**Actions:**
- View opens detail modal
- Add Note opens comment form
- Status updates in real-time

---

### Section 6: Events & Calendar

**Layout**: Grid with calendar sidebar

**Left Sidebar (Mini Calendar):**
- Month/year with navigation arrows
- Day grid with clickable dates
- Highlighted dates with events
- "Today" button

**Main Content:**
- Large calendar view
- Event list below calendar
- Event cards showing:
  - Title and description
  - Date and venue
  - Attendee count
  - Register button

**Modal:**
- Select event from dropdown
- Enter attendee count (1-20)
- Special requirements textarea
- Confirmation required

---

### Section 7: Announcements

**Layout**: Card-based feed

**Card Contents:**
- Title (large, bold)
- Date posted
- Content preview (max 100 chars)
- Read More link
- Pin icon for pinned announcements

**Filter:**
- All Puroks dropdown
- Zone-specific announcements
- Barangay-wide announcements

---

### Section 8: Messages

**Layout**: 2-column (list + thread view)

**Left Column (Conversation List):**
- Sender name
- Message preview
- Timestamp
- Unread indicator (dot)
- Click to load thread

**Right Column (Message Thread):**
- Sender info at top
- Message history
- Timestamps on each message
- Input box with send button
- Attachment icon

---

### Section 9: Help & Support

**Layout**: Single column with sections

**Sections:**
1. **FAQ**
   - Expandable Q&A items
   - Icon indicator for open/closed
   - Smooth animations

2. **Contact Support**
   - Form with fields
   - Category dropdown
   - Subject and message
   - Submit ticket button

3. **SLA Table**
   - Service type
   - Response time
   - Resolution time
   - Responsive horizontal scroll

---

## Responsive Design Strategy

### Breakpoints

```css
/* Desktop */
@media (min-width: 1024px) {
    /* Full layout */
}

/* Tablet */
@media (max-width: 1023px) and (min-width: 768px) {
    /* Adjusted spacing, narrower sidebar */
    aside { width: 240px; }
    .summary-cards { grid-template-columns: repeat(2, 1fr); }
    .form-row { grid-template-columns: 1fr; }
}

/* Mobile */
@media (max-width: 767px) {
    /* Stacked layout */
    .container { flex-direction: column; }
    aside { width: 100%; flex-direction: row; overflow-x: auto; }
    nav { flex-direction: row; }
    .summary-cards { grid-template-columns: 1fr; }
    .content-wrapper { padding: 15px; }
    table { font-size: 11px; }
    .section-header { flex-direction: column; align-items: flex-start; }
}
```

### Mobile Optimizations

**Touch Targets:**
- Minimum 44px x 44px for buttons
- Larger tap areas for interactive elements
- Spacing between interactive elements (min 8px)

**Gestures:**
- Swipe left/right to navigate sections
- Tap to expand/collapse sections
- Long-press for context menu

**Viewport:**
- Viewport meta tag for proper scaling
- Font sizes scale with zoom level
- Input fields scale to 16px for iOS focus prevention

**Performance:**
- Lazy load images
- Defer non-critical JS
- Minimize CSS repaints

### Orientation Handling

**Portrait (Mobile):**
- Single column layout
- Horizontal scrolling tables
- Bottom action buttons

**Landscape (Tablet):**
- 2-column layouts where applicable
- Side-by-side cards
- Increased use of grid

---

## Security & Privacy

### Authentication & Authorization

```javascript
// JWT Verification Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.resident = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Resident-only middleware
const residentOnly = (req, res, next) => {
    if (req.resident.role !== 'resident') {
        return res.status(403).json({ error: 'Forbidden' });
    }
    next();
};
```

### Data Protection

**Client-Side:**
- Sensitive fields masked in UI
- "Show" button to reveal masked data
- National ID encrypted before transmission
- localStorage cleared on logout

**Server-Side:**
- All sensitive fields encrypted (national_id_encrypted)
- SQL parameterized queries prevent injection
- Rate limiting on API endpoints
- HTTPS enforced

**Database:**
- Encryption at rest
- Regular backups (automated)
- Audit logging for data access
- Column-level encryption for PII

### Privacy Controls

**Visibility Settings:**
```
┌─ Directory Visibility
├─ Contact Visibility
├─ Profile Visibility
├─ Message Opt-in
└─ Notification Preferences
```

**Data Access Audit:**
- Who accessed your data
- When it was accessed
- What was accessed
- Exportable audit log

---

## Performance Optimization

### Frontend Optimization

**Code Splitting:**
- Main dashboard HTML file (critical)
- Lazy load modal scripts
- Defer non-blocking JS

**Asset Optimization:**
- CSS inlined for critical path
- Minify all CSS/JS
- WebP images with fallbacks
- SVG icons for crisp rendering

**Caching Strategy:**
- LocalStorage: 5-minute cache for dashboard data
- Service Worker: Offline-first PWA capability
- Browser cache: 1-year for static assets

**Performance Metrics:**
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Cumulative Layout Shift (CLS): < 0.1
- Time to Interactive (TTI): < 3.5s

### Backend Optimization

**Query Optimization:**
```sql
-- Use EXPLAIN ANALYZE for query plans
EXPLAIN ANALYZE
SELECT c.id, c.subject, c.status
FROM complaints c
WHERE c.resident_id = $1
ORDER BY c.created_at DESC
LIMIT 10;

-- Create covering indexes
CREATE INDEX idx_complaints_resident_status 
ON complaints(resident_id, status, created_at DESC)
INCLUDE (subject, status);
```

**Connection Pooling:**
```javascript
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,                    // Connection pool size
    min: 2,                     // Minimum connections
    idleTimeoutMillis: 30000,   // 30 seconds idle timeout
    connectionTimeoutMillis: 5000
});
```

**Response Compression:**
```javascript
app.use(compression({
    level: 6,                   // 1-9 compression level
    threshold: 1024,            // Only compress > 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));
```

**Caching Strategy:**
```javascript
// Cache dashboard data for 5 minutes
app.get('/api/resident/dashboard', 
    cacheMiddleware('5 minutes'),
    residentOnly,
    async (req, res) => {
        // Endpoint logic
    }
);
```

---

## Error Handling & Notifications

### Error Categories

| Type | Example | User Message |
|------|---------|--------------|
| Network | Connection timeout | "Network error. Please try again." |
| Validation | Missing required field | "Please fill in all required fields." |
| Authorization | Invalid token | "Session expired. Please log in again." |
| Server | Database error | "Server error. Please try again later." |
| Conflict | Duplicate entry | "This entry already exists." |

### Error Response Flow

```javascript
try {
    // Validate input
    if (!validateComplaint(body)) {
        return res.status(400).json({
            error: 'Invalid complaint data',
            code: 'VALIDATION_ERROR',
            details: validationErrors
        });
    }

    // Process request
    const result = await db.query(...);
    
    res.json(result);
} catch (error) {
    // Log error server-side
    console.error('Complaint error:', error);
    
    // Return safe error message
    res.status(500).json({
        error: 'Failed to file complaint',
        code: 'INTERNAL_ERROR',
        timestamp: new Date().toISOString()
    });
}
```

### Notification System

```javascript
class NotificationManager {
    // Success notification
    showSuccess(message, duration = 3000) {
        this.show(message, 'success', duration);
    }

    // Error notification
    showError(message, duration = 5000) {
        this.show(message, 'error', duration);
    }

    // Info notification
    showInfo(message, duration = 3000) {
        this.show(message, 'info', duration);
    }

    // Generic notification
    show(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}
```

### Form Validation

```javascript
const validateComplaint = (data) => {
    const errors = {};

    if (!data.category) {
        errors.category = 'Category is required';
    }

    if (!data.subject || data.subject.length < 5) {
        errors.subject = 'Subject must be at least 5 characters';
    }

    if (!data.description || data.description.length < 20) {
        errors.description = 'Description must be at least 20 characters';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};
```

---

## Implementation Roadmap

### Phase 1: Core Foundation (Week 1)
- [ ] Database schema creation
- [ ] API endpoints implementation
- [ ] Authentication middleware
- [ ] Dashboard HTML template

### Phase 2: UI Components (Week 2)
- [ ] Glass-morphism styling
- [ ] Component library (buttons, forms, cards)
- [ ] Modal system
- [ ] Responsive layout

### Phase 3: Functionality (Week 3)
- [ ] ResidentDashboardManager class
- [ ] Data loading and binding
- [ ] Form submissions
- [ ] Error handling

### Phase 4: Polish & Optimization (Week 4)
- [ ] Performance optimization
- [ ] Testing (unit, integration, E2E)
- [ ] Security audit
- [ ] Documentation

### Phase 5: Deployment (Week 5)
- [ ] Production environment setup
- [ ] Database migration
- [ ] Monitoring setup
- [ ] User training

---

## Maintenance & Monitoring

### Key Metrics to Track

```javascript
// Page Load Performance
performance.mark('dashboard-load-start');
// ... dashboard initialization
performance.mark('dashboard-load-end');
performance.measure('dashboard-load', 'dashboard-load-start', 'dashboard-load-end');

// API Response Times
const startTime = Date.now();
const response = await fetch('/api/resident/dashboard');
const duration = Date.now() - startTime;
console.log(`API call took ${duration}ms`);

// Error Rates
const errorRate = (errorCount / totalRequests) * 100;
console.log(`Error rate: ${errorRate}%`);

// Database Query Performance
console.time('db-query');
const result = await db.query(sql);
console.timeEnd('db-query');
```

### Monitoring Dashboard

```
┌─ Real-time Metrics
│  ├─ Active Users
│  ├─ API Response Time (avg)
│  ├─ Database Connection Pool Status
│  └─ Error Rate
│
├─ Performance Metrics
│  ├─ Page Load Time (FCP, LCP)
│  ├─ Query Performance (P95, P99)
│  └─ Cache Hit Rate
│
└─ Business Metrics
   ├─ Complaints Filed (daily)
   ├─ Documents Requested
   ├─ Event Registrations
   └─ User Satisfaction (feedback score)
```

---

## Conclusion

This comprehensive design creates a modern, secure, and performant Resident Dashboard that:

✅ Uses cutting-edge glass-morphism aesthetic throughout
✅ Maintains responsive design across all devices
✅ Implements secure data handling with JWT + encryption
✅ Optimizes database queries for scalability
✅ Provides excellent UX with smooth animations
✅ Handles errors gracefully with user feedback
✅ Integrates seamlessly with CockroachDB backend

The system is built for:
- **Scalability**: Distributed database, connection pooling
- **Reliability**: Transaction support, automated backups
- **Security**: Encryption, access control, audit logging
- **Performance**: Indexed queries, caching, compression
- **Usability**: Intuitive interface, responsive design
