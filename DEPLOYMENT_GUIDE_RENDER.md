# Deploying eGrowtify on Render

This guide outlines how to deploy your **split frontend/backend** application on Render.

> [!WARNING]
> **Database Persistence**: Your current app uses **SQLite** (`database.db`), which saves data to a local file. **Render Web Services have an ephemeral filesystem**, meaning every time your backend redeploys or restarts, **your database (and all trained plant data) will be wiped.**
>
> **Recommended Solution**: For production, create a **PostgreSQL database** on Render and connect it to your backend.

---

## 1. Backend Deployment (Web Service)

Create a new **Web Service** on Render and connect your repository.

| Setting | Value |
| :--- | :--- |
| **Name** | `egrowtify-backend` (or similar) |
| **Region** | Singapore (or closest to you) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn app:app` |

### Environment Variables (Backend)
Add these under the **Environment** tab:

| Key | Value | Description |
| :--- | :--- | :--- |
| `PYTHON_VERSION` | `3.10.0` (or newer) | Ensure Python version match |
| `SECRET_KEY` | (Generate a random string) | For session security |
| `OPENAI_API_KEY` | `sk-...` | Your OpenAI API Key |
| `PLANT_ID_API_KEY` | (Your Key) | Your Plant.id API Key |
| `DATABASE_URL` | (External DB URL) | **Highly Recommended:** PostgreSQL URL |

> [!TIP]
> If you stick with SQLite for testing, the default code will create `database/database.db`, but remember it will vanish on restart.

---

## 2. Frontend Deployment (Static Site)

Create a new **Static Site** on Render.

| Setting | Value |
| :--- | :--- |
| **Name** | `egrowtify-frontend` |
| **Region** | Singapore (Same as backend) |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Publish Directory** | `dist` |

### Environment Variables (Frontend)
> [!IMPORTANT]
> Render Static Sites bake environment variables into the build. You must set this **before** the first build.

| Key | Value | Description |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://your-backend-name.onrender.com` | The URL of your **deployed** backend (NOT localhost) |

---

## 3. Connecting Them
1.  **Deploy Backend First**: Wait for it to go live and copy its URL (e.g., `https://egrowtify-backend.onrender.com`).
2.  **Configure Frontend**: Go to your Frontend settings -> Environment, add `VITE_API_URL` with that backend URL.
3.  **Redeploy Frontend**: Trigger a manual deploy so the frontend rebuilds with the correct API link.
