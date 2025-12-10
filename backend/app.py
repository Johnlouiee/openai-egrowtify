from flask import Flask
from flask_cors import CORS
from website import create_app, db
from dotenv import load_dotenv
import os

# Load environment variables - specify the path explicitly
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=env_path)

# Debug: Check if OpenAI key is loaded
openai_key = os.getenv('OPENAI_API_KEY')
if openai_key:
    print(f"✅ OpenAI API key loaded (length: {len(openai_key)})")
    if openai_key.startswith('sk-'):
        print("✅ OpenAI API key format looks correct")
    else:
        print("⚠️ OpenAI API key doesn't start with 'sk-' - might be invalid")
else:
    print("❌ OpenAI API key NOT found in environment variables")
    print(f"   Current working directory: {os.getcwd()}")
    print(f"   Looking for .env at: {env_path}")
    print(f"   .env file exists: {os.path.exists(env_path)}")

app = create_app()
# CORS configuration - allow all origins for development
CORS(app, resources={r"/api/*": {"origins": "*"}})

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("✅ Database tables created/verified")
        print("✅ Server starting on http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0')

