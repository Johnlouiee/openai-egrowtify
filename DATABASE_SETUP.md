# Database Setup Guide

## Yes, this project uses MySQL database!

The database name is: **`plant_soil_db`**

## Quick Setup (XAMPP)

### Method 1: Using phpMyAdmin (Easiest)

1. **Start XAMPP:**
   - Open XAMPP Control Panel
   - Start **MySQL** (click "Start")

2. **Open phpMyAdmin:**
   - Click **"Admin"** button next to MySQL
   - OR go to: `http://localhost/phpmyadmin`

3. **Run SQL Script:**
   - Click **"SQL"** tab
   - Open file: `backend/database/create_tables.sql`
   - **Copy all contents** and paste into SQL box
   - Click **"Go"**

4. **Verify:**
   - You should see 4 tables created:
     - `ai_analysis_usage`
     - `ai_usage_tracking`
     - `soil_analysis_usage`
     - `plant_training_submissions`

### Method 2: Using MySQL Command Line

1. **Open Command Prompt/Terminal**

2. **Navigate to MySQL:**
   ```cmd
   cd C:\xampp\mysql\bin
   ```

3. **Login to MySQL:**
   ```cmd
   mysql -u root -p
   ```
   (Press Enter if no password, or enter your MySQL password)

4. **Run SQL Script:**
   ```sql
   source C:\Users\User\Downloads\openai-egrowtify\backend\database\create_tables.sql
   ```

   OR copy-paste the entire contents of `create_tables.sql` file

5. **Verify:**
   ```sql
   USE plant_soil_db;
   SHOW TABLES;
   ```
   Should show 4 tables.

## Database Configuration

After creating the database, make sure your `backend/.env` file has:

```env
DATABASE_URL=mysql+pymysql://root:@localhost:3306/plant_soil_db
```

**Note:**
- If XAMPP MySQL has **no password** (default): `root:@localhost` (empty after colon)
- If you set a password: `root:YOUR_PASSWORD@localhost`

## What the Database Stores

1. **Usage Tracking:** How many analyses each user has done
2. **Analysis Logs:** History of all plant/soil analyses
3. **Training Submissions:** User-submitted data for new plants

## Troubleshooting

### "Access denied" error
- Check MySQL is running in XAMPP
- Verify username/password in `.env` file
- Default XAMPP: username `root`, no password

### "Database doesn't exist"
- Run the SQL script again
- Make sure you're using the correct database name: `plant_soil_db`

### "Table already exists"
- That's okay! The script uses `CREATE TABLE IF NOT EXISTS`
- Safe to run multiple times

---

**That's it!** Your database is ready to use. 🌱

