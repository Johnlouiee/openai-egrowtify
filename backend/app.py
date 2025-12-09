from flask import Flask
from flask_cors import CORS
from website import create_app, db
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = create_app()
# CORS configuration - allow all origins for development
CORS(app, resources={r"/api/*": {"origins": "*"}})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("✅ Database tables created/verified")
        print("✅ Server starting on http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0')

