# Barangay Cubacub Civic-Flow — Django Integration & Local Setup Guide

## Table of Contents
1. [Local Setup (React Frontend)](#1-local-setup-react-frontend)
2. [Django Backend Setup](#2-django-backend-setup)
3. [Connecting React to Django](#3-connecting-react-to-django)
4. [File-by-File Reference](#4-file-by-file-reference)
5. [Django Models Quick Reference](#5-django-models-quick-reference)
6. [Common Mistakes to Avoid](#6-common-mistakes-to-avoid)
7. [Step-by-Step Deployment](#7-step-by-step-deployment)

---

## 1. Local Setup (React Frontend)

### Prerequisites
- **Node.js** v18 or higher — Download from https://nodejs.org
- **pnpm** (package manager) — Install: `npm install -g pnpm`
- **VS Code** — Download from https://code.visualstudio.com

### Steps

```bash
# 1. Download/clone your project files into a folder
# Put all the files from /src into your local project

# 2. Open in VS Code
cd your-project-folder
code .

# 3. Install dependencies
pnpm install

# 4. Start the development server
pnpm run dev

# 5. Open your browser to http://localhost:5173
```

### Project Structure (What each folder/file does)
```
src/
├── app/
│   ├── App.tsx                 # Main entry point — loads the router
│   ├── routes.ts               # All page routes (URL paths)
│   ├── api/
│   │   └── services.ts         # ★ ALL API CALLS GO HERE (your Django connection point)
│   └── components/
│       ├── LandingPage.tsx      # Public homepage (document request form, calendar, etc.)
│       ├── LoginPage.tsx        # Staff login page
│       ├── Dashboard.tsx        # Dashboard layout (sidebar, header, stat cards)
│       ├── FinancePage.tsx      # Public finance transparency page
│       ├── Toast.tsx            # Toast notification system (keep as-is)
│       ├── Layout.tsx           # Root layout wrapper (keep as-is)
│       ├── dashboard/
│       │   ├── DocumentHandler.tsx   # Document request management
│       │   ├── ReportHandler.tsx     # Reports, cases, lost & found management
│       │   ├── ClinicHandler.tsx     # Patient queue and clinic management
│       │   ├── TreasurerHandler.tsx  # Budget and project management
│       │   └── SuperAdmin.tsx        # Staff accounts, audit trail, analytics
│       └── shared/
│           ├── calendarEvents.ts     # Shared calendar (localStorage, replace with API)
│           └── lostFoundData.ts      # Lost & Found data (localStorage, replace with API)
├── styles/
│   ├── fonts.css               # Google Fonts imports (Montserrat, Inter)
│   └── theme.css               # Tailwind CSS theme tokens
├── SQL_SCHEMA.sql              # ★ Complete database schema
└── DJANGO_INTEGRATION_GUIDE.md # ★ This file
```

---

## 2. Django Backend Setup

### Prerequisites
- **Python** 3.10+ — Download from https://python.org
- **pip** (comes with Python)

### Steps

```bash
# 1. Create a new Django project
mkdir civicflow-backend
cd civicflow-backend

# 2. Create virtual environment
python -m venv venv
source venv/bin/activate          # Mac/Linux
# venv\Scripts\activate           # Windows

# 3. Install packages
pip install django
pip install djangorestframework
pip install django-cors-headers    # Needed for React to talk to Django
pip install Pillow                 # For image uploads

# 4. Create the Django project
django-admin startproject civicflow .

# 5. Create your Django apps (one per feature area)
python manage.py startapp accounts    # Staff accounts, auth, audit log
python manage.py startapp documents   # Document requests
python manage.py startapp reports     # Incidents, cases, lost & found
python manage.py startapp clinic      # Patient queue
python manage.py startapp finance     # Projects, budget
python manage.py startapp events      # Calendar events
```

### Django settings.py — Add these:

```python
# civicflow/settings.py

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    # Your apps
    'accounts',
    'documents',
    'reports',
    'clinic',
    'finance',
    'events',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',   # ADD THIS AT THE TOP
    'django.middleware.security.SecurityMiddleware',
    # ... rest of middleware
]

# Allow React frontend to connect
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:3000",   # Alternative
]

# REST Framework settings
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

# Media files (for image uploads)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

### Django urls.py (Main)

```python
# civicflow/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/',       include('accounts.urls')),
    path('api/documents/',  include('documents.urls')),
    path('api/incidents/',  include('reports.urls')),
    path('api/cases/',      include('reports.case_urls')),
    path('api/patients/',   include('clinic.urls')),
    path('api/projects/',   include('finance.urls')),
    path('api/events/',     include('events.urls')),
    path('api/lost-found/', include('reports.lostfound_urls')),
    path('api/staff/',      include('accounts.staff_urls')),
    path('api/audit-log/',  include('accounts.audit_urls')),
    path('api/analytics/',  include('accounts.analytics_urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

---

## 3. Connecting React to Django

### The Key File: `/src/app/api/services.ts`

This is the ONLY file you need to modify to connect React to Django. Here is how:

### Step 1: Update the API_BASE_URL

```typescript
// In /src/app/api/services.ts, line ~55
const API_BASE_URL = "http://localhost:8000/api";  // Your Django server
```

### Step 2: Replace localStorage functions with fetch()

**Example — Login:**
```typescript
// BEFORE (localStorage):
export async function login(username, password) {
  const user = MOCK_USERS[username];
  if (user && user.password === password) {
    localStorage.setItem("role", user.role);
    return { username, name: user.name, role: user.role };
  }
  return null;
}

// AFTER (Django API):
export async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) return null;
  const data = await response.json();
  localStorage.setItem("auth_token", data.token);
  localStorage.setItem("role", data.user.role);
  localStorage.setItem("userName", data.user.name);
  return data.user;
}
```

**Example — Get Documents:**
```typescript
// BEFORE:
export async function getDocumentRequests() {
  return JSON.parse(localStorage.getItem("civicflow_documents") || "[]");
}

// AFTER:
export async function getDocumentRequests() {
  return apiFetch("/documents/");
}
```

### Step 3: Update components to use async functions

The components currently use mock data directly in `useState()`. To use the API:

```typescript
// BEFORE (in DocumentHandler.tsx):
const [requests, setRequests] = useState(MOCK_REQUESTS);

// AFTER (with API):
const [requests, setRequests] = useState<DocRequest[]>([]);

useEffect(() => {
  getDocumentRequests().then(data => setRequests(data));
}, []);
```

---

## 4. File-by-File Reference

| React File | What It Does | Django App | API Endpoints |
|---|---|---|---|
| `LoginPage.tsx` | Staff login form | `accounts` | POST `/api/auth/login/` |
| `Dashboard.tsx` | Layout + stat cards | All apps | GET various counts |
| `DocumentHandler.tsx` | Manage document requests | `documents` | GET/PATCH `/api/documents/` |
| `ReportHandler.tsx` | Manage incidents + cases + L&F | `reports` | GET/POST/PATCH `/api/incidents/`, `/api/cases/`, `/api/lost-found/` |
| `ClinicHandler.tsx` | Patient queue management | `clinic` | GET/PATCH `/api/patients/` |
| `TreasurerHandler.tsx` | Budget & project management | `finance` | GET/POST/PUT/DELETE `/api/projects/` |
| `SuperAdmin.tsx` | Staff accounts + audit + analytics | `accounts` | GET/POST/PUT/DELETE `/api/staff/`, GET `/api/audit-log/` |
| `LandingPage.tsx` | Public forms (doc request, report) | `documents`, `reports` | POST `/api/documents/public-request/`, POST `/api/incidents/public-report/` |
| `FinancePage.tsx` | Public finance transparency | `finance` | GET `/api/projects/` (public) |

---

## 5. Django Models Quick Reference

### accounts/models.py
```python
from django.contrib.auth.models import AbstractUser
from django.db import models

class StaffAccount(AbstractUser):
    # Extends Django's built-in User model
    role = models.CharField(max_length=50)  # document_handler, report_handler, etc.
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    birthdate = models.DateField(null=True, blank=True)
    sex = models.CharField(max_length=10, blank=True)

class AuditLog(models.Model):
    user = models.ForeignKey(StaffAccount, on_delete=models.SET_NULL, null=True)
    user_name = models.CharField(max_length=200)
    action = models.TextField()
    log_type = models.CharField(max_length=20, default='info')
    log_time = models.DateTimeField(auto_now_add=True)
    related_table = models.CharField(max_length=50, blank=True)
    related_id = models.CharField(max_length=20, blank=True)
```

### documents/models.py
```python
from django.db import models

class DocumentRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('processing', 'Processing'),
        ('ready_to_pickup', 'Ready to Pick Up'),
        ('rejected', 'Rejected'),
    ]
    
    request_id = models.CharField(max_length=20, unique=True)
    requestor_name = models.CharField(max_length=200)
    document_type = models.CharField(max_length=100)
    request_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pending')
    case_history = models.CharField(max_length=20, default='clear')
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    purpose = models.CharField(max_length=200, blank=True)
    civil_status = models.CharField(max_length=20, blank=True)
    sex = models.CharField(max_length=10, blank=True)
    birthdate = models.DateField(null=True, blank=True)
    valid_id_type = models.CharField(max_length=100, blank=True)
    valid_id_number = models.CharField(max_length=100, blank=True)
    id_photo = models.ImageField(upload_to='documents/id_photos/', blank=True)
    selfie_photo = models.ImageField(upload_to='documents/selfies/', blank=True)
    payment_method = models.CharField(max_length=20, blank=True)
    gcash_proof = models.ImageField(upload_to='documents/gcash/', blank=True)
    copies_requested = models.IntegerField(default=1)
    pickup_deadline = models.DateField(null=True, blank=True)
    handled_by = models.ForeignKey('accounts.StaffAccount', on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

## 6. Common Mistakes to Avoid

### CORS Errors
If you see "Access to fetch has been blocked by CORS policy":
- Make sure `django-cors-headers` is installed
- Make sure `corsheaders.middleware.CorsMiddleware` is FIRST in MIDDLEWARE
- Make sure your React URL is in `CORS_ALLOWED_ORIGINS`

### Authentication Token Not Sent
- Store the token after login: `localStorage.setItem("auth_token", data.token)`
- Send it in every request header: `Authorization: Token YOUR_TOKEN_HERE`

### File Uploads
- Use `FormData` instead of JSON for image uploads
- In Django, use `ImageField` or `FileField` in your model
- In settings.py, configure `MEDIA_URL` and `MEDIA_ROOT`

### Date Format
- React sends dates as `YYYY-MM-DD` strings
- Django `DateField` expects the same format — they match!

### ID Fields
- React uses string IDs like "BRG-001", "RPT-002"
- In Django, you can use `CharField(primary_key=True)` or auto-generate in `save()` method

---

## 7. Step-by-Step Deployment

### For Development (Your Laptop)

```bash
# Terminal 1 — Django backend
cd civicflow-backend
source venv/bin/activate
python manage.py runserver
# Runs on http://localhost:8000

# Terminal 2 — React frontend
cd civicflow-frontend
pnpm run dev
# Runs on http://localhost:5173
```

### For Production

1. Build React: `pnpm run build` (creates `dist/` folder)
2. Serve `dist/` with Django's static files OR deploy separately
3. Use a production database (PostgreSQL recommended)
4. Use environment variables for secrets (database password, secret key)

### Quick Test Checklist
- [ ] Django server starts without errors
- [ ] React dev server starts
- [ ] Login works (POST to /api/auth/login/ returns token)
- [ ] Dashboard loads data (GET requests return arrays)
- [ ] Status updates work (PATCH requests update records)
- [ ] Calendar events sync across dashboards
- [ ] File uploads work (ID photos, project images)

---

## Need More Help?

- Django REST Framework docs: https://www.django-rest-framework.org/
- Django official tutorial: https://docs.djangoproject.com/en/5.0/intro/tutorial01/
- React Router docs: https://reactrouter.com/
- Tailwind CSS docs: https://tailwindcss.com/docs