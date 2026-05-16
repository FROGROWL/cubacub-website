# Security Policy

## Project
**Barangay Cubacub Civic-Flow**
Maintained by: Martin James Anog ([@Develofer1](https://github.com/Develofer1))

---

## Supported Versions

| Version | Status          |
|---------|-----------------|
| 1.x     | ✅ Supported     |

---

## Reporting a Vulnerability

If you discover a security vulnerability in this project, **please do NOT open a public GitHub Issue.** Doing so may expose the vulnerability before it can be fixed.

Instead, report it privately:

**Email:** martin.anog187@gmail.com
**Subject line:** `[SECURITY] Barangay Cubacub Civic-Flow — Vulnerability Report`

### What to include in your report:
- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact (what could an attacker do?)
- Your suggested fix (optional, but appreciated)

---

## Response Timeline

| Step | Timeframe |
|------|-----------|
| Acknowledgement of your report | Within **48 hours** |
| Confirmation of the vulnerability | Within **7 days** |
| Patch released | Within **30 days** (critical issues faster) |
| Public disclosure (if applicable) | After patch is deployed |

---

## Scope

The following are **in scope** for security reports:

- Authentication bypass (login without credentials)
- Unauthorized access to role-specific dashboards
- Data exposure (resident personal information, barangay records)
- Cross-Site Scripting (XSS)
- SQL Injection (once Django backend is connected)
- CORS misconfiguration

The following are **out of scope**:

- Issues in third-party libraries (report to the library maintainer)
- UI/UX bugs that have no security impact
- Issues only reproducible on outdated browsers

---

## Disclosure Policy

This project follows **Responsible Disclosure**. We ask that you:
1. Give us reasonable time to fix the issue before any public disclosure
2. Make a good-faith effort not to access or modify other users' data
3. Not perform denial-of-service attacks

We will publicly credit you for the discovery (if you wish) after the issue is resolved.

---

*Copyright (c) 2026 Martin James Anog. All Rights Reserved.*
