-- ============================================================================
-- BARANGAY CUBACUB CIVIC-FLOW — COMPLETE SQL SCHEMA
-- ============================================================================
-- 
-- This file contains ALL the database tables you need for the entire system.
-- Use this with PostgreSQL (recommended) or MySQL.
--
-- HOW TO USE WITH DJANGO:
-- You do NOT need to run this SQL manually. Django creates tables for you!
-- 1. Define your models in models.py (matching these tables)
-- 2. Run: python manage.py makemigrations
-- 3. Run: python manage.py migrate
--
-- This file is here as a REFERENCE so you can see the full database design
-- and use it to create your Django models correctly.
--
-- TABLE OF CONTENTS:
-- 1. staff_accounts        — Staff/admin user accounts
-- 2. document_requests     — Barangay document requests (staff + public)
-- 3. document_case_history — Case history linked to document requests
-- 4. incidents             — Reports and complaints (staff + public)
-- 5. case_records          — Formal case management for Report Handler
-- 6. case_linked_reports   — Many-to-many: cases ↔ incidents
-- 7. case_prior_offenses   — Prior offense history per case
-- 8. patient_queue         — Clinic patient queue and records
-- 9. projects              — Treasurer's infrastructure/community projects
-- 10. project_images       — Photos for each project
-- 11. project_milestones   — Milestone tracking for each project
-- 12. calendar_events      — Shared calendar events across all dashboards
-- 13. lost_found_items     — Lost & Found items (public + handler managed)
-- 14. audit_log            — System audit trail for Super Admin
-- 15. system_settings      — Global configuration key-value pairs
-- 16. INDEXES              — Performance indexes on key columns
-- 17. VIEWS                — Helpful query shortcuts
--
-- NOTE: Public document requests and public reports go directly into
-- document_requests and incidents tables (with source='public').
-- No separate public_submissions / public_reports tables are needed.
-- ============================================================================


