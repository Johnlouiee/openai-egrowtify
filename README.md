# Plant & Soil Identification System

AI-powered application for identifying plants and analyzing soil from images.

## System Flow

### Plant Identification Flow

```
┌─────────────────┐
│  User Uploads   │
│  Plant Image    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 1: Check Usage     │
│ - Verify user has       │
│   remaining credits     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 2: Image Processing│
│ - Read image file       │
│ - Base64 encode         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 3: Plant.id API    │
│ - Send image to API     │
│ - Get plant suggestions │
│ - Extract plant name,   │
│   confidence, details   │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 4: OpenAI          │
│ Enhancement (Optional)  │
│ - Analyze image with    │
│   GPT-4o Vision         │
│ - Get health status,    │
│   care recommendations │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 5: Update Usage    │
│ - Decrement credits     │
│ - Log analysis          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 6: Return Results  │
│ - Plant name & details  │
│ - Health assessment    │
│ - Care recommendations │
└─────────────────────────┘
```

### Soil Analysis Flow

```
┌─────────────────┐
│  User Uploads   │
│  Soil Image     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 1: Check Usage     │
│ - Verify user has       │
│   remaining credits     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 2: Image Processing│
│ - Read image file       │
│ - Base64 encode         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 3: OpenAI Vision   │
│ Analysis                │
│ - Send image to GPT-4o  │
│ - Get comprehensive     │
│   soil assessment       │
│ - Analyze moisture, pH, │
│   texture, nutrients    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 4: Update Usage    │
│ - Decrement credits     │
│ - Log analysis          │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 5: Return Results  │
│ - Soil properties       │
│ - Health score          │
│ - Suitable plants       │
│ - Recommendations       │
└─────────────────────────┘
```

### Usage Tracking Flow

```
User Session
    │
    ▼
┌─────────────────┐
│ Session-based   │
│ User ID Created │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Check Usage Record      │
│ - Query database        │
│ - Create if not exists  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Calculate Remaining     │
│ - Free analyses used    │
│ - Purchased credits     │
│ - Total available       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Allow/Deny Request      │
│ - If credits available: │
│   → Proceed             │
│ - If no credits:        │
│   → Return error        │
└─────────────────────────┘
```

## How to Run the System

### Prerequisites

- **Python 3.8+**
- **Node.js 16+**
- **MySQL 5.7+** (or MariaDB 10.3+)
- **API Keys:**
  - [Plant.id API Key](https://web.plant.id/plant-identification-api/)
  - [OpenAI API Key](https://platform.openai.com/api-keys)

### Step 1: Database Setup

1. **Start MySQL:**
   ```bash
   # Windows: Usually runs as service
   # Mac/Linux:
   sudo systemctl start mysql
   ```

2. **Create database and tables:**
   ```bash
   mysql -u root -p < backend/database/create_tables.sql
   ```
   
   Or manually:
   ```sql
   mysql -u root -p
   CREATE DATABASE plant_soil_db;
   USE plant_soil_db;
   SOURCE backend/database/create_tables.sql;
   ```

### Step 2: Backend Setup

1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # Mac/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Create `.env` file:**
   ```bash
   # Copy template
   cp env_template.txt .env
   
   # Or create manually
   # Windows: type nul > .env
   # Mac/Linux: touch .env
   ```

5. **Configure `.env` file:**
   ```env
   DATABASE_URL=mysql+pymysql://root:your_password@localhost:3306/plant_soil_db
   SECRET_KEY=your-secret-key-here
   PLANT_ID_API_KEY=your-plant-id-api-key
   OPENAI_API_KEY=your-openai-api-key
   FREE_ANALYSES_BASIC=5
   FREE_ANALYSES_PREMIUM=10
   PRICE_PER_ANALYSIS=20.00
   ```

6. **Get API Keys:**
   
   **Plant.id:**
   - Visit: https://web.plant.id/plant-identification-api/
   - Sign up/login
   - Copy API key to `.env`
   
   **OpenAI:**
   - Visit: https://platform.openai.com/api-keys
   - Sign up/login
   - Create new secret key
   - Copy to `.env`

7. **Start backend server:**
   ```bash
   python app.py
   ```
   
   You should see:
   ```
   ✅ Database tables created/verified
   ✅ Server starting on http://localhost:5000
   * Running on http://0.0.0.0:5000
   ```

### Step 3: Frontend Setup

1. **Open new terminal** (keep backend running)

2. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Start frontend server:**
   ```bash
   npm run dev
   ```
   
   You should see:
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:3000/
   ```

### Step 4: Use the Application

1. **Open browser:**
   Navigate to `http://localhost:3000`

2. **Plant Identification:**
   - Click "Plant" tab
   - Click "Choose File" or "Use Camera"
   - Select/take a plant image
   - Click "Analyze Image"
   - View results (name, health, care tips)

3. **Soil Analysis:**
   - Click "Soil" tab
   - Upload a soil image
   - Click "Analyze Image"
   - View results (moisture, pH, texture, recommendations)

## System Architecture

### Backend (Flask)
- **Port:** 5000
- **Framework:** Flask
- **Database:** MySQL via SQLAlchemy
- **APIs Used:**
  - Plant.id API (plant identification)
  - OpenAI GPT-4o Vision (enhancement & soil analysis)

### Frontend (React)
- **Port:** 3000
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **HTTP Client:** Axios

### Database Tables
- `ai_analysis_usage` - Plant identification usage tracking
- `soil_analysis_usage` - Soil analysis usage tracking
- `ai_usage_tracking` - Individual request logs

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai-recognition` | POST | Analyze plant image |
| `/api/soil-analysis` | POST | Analyze soil image |
| `/api/ai-usage-status` | GET | Get plant analysis credits |
| `/api/soil-usage-status` | GET | Get soil analysis credits |
| `/api/health` | GET | Check API configuration |

## Troubleshooting

### Backend won't start
- ✅ Check MySQL is running
- ✅ Verify `.env` file exists and has correct values
- ✅ Ensure virtual environment is activated
- ✅ Check database connection string

### Frontend can't connect
- ✅ Verify backend is running on port 5000
- ✅ Check browser console for errors
- ✅ Ensure CORS is enabled (already configured)

### API errors
- ✅ Verify API keys are correct in `.env`
- ✅ Check API key validity
- ✅ Restart backend after changing `.env`

### Database errors
- ✅ Ensure MySQL is running
- ✅ Verify database exists: `plant_soil_db`
- ✅ Check user permissions
- ✅ Verify connection string format

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | MySQL connection string | Required |
| `PLANT_ID_API_KEY` | Plant.id API key | Required |
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `SECRET_KEY` | Flask session secret | Required |
| `FREE_ANALYSES_BASIC` | Free analyses limit | 5 |
| `FREE_ANALYSES_PREMIUM` | Premium free analyses | 10 |
| `PRICE_PER_ANALYSIS` | Cost per paid analysis | 20.00 |

### Usage Limits

- **Default:** 5 free analyses per type (plant/soil)
- **Session-based:** Each browser session gets its own usage tracking
- **No authentication required:** Uses Flask sessions

---

**Ready to start?** Follow the steps above and you'll be analyzing plants and soil in minutes! 🌱
