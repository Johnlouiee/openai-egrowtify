# Backend Not Running - Quick Fix

## The Error
`ERR_CONNECTION_REFUSED` means the backend server is **not running**.

## Solution: Start the Backend

### Step 1: Open Terminal/Command Prompt

### Step 2: Navigate to Backend Folder
```cmd
cd backend
```

### Step 3: Activate Virtual Environment (if using one)
```cmd
venv\Scripts\activate
```

### Step 4: Start the Backend Server
```cmd
python app.py
```

### Step 5: You Should See
```
✅ Database tables created/verified
✅ Server starting on http://localhost:5000
 * Running on http://0.0.0.0:5000
```

**Keep this terminal window open!** The backend must stay running.

### Step 6: Go Back to Your Browser
Refresh the page and try analyzing again.

---

## Quick Checklist

- [ ] Backend terminal is open and running `python app.py`
- [ ] You see "Running on http://0.0.0.0:5000" message
- [ ] No errors in the backend terminal
- [ ] Frontend is running on `http://localhost:3000`
- [ ] Browser is open to the frontend URL

---

## If Backend Won't Start

### Check 1: Python is installed
```cmd
python --version
```
Should show Python 3.8+

### Check 2: Dependencies installed
```cmd
cd backend
pip install -r requirements.txt
```

### Check 3: .env file exists
```cmd
dir .env
```
Should show the file exists

### Check 4: API keys are set
Open `backend/.env` and verify:
```env
PLANT_ID_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
```

### Check 5: Database is running
- XAMPP: Make sure MySQL is started
- Or your MySQL server is running

---

## Two Terminals Needed

**Terminal 1 - Backend:**
```cmd
cd backend
python app.py
```
Keep this running!

**Terminal 2 - Frontend:**
```cmd
cd frontend
npm run dev
```
Keep this running too!

---

**That's it!** Once backend is running, the errors will disappear. 🚀

