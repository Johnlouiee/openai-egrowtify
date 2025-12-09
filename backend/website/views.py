from flask import Blueprint, jsonify, request, session
from website import db
from website.models import AIUsageTracking, AIAnalysisUsage, SoilAnalysisUsage
import os
import base64
import requests
import json
import time
from openai import OpenAI
from datetime import datetime
import uuid

views = Blueprint('views', __name__)

# Configuration
FREE_ANALYSES_BASIC = int(os.getenv('FREE_ANALYSES_BASIC', '5'))
FREE_ANALYSES_PREMIUM = int(os.getenv('FREE_ANALYSES_PREMIUM', '10'))
PRICE_PER_ANALYSIS = float(os.getenv('PRICE_PER_ANALYSIS', '20.00'))

# Cache for OpenAI responses (in-memory, simple implementation)
openai_cache = {}

def get_user_id():
    """Get or create a session-based user ID"""
    if 'user_id' not in session:
        session['user_id'] = int(time.time() * 1000) % 1000000  # Simple session ID
    return session['user_id']

def _ensure_soil_usage_record(user_id):
    """Ensure a SoilAnalysisUsage record exists for the given user"""
    usage = SoilAnalysisUsage.query.filter_by(user_id=user_id).first()
    if not usage:
        usage = SoilAnalysisUsage(user_id=user_id, free_analyses_used=0, purchased_credits=0)
        db.session.add(usage)
        db.session.commit()
    return usage

def _check_ai_usage_limit(user_id, is_premium=False):
    """
    Check if user can perform AI plant analysis
    Returns: (can_proceed, remaining_free, needs_payment)
    """
    usage = AIAnalysisUsage.query.filter_by(user_id=user_id).first()
    
    if not usage:
        usage = AIAnalysisUsage(user_id=user_id, free_analyses_used=0, purchased_credits=0)
        db.session.add(usage)
        db.session.commit()
    
    max_free = FREE_ANALYSES_PREMIUM if is_premium else FREE_ANALYSES_BASIC
    total_available = usage.free_analyses_used + usage.purchased_credits
    remaining_free = max(0, max_free - usage.free_analyses_used)
    remaining_purchased = usage.purchased_credits
    
    if remaining_free > 0:
        return True, remaining_free, False
    elif remaining_purchased > 0:
        return True, remaining_purchased, False
    else:
        return False, 0, True

def _check_soil_usage_limit(user_id, is_premium=False):
    """
    Check if user can perform soil analysis
    Returns: (can_proceed, remaining_free, needs_payment)
    """
    usage = _ensure_soil_usage_record(user_id)
    
    max_free = FREE_ANALYSES_PREMIUM if is_premium else FREE_ANALYSES_BASIC
    remaining_free = max(0, max_free - usage.free_analyses_used)
    remaining_purchased = usage.purchased_credits
    
    if remaining_free > 0:
        return True, remaining_free, False
    elif remaining_purchased > 0:
        return True, remaining_purchased, False
    else:
        return False, 0, True

