from website import db
from datetime import datetime

class AIUsageTracking(db.Model):
    """Tracks individual AI analysis requests"""
    __tablename__ = 'ai_usage_tracking'
    
    usage_tracking_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    usage_type = db.Column(db.String(20), nullable=False, index=True)  # 'plant_analysis' or 'soil_analysis'
    image_path = db.Column(db.String(500), nullable=True)
    analysis_result = db.Column(db.Text, nullable=True)
    cost = db.Column(db.Numeric(10, 2), default=0.00)
    is_free_usage = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'usage_tracking_id': self.usage_tracking_id,
            'user_id': self.user_id,
            'usage_type': self.usage_type,
            'image_path': self.image_path,
            'analysis_result': self.analysis_result,
            'cost': float(self.cost) if self.cost else 0.00,
            'is_free_usage': self.is_free_usage,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class AIAnalysisUsage(db.Model):
    """Tracks plant identification usage per user"""
    __tablename__ = 'ai_analysis_usage'
    
    ai_image_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, unique=True, index=True)
    free_analyses_used = db.Column(db.Integer, default=0)
    purchased_credits = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'ai_image_id': self.ai_image_id,
            'user_id': self.user_id,
            'free_analyses_used': self.free_analyses_used,
            'purchased_credits': self.purchased_credits,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class SoilAnalysisUsage(db.Model):
    """Tracks soil analysis usage per user"""
    __tablename__ = 'soil_analysis_usage'
    
    soil_usage_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, unique=True, index=True)
    free_analyses_used = db.Column(db.Integer, default=0)
    purchased_credits = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'soil_usage_id': self.soil_usage_id,
            'user_id': self.user_id,
            'free_analyses_used': self.free_analyses_used,
            'purchased_credits': self.purchased_credits,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PlantTrainingSubmission(db.Model):
    """Stores user submissions for training new plants"""
    __tablename__ = 'plant_training_submissions'
    
    submission_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False, index=True)
    plant_name = db.Column(db.String(200), nullable=False)
    scientific_name = db.Column(db.String(200), nullable=True)
    common_names = db.Column(db.Text, nullable=True)  # JSON array as string
    plant_type = db.Column(db.String(50), nullable=True)  # vegetable, fruit, herb, etc.
    description = db.Column(db.Text, nullable=True)
    care_instructions = db.Column(db.Text, nullable=True)
    image_data = db.Column(db.Text, nullable=True)  # Base64 encoded image
    status = db.Column(db.String(20), default='pending')  # pending, reviewed, approved, rejected
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'submission_id': self.submission_id,
            'user_id': self.user_id,
            'plant_name': self.plant_name,
            'scientific_name': self.scientific_name,
            'common_names': self.common_names,
            'plant_type': self.plant_type,
            'description': self.description,
            'care_instructions': self.care_instructions,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None
        }

