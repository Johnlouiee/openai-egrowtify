# Troubleshooting: "Error occurred during analysis"

## Common Causes & Solutions

### 1. Missing API Keys

**Error:** "Missing PLANT_ID_API_KEY" or "Missing OPENAI_API_KEY"

**Solution:**
1. Open `backend/.env` file
2. Make sure you have:
   ```env
   PLANT_ID_API_KEY=your-actual-key-here
   OPENAI_API_KEY=your-actual-key-here
   ```
3. **Restart the backend server** after adding keys

**Get API Keys:**
- Plant.id: https://web.plant.id/plant-identification-api/
- OpenAI: https://platform.openai.com/api-keys

---

### 2. Database Connection Error

**Error:** "Access denied" or database connection errors

**Solution:**
1. Make sure MySQL is running (XAMPP: Start MySQL)
2. Check `backend/.env`:
   ```env
   DATABASE_URL=mysql+pymysql://root:@localhost:3306/plant_soil_db
   ```
3. Make sure database exists:
   - Open phpMyAdmin
   - Run `backend/database/create_tables.sql`

---

### 3. Backend Not Running

**Error:** Network error, connection refused, or CORS error

**Solution:**
1. Check backend is running:
   ```cmd
   cd backend
   python app.py
   ```
2. Should see: `* Running on http://0.0.0.0:5000`
3. Check frontend is pointing to correct URL:
   - Default: `http://localhost:5000`
   - Check browser console (F12) for actual error

---

### 4. Plant.id API Error

**Error:** "Plant.id API error: 401" or "403" or "429"

**Possible Causes:**
- **401/403:** Invalid API key
  - Check key is correct in `.env`
  - Verify key is active at https://web.plant.id/
  
- **429:** Rate limit exceeded
  - Wait a few minutes
  - Check your Plant.id account limits
  
- **500:** Plant.id server error
  - Try again later
  - Check Plant.id status page

**Solution:**
1. Verify API key at: https://web.plant.id/plant-identification-api/
2. Check your account has available credits
3. Try with a different image

---

### 5. Image Format/Size Issues

**Error:** "No image file provided" or upload fails

**Solution:**
1. Supported formats: JPG, PNG, GIF, WEBP
2. Max size: 10MB
3. Make sure image is not corrupted
4. Try a different image

---

### 6. Database Table Missing

**Error:** Database errors when tracking usage

**Solution:**
1. Run the SQL script:
   ```sql
   -- In phpMyAdmin or MySQL:
   source backend/database/create_tables.sql
   ```
2. Or manually create tables from the SQL file

---

## Quick Diagnostic Steps

### Step 1: Check Backend Logs
Look at the terminal where `python app.py` is running. You should see error messages there.

### Step 2: Check Browser Console
1. Open browser (F12)
2. Go to "Console" tab
3. Look for red error messages
4. Check "Network" tab for failed requests

### Step 3: Test Backend Health
Open in browser: `http://localhost:5000/api/health`

Should return:
```json
{
  "status": "healthy",
  "plant_id_api_configured": true,
  "openai_api_configured": true
}
```

If `plant_id_api_configured: false`, your API key is missing!

### Step 4: Check .env File
1. Make sure `.env` exists in `backend/` folder
2. Check file has no syntax errors
3. No quotes around values:
   ```env
   # ✅ Correct
   PLANT_ID_API_KEY=abc123
   
   # ❌ Wrong
   PLANT_ID_API_KEY="abc123"
   ```

---

## Most Common Fix

**90% of errors are from missing API keys!**

1. Create `backend/.env` file (copy from `env_template.txt`)
2. Add your actual API keys
3. **Restart backend** (stop and start `python app.py`)

---

## Still Not Working?

1. **Check backend terminal** - errors show there first
2. **Check browser console** (F12) - see actual error message
3. **Verify API keys** are valid and active
4. **Test with simple image** - try a clear, well-lit plant photo
5. **Check network** - make sure backend is accessible

---

## Need More Help?

Share:
1. Error message from backend terminal
2. Error message from browser console (F12)
3. What you see at `http://localhost:5000/api/health`