-- ============================================================================
-- 1. STAFF ACCOUNTS
-- ============================================================================
-- Django model: accounts/models.py > StaffAccount
-- Used by: LoginPage, SuperAdmin dashboard
-- API endpoints: /api/auth/login/, /api/staff/
-- ============================================================================
CREATE TABLE staff_accounts (
    id              SERIAL PRIMARY KEY,
    username        VARCHAR(100) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,       -- Django handles hashing automatically
    name            VARCHAR(200) NOT NULL,
    role            VARCHAR(50) NOT NULL,         -- 'document_handler', 'report_handler', 'clinic_handler', 'treasurer', 'super_admin'
    is_active       BOOLEAN DEFAULT TRUE,
    phone           VARCHAR(20),
    email           VARCHAR(200),
    address         TEXT,
    birthdate       DATE,
    sex             VARCHAR(10),                  -- 'Male', 'Female'
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default staff accounts (passwords will be hashed by Django)
-- In Django: python manage.py createsuperuser
-- Then create the rest via the SuperAdmin dashboard


-- ============================================================================
-- 2. DOCUMENT REQUESTS
-- ============================================================================
-- Django model: documents/models.py > DocumentRequest
-- Used by: DocumentHandler dashboard, Public landing page form
-- API endpoints: /api/documents/, /api/documents/<id>/, /api/documents/public-request/
-- ============================================================================
CREATE TABLE document_requests (
    id                  VARCHAR(20) PRIMARY KEY,   -- e.g., 'BRG-001'
    requestor_name      VARCHAR(200) NOT NULL,
    document_type       VARCHAR(100) NOT NULL,     -- 'Barangay Clearance', 'Certificate of Residency', etc.
    request_date        DATE NOT NULL DEFAULT CURRENT_DATE,
    status              VARCHAR(30) NOT NULL DEFAULT 'pending',
                        -- Possible values: 'pending', 'approved', 'processing', 'ready_to_pickup', 'rejected'
    case_history        VARCHAR(20) DEFAULT 'clear',  -- 'clear' or 'flagged'
    
    -- Personal information
    address             TEXT,
    phone               VARCHAR(20),
    email               VARCHAR(200),
    purpose             VARCHAR(200),              -- Why they need the document
    civil_status        VARCHAR(20),               -- 'Single', 'Married', 'Widowed', 'Separated'
    sex                 VARCHAR(10),
    birthdate           DATE,
    
    -- Verification
    valid_id_type       VARCHAR(100),              -- 'Philippine National ID', "Driver's License", etc.
    valid_id_number     VARCHAR(100),
    id_photo_url        TEXT,                      -- URL to uploaded ID photo
    selfie_photo_url    TEXT,                      -- URL to uploaded selfie
    
    -- Payment
    payment_method      VARCHAR(20),               -- 'cash' or 'gcash'
    gcash_proof_url     TEXT,                      -- URL to GCash receipt screenshot
    copies_requested    INTEGER DEFAULT 1,
    
    -- Pickup
    pickup_deadline     DATE,                      -- Auto-set: 5 days after status = 'ready_to_pickup'
    
    -- Source tracking (tells you where the request came from)
    source              VARCHAR(20) DEFAULT 'staff', -- 'staff' (from handler) or 'public' (from landing page form)
    
    -- Metadata
    handled_by          INTEGER REFERENCES staff_accounts(id),  -- Which handler processed it
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- The 11 document types supported (matches LandingPage DocumentRequestForm):
-- 1.  Barangay Clearance
-- 2.  Certificate of Residency
-- 3.  Certificate of Indigency
-- 4.  Certificate of Good Moral Character
-- 5.  Business Clearance / Permit
-- 6.  First-Time Jobseeker Certification
-- 7.  Cedula (Community Tax Certificate)
-- 8.  Barangay ID
-- 9.  Certificate of No Income
-- 10. Certificate of Late Registration
-- 11. Barangay Protection Order


-- ============================================================================
-- 3. DOCUMENT CASE HISTORY
-- ============================================================================
-- Django model: documents/models.py > DocumentCaseHistory
-- Used by: DocumentHandler (Case History section)
-- ============================================================================
CREATE TABLE document_case_history (
    id              VARCHAR(20) PRIMARY KEY,       -- e.g., 'CH-001'
    requestor_name  VARCHAR(200) NOT NULL,
    case_type       VARCHAR(100) NOT NULL,         -- 'Multiple Rejections', 'Fraudulent Request', etc.
    case_date       DATE NOT NULL,
    status          VARCHAR(20) NOT NULL,          -- 'cleared', 'flagged', 'under_review'
    details         TEXT,
    linked_request  VARCHAR(20) REFERENCES document_requests(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 4. INCIDENTS (Reports & Complaints)
-- ============================================================================
-- Django model: reports/models.py > Incident
-- Used by: ReportHandler dashboard, Public landing page form
-- API endpoints: /api/incidents/, /api/incidents/<id>/, /api/incidents/public-report/
-- ============================================================================
CREATE TABLE incidents (
    id                  VARCHAR(20) PRIMARY KEY,    -- e.g., 'RPT-001'
    reporter_name       VARCHAR(200) NOT NULL,      -- Can be 'Anonymous'
    is_anonymous        BOOLEAN DEFAULT FALSE,
    category            VARCHAR(100) NOT NULL,       -- 'Noise Complaint', 'Road Hazard', etc.
    subcategory         VARCHAR(100),                -- More specific type
    details             TEXT NOT NULL,
    incident_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    status              VARCHAR(30) NOT NULL DEFAULT 'new',
                        -- Possible values: 'new', 'investigating', 'resolved'
    location            VARCHAR(200),
    priority            VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    incident_time       VARCHAR(20),                  -- Time of incident (e.g., '11:45 PM')
    landmark            VARCHAR(200),
    suspect_name        VARCHAR(200),
    suspect_description TEXT,
    urgency             VARCHAR(20),                  -- 'Low', 'Medium', 'High', 'Critical'
    evidence_photo_count INTEGER DEFAULT 0,
    victims_involved    VARCHAR(200),
    reporter_phone      VARCHAR(20),
    reporter_relation   VARCHAR(100),                 -- 'Victim', 'Witness', 'Concerned Neighbor'
    
    -- Source tracking (tells you where the report came from)
    source              VARCHAR(20) DEFAULT 'staff', -- 'staff' (from handler) or 'public' (from landing page form)
    
    handled_by          INTEGER REFERENCES staff_accounts(id),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report categories:
-- 1. Noise Complaint (subcategories: Karaoke/Loud Music, Construction Noise, Animals)
-- 2. Road Hazard (subcategories: Pothole, Flooding, Obstruction)
-- 3. Public Disturbance (subcategories: Loitering/Intimidation, Drinking in Public)
-- 4. Illegal Activity (subcategories: Gambling, Drug-related, Illegal Vending)
-- 5. Environmental (subcategories: Garbage Dumping, Smoke/Air Pollution)
-- 6. Property Damage
-- 7. Lost Item (links to lost_found_items)
-- 8. Found Item (links to lost_found_items)
-- 9. Document Refund Request


-- ============================================================================
-- 5. CASE RECORDS (Formal cases from Report Handler)
-- ============================================================================
-- Django model: reports/models.py > CaseRecord
-- Used by: ReportHandler (Case Management section)
-- API endpoints: /api/cases/, /api/cases/<id>/
-- ============================================================================
CREATE TABLE case_records (
    id                  VARCHAR(20) PRIMARY KEY,    -- e.g., 'CASE-001'
    subject_name        VARCHAR(200) NOT NULL,      -- Name of person involved
    crime_description   TEXT NOT NULL,              -- What the case is about
    case_date           DATE NOT NULL DEFAULT CURRENT_DATE,
    status              VARCHAR(20) NOT NULL DEFAULT 'open',
                        -- Possible values: 'open', 'investigating', 'resolved', 'closed'
    details             TEXT,
    location            VARCHAR(200),
    
    -- Legal details
    charges             TEXT,
    penalty             TEXT,
    complainant         VARCHAR(200),
    respondent          VARCHAR(200),
    mediator            VARCHAR(200),
    remarks             TEXT,
    date_resolved       DATE,
    
    handled_by          INTEGER REFERENCES staff_accounts(id),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Linked reports (many-to-many relationship)
CREATE TABLE case_linked_reports (
    case_id     VARCHAR(20) REFERENCES case_records(id),
    incident_id VARCHAR(20) REFERENCES incidents(id),
    PRIMARY KEY (case_id, incident_id)
);

-- Prior offenses for a case
CREATE TABLE case_prior_offenses (
    id          SERIAL PRIMARY KEY,
    case_id     VARCHAR(20) REFERENCES case_records(id),
    description TEXT NOT NULL,
    offense_date DATE
);


-- ============================================================================
-- 6. PATIENT QUEUE (Clinic Handler)
-- ============================================================================
-- Django model: clinic/models.py > Patient
-- Used by: ClinicHandler dashboard
-- API endpoints: /api/patients/, /api/patients/<id>/
-- ============================================================================
CREATE TABLE patient_queue (
    id                  SERIAL PRIMARY KEY,
    patient_name        VARCHAR(200) NOT NULL,
    queue_time          VARCHAR(20) NOT NULL,        -- e.g., '8:00 AM'
    reason              VARCHAR(200) NOT NULL,       -- 'General Checkup', 'Blood Pressure', etc.
    status              VARCHAR(20) NOT NULL DEFAULT 'waiting',
                        -- Possible values: 'waiting', 'in-progress', 'completed'
    phone               VARCHAR(20),
    birthdate           DATE,
    sex                 VARCHAR(10),
    chief_complaint     TEXT,
    allergies           TEXT,
    current_medications TEXT,
    medical_conditions  TEXT,
    
    -- Track which handler processed them
    handled_by          INTEGER REFERENCES staff_accounts(id),
    queue_date          DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at        TIMESTAMP
);


-- ============================================================================
-- 7. PROJECTS (Treasurer)
-- ============================================================================
-- Django model: finance/models.py > Project
-- Used by: TreasurerHandler dashboard, FinancePage (public)
-- API endpoints: /api/projects/, /api/projects/<id>/, /api/projects/public/
-- ============================================================================
CREATE TABLE projects (
    id              VARCHAR(20) PRIMARY KEY,         -- e.g., 'PRJ-001'
    project_name    VARCHAR(200) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'upcoming',
                    -- Possible values: 'completed', 'ongoing', 'upcoming'
    budget          DECIMAL(12,2) NOT NULL DEFAULT 0,
    spent           DECIMAL(12,2) NOT NULL DEFAULT 0,
    progress        INTEGER NOT NULL DEFAULT 0,      -- 0 to 100 (percentage)
    description     TEXT,
    location        VARCHAR(200),
    start_date      DATE,
    end_date        DATE,
    contractor      VARCHAR(200),
    funding_source  VARCHAR(200),                    -- '20% Development Fund', 'DILG Grant', etc.
    category        VARCHAR(100),                    -- 'Infrastructure', 'Health', 'Community', etc.
    
    created_by      INTEGER REFERENCES staff_accounts(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 8. PROJECT IMAGES
-- ============================================================================
-- Django model: finance/models.py > ProjectImage
-- Used by: TreasurerHandler (project form image upload)
-- ============================================================================
CREATE TABLE project_images (
    id          SERIAL PRIMARY KEY,
    project_id  VARCHAR(20) REFERENCES projects(id) ON DELETE CASCADE,
    image_url   TEXT NOT NULL,                       -- URL to uploaded image
    caption     VARCHAR(200),                        -- 'Before', 'During', 'After'
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 9. PROJECT MILESTONES (for Finance Transparency page)
-- ============================================================================
-- Django model: finance/models.py > ProjectMilestone
-- Used by: FinancePage (public), TreasurerHandler
-- API: returned as nested array in /api/projects/public/ response
-- ============================================================================
CREATE TABLE project_milestones (
    id          SERIAL PRIMARY KEY,
    project_id  VARCHAR(20) REFERENCES projects(id) ON DELETE CASCADE,
    label       VARCHAR(200) NOT NULL,
    target_date DATE,
    is_done     BOOLEAN DEFAULT FALSE
);


-- ============================================================================
-- 10. CALENDAR EVENTS (Shared across all dashboards)
-- ============================================================================
-- Django model: events/models.py > CalendarEvent
-- Used by: All dashboards, Public landing page CommunityCalendar
-- API endpoints: /api/events/, /api/events/<id>/
-- ============================================================================
CREATE TABLE calendar_events (
    id          VARCHAR(50) PRIMARY KEY,             -- e.g., 'ev-1' or UUID
    event_date  DATE NOT NULL,
    title       VARCHAR(200) NOT NULL,
    color       VARCHAR(50) NOT NULL,                -- Tailwind class: 'bg-[#008080]'
    source      VARCHAR(50) NOT NULL,                -- Which handler created it
    icon        VARCHAR(10),                         -- Emoji like unicode
    event_type  VARCHAR(20) DEFAULT 'event',         -- 'event' or 'closure'
    
    created_by  INTEGER REFERENCES staff_accounts(id),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 11. LOST & FOUND ITEMS
-- ============================================================================
-- Django model: reports/models.py > LostFoundItem
-- Used by: ReportHandler (Lost & Found section), Public landing page
-- API endpoints: /api/lost-found/, /api/lost-found/<id>/
-- ============================================================================
CREATE TABLE lost_found_items (
    id                  VARCHAR(20) PRIMARY KEY,     -- e.g., 'LF-001'
    item_type           VARCHAR(10) NOT NULL,        -- 'lost' or 'found'
    reporter_name       VARCHAR(200),
    reporter_phone      VARCHAR(20),
    reporter_id         VARCHAR(20) NOT NULL,        -- 'ANON-XXXX' or 'RPT-XXXX'
    is_anonymous        BOOLEAN DEFAULT FALSE,
    item_name           VARCHAR(200) NOT NULL,
    description         TEXT,
    category            VARCHAR(100),                -- 'Personal Belongings', 'Electronics', etc.
    location            VARCHAR(200),
    date_reported       DATE NOT NULL DEFAULT CURRENT_DATE,
    date_of_incident    DATE,
    image_url           TEXT,                        -- URL to uploaded image
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
                        -- Possible values: 'pending', 'investigating', 'solved', 'canceled'
    handler_notes       TEXT,
    
    handled_by          INTEGER REFERENCES staff_accounts(id),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- ============================================================================
-- 12. AUDIT LOG
-- ============================================================================
-- Django model: accounts/models.py > AuditLog
-- Used by: SuperAdmin dashboard (Audit Trail section)
-- API endpoint: /api/audit-log/
--
-- TIP: Use Django signals or middleware to auto-create audit entries
-- whenever a staff member performs an action (approve, reject, resolve, etc.)
-- ============================================================================
CREATE TABLE audit_log (
    id          SERIAL PRIMARY KEY,
    log_time    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    user_name   VARCHAR(200) NOT NULL,               -- Name of the staff who performed action
    user_id     INTEGER REFERENCES staff_accounts(id),
    action      TEXT NOT NULL,                        -- What they did (e.g., 'Approved document BRG-001')
    log_type    VARCHAR(20) NOT NULL DEFAULT 'info',  -- 'success', 'error', 'warning', 'info'
    
    -- Optional: link to the affected record
    related_table VARCHAR(50),                        -- e.g., 'document_requests', 'incidents'
    related_id    VARCHAR(20)                         -- e.g., 'BRG-001', 'RPT-003'
);

-- Create index for faster queries
CREATE INDEX idx_audit_log_time ON audit_log(log_time DESC);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);


-- ============================================================================
-- 13. SYSTEM SETTINGS
-- ============================================================================
-- Django model: accounts/models.py > SystemSetting (or settings app)
-- Used by: SuperAdmin, TreasurerHandler, global configuration
-- API endpoints: /api/settings/, /api/settings/ (PATCH)
-- ============================================================================
CREATE TABLE system_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       TEXT,
    description VARCHAR(200),
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default settings
INSERT INTO system_settings (key, value, description) VALUES
    ('annual_budget', '8500000', 'Total annual barangay budget in PHP'),
    ('clinic_status', 'open', 'Current clinic status: open or closed'),
    ('pickup_deadline_days', '5', 'Days before document pickup deadline'),
    ('refund_percentage', '60', 'Refund percentage for expired documents');


-- ============================================================================
-- 16. PERFORMANCE INDEXES
-- ============================================================================
-- Add these after all tables are created for faster query performance.
-- Django's QuerySet filters on these columns will be significantly faster.
-- ============================================================================

-- document_requests: most-queried columns
CREATE INDEX idx_doc_requests_status      ON document_requests(status);
CREATE INDEX idx_doc_requests_date        ON document_requests(request_date DESC);
CREATE INDEX idx_doc_requests_source      ON document_requests(source);
CREATE INDEX idx_doc_requests_handled_by  ON document_requests(handled_by);
CREATE INDEX idx_doc_requests_name        ON document_requests(requestor_name);

-- incidents: most-queried columns
CREATE INDEX idx_incidents_status         ON incidents(status);
CREATE INDEX idx_incidents_date           ON incidents(incident_date DESC);
CREATE INDEX idx_incidents_priority       ON incidents(priority);
CREATE INDEX idx_incidents_source         ON incidents(source);
CREATE INDEX idx_incidents_category       ON incidents(category);

-- case_records: status-based queries
CREATE INDEX idx_case_records_status      ON case_records(status);
CREATE INDEX idx_case_records_date        ON case_records(case_date DESC);

-- patient_queue: daily queue lookups
CREATE INDEX idx_patient_queue_status     ON patient_queue(status);
CREATE INDEX idx_patient_queue_date       ON patient_queue(queue_date DESC);
CREATE INDEX idx_patient_queue_name       ON patient_queue(patient_name);

-- projects: filtered by status and category
CREATE INDEX idx_projects_status          ON projects(status);
CREATE INDEX idx_projects_category        ON projects(category);
CREATE INDEX idx_projects_start_date      ON projects(start_date DESC);

-- lost_found_items: filter by type and status
CREATE INDEX idx_lost_found_status        ON lost_found_items(status);
CREATE INDEX idx_lost_found_type          ON lost_found_items(item_type);
CREATE INDEX idx_lost_found_date          ON lost_found_items(date_reported DESC);

-- calendar_events: date-range queries
CREATE INDEX idx_calendar_events_date     ON calendar_events(event_date);
CREATE INDEX idx_calendar_events_source   ON calendar_events(source);


-- ============================================================================
-- 17. VIEWS (Helpful query shortcuts for Django / analytics)
-- ============================================================================

-- View: Dashboard summary counts (used by SuperAdmin analytics)
-- DJANGO usage: SELECT * FROM dashboard_summary;
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT
    (SELECT COUNT(*) FROM document_requests)                                    AS total_documents,
    (SELECT COUNT(*) FROM document_requests WHERE status = 'pending')           AS pending_documents,
    (SELECT COUNT(*) FROM document_requests WHERE status = 'approved')          AS approved_documents,
    (SELECT COUNT(*) FROM incidents)                                             AS total_incidents,
    (SELECT COUNT(*) FROM incidents WHERE status = 'new')                       AS new_incidents,
    (SELECT COUNT(*) FROM patient_queue WHERE queue_date = CURRENT_DATE)        AS today_patients,
    (SELECT COUNT(*) FROM patient_queue WHERE status = 'waiting'
     AND queue_date = CURRENT_DATE)                                             AS waiting_patients,
    (SELECT COUNT(*) FROM lost_found_items)                                     AS total_lost_found,
    (SELECT COUNT(*) FROM lost_found_items WHERE status = 'pending')            AS pending_lost_found,
    (SELECT COUNT(*) FROM projects WHERE status = 'ongoing')                    AS active_projects,
    (SELECT COUNT(*) FROM staff_accounts WHERE is_active = TRUE)                AS active_staff;


-- View: Document type breakdown (used by SuperAdmin donut chart)
-- DJANGO usage: SELECT * FROM document_type_breakdown;
CREATE OR REPLACE VIEW document_type_breakdown AS
SELECT document_type, COUNT(*) AS count,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS percentage
FROM document_requests
GROUP BY document_type
ORDER BY count DESC;


-- View: Monthly service volume (for analytics charts)
-- DJANGO usage: SELECT * FROM monthly_service_volume WHERE month >= '2026-01-01';
CREATE OR REPLACE VIEW monthly_service_volume AS
SELECT
    DATE_TRUNC('month', created_at)::DATE AS month,
    'documents' AS service,
    COUNT(*) AS count
FROM document_requests
GROUP BY DATE_TRUNC('month', created_at)
UNION ALL
SELECT
    DATE_TRUNC('month', created_at)::DATE,
    'incidents',
    COUNT(*)
FROM incidents
GROUP BY DATE_TRUNC('month', created_at)
UNION ALL
SELECT
    DATE_TRUNC('month', created_at)::DATE,
    'clinic',
    COUNT(*)
FROM patient_queue
GROUP BY DATE_TRUNC('month', created_at)
UNION ALL
SELECT
    DATE_TRUNC('month', created_at)::DATE,
    'lost_found',
    COUNT(*)
FROM lost_found_items
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;


-- View: Monthly spending by projects (Treasurer chart — GET /api/analytics/monthly-spending/)
-- DJANGO usage: SELECT * FROM monthly_project_spending WHERE year = 2026;
CREATE OR REPLACE VIEW monthly_project_spending AS
SELECT
    TO_CHAR(p.start_date, 'Mon')        AS month,
    EXTRACT(MONTH FROM p.start_date)    AS month_num,
    EXTRACT(YEAR FROM p.start_date)     AS year,
    COALESCE(SUM(p.spent), 0)           AS spent
FROM projects p
GROUP BY
    TO_CHAR(p.start_date, 'Mon'),
    EXTRACT(MONTH FROM p.start_date),
    EXTRACT(YEAR FROM p.start_date)
ORDER BY year, month_num;


-- View: Budget breakdown by category (Finance Page — GET /api/analytics/budget-summary/)
-- DJANGO usage: SELECT * FROM budget_by_category;
CREATE OR REPLACE VIEW budget_by_category AS
SELECT
    COALESCE(category, 'Uncategorized')     AS category,
    SUM(budget)                             AS total_budget,
    SUM(spent)                              AS total_spent,
    SUM(budget) - SUM(spent)               AS remaining,
    ROUND(SUM(spent) * 100.0 / NULLIF(SUM(budget), 0), 1) AS utilization_pct
FROM projects
GROUP BY category
ORDER BY total_budget DESC;


-- View: Quarterly budget vs spending (Finance Page — /api/analytics/budget-summary/)
-- DJANGO usage: SELECT * FROM quarterly_budget_spending WHERE year = 2026;
CREATE OR REPLACE VIEW quarterly_budget_spending AS
SELECT
    EXTRACT(YEAR FROM start_date)                   AS year,
    CONCAT('Q', EXTRACT(QUARTER FROM start_date), ' ',
           EXTRACT(YEAR FROM start_date))            AS quarter,
    EXTRACT(QUARTER FROM start_date)                AS quarter_num,
    SUM(budget) / 4                                 AS quarterly_budget_alloc,
    SUM(spent)                                      AS quarterly_spent
FROM projects
WHERE start_date IS NOT NULL
GROUP BY
    EXTRACT(YEAR FROM start_date),
    EXTRACT(QUARTER FROM start_date)
ORDER BY year, quarter_num;


-- View: Projects with milestone completion rate (public Finance Transparency)
-- DJANGO usage: SELECT * FROM projects_with_milestones;
CREATE OR REPLACE VIEW projects_with_milestones AS
SELECT
    p.*,
    COUNT(m.id)                                         AS total_milestones,
    COUNT(m.id) FILTER (WHERE m.is_done = TRUE)         AS completed_milestones,
    ROUND(
        COUNT(m.id) FILTER (WHERE m.is_done = TRUE) * 100.0
        / NULLIF(COUNT(m.id), 0), 0
    )                                                   AS milestone_completion_pct
FROM projects p
LEFT JOIN project_milestones m ON m.project_id = p.id
GROUP BY p.id;


-- ============================================================================
-- 18. SEED / DEMO DATA
-- ============================================================================
-- Realistic demo records for all tables so the system feels alive on first run.
-- All records use Filipino names and Barangay Cubacub locale context.
-- Date range: November 2025 through April 7, 2026.
--
-- HOW TO RUN:
--   Option A — Direct PostgreSQL:
--     psql -U postgres -d civicflow -f SQL_SCHEMA.sql
--   Option B — Django data migration:
--     Paste these INSERTs into a new migration under operations=[RunSQL(...)]
--
-- WARNING: PASSWORDS
--   The password_hash column values are PLACEHOLDERS.
--   After inserting, set real Django-hashed passwords via management shell:
--
--     python manage.py shell
--     >>> from django.contrib.auth.hashers import make_password
--     >>> from accounts.models import StaffAccount
--     >>> pairs = [('user1','pass1'),('user2','pass2'),('user3','pass3'),
--     ...          ('treasurer','treas1'),('admin','admin')]
--     >>> for uname, pw in pairs:
--     ...     StaffAccount.objects.filter(username=uname).update(
--     ...         password_hash=make_password(pw))
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 18-A. STAFF ACCOUNTS  (5 demo accounts)
-- ----------------------------------------------------------------------------
INSERT INTO staff_accounts
    (id, username, password_hash, name, role, is_active,
     phone, email, address, birthdate, sex)
VALUES
    (1, 'user1',     'PLACEHOLDER_SET_VIA_DJANGO', 'Maria Santos',  'document_handler', TRUE,
     '09171234567', 'maria@cubacub.gov.ph',  'Sitio Magsaysay, Cubacub', '1990-05-12', 'Female'),
    (2, 'user2',     'PLACEHOLDER_SET_VIA_DJANGO', 'Juan Cruz',     'report_handler',   TRUE,
     '09281234567', 'juan@cubacub.gov.ph',   'Phase 2, Cubacub',         '1985-11-03', 'Male'),
    (3, 'user3',     'PLACEHOLDER_SET_VIA_DJANGO', 'Ana Reyes',     'clinic_handler',   TRUE,
     '09361234567', 'ana@cubacub.gov.ph',    'Poblacion, Cubacub',       '1992-08-20', 'Female'),
    (4, 'treasurer', 'PLACEHOLDER_SET_VIA_DJANGO', 'Elena Mendoza', 'treasurer',        TRUE,
     '09451234567', 'elena@cubacub.gov.ph',  'Phase 1, Cubacub',         '1988-03-07', 'Female'),
    (5, 'admin',     'PLACEHOLDER_SET_VIA_DJANGO', 'Kap. Roberto',  'super_admin',      TRUE,
     '09561234567', 'admin@cubacub.gov.ph',  'Barangay Hall, Cubacub',   '1975-09-15', 'Male');

-- Sync SERIAL sequence so next INSERT auto-assigns id = 6
SELECT setval('staff_accounts_id_seq', 5);


-- ----------------------------------------------------------------------------
-- 18-B. DOCUMENT REQUESTS  (15 records — Nov 2025 through Apr 2026)
-- ----------------------------------------------------------------------------
INSERT INTO document_requests
    (id, requestor_name, document_type, request_date, status, case_history,
     address, phone, email, purpose, civil_status, sex, birthdate,
     valid_id_type, valid_id_number, payment_method, copies_requested,
     source, handled_by, pickup_deadline)
VALUES
    ('BRG-001', 'Maria Dela Cruz',    'Barangay Clearance',
     '2025-11-05', 'approved',        'clear',
     'Phase 1, Cubacub',         '09171122334', 'mdelacr@email.com',
     'Employment',                'Single',   'Female', '1995-03-14',
     'Philippine National ID',  'PH-1234567',  'cash',  1, 'public', 1, NULL),

    ('BRG-002', 'Jose Reyes',         'Certificate of Residency',
     '2025-11-18', 'approved',        'clear',
     'Sitio Magsaysay, Cubacub', '09281122334', NULL,
     'School Requirement',        'Married',  'Male',   '1980-07-22',
     'Driver''s License',        'DL-9876543', 'cash',  1, 'staff',  1, NULL),

    ('BRG-003', 'Ana Lim',            'Certificate of Indigency',
     '2025-12-03', 'approved',        'clear',
     'Poblacion, Cubacub',       '09361122334', 'ana.lim@email.com',
     'Scholarship Application',   'Single',   'Female', '2002-01-30',
     'PhilSys ID',               'PS-1111111', 'cash',  1, 'public', 1, NULL),

    ('BRG-004', 'Pedro Santos',       'Business Clearance / Permit',
     '2025-12-15', 'rejected',        'flagged',
     'Phase 3, Cubacub',         '09451122334', NULL,
     'Business Operation',        'Married',  'Male',   '1978-05-11',
     'Philippine National ID',  'PH-2222222',  'cash',  1, 'staff',  1, NULL),

    ('BRG-005', 'Rosario Flores',     'Certificate of Good Moral Character',
     '2026-01-08', 'approved',        'clear',
     'Phase 2, Cubacub',         '09161122334', NULL,
     'Employment',                'Single',   'Female', '1998-09-05',
     'Passport',                 'PA-AABBCC',  'gcash', 1, 'public', 1, NULL),

    ('BRG-006', 'Dante Cruz',         'Cedula (Community Tax Certificate)',
     '2026-01-20', 'approved',        'clear',
     'Sitio Magsaysay, Cubacub', '09271122334', NULL,
     'Annual Cedula',             'Married',  'Male',   '1972-12-01',
     'Driver''s License',        'DL-1234567', 'cash',  1, 'staff',  1, NULL),

    ('BRG-007', 'Marilou Garcia',     'Barangay ID',
     '2026-02-01', 'approved',        'clear',
     'Poblacion, Cubacub',       '09381122334', NULL,
     'Identification',            'Widowed',  'Female', '1965-04-18',
     'PhilSys ID',               'PS-2222222', 'cash',  1, 'public', 1, NULL),

    ('BRG-008', 'Ernesto Villanueva', 'First-Time Jobseeker Certification',
     '2026-02-14', 'approved',        'clear',
     'Phase 1, Cubacub',         '09491122334', NULL,
     'First-Time Jobseeker Benefit','Single', 'Male',   '2004-06-25',
     'PhilSys ID',               'PS-3333333', 'cash',  1, 'staff',  1, NULL),

    ('BRG-009', 'Carmen Ocampo',      'Certificate of No Income',
     '2026-02-28', 'ready_to_pickup', 'clear',
     'Phase 3, Cubacub',         '09511122334', NULL,
     '4Ps Application',           'Married',  'Female', '1983-08-30',
     'Philippine National ID',  'PH-3333333',  'cash',  1, 'public', 1, '2026-04-12'),

    ('BRG-010', 'Roberto Mendoza',    'Barangay Clearance',
     '2026-03-05', 'approved',        'clear',
     'Sitio Magsaysay, Cubacub', '09211122334', NULL,
     'Bank Loan Requirement',     'Married',  'Male',   '1976-02-14',
     'Driver''s License',        'DL-5432100', 'gcash', 2, 'staff',  1, NULL),

    ('BRG-011', 'Teresita Bautista',  'Certificate of Residency',
     '2026-03-12', 'processing',      'clear',
     'Phase 2, Cubacub',         '09321122334', NULL,
     'Voter Registration',        'Separated','Female', '1970-11-20',
     'Postal ID',                'PO-9999999', 'cash',  1, 'public', 1, NULL),

    ('BRG-012', 'Andres Pascual',     'Certificate of Indigency',
     '2026-03-20', 'processing',      'clear',
     'Poblacion, Cubacub',       '09431122334', NULL,
     'Medical Assistance',        'Single',   'Male',   '1990-07-03',
     'PhilSys ID',               'PS-4444444', 'cash',  1, 'staff',  1, NULL),

    ('BRG-013', 'Gloria Tan',         'Barangay Protection Order',
     '2026-03-28', 'pending',         'flagged',
     'Phase 1, Cubacub',         '09541122334', NULL,
     'Domestic Violence Protection','Married','Female', '1985-01-09',
     'Philippine National ID',  'PH-4444444',  'cash',  1, 'public', NULL, NULL),

    ('BRG-014', 'Benjamin Ramos',     'Business Clearance / Permit',
     '2026-04-02', 'pending',         'clear',
     'Phase 3, Cubacub',         '09651122334', NULL,
     'Sari-sari Store Operation', 'Married',  'Male',   '1968-10-05',
     'Driver''s License',        'DL-6655443', 'cash',  1, 'staff',  NULL, NULL),

    ('BRG-015', 'Corazon Navarro',    'Barangay Clearance',
     '2026-04-05', 'pending',         'clear',
     'Phase 2, Cubacub',         '09761122334', NULL,
     'Employment Abroad',         'Single',   'Female', '2000-03-22',
     'Passport',                 'PA-CCDDEE',  'gcash', 1, 'public', NULL, NULL);


-- ----------------------------------------------------------------------------
-- 18-C. DOCUMENT CASE HISTORY  (5 records)
-- ----------------------------------------------------------------------------
INSERT INTO document_case_history
    (id, requestor_name, case_type, case_date, status, details, linked_request)
VALUES
    ('CH-001', 'Maria Dela Cruz', 'Multiple Rejections',
     '2025-10-15', 'cleared',
     'Requestor submitted incomplete documents three times. Resolved Nov 5 after proper ID submission.',
     'BRG-001'),

    ('CH-002', 'Pedro Santos',    'Fraudulent Request',
     '2025-12-16', 'flagged',
     'Business permit contained falsified financial records. Endorsed to Barangay Captain.',
     'BRG-004'),

    ('CH-003', 'Juan Reyes Jr.', 'Suspicious Activity',
     '2026-01-10', 'under_review',
     'Third-party submitted without notarized SPA. Currently under verification.',
     NULL),

    ('CH-004', 'Ligaya Morales',  'Multiple Rejections',
     '2026-02-20', 'cleared',
     'Two prior rejections due to expired ID. Cleared after submitting valid PhilSys ID.',
     NULL),

    ('CH-005', 'Gloria Tan',      'Domestic Dispute History',
     '2026-03-29', 'flagged',
     'Prior domestic complaint on record (2024). BPO coordinated with VAWC desk officer.',
     'BRG-013');


-- ----------------------------------------------------------------------------
-- 18-D. INCIDENTS  (12 records — Nov 2025 through Apr 2026)
-- ----------------------------------------------------------------------------
INSERT INTO incidents
    (id, reporter_name, is_anonymous, category, subcategory, details,
     incident_date, status, location, priority, incident_time, landmark,
     suspect_name, urgency, reporter_phone, reporter_relation, source, handled_by)
VALUES
    ('RPT-001', 'Juanita Santiago', FALSE,
     'Noise Complaint',    'Karaoke/Loud Music',
     'Neighbor playing karaoke past 11 PM every Friday. Multiple residents unable to sleep.',
     '2025-11-10', 'resolved',      'Phase 1, Cubacub',         'low',    '11:30 PM',
     'Near Phase 1 basketball court','Rodrigo Macaraeg','Low',  '09181234567','Concerned Neighbor','public',2),

    ('RPT-002', 'Anonymous',        TRUE,
     'Road Hazard',        'Pothole',
     'Large pothole on main road caused a motorcycle accident last night. Urgent repair needed.',
     '2025-11-25', 'resolved',      'Main Road, Cubacub',       'high',   '6:00 PM',
     'Near Cubacub Chapel',          NULL,            'High',   NULL,        'Witness',           'public',2),

    ('RPT-003', 'Rodrigo Castillo', FALSE,
     'Public Disturbance', 'Loitering/Intimidation',
     'Group of 5-6 individuals blocking Purok 3 road and harassing passersby at night.',
     '2025-12-08', 'resolved',      'Phase 2, Cubacub',         'medium', '9:00 PM',
     'Purok 3 junction',             'Unknown group', 'Medium', '09291234567','Victim',            'staff', 2),

    ('RPT-004', 'Anonymous',        TRUE,
     'Illegal Activity',   'Drug-related',
     'Suspected drug transaction observed near the creek on two consecutive nights.',
     '2025-12-20', 'resolved',      'Sitio Magsaysay, Cubacub', 'high',   '10:45 PM',
     'Near old bridge',              'Unknown suspect','High',   NULL,        'Witness',           'public',2),

    ('RPT-005', 'Maricel Reyes',    FALSE,
     'Environmental',      'Garbage Dumping',
     'Multiple households dumping waste on the open lot along Phase 3 illegally.',
     '2026-01-05', 'resolved',      'Phase 3, Cubacub',         'low',    '7:00 AM',
     'Vacant lot near Purok 5',      'Felix Domingo', 'Low',    '09391234567','Concerned Neighbor','public',2),

    ('RPT-006', 'Felix Bautista',   FALSE,
     'Noise Complaint',    'Karaoke/Loud Music',
     'Same neighbor from RPT-001 still singing past midnight despite prior warning.',
     '2026-01-22', 'resolved',      'Phase 1, Cubacub',         'low',    '12:00 AM',
     'House beside Phase 1 store',   'Rodrigo Macaraeg','Low',  '09181234567','Concerned Neighbor','staff', 2),

    ('RPT-007', 'Leticia Sison',    FALSE,
     'Road Hazard',        'Flooding',
     'Standing floodwater blocking Purok 4 entry for 3 days. Residents cannot pass.',
     '2026-02-03', 'investigating', 'Phase 2, Cubacub',         'high',   '8:00 AM',
     'Purok 4 entry road',           NULL,            'High',   '09491234567','Victim',            'public',2),

    ('RPT-008', 'Dennis Lim',       FALSE,
     'Property Damage',    NULL,
     'Car windshield smashed by unknown person. Owner has CCTV footage of male suspect.',
     '2026-02-18', 'resolved',      'Phase 1, Cubacub',         'medium', '3:00 AM',
     'In front of residence',        'Unknown',       'Medium', '09591234567','Victim',            'staff', 2),

    ('RPT-009', 'Anonymous',        TRUE,
     'Public Disturbance', 'Drinking in Public',
     'Group of young men drinking at the basketball court past midnight, shouting obscenities.',
     '2026-03-05', 'investigating', 'Phase 3, Cubacub',         'medium', '12:30 AM',
     'Phase 3 basketball court',     NULL,            'Medium', NULL,        'Concerned Neighbor','public',2),

    ('RPT-010', 'Cynthia Ramos',    FALSE,
     'Illegal Activity',   'Gambling',
     'Illegal jueteng operation from a private residence, observed on multiple afternoons.',
     '2026-03-15', 'investigating', 'Sitio Magsaysay, Cubacub', 'high',   '2:00 PM',
     'Purok 2 residential area',     'Unknown operator','High', '09691234567','Witness',           'public',2),

    ('RPT-011', 'Eduardo Cruz',     FALSE,
     'Noise Complaint',    'Construction Noise',
     'Renovation crew starts work at 5 AM, waking the entire block.',
     '2026-03-25', 'new',           'Phase 2, Cubacub',         'low',    '5:00 AM',
     'House under renovation Purok 2',NULL,           'Low',    '09791234567','Concerned Neighbor','staff', 2),

    ('RPT-012', 'Marivic Santos',   FALSE,
     'Environmental',      'Smoke/Air Pollution',
     'Backyard poultry farm producing heavy smoke and foul odor affecting 4 households.',
     '2026-04-02', 'new',           'Phase 3, Cubacub',         'medium', '10:00 AM',
     'Near Phase 3 poultry farm',    NULL,            'Medium', '09891234567','Concerned Neighbor','public',2);


-- ----------------------------------------------------------------------------
-- 18-E. CASE RECORDS  (5 formal cases)
-- ----------------------------------------------------------------------------
INSERT INTO case_records
    (id, subject_name, crime_description, case_date, status, details, location,
     charges, penalty, complainant, respondent, mediator, remarks,
     date_resolved, handled_by)
VALUES
    ('CASE-001', 'Ricardo Morales',     'Physical Altercation',
     '2025-12-01', 'resolved',
     'Physical fight during a neighborhood celebration. Both parties had minor injuries.',
     'Phase 2, Cubacub',
     'Physical injury / breach of peace',
     'Written public apology + PHP 500 fine each',
     'Rodrigo Castillo', 'Ricardo Morales', 'Kap. Roberto',
     'Both parties reconciled. No further incidents reported.',
     '2025-12-20', 2),

    ('CASE-002', 'Arturo Villanueva',   'Property Damage / Vandalism',
     '2026-01-10', 'resolved',
     'Respondent smashed complainant vehicle windshield. CCTV evidence confirmed identity.',
     'Phase 1, Cubacub',
     'Malicious mischief (Art. 327 RPC)',
     'PHP 8,500 repair cost restitution',
     'Dennis Lim', 'Arturo Villanueva', 'Juan Cruz',
     'Respondent paid full restitution. Case closed.',
     '2026-02-25', 2),

    ('CASE-003', 'Unknown Suspect',     'Suspected Drug-Related Activity',
     '2026-02-05', 'investigating',
     'Anonymous tip on drug transaction near old bridge. Referred to BADAC.',
     'Sitio Magsaysay, Cubacub',
     'Violation of RA 9165 (Comprehensive Dangerous Drugs Act)',
     NULL,
     NULL, 'Unknown Suspect', 'BADAC Chair',
     'Coordinating with PNP Mandaue City Police. Ongoing surveillance.',
     NULL, 2),

    ('CASE-004', 'Benedicto Fernandez', 'Noise Ordinance Repeat Violation',
     '2026-02-20', 'open',
     'Repeat offender with three noise complaints in two months. Escalated to formal case.',
     'Phase 1, Cubacub',
     'Violation of Barangay Noise Ordinance No. 2019-01',
     'Community service (8 hours) + PHP 1,000 fine',
     'Felix Bautista', 'Benedicto Fernandez', 'Maria Santos',
     'First hearing scheduled April 15, 2026. Respondent notified.',
     NULL, 2),

    ('CASE-005', 'Noel Aquino',         'Trespassing / Harassment',
     '2026-03-10', 'open',
     'Respondent repeatedly enters adjacent property and harasses occupants.',
     'Phase 3, Cubacub',
     'Trespassing + unjust vexation (Art. 287 RPC)',
     NULL,
     'Angela Soriano', 'Noel Aquino', 'Juan Cruz',
     'Mediation ongoing. Next hearing April 20, 2026.',
     NULL, 2);


-- ----------------------------------------------------------------------------
-- 18-F. CASE LINKED REPORTS  (junction table)
-- ----------------------------------------------------------------------------
INSERT INTO case_linked_reports (case_id, incident_id)
VALUES
    ('CASE-001', 'RPT-003'),
    ('CASE-002', 'RPT-008'),
    ('CASE-003', 'RPT-004'),
    ('CASE-003', 'RPT-010'),
    ('CASE-004', 'RPT-001'),
    ('CASE-004', 'RPT-006'),
    ('CASE-004', 'RPT-011'),
    ('CASE-005', 'RPT-009');


-- ----------------------------------------------------------------------------
-- 18-G. CASE PRIOR OFFENSES  (4 records)
-- ----------------------------------------------------------------------------
INSERT INTO case_prior_offenses (case_id, description, offense_date)
VALUES
    ('CASE-001', 'Minor altercation at a public event. Verbal warning issued.',      '2023-06-15'),
    ('CASE-003', 'Drug possession charge. Dismissed due to insufficient evidence.',  '2024-03-20'),
    ('CASE-004', 'First noise complaint. Verbal warning by on-duty tanod.',          '2025-05-10'),
    ('CASE-004', 'Second noise complaint. PHP 300 fine imposed and paid.',           '2025-09-03');


-- ----------------------------------------------------------------------------
-- 18-H. PATIENT QUEUE  (8 past + 6 today using CURRENT_DATE)
-- ----------------------------------------------------------------------------
INSERT INTO patient_queue
    (patient_name, queue_time, reason, status, phone, birthdate, sex,
     chief_complaint, allergies, current_medications, medical_conditions,
     handled_by, queue_date, completed_at)
VALUES
    ('Jose Dela Pena',    '8:00 AM',  'Blood Pressure Monitoring', 'completed',
     '09171111001', '1958-04-15', 'Male',
     'Occasional dizziness and blurred vision',
     'None', 'Amlodipine 5mg', 'Hypertension',
     3, '2026-03-10', '2026-03-10 09:15:00'),

    ('Lourdes Fernandez', '8:30 AM',  'General Checkup',           'completed',
     '09181111002', '1970-07-22', 'Female',
     'Fatigue, mild headache for 3 days',
     'Penicillin', 'None', 'None',
     3, '2026-03-10', '2026-03-10 09:50:00'),

    ('Ricardo Gomez',     '9:00 AM',  'Wound Dressing',            'completed',
     '09191111003', '1985-12-05', 'Male',
     'Laceration on right forearm from work accident',
     'None', 'None', 'None',
     3, '2026-03-10', '2026-03-10 10:10:00'),

    ('Norma Castillo',    '8:00 AM',  'Blood Pressure Monitoring', 'completed',
     '09271111004', '1952-01-30', 'Female',
     'High BP reading 160/95 recorded at home',
     'Sulfa drugs', 'Losartan 50mg', 'Hypertension, Type 2 Diabetes',
     3, '2026-03-18', '2026-03-18 09:00:00'),

    ('Caridad Robles',    '8:30 AM',  'Prenatal Checkup',          'completed',
     '09291111006', '1998-05-08', 'Female',
     '7 months pregnant, routine prenatal visit',
     'None', 'Ferrous sulfate 325mg', 'Pregnancy G1P0',
     3, '2026-03-25', '2026-03-25 10:20:00'),

    ('Angelito Torres',   '9:00 AM',  'Fever Consultation',        'completed',
     '09311111007', '2010-03-18', 'Male',
     '38.5 deg C fever with productive cough for 2 days',
     'None', 'None', 'None',
     3, '2026-03-25', '2026-03-25 10:50:00'),

    ('Pilar Aguila',      '8:00 AM',  'General Checkup',           'completed',
     '09321111008', '1963-08-25', 'Female',
     'Joint pain both knees and chronic fatigue',
     'Aspirin', 'Metformin 500mg', 'Type 2 Diabetes, Arthritis',
     3, '2026-04-01', '2026-04-01 09:45:00'),

    ('Eduardo Salazar',   '8:30 AM',  'Dental Referral',           'completed',
     '09281111005', '1990-09-14', 'Male',
     'Severe toothache for 4 days, requesting dental referral',
     'None', 'Mefenamic acid 500mg', 'None',
     3, '2026-04-01', '2026-04-01 10:05:00'),

    -- Today queue (CURRENT_DATE resolves at INSERT time)
    ('Manuel Suarez',     '8:00 AM',  'Blood Pressure Monitoring', 'completed',
     '09411111009', '1955-02-10', 'Male',
     'Routine BP check, mild dizziness this morning',
     'None', 'Enalapril 10mg', 'Hypertension',
     3, CURRENT_DATE, NULL),

    ('Fe Santos',         '8:30 AM',  'General Checkup',           'completed',
     '09421111010', '1975-06-19', 'Female',
     'Lower back pain radiating to left leg for 1 week',
     'None', 'None', 'None',
     3, CURRENT_DATE, NULL),

    ('Gerardo Manalo',    '9:00 AM',  'Wound Dressing',            'in-progress',
     '09431111011', '1988-11-28', 'Male',
     'Infected puncture wound on left foot from rusty nail',
     'None', 'None', 'None',
     3, CURRENT_DATE, NULL),

    ('Marilyn Pascual',   '9:30 AM',  'Prenatal Checkup',          'waiting',
     '09441111012', '2000-04-03', 'Female',
     '5 months pregnant, routine visit with mild leg cramps',
     'None', 'Folic acid 5mg', 'Pregnancy G2P1',
     3, CURRENT_DATE, NULL),

    ('Roberto Dela Cruz', '10:00 AM', 'Fever Consultation',        'waiting',
     '09451111013', '2015-08-12', 'Male',
     '37.9 deg C fever with runny nose since yesterday',
     'None', 'None', 'None',
     3, CURRENT_DATE, NULL),

    ('Concepcion Yap',    '10:30 AM', 'Blood Pressure Monitoring', 'waiting',
     '09461111014', '1948-12-01', 'Female',
     'Dizziness and mild headache since early morning',
     'None', 'Amlodipine 10mg', 'Hypertension',
     3, CURRENT_DATE, NULL);


-- ----------------------------------------------------------------------------
-- 18-I. PROJECTS  (8 projects — completed, ongoing, and upcoming)
-- ----------------------------------------------------------------------------
INSERT INTO projects
    (id, project_name, status, budget, spent, progress, description,
     location, start_date, end_date, contractor, funding_source, category, created_by)
VALUES
    ('PRJ-001',
     'Road Concreting — Purok 1 to Purok 3',
     'completed', 1500000.00, 1478500.00, 100,
     'Full concreting of 480 linear meters from Purok 1 to Purok 3 to improve access and reduce flood damage.',
     'Purok 1-3, Cubacub', '2025-04-01', '2025-08-30',
     'R&C Construction Services', '20% Development Fund', 'Infrastructure', 4),

    ('PRJ-002',
     'Multi-Purpose Hall Renovation',
     'ongoing', 2200000.00, 1540000.00, 70,
     'Major renovation: new steel roofing, polished concrete flooring, electrical rewiring, and restrooms.',
     'Barangay Hall, Cubacub', '2025-10-01', '2026-06-30',
     'BuildRight Contractors Inc.', 'DILG Assistance Fund', 'Infrastructure', 4),

    ('PRJ-003',
     'Street Lighting Installation — Phase 2',
     'ongoing', 850000.00, 510000.00, 60,
     'Installation of 45 LED solar-powered streetlights along Phase 2 to improve night safety.',
     'Phase 2, Cubacub', '2026-01-15', '2026-05-15',
     'LuminaTech Solutions', '20% Development Fund', 'Infrastructure', 4),

    ('PRJ-004',
     'Drainage Improvement — Sitio Magsaysay',
     'completed', 980000.00, 974200.00, 100,
     'Concrete lining of the open drainage canal to prevent flooding during rainy season.',
     'Sitio Magsaysay, Cubacub', '2025-05-15', '2025-09-30',
     'GreenBuild Engineering', 'Cebu City LDRRMO Fund', 'Infrastructure', 4),

    ('PRJ-005',
     'Livelihood Training Center Construction',
     'upcoming', 650000.00, 0.00, 0,
     'Dedicated training facility for livelihood programs: dressmaking, food processing, and welding.',
     'Phase 3, Cubacub', '2026-07-01', '2026-12-31',
     NULL, 'DSWD Sustainable Livelihood Grant', 'Community', 4),

    ('PRJ-006',
     'Barangay Health Station Upgrade',
     'completed', 450000.00, 441800.00, 100,
     'New medical equipment, expanded waiting area, and medicine cold storage unit.',
     'Poblacion, Cubacub', '2025-06-01', '2025-09-15',
     'Medcon Builders', 'DOH Health Facilities Enhancement Fund', 'Health', 4),

    ('PRJ-007',
     'Basketball Court Resurfacing & Covered Bleachers',
     'ongoing', 320000.00, 192000.00, 60,
     'Acrylic resurfacing of the main court and covered bleachers seating 200 spectators.',
     'Purok 3, Cubacub', '2026-02-01', '2026-05-31',
     'CourtPros Construction', '20% Development Fund', 'Sports & Culture', 4),

    ('PRJ-008',
     'Solid Waste Management Eco-Park',
     'upcoming', 380000.00, 0.00, 0,
     'Community Material Recovery Facility with segregation stations, composting, and eco-education zone.',
     'Phase 3, Cubacub', '2026-08-01', '2026-11-30',
     NULL, 'DENR Clean Philippines Program', 'Environmental', 4);


-- ----------------------------------------------------------------------------
-- 18-J. PROJECT IMAGES  (12 images)
-- Replace /media/projects/ paths with your actual Django MEDIA_URL paths.
-- ----------------------------------------------------------------------------
INSERT INTO project_images (project_id, image_url, caption)
VALUES
    ('PRJ-001', '/media/projects/prj001_before.jpg',  'Before — Gravel road with potholes'),
    ('PRJ-001', '/media/projects/prj001_during.jpg',  'During — Concrete laying in progress'),
    ('PRJ-001', '/media/projects/prj001_after.jpg',   'After — Completed concrete road'),
    ('PRJ-002', '/media/projects/prj002_before.jpg',  'Before — Deteriorated hall interior'),
    ('PRJ-002', '/media/projects/prj002_during.jpg',  'During — Steel roofing installation'),
    ('PRJ-003', '/media/projects/prj003_during.jpg',  'During — Solar streetlight post installation'),
    ('PRJ-004', '/media/projects/prj004_before.jpg',  'Before — Clogged open drainage canal'),
    ('PRJ-004', '/media/projects/prj004_after.jpg',   'After — Concrete-lined drainage canal'),
    ('PRJ-006', '/media/projects/prj006_before.jpg',  'Before — Old health station exterior'),
    ('PRJ-006', '/media/projects/prj006_after.jpg',   'After — Upgraded health station'),
    ('PRJ-007', '/media/projects/prj007_during.jpg',  'During — Court acrylic coating application'),
    ('PRJ-007', '/media/projects/prj007_render.jpg',  'Render — Finished court with bleachers');


-- ----------------------------------------------------------------------------
-- 18-K. PROJECT MILESTONES  (36 milestones across 8 projects)
-- ----------------------------------------------------------------------------
INSERT INTO project_milestones (project_id, label, target_date, is_done)
VALUES
    -- PRJ-001 Road Concreting (completed — all 5 done)
    ('PRJ-001', 'Site clearing and staking',               '2025-04-15', TRUE),
    ('PRJ-001', 'Sub-base and base course preparation',    '2025-05-30', TRUE),
    ('PRJ-001', 'Concrete pouring — Section A',            '2025-06-30', TRUE),
    ('PRJ-001', 'Concrete pouring — Section B',            '2025-07-31', TRUE),
    ('PRJ-001', 'Final inspection and community turnover', '2025-08-30', TRUE),

    -- PRJ-002 Hall Renovation (ongoing 70% — 3 done / 3 pending)
    ('PRJ-002', 'Demolition of old roofing and flooring',  '2025-10-31', TRUE),
    ('PRJ-002', 'Structural steel installation',           '2025-12-15', TRUE),
    ('PRJ-002', 'New roofing completion',                  '2026-01-31', TRUE),
    ('PRJ-002', 'Flooring and interior finishing',         '2026-04-30', FALSE),
    ('PRJ-002', 'Electrical, plumbing, and paint',         '2026-06-15', FALSE),
    ('PRJ-002', 'Turnover ceremony and inauguration',      '2026-06-30', FALSE),

    -- PRJ-003 Street Lighting (ongoing 60% — 3 done / 2 pending)
    ('PRJ-003', 'Site survey and pole location marking',   '2026-01-31', TRUE),
    ('PRJ-003', 'Pole installation — Batch 1 (20 poles)',  '2026-02-28', TRUE),
    ('PRJ-003', 'Pole installation — Batch 2 (25 poles)',  '2026-03-31', TRUE),
    ('PRJ-003', 'Solar panel mounting and wiring',         '2026-04-30', FALSE),
    ('PRJ-003', 'Testing, commissioning, and handover',    '2026-05-15', FALSE),

    -- PRJ-004 Drainage (completed — all 4 done)
    ('PRJ-004', 'Canal excavation and earthwork',          '2025-06-15', TRUE),
    ('PRJ-004', 'Concrete lining — Sector A',              '2025-07-15', TRUE),
    ('PRJ-004', 'Concrete lining — Sector B',              '2025-08-15', TRUE),
    ('PRJ-004', 'Final inspection and cleanup',            '2025-09-30', TRUE),

    -- PRJ-005 Livelihood Center (upcoming — all 5 pending)
    ('PRJ-005', 'Design, permits, and procurement',        '2026-07-31', FALSE),
    ('PRJ-005', 'Foundation and concrete slab',            '2026-09-15', FALSE),
    ('PRJ-005', 'Structure, roofing, and walls',           '2026-10-31', FALSE),
    ('PRJ-005', 'Interior fit-out and equipment install',  '2026-12-15', FALSE),
    ('PRJ-005', 'Inauguration and program launch',         '2026-12-31', FALSE),

    -- PRJ-006 Health Station (completed — all 4 done)
    ('PRJ-006', 'Equipment procurement and delivery',      '2025-06-30', TRUE),
    ('PRJ-006', 'Renovation works and expansion',          '2025-08-15', TRUE),
    ('PRJ-006', 'Equipment installation and testing',      '2025-09-01', TRUE),
    ('PRJ-006', 'DOH inspection and facility clearance',   '2025-09-15', TRUE),

    -- PRJ-007 Basketball Court (ongoing 60% — 2 done / 3 pending)
    ('PRJ-007', 'Old surface removal and subfloor grading','2026-02-15', TRUE),
    ('PRJ-007', 'Acrylic court surface application',       '2026-03-15', TRUE),
    ('PRJ-007', 'Court line markings and basketball rings','2026-04-15', FALSE),
    ('PRJ-007', 'Bleacher steel frame construction',       '2026-05-10', FALSE),
    ('PRJ-007', 'Roofing, finishing, and handover',        '2026-05-31', FALSE),

    -- PRJ-008 Eco-Park (upcoming — all 4 pending)
    ('PRJ-008', 'Site preparation, clearing, and fencing', '2026-08-31', FALSE),
    ('PRJ-008', 'MRF structure construction',              '2026-09-30', FALSE),
    ('PRJ-008', 'Segregation equipment installation',      '2026-10-31', FALSE),
    ('PRJ-008', 'Community orientation and soft launch',   '2026-11-30', FALSE);


-- ----------------------------------------------------------------------------
-- 18-L. CALENDAR EVENTS  (15 events — April through June 2026)
-- ----------------------------------------------------------------------------
INSERT INTO calendar_events
    (id, event_date, title, color, source, icon, event_type, created_by)
VALUES
    ('ev-001', '2026-04-10', 'Document Processing Walk-In Day',        'bg-[#1B263B]',   'document_handler', '📄', 'event',   1),
    ('ev-002', '2026-04-12', 'Barangay Assembly Q2 2026',              'bg-[#008080]',   'super_admin',      '🏛', 'event',   5),
    ('ev-003', '2026-04-14', 'Araw ng Kagitingan — Office Closed',     'bg-rose-500',    'super_admin',      '🇵🇭','closure', 5),
    ('ev-004', '2026-04-15', 'BADAC Case Hearing — CASE-004',          'bg-amber-500',   'report_handler',   '⚖', 'event',   2),
    ('ev-005', '2026-04-18', 'Quarterly Health Mission',               'bg-emerald-500', 'clinic_handler',   '🏥', 'event',   3),
    ('ev-006', '2026-04-20', 'Bingo Social — Senior Citizens',         'bg-violet-500',  'super_admin',      '🎉', 'event',   5),
    ('ev-007', '2026-04-22', 'Community Emergency Preparedness Drill', 'bg-orange-500',  'report_handler',   '🚨', 'event',   2),
    ('ev-008', '2026-04-25', 'Q1 Financial Report Presentation',       'bg-emerald-700', 'treasurer',        '💰', 'event',   4),
    ('ev-009', '2026-05-01', 'Labor Day — Office Closed',              'bg-rose-500',    'super_admin',      '🇵🇭','closure', 5),
    ('ev-010', '2026-05-08', 'Youth Leadership Seminar',               'bg-[#008080]',   'super_admin',      '🎓', 'event',   5),
    ('ev-011', '2026-05-15', 'Inter-Purok Basketball Tournament',      'bg-violet-500',  'super_admin',      '🏀', 'event',   5),
    ('ev-012', '2026-05-28', 'Livelihood Program Orientation',         'bg-[#008080]',   'super_admin',      '🧵', 'event',   5),
    ('ev-013', '2026-06-05', 'Environmental Awareness Day',            'bg-emerald-500', 'super_admin',      '🌱', 'event',   5),
    ('ev-014', '2026-06-12', 'Independence Day — Office Closed',       'bg-rose-500',    'super_admin',      '🇵🇭','closure', 5),
    ('ev-015', '2026-06-13', 'Cubacub Barangay Fiesta 2026',           'bg-[#008080]',   'super_admin',      '🎊', 'event',   5);


-- ----------------------------------------------------------------------------
-- 18-M. LOST & FOUND ITEMS  (8 items — January through April 2026)
-- ----------------------------------------------------------------------------
INSERT INTO lost_found_items
    (id, item_type, reporter_name, reporter_phone, reporter_id, is_anonymous,
     item_name, description, category, location,
     date_reported, date_of_incident, status, handler_notes, handled_by)
VALUES
    ('LF-001', 'lost', 'Rosalinda Torres',   '09171234501', 'ANON-0001', FALSE,
     'Brown Leather Wallet',
     'Brown bifold wallet initials RT. Contains PNB ATM card, PhilSys ID, approx PHP 800 cash.',
     'Personal Belongings', 'Near Phase 2 basketball court',
     '2026-01-15', '2026-01-14', 'solved',
     'Found by a child and returned to owner Jan 17. Case closed.', 2),

    ('LF-002', 'found', 'Barangay Tanod',    '09281234502', 'ANON-0002', FALSE,
     'Black Android Smartphone',
     'Samsung Galaxy A-series, cracked screen, floral case. Powered on but lock-screened.',
     'Electronics', 'Cubacub Chapel entrance',
     '2026-01-20', '2026-01-20', 'investigating',
     'Posted on community FB page. No claimant yet. Stored at barangay hall.', 2),

    ('LF-003', 'lost', 'Anonymous',          NULL,          'ANON-0003', TRUE,
     'Blue JanSport School Bag',
     'Blue JanSport backpack with notebooks, pencil case, and clear folder. No name tag.',
     'School Supplies', 'Near Cubacub Elementary School',
     '2026-02-05', '2026-02-05', 'pending',
     NULL, 2),

    ('LF-004', 'found', 'Ernesto Delas Alas','09381234503', 'ANON-0004', FALSE,
     'Prescription Eyeglasses',
     'Black-framed reading glasses found on the road. No case. Appears strong prescription.',
     'Personal Belongings', 'Phase 3 main road near waiting shed',
     '2026-02-14', '2026-02-14', 'pending',
     'Stored at barangay hall front desk. Owner may claim with valid ID.', 2),

    ('LF-005', 'lost', 'Josephine Ramos',    '09491234504', 'ANON-0005', FALSE,
     'House Keys (3 keys on ring)',
     'Three keys on yellow rubber keyring with a small blue whale keychain.',
     'Personal Belongings', 'Sitio Magsaysay covered waiting shed',
     '2026-02-28', '2026-02-27', 'pending',
     NULL, 2),

    ('LF-006', 'found', 'Mark Villanueva',   '09511234505', 'ANON-0006', FALSE,
     'Red Collapsible Umbrella',
     'Red foldable umbrella with heart-shaped handle. Found near the Purok 1 corner store.',
     'Personal Belongings', 'Purok 1 corner, Cubacub',
     '2026-03-10', '2026-03-10', 'pending',
     NULL, 2),

    ('LF-007', 'lost', 'Jonathan Uy',        '09621234506', 'ANON-0007', FALSE,
     'Globe Postpaid SIM (GCash-linked)',
     'Globe postpaid SIM with GCash wallet reportedly stolen. IMEI reported to Globe Telecom.',
     'Electronics', 'Phase 2 area — possibly stolen',
     '2026-03-18', '2026-03-17', 'investigating',
     'Coordinating with Globe Telecom and PNP cybercrime unit.', 2),

    ('LF-008', 'lost', 'Anonymous',          NULL,          'ANON-0008', TRUE,
     'Stray Dog — Brown Aspin, Red Collar',
     'Small brown native dog, gentle, red collar with no ID tag. Seen roaming Phase 3.',
     'Pets & Animals', 'Phase 3 near basketball court',
     '2026-04-01', '2026-03-31', 'pending',
     'Flyers posted. Tanod feeding dog while owner is searched.', 2);


-- ----------------------------------------------------------------------------
-- 18-N. AUDIT LOG  (15 entries — November 2025 through April 7, 2026)
-- ----------------------------------------------------------------------------
INSERT INTO audit_log
    (log_time, user_name, user_id, action, log_type, related_table, related_id)
VALUES
    ('2025-11-05 10:23:00', 'Maria Santos',  1,
     'Approved document request: Maria Dela Cruz — Barangay Clearance (BRG-001)',
     'success', 'document_requests', 'BRG-001'),

    ('2025-12-16 14:05:00', 'Maria Santos',  1,
     'Rejected document request: Pedro Santos — flagged case history (BRG-004)',
     'error',   'document_requests', 'BRG-004'),

    ('2026-01-10 09:30:00', 'Juan Cruz',     2,
     'Opened case CASE-001: Ricardo Morales — Physical Altercation',
     'info',    'case_records',      'CASE-001'),

    ('2026-01-22 11:15:00', 'Juan Cruz',     2,
     'Resolved incident RPT-006: Noise complaint — Benedicto Fernandez warned',
     'success', 'incidents',         'RPT-006'),

    ('2026-02-05 08:45:00', 'Juan Cruz',     2,
     'Escalated case CASE-003: Suspected drug-related activity — referred to BADAC',
     'warning', 'case_records',      'CASE-003'),

    ('2026-02-25 16:00:00', 'Juan Cruz',     2,
     'Resolved case CASE-002: Arturo Villanueva paid PHP 8,500 restitution — closed',
     'success', 'case_records',      'CASE-002'),

    ('2026-03-05 13:20:00', 'Ana Reyes',     3,
     'Completed consultation: Caridad Robles — Prenatal Checkup 7 months',
     'success', 'patient_queue',     NULL),

    ('2026-03-15 10:10:00', 'Elena Mendoza', 4,
     'Added project PRJ-007: Basketball Court Resurfacing and Covered Bleachers',
     'info',    'projects',          'PRJ-007'),

    ('2026-03-28 09:50:00', 'Maria Santos',  1,
     'Flagged document request BRG-013: Gloria Tan — Barangay Protection Order',
     'warning', 'document_requests', 'BRG-013'),

    ('2026-04-01 14:30:00', 'Elena Mendoza', 4,
     'Updated project spending: PRJ-002 Multi-Purpose Hall — PHP 1,540,000 (70%)',
     'info',    'projects',          'PRJ-002'),

    ('2026-04-02 11:05:00', 'Juan Cruz',     2,
     'New incident RPT-012: Environmental complaint — smoke and pollution Phase 3',
     'info',    'incidents',         'RPT-012'),

    ('2026-04-05 09:15:00', 'Maria Santos',  1,
     'New public request BRG-015: Corazon Navarro — Barangay Clearance for OFW',
     'info',    'document_requests', 'BRG-015'),

    ('2026-04-07 08:00:00', 'Ana Reyes',     3,
     'Clinic opened for the day. 6 patients registered in morning queue.',
     'success', 'patient_queue',     NULL),

    ('2026-04-07 08:45:00', 'Kap. Roberto',  5,
     'Added calendar event ev-005: Quarterly Health Mission on April 18, 2026',
     'info',    'calendar_events',   'ev-005'),

    ('2026-04-07 09:05:00', 'Kap. Roberto',  5,
     'System check: All 5 staff accounts verified active. Database seed complete.',
     'success', 'staff_accounts',    NULL);


-- ============================================================================
-- END OF SEED DATA
-- Records seeded per table:
--   staff_accounts         →   5
--   document_requests      →  15
--   document_case_history  →   5
--   incidents              →  12
--   case_records           →   5
--   case_linked_reports    →   8  (junction rows)
--   case_prior_offenses    →   4
--   patient_queue          →  14  (8 past + 6 using CURRENT_DATE)
--   projects               →   8
--   project_images         →  12
--   project_milestones     →  36
--   calendar_events        →  15
--   lost_found_items       →   8
--   audit_log              →  15
--   system_settings        →   4  (seeded in schema definition above)
-- ============================================================================
