# Backend Quickstart — The Honest, Easiest Path

**For:** The backend team member connecting Django to the Civic-Flow React frontend.
**Truth level:** 100%. No filler, no fluff.

---

## The Big Picture (Read This First)

```
React Frontend (already done)
    |
    |  ALL data goes through ONE file: /src/app/api/services.ts
    |
    v
Django REST API (you build this)
    |
    v
Database (SQLite for dev, PostgreSQL for production)
```

**The frontend is DONE. You only touch ONE file** (`services.ts`) to connect everything.
Right now `services.ts` uses `localStorage` (fake database in the browser).
Your job: Replace `localStorage` calls with `fetch()` calls to your Django API.

---

## Step-by-Step (Do This IN ORDER)

### PHASE 1: Get Django Running (30 minutes)

```bash
# 1. Create project folder BESIDE (not inside) the React folder
mkdir civicflow-backend
cd civicflow-backend

# 2. Virtual environment (ALWAYS do this)
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate          # Windows

# 3. Install everything you need
pip install django djangorestframework django-cors-headers Pillow

# 4. Create Django project
django-admin startproject civicflow .

# 5. Create apps (one per feature)
python manage.py startapp accounts
python manage.py startapp documents
python manage.py startapp reports
python manage.py startapp clinic
python manage.py startapp finance
python manage.py startapp events
```

### PHASE 2: Configure Django (15 minutes)

Edit `civicflow/settings.py`:

```python
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
    'corsheaders.middleware.CorsMiddleware',   # MUST be first!
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# Let React talk to Django (CORS)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",    # React dev server
    "http://localhost:3000",    # Alternative React port
]

# REST Framework config
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
}

# For development — use SQLite (already configured by default, zero setup!)
# For production — switch to PostgreSQL later
# DATABASES = { ... }  # SQLite is already the default, don't touch this yet
```

