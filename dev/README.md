# Local Dev Runner

Use this folder when you want to run the backend and frontend at the same time.

## First-time setup

Backend dependencies:

```powershell
.\venv\Scripts\python.exe -m pip install -r backend\requirements.txt
```

Frontend dependencies:

```powershell
cd frontend
pnpm install
```

## Start both servers

From the project root:

```powershell
.\dev\start-all.ps1
```

Or double-click:

```text
dev\start-all.bat
```

The script opens two PowerShell windows:

- Django backend: http://localhost:8000
- Vite frontend: http://localhost:5173

Close those two windows to stop the servers.

## Local vs Live

Use this local runner when you want to test changes against your own backend/.env database instead of the deployed Render and Cloudflare sites.

If the backend schema changes or the local database is stale, run this once before starting the servers:

```powershell
cd backend
..\venv\Scripts\python.exe manage.py migrate
```

Then start the app with `dev\start-all.ps1` as usual.