@views.route('/api/ai-recognition', methods=['POST'])
def ai_plant_recognition():
    """
    Plant identification endpoint
    Uses Plant.id API + OpenAI Vision for enhanced analysis
    """
    try:
        user_id = get_user_id()
        is_premium = False  # Simplified: no premium tracking
        
        # Check usage limit
        can_proceed, remaining, needs_payment = _check_ai_usage_limit(user_id, is_premium)
        if not can_proceed:
            return jsonify({
                "error": "Usage limit reached",
                "needs_payment": needs_payment,
                "remaining": 0
            }), 403
        
        # Get API keys
        plant_id_key = os.getenv('PLANT_ID_API_KEY')
        openai_key = os.getenv('OPENAI_API_KEY')
        
        if not plant_id_key:
            return jsonify({"error": "Missing PLANT_ID_API_KEY. Add it to .env and restart backend."}), 500
        
        # Get image file
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Read and encode image
        image_bytes = file.read()
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Call Plant.id API
        plant_id_url = "https://api.plant.id/v2/identify"
        headers = {
            "Content-Type": "application/json",
            "Api-Key": plant_id_key
        }
        
        payload = {
            "images": [image_b64],
            "modifiers": ["similar_images"],
            "plant_language": "en",
            "plant_details": ["common_names", "edible_parts", "url", "wiki_description"]
        }
        
        plant_response = requests.post(plant_id_url, json=payload, headers=headers, timeout=30)
        
        if plant_response.status_code != 200:
            return jsonify({
                "error": f"Plant.id API error: {plant_response.status_code}",
                "details": plant_response.text
            }), 500
        
        plant_data = plant_response.json()
        
        # Process Plant.id results
        if not plant_data.get('suggestions'):
            return jsonify({
                "error": "No plant suggestions found",
                "plant_name": "Unknown",
                "confidence": 0,
                "needs_training": True
            }), 200
        
        # Get top suggestion
        top_suggestion = plant_data['suggestions'][0]
        plant_name = top_suggestion.get('plant_name', 'Unknown')
        confidence = float(top_suggestion.get('probability', 0)) * 100
        
        plant_details = top_suggestion.get('plant_details', {})
        common_names = plant_details.get('common_names', [])
        scientific_name = plant_details.get('scientific_name', plant_name)
        wiki_description = plant_details.get('wiki_description', {}).get('value', '')
        
        # Check if confidence is low (needs training)
        needs_training = confidence < 50.0
        
        # Prepare result
        result = {
            "plant_name": plant_name,
            "scientific_name": scientific_name,
            "common_names": common_names if isinstance(common_names, list) else [common_names] if common_names else [],
            "confidence": round(confidence, 2),
            "wiki_description": wiki_description,
            "info_url": plant_details.get('url', ''),
            "needs_training": needs_training,
            "alternatives": [
                {
                    "name": s.get('plant_name', 'Unknown'),
                    "confidence": round(float(s.get('probability', 0)) * 100, 2)
                }
                for s in plant_data['suggestions'][1:6]  # Top 5 alternatives
            ]
        }
        
        # OpenAI Enhancement (optional, if API key available)
        if openai_key and confidence > 30:  # Only enhance if confidence is reasonable
            try:
                cache_key = f"{plant_name.lower()}_{confidence}"
                if cache_key in openai_cache:
                    ai_data = openai_cache[cache_key]
                else:
                    client = OpenAI(api_key=openai_key)
                    
                    system_prompt = """You are an expert horticulturist and plant pathologist with 20+ years of experience.
Analyze the provided plant image and identification data to give accurate, image-specific guidance.
Return your analysis as strict JSON with these exact keys:
- health_status (detailed assessment)
- growth_stage (specific stage based on what's visible)
- care_recommendations (object with watering, sunlight, soil, fertilizing, pruning)
- common_issues (array of specific problems)
- estimated_yield (realistic expectations)
- seasonal_notes (seasonal care tips)
- pest_diseases (common threats and prevention)"""
                    
                    user_prompt = f"""Analyze this {plant_name} plant image and provide detailed care guidance.
Scientific name: {scientific_name}
Common names: {', '.join(common_names) if common_names else plant_name}
Confidence: {confidence}%
Wiki: {wiki_description[:200]}..."""
                    
                    completion = client.chat.completions.create(
                        model="gpt-4o",
                        response_format={"type": "json_object"},
                        messages=[
                            {"role": "system", "content": system_prompt},
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": user_prompt},
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}
                                    }
                                ]
                            }
                        ],
                        temperature=0.3,
                        max_tokens=1000
                    )
                    
                    ai_data = json.loads(completion.choices[0].message.content)
                    openai_cache[cache_key] = ai_data
                
                # Merge OpenAI results
                result.update({
                    "health_status": ai_data.get("health_status", ""),
                    "growth_stage": ai_data.get("growth_stage", ""),
                    "care_recommendations": ai_data.get("care_recommendations", {}),
                    "common_issues": ai_data.get("common_issues", []),
                    "estimated_yield": ai_data.get("estimated_yield", ""),
                    "seasonal_notes": ai_data.get("seasonal_notes", ""),
                    "pest_diseases": ai_data.get("pest_diseases", {}),
                    "ai_enriched": True
                })
            except Exception as e:
                print(f"OpenAI enhancement error: {str(e)}")
                result["ai_enriched"] = False
        
        # Update usage tracking
        usage = AIAnalysisUsage.query.filter_by(user_id=user_id).first()
        if not usage:
            usage = AIAnalysisUsage(user_id=user_id, free_analyses_used=0, purchased_credits=0)
            db.session.add(usage)
        
        if remaining > 0 and usage.free_analyses_used < (FREE_ANALYSES_PREMIUM if is_premium else FREE_ANALYSES_BASIC):
            usage.free_analyses_used += 1
        elif usage.purchased_credits > 0:
            usage.purchased_credits -= 1
        
        usage.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Track usage
        tracking = AIUsageTracking(
            user_id=user_id,
            usage_type='plant_analysis',
            analysis_result=plant_name,
            cost=0.00 if remaining > 0 else PRICE_PER_ANALYSIS,
            is_free_usage=(remaining > 0)
        )
        db.session.add(tracking)
        db.session.commit()
        
        result["remaining_analyses"] = remaining - 1 if remaining > 0 else usage.purchased_credits - 1
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in ai_plant_recognition: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@views.route('/api/soil-analysis', methods=['POST'])
def soil_analysis():
    """
    Soil analysis endpoint
    Uses OpenAI Vision API for comprehensive soil assessment
    """
    try:
        user_id = get_user_id()
        is_premium = False  # Simplified: no premium tracking
        
        # Check usage limit
        can_proceed, remaining, needs_payment = _check_soil_usage_limit(user_id, is_premium)
        if not can_proceed:
            return jsonify({
                "error": "Usage limit reached",
                "needs_payment": needs_payment,
                "remaining": 0
            }), 403
        
        # Get API key
        openai_key = os.getenv('OPENAI_API_KEY')
        if not openai_key:
            return jsonify({"error": "Missing OPENAI_API_KEY. Add it to .env and restart backend."}), 500
        
        # Get image file
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Read and encode image
        image_bytes = file.read()
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Call OpenAI Vision API
        client = OpenAI(api_key=openai_key)
        
        system_prompt = """You are an expert soil scientist, agronomist, and horticulturist with extensive experience in soil analysis and plant-soil relationships, SPECIFICALLY for tropical climates and the Philippines.

Analyze the provided soil image and return detailed, accurate soil assessment with specific plant recommendations.

Return your analysis as strict JSON with these exact keys:
- moisture_level (detailed assessment with visual indicators)
- texture (specific soil type with characteristics)
- ph (estimated pH range with visual indicators)
- organic_matter (assessment of organic content)
- drainage (drainage quality assessment)
- recommendations (array of specific improvement suggestions)
- suitable_plants (detailed object with categories: vegetables, fruits, herbs, flowers, trees - each containing specific plant names with brief explanations)
- nutrient_indicators (visual signs of nutrient status)
- compaction_assessment (soil structure analysis)
- soil_health_score (1-10 rating with explanation)
- seasonal_considerations (best planting times for this soil)
- soil_amendments (specific materials to add for improvement)
- water_retention (how well soil holds water)
- root_development (how well roots can grow in this soil)

IMPORTANT: For suitable_plants, prioritize and recommend COMMON PHILIPPINE PLANTS that are widely grown in the Philippines."""
        
        completion = client.chat.completions.create(
            model="gpt-4o",
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Analyze this soil image and provide detailed soil assessment for home gardening:"},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}
                        }
                    ]
                }
            ],
            temperature=0.3,
            max_tokens=1500
        )
        
        result = json.loads(completion.choices[0].message.content)
        result["ai_analyzed"] = True
        
        # Update usage tracking
        usage = _ensure_soil_usage_record(user_id)
        if remaining > 0:
            usage.free_analyses_used += 1
        elif usage.purchased_credits > 0:
            usage.purchased_credits -= 1
        
        usage.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Track usage
        tracking = AIUsageTracking(
            user_id=user_id,
            usage_type='soil_analysis',
            analysis_result=result.get('soil_health_score', 'N/A'),
            cost=0.00 if remaining > 0 else PRICE_PER_ANALYSIS,
            is_free_usage=(remaining > 0)
        )
        db.session.add(tracking)
        db.session.commit()
        
        result["remaining_analyses"] = remaining - 1 if remaining > 0 else usage.purchased_credits - 1
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error in soil_analysis: {str(e)}")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@views.route('/api/ai-usage-status', methods=['GET'])
def ai_usage_status():
    """Get remaining AI plant analysis credits"""
    try:
        user_id = get_user_id()
        is_premium = False
        
        usage = AIAnalysisUsage.query.filter_by(user_id=user_id).first()
        if not usage:
            max_free = FREE_ANALYSES_PREMIUM if is_premium else FREE_ANALYSES_BASIC
            return jsonify({
                "free_analyses_used": 0,
                "purchased_credits": 0,
                "remaining_free": max_free,
                "remaining_total": max_free
            }), 200
        
        max_free = FREE_ANALYSES_PREMIUM if is_premium else FREE_ANALYSES_BASIC
        remaining_free = max(0, max_free - usage.free_analyses_used)
        
        return jsonify({
            "free_analyses_used": usage.free_analyses_used,
            "purchased_credits": usage.purchased_credits,
            "remaining_free": remaining_free,
            "remaining_total": remaining_free + usage.purchased_credits
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@views.route('/api/soil-usage-status', methods=['GET'])
def soil_usage_status():
    """Get remaining soil analysis credits"""
    try:
        user_id = get_user_id()
        is_premium = False
        
        usage = _ensure_soil_usage_record(user_id)
        max_free = FREE_ANALYSES_PREMIUM if is_premium else FREE_ANALYSES_BASIC
        remaining_free = max(0, max_free - usage.free_analyses_used)
        
        return jsonify({
            "free_analyses_used": usage.free_analyses_used,
            "purchased_credits": usage.purchased_credits,
            "remaining_free": remaining_free,
            "remaining_total": remaining_free + usage.purchased_credits
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@views.route('/api/train-plant', methods=['POST'])
def train_new_plant():
    """
    Submit training data for a newly discovered plant
    Accepts both JSON and form data
    """
    try:
        user_id = get_user_id()
        
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
        else:
            data = request.form.to_dict()
            # Parse JSON strings if present
            if 'common_names' in data and isinstance(data['common_names'], str):
                try:
                    data['common_names'] = json.loads(data['common_names'])
                except:
                    pass
        
        # Validate required fields
        if 'plant_name' not in data or not data.get('plant_name'):
            return jsonify({"error": "Missing required field: plant_name"}), 400
        
        # Get image if provided
        image_data = None
        if 'image' in request.files:
            file = request.files['image']
            if file.filename:
                image_bytes = file.read()
                image_data = base64.b64encode(image_bytes).decode('utf-8')
        elif 'image_data' in data and data['image_data']:
            # Remove data URL prefix if present
            img_data = data['image_data']
            if ',' in img_data:
                image_data = img_data.split(',')[1]
            else:
                image_data = img_data
        
        # Process common_names
        common_names_str = ''
        if 'common_names' in data:
            if isinstance(data['common_names'], list):
                common_names_str = json.dumps(data['common_names'])
            elif isinstance(data['common_names'], str):
                # If it's a comma-separated string, convert to list then JSON
                names_list = [n.strip() for n in data['common_names'].split(',') if n.strip()]
                common_names_str = json.dumps(names_list)
        
        # Create training submission
        submission = PlantTrainingSubmission(
            user_id=user_id,
            plant_name=data.get('plant_name', ''),
            scientific_name=data.get('scientific_name', ''),
            common_names=common_names_str,
            plant_type=data.get('plant_type', ''),
            description=data.get('description', ''),
            care_instructions=data.get('care_instructions', ''),
            image_data=image_data,
            status='pending'
        )
        
        db.session.add(submission)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "message": "Plant training data submitted successfully. Thank you for contributing!",
            "submission_id": submission.submission_id
        }), 200
        
    except Exception as e:
        print(f"Error in train_new_plant: {str(e)}")
        import traceback
        traceback.print_exc()
        db.session.rollback()
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@views.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "plant_id_api_configured": bool(os.getenv('PLANT_ID_API_KEY')),
        "openai_api_configured": bool(os.getenv('OPENAI_API_KEY'))
    }), 200