**IMPORTANT:** For development, just use SQLite (Django's default). It works out of the box — zero installation, zero configuration. Switch to PostgreSQL only when you deploy.

### PHASE 3: Create ONE Model First (Start Small!)

**DO NOT build all 11 models at once.** Start with the simplest one.

Recommended order (easiest to hardest):
```
1. CalendarEvent     (simplest — just CRUD, no auth needed for reading)
2. StaffAccount      (auth system — login/logout)
3. DocumentRequest   (most used feature)
4. Incident          (similar pattern to documents)
5. Patient           (similar pattern)
6. Project           (similar pattern)
7. CaseRecord        (links to incidents)
8. DocCaseHistory    (links to documents)
9. LostFoundItem     (public + handler access)
10. AuditLog         (auto-generated on actions)
11. PublicSubmission  (public forms, no auth)
```

**Start with CalendarEvent.** Here's the full flow for ONE model:

#### Step 3a: Model (`events/models.py`)

```python
from django.db import models

class CalendarEvent(models.Model):
    date = models.DateField()
    title = models.CharField(max_length=200)
    color = models.CharField(max_length=50, default='bg-[#1B263B]')
    source = models.CharField(max_length=50)  # 'document_handler', 'clinic_handler', etc.
    icon = models.CharField(max_length=10, blank=True, null=True)
    event_type = models.CharField(max_length=20, blank=True, null=True)  # 'event' or 'closure'
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.date} - {self.title}"
```

#### Step 3b: Serializer (`events/serializers.py`) — create this file

```python
from rest_framework import serializers
from .models import CalendarEvent

class CalendarEventSerializer(serializers.ModelSerializer):
    # Map 'event_type' in DB to 'type' in API (frontend expects 'type')
    type = serializers.CharField(source='event_type', required=False, allow_null=True)

    class Meta:
        model = CalendarEvent
        fields = ['id', 'date', 'title', 'color', 'source', 'icon', 'type']
```

#### Step 3c: Views (`events/views.py`)

```python
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from .models import CalendarEvent
from .serializers import CalendarEventSerializer

class CalendarEventViewSet(viewsets.ModelViewSet):
    queryset = CalendarEvent.objects.all().order_by('-date')
    serializer_class = CalendarEventSerializer
    permission_classes = [AllowAny]  # Public read, change later for write
```

#### Step 3d: URLs (`events/urls.py`) — create this file

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CalendarEventViewSet

router = DefaultRouter()
router.register(r'events', CalendarEventViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
```

#### Step 3e: Main URL config (`civicflow/urls.py`)

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('events.urls')),
    # Add more apps here later:
    # path('api/', include('documents.urls')),
    # path('api/', include('accounts.urls')),
]
```

#### Step 3f: Migrate and Run

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py runserver
```

#### Step 3g: Test it!

Open your browser: `http://localhost:8000/api/events/`

You should see Django REST Framework's browseable API — a nice web page where you can add/edit/delete events manually. If you see this, **your backend is working.**

### PHASE 4: Seed Test Data (5 minutes)

Create `events/management/commands/seed_events.py`:

```
events/
  management/
    __init__.py
    commands/
      __init__.py
      seed_events.py
```

```python
# events/management/commands/seed_events.py
from django.core.management.base import BaseCommand
from events.models import CalendarEvent

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        events = [
            {"date": "2026-04-05", "title": "Barangay Assembly", "color": "bg-[#1B263B]", "source": "document_handler"},
            {"date": "2026-04-12", "title": "Youth Sports Fest", "color": "bg-[#008080]", "source": "document_handler"},
            {"date": "2026-04-15", "title": "Fiesta Celebration", "color": "bg-amber-500", "source": "document_handler"},
            {"date": "2026-04-03", "title": "Polio Vaccination", "color": "bg-[#008080]", "source": "clinic_handler", "icon": "\U0001f489", "event_type": "event"},
        ]
        for e in events:
            CalendarEvent.objects.get_or_create(title=e["title"], defaults=e)
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(events)} events"))
```

```bash
python manage.py seed_events
```

### PHASE 5: Connect React to Django (The Fun Part!)

**This is where you edit ONE file: `/src/app/api/services.ts`**

Replace ONLY the calendar event functions:

```typescript
// BEFORE (localStorage):
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  return getOrSeed("civicflow_shared_events", MOCK_EVENTS);
}

// AFTER (Django):
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  const res = await fetch("http://localhost:8000/api/events/");
  return res.json();
}
```

```typescript
// BEFORE:
export async function createCalendarEvent(event) {
  // ... localStorage stuff
}

// AFTER:
export async function createCalendarEvent(event: Omit<CalendarEvent, "id">): Promise<CalendarEvent> {
  const res = await fetch("http://localhost:8000/api/events/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
  });
  return res.json();
}
```

```typescript
// BEFORE:
export async function deleteCalendarEvent(id) {
  // ... localStorage stuff
}

// AFTER:
export async function deleteCalendarEvent(id: string): Promise<void> {
  await fetch(`http://localhost:8000/api/events/${id}/`, {
    method: "DELETE",
  });
}
```

**Test it.** Open the React app, go to any dashboard with a calendar. If events load and you can add/delete — the connection works! Move on to the next model.

### PHASE 6: Repeat for Each Model

Follow the exact same pattern for each feature:
1. Create model in `models.py`
2. Create serializer in `serializers.py`
3. Create viewset in `views.py`
4. Register URL in `urls.py`
5. `makemigrations` + `migrate`
6. Seed test data
7. Update `services.ts` (replace localStorage function with `fetch()`)
8. Test in browser

---

## Common Mistakes (Save Yourself Hours)

### Mistake 1: Forgetting CORS
**Symptom:** React shows `CORS error` in browser console.
**Fix:** Make sure `corsheaders` is installed and `CORS_ALLOWED_ORIGINS` includes your React URL.

### Mistake 2: Trailing Slash
**Symptom:** 301 redirects, data not loading.
**Fix:** Django URLs need trailing slashes. Use `/api/events/` not `/api/events`.

### Mistake 3: Building Everything Before Testing
**Symptom:** 11 broken models and no idea where the bug is.
**Fix:** Build ONE model, test it end-to-end, THEN build the next one.

### Mistake 4: Using PostgreSQL on Day 1
**Symptom:** Spending 2 hours installing PostgreSQL before writing any code.
**Fix:** Use SQLite for development. It's already configured. Switch to PostgreSQL for deployment only.

### Mistake 5: Not Using Django Admin
**Symptom:** Creating management commands just to add test data.
**Fix:** Register your models in `admin.py`:
```python
# events/admin.py
from django.contrib import admin
from .models import CalendarEvent

