from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv
import os

# Load environment variables - search in backend and root
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
root_dir = os.path.dirname(backend_dir)
env_paths = [
    os.path.join(backend_dir, '.env'),
    os.path.join(root_dir, '.env')
]

for path in env_paths:
    if os.path.exists(path):
        load_dotenv(dotenv_path=path)
        break


db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Database configuration - use SQLite as default fallback (more reliable for verify)
    db_path = os.path.join(backend_dir, 'database', 'database.db')
    default_db_uri = f'sqlite:///{db_path}'
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', default_db_uri)
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
    
    # Initialize extensions
    db.init_app(app)
    
    # Register blueprints
    from website import views
    app.register_blueprint(views.views, url_prefix='/')
    
    return app