@admin.register(CalendarEvent)
class CalendarEventAdmin(admin.ModelAdmin):
    list_display = ['date', 'title', 'source', 'color']
```
Then go to `http://localhost:8000/admin/` to add/edit data with a nice UI.

### Mistake 6: JSON field name mismatch
**Symptom:** Data loads but fields are empty or undefined.
**Fix:** The React frontend expects specific field names (like `type`, not `event_type`). Use the serializer to map field names. Check `services.ts` for the exact field names each function expects.

---

## Auth — How Login Works

Currently the frontend stores `role` and `userName` in localStorage after login.

For Django:
1. Use `rest_framework.authtoken` (already installed above)
2. Create a login endpoint that returns a token
3. The frontend sends `Authorization: Token <token>` with every request
4. `services.ts` already has `getAuthToken()` and `apiFetch()` helper functions ready

```python
# accounts/views.py
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(username=username, password=password)
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'username': user.username,
            'name': user.get_full_name() or user.username,
            'role': user.profile.role,  # Add a profile model with role field
        })
    return Response({'error': 'Invalid credentials'}, status=400)
```

Then in `services.ts`, the `login()` function becomes:
```typescript
export async function login(username: string, password: string): Promise<AuthUser | null> {
  try {
    const res = await fetch("http://localhost:8000/api/auth/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    localStorage.setItem("auth_token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("userName", data.name);
    return { username: data.username, name: data.name, role: data.role, token: data.token };
  } catch {
    return null;
  }
}
```

---

## The Complete Model Reference

Here's every Django model you need, matched to the SQL schema in `/src/SQL_SCHEMA.sql`:

| Django App   | Model              | API Endpoint               | services.ts Function           |
|-------------|--------------------|-----------------------------|-------------------------------|
| accounts    | StaffAccount       | /api/staff/                 | getStaffAccounts()            |
| accounts    | AuditLog           | /api/audit-log/             | getAuditLog()                 |
| documents   | DocumentRequest    | /api/documents/             | getDocumentRequests()         |
| documents   | DocCaseHistory     | /api/doc-cases/             | getDocCases()                 |
| reports     | Incident           | /api/incidents/             | getIncidents()                |
| reports     | CaseRecord         | /api/cases/                 | getCases()                    |
| reports     | LostFoundItem      | /api/lost-found/            | getLostFoundItems()           |
| clinic      | Patient            | /api/patients/              | getPatientQueue()             |
| finance     | Project            | /api/projects/              | getProjects()                 |
| events      | CalendarEvent      | /api/events/                | getCalendarEvents()           |

---

## Deployment Checklist (When You're Ready)

1. Switch from SQLite to PostgreSQL
2. Set `DEBUG = False` in settings.py
3. Set `CORS_ALLOWED_ORIGINS` to your production frontend URL
4. Update `API_BASE_URL` in `services.ts` to your production Django URL
5. Use `gunicorn` to serve Django (not `runserver`)
6. Serve React as static files OR deploy separately (Vercel, Netlify, etc.)

---

## TL;DR for Your Backend Friend

> "Bro, the frontend is 100% done. You only need to edit ONE file — `services.ts`.
> Start with CalendarEvent (simplest model). Build the Django model, serializer,
> viewset, and URL. Test it with the browseable API. Then replace the localStorage
> function in services.ts with a fetch() call. If the calendar works, do the next
> model. Repeat 10 times and we're done. Use SQLite for dev, don't install
> PostgreSQL yet. And don't forget CORS."
