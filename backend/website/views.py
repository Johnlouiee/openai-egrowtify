from flask import Blueprint, jsonify, request, session
from website import db
from website.models import AIUsageTracking, AIAnalysisUsage, SoilAnalysisUsage, PlantTrainingSubmission
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
        # Get is_premium from request (form data or JSON)
        is_premium = False
        if request.form:
            is_premium = request.form.get('is_premium', 'false').lower() == 'true'
        elif request.is_json:
            is_premium = request.get_json().get('is_premium', False)
        
        print(f"\n📋 Plan Check:")
        print(f"   Plan: {'Premium' if is_premium else 'Basic'}")
        print(f"   Will use OpenAI: {is_premium}")
        
        # Check usage limit
        can_proceed, remaining, needs_payment = _check_ai_usage_limit(user_id, is_premium)
        if not can_proceed:
            return jsonify({
                "error": "Usage limit reached",
                "needs_payment": needs_payment,
                "remaining": 0
            }), 403
        
        # Get API keys - try multiple locations for .env file
        from dotenv import load_dotenv
        import os as os_module
        
        # Try backend/.env first, then root/.env
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        root_dir = os.path.dirname(backend_dir) if os.path.basename(backend_dir) == 'backend' else backend_dir
        
        env_paths = [
            os.path.join(backend_dir, '.env'),
            os.path.join(root_dir, '.env'),
            '.env'  # Current directory
        ]
        
        loaded = False
        for env_path in env_paths:
            if os.path.exists(env_path):
                load_dotenv(dotenv_path=env_path, override=True)
                loaded = True
                print(f"✅ Loaded .env from: {env_path}")
                break
        
        if not loaded:
            # Try default load_dotenv() which searches current directory and parents
            load_dotenv(override=True)
            print(f"⚠️ Using default .env search")
        
        plant_id_key = os.getenv('PLANT_ID_API_KEY')
        openai_key = os.getenv('OPENAI_API_KEY')
        
        # Clean up the key (remove quotes and whitespace if present)
        if openai_key:
            openai_key = openai_key.strip().strip('"').strip("'")
        
        # Debug logging
        print(f"\n🔍 API Key Check:")
        print(f"   PLANT_ID_API_KEY: {'✅ Found' if plant_id_key else '❌ Missing'}")
        print(f"   OPENAI_API_KEY: {'✅ Found' if openai_key else '❌ Missing'}")
        if openai_key:
            print(f"   OpenAI key length: {len(openai_key)}")
            print(f"   OpenAI key starts with 'sk-': {openai_key.startswith('sk-')}")
            print(f"   OpenAI key preview: {openai_key[:7]}...{openai_key[-4:]}")
        else:
            print(f"   ⚠️ OpenAI key is None or empty")
            print(f"   Checking .env file at: {env_path}")
            print(f"   .env exists: {os.path.exists(env_path)}")
        
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
            "ai_enriched": False,  # Initialize as False, will be set to True if OpenAI succeeds
            "alternatives": [
                {
                    "name": s.get('plant_name', 'Unknown'),
                    "confidence": round(float(s.get('probability', 0)) * 100, 2)
                }
                for s in plant_data['suggestions'][1:6]  # Top 5 alternatives
            ]
        }
        
        # OpenAI Enhancement (ONLY for premium plan)
        print(f"\n🤖 OpenAI Enhancement Check:")
        print(f"   Plan: {'Premium' if is_premium else 'Basic'}")
        print(f"   Has API key: {bool(openai_key)}")
        if openai_key:
            print(f"   API key preview: {openai_key[:10]}...{openai_key[-4:]}")
            print(f"   API key valid format: {openai_key.startswith('sk-')}")
        print(f"   Confidence: {confidence}%")
        
        # Only use OpenAI for premium plan
        if not is_premium:
            print("ℹ️ Basic plan: Skipping OpenAI enhancement (using Plant.id API only)")
            result["ai_enriched"] = False
        elif not openai_key:
            print("❌ OpenAI API key not found. Skipping AI enhancement.")
            print("   Make sure OPENAI_API_KEY is set in .env file")
            result["ai_enriched"] = False
        elif confidence <= 30:
            print(f"⚠️ Confidence too low ({confidence}%) for OpenAI enhancement. Skipping.")
            result["ai_enriched"] = False
        else:
            try:
                print(f"🚀 Starting OpenAI enhancement for {plant_name}...")
                cache_key = f"{plant_name.lower()}_{confidence}"
                if cache_key in openai_cache:
                    print(f"✅ Using cached OpenAI data for {plant_name}")
                    ai_data = openai_cache[cache_key]
                else:
                    print(f"🔄 Calling OpenAI API for {plant_name} (confidence: {confidence}%)")
                    # Validate API key format
                    if not openai_key or not openai_key.startswith('sk-'):
                        raise ValueError(f"Invalid OpenAI API key format. Key should start with 'sk-'. Got: {openai_key[:10] if openai_key else 'None'}...")
                    
                    print(f"   Creating OpenAI client...")
                    # Initialize OpenAI client - ensure clean API key
                    clean_key = openai_key.strip().strip('"').strip("'")
                    if not clean_key.startswith('sk-'):
                        raise ValueError(f"Invalid OpenAI API key format. Key should start with 'sk-'")
                    client = OpenAI(api_key=clean_key)
                    print(f"   ✅ OpenAI client created successfully")
                    
                    system_prompt = """You are an expert horticulturist and plant pathologist with 20+ years of experience.
Analyze the provided plant image and identification data to give accurate, image-specific guidance based on what you can actually see in the image.

IMPORTANT: Your analysis must be based on the actual image provided, not generic information. Look at the plant's condition, stage, and visible characteristics.

Return your analysis as strict JSON with these exact keys:
- health_status (detailed assessment based on visible condition - describe what you see: color, leaves, stems, any signs of disease or health issues)
- growth_stage (specific stage based on what's visible in the image - e.g., "seedling", "vegetative", "flowering", "fruiting", "mature")
- care_recommendations (object with watering, sunlight, soil, fertilizing, pruning - each as a detailed string)
- common_issues (array of specific problems that might affect this plant)
- estimated_yield (realistic expectations for this specific plant)
- seasonal_notes (seasonal care tips relevant to the current season)
- pest_diseases (common threats and prevention methods for this plant)

All fields must contain meaningful, detailed information. Do not leave any field empty."""

                    user_prompt = f"""Analyze this {plant_name} plant image carefully and provide detailed, image-specific care guidance.

Plant Information:
- Scientific name: {scientific_name}
- Common names: {', '.join(common_names) if common_names else plant_name}
- Identification confidence: {confidence}%
- Description: {wiki_description[:300] if wiki_description else 'No description available'}

Based on what you can see in the image:
1. Assess the plant's health status - describe the visible condition, color, leaves, stems, and any signs of health or disease
2. Determine the growth stage - what stage is the plant in based on what's visible (seedling, vegetative, flowering, fruiting, etc.)
3. Provide specific care recommendations for watering, sunlight, soil, fertilizing, and pruning
4. Note any seasonal considerations
5. List common pests and diseases to watch for

Be specific and detailed. Base your analysis on what you can actually see in the image."""
                    
                    print(f"   📤 Sending request to OpenAI API...")
                    print(f"   Model: gpt-4o")
                    print(f"   Image size: {len(image_b64)} characters (base64)")
                    
                    # Make the OpenAI API call
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
                        max_tokens=1500
                    )
                    
                    print(f"   📥 Received response from OpenAI")
                    print(f"   Response status: {completion.choices[0].finish_reason}")
                    
                    # Parse the response
                    response_content = completion.choices[0].message.content
                    print(f"   Response content length: {len(response_content)}")
                    print(f"   Response preview: {response_content[:200]}...")
                    ai_data = json.loads(response_content)
                    print(f"   📊 Parsed AI data keys: {list(ai_data.keys())}")
                    
                    # Debug: Print all field values
                    print(f"   📋 Field values:")
                    print(f"      health_status: {ai_data.get('health_status', 'MISSING')[:80] if ai_data.get('health_status') else 'MISSING'}")
                    print(f"      growth_stage: {ai_data.get('growth_stage', 'MISSING')[:80] if ai_data.get('growth_stage') else 'MISSING'}")
                    print(f"      care_recommendations: {list(ai_data.get('care_recommendations', {}).keys()) if isinstance(ai_data.get('care_recommendations'), dict) else 'NOT A DICT'}")
                    print(f"      seasonal_notes: {ai_data.get('seasonal_notes', 'MISSING')[:80] if ai_data.get('seasonal_notes') else 'MISSING'}")
                    
                    # Validate that we got the expected data
                    if not ai_data:
                        raise ValueError("OpenAI returned empty data")
                    
                    # Warn if critical fields are missing
                    if not ai_data.get("health_status"):
                        print(f"   ⚠️ WARNING: health_status is missing or empty")
                    if not ai_data.get("growth_stage"):
                        print(f"   ⚠️ WARNING: growth_stage is missing or empty")
                    if not ai_data.get("care_recommendations"):
                        print(f"   ⚠️ WARNING: care_recommendations is missing or empty")
                    
                    openai_cache[cache_key] = ai_data
                    print(f"✅ OpenAI enhancement successful for {plant_name}")
                
                # Merge OpenAI results - ensure all fields are populated
                pest_diseases = ai_data.get("pest_diseases", "")
                # Handle both string and object types for pest_diseases
                if isinstance(pest_diseases, dict):
                    # Convert dict to string if needed
                    pest_diseases = json.dumps(pest_diseases) if pest_diseases else ""
                elif pest_diseases is None:
                    pest_diseases = ""
                
                # Get care recommendations
                care_recommendations = ai_data.get("care_recommendations", {})
                if not isinstance(care_recommendations, dict):
                    care_recommendations = {}
                
                # Validate and extract OpenAI data with fallbacks
                health_status = ai_data.get("health_status", "").strip()
                growth_stage = ai_data.get("growth_stage", "").strip()
                seasonal_notes = ai_data.get("seasonal_notes", "").strip()
                estimated_yield = ai_data.get("estimated_yield", "").strip()
                
                # Ensure care_recommendations has all required fields
                if not care_recommendations:
                    care_recommendations = {}
                
                # Update result with OpenAI data
                result.update({
                    "health_status": health_status if health_status else "Healthy plant with good overall condition based on visual assessment.",
                    "growth_stage": growth_stage if growth_stage else "Active growth stage visible in the image.",
                    "care_recommendations": care_recommendations,
                    "common_issues": ai_data.get("common_issues", []),
                    "estimated_yield": estimated_yield if estimated_yield else "Yield expectations depend on proper care and growing conditions.",
                    "seasonal_notes": seasonal_notes if seasonal_notes else "Provide appropriate seasonal care based on current weather conditions.",
                    "pest_diseases": pest_diseases if pest_diseases else "Monitor for common pests and diseases. Use organic treatments when possible.",
                    "ai_enriched": True
                })
                
                print(f"   ✅ Result updated with AI data")
                print(f"   ✅ ai_enriched set to: {result['ai_enriched']}")
                print(f"   ✅ health_status: {result['health_status'][:50]}..." if result['health_status'] else "   ⚠️ health_status: EMPTY")
                print(f"   ✅ growth_stage: {result['growth_stage'][:50]}..." if result['growth_stage'] else "   ⚠️ growth_stage: EMPTY")
                print(f"   ✅ care_recommendations keys: {list(result['care_recommendations'].keys())}")
                print(f"   ✅ Final check - ai_enriched in result: {result.get('ai_enriched', 'NOT SET')}")
            except Exception as e:
                import traceback
                error_msg = str(e)
                error_type = type(e).__name__
                print(f"\n❌ OpenAI enhancement error occurred!")
                print(f"   Error type: {error_type}")
                print(f"   Error message: {error_msg}")
                print(f"   Full traceback:")
                traceback.print_exc()  # Use print_exc instead of format_exc for immediate output
                result["ai_enriched"] = False
                # Always add error info to result for debugging
                result["openai_error"] = {
                    "type": error_type,
                    "message": error_msg,
                    "debug": "Check backend console for full traceback"
                }
                # Still return the basic result even if OpenAI fails
        
        # Final verification
        print(f"\n📋 Final Result Check:")
        print(f"   ai_enriched: {result.get('ai_enriched', 'NOT SET')}")
        print(f"   Has health_status: {bool(result.get('health_status'))}")
        print(f"   Has care_recommendations: {bool(result.get('care_recommendations'))}")
        
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
        # Get is_premium from request (form data or JSON)
        is_premium = False
        if request.form:
            is_premium = request.form.get('is_premium', 'false').lower() == 'true'
        elif request.is_json:
            is_premium = request.get_json().get('is_premium', False)
        
        print(f"\n📋 Soil Analysis Plan Check:")
        print(f"   Plan: {'Premium' if is_premium else 'Basic'}")
        
        # Check usage limit
        can_proceed, remaining, needs_payment = _check_soil_usage_limit(user_id, is_premium)
        if not can_proceed:
            return jsonify({
                "error": "Usage limit reached",
                "needs_payment": needs_payment,
                "remaining": 0
            }), 403
        
        # Soil analysis requires premium plan (uses OpenAI)
        if not is_premium:
            return jsonify({
                "error": "Soil analysis requires Premium plan. Please upgrade to Premium to use this feature.",
                "requires_premium": True
            }), 403
        
        # Get API key
        openai_key = os.getenv('OPENAI_API_KEY')
        if not openai_key:
            return jsonify({"error": "Missing OPENAI_API_KEY. Add it to .env and restart backend."}), 500
        
        # Clean up the key (remove quotes and whitespace if present)
        if openai_key:
            openai_key = openai_key.strip().strip('"').strip("'")
        
        # Get image file
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Read and encode image
        image_bytes = file.read()
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Call OpenAI Vision API (Premium only)
        print(f"🚀 Starting OpenAI soil analysis (Premium plan)...")
        clean_key = openai_key.strip().strip('"').strip("'")
        if not clean_key.startswith('sk-'):
            return jsonify({"error": "Invalid OpenAI API key format"}), 500
        
        client = OpenAI(api_key=clean_key)
        
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
        result["ai_enriched"] = True  # Soil analysis always uses OpenAI (Premium only)
        print(f"✅ Soil analysis completed with OpenAI")
        
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

@views.route('/api/train-plant/generate', methods=['POST'])
def generate_plant_info():
    """
    Use OpenAI to generate plant information from an uploaded image
    This helps users train new plants by auto-filling scientific data
    """
    try:
        # Get OpenAI API key
        openai_key = os.getenv('OPENAI_API_KEY')
        if not openai_key:
            return jsonify({"error": "OpenAI API key not configured"}), 500
        
        clean_key = openai_key.strip().strip('"').strip("'")
        if not clean_key.startswith('sk-'):
            return jsonify({"error": "Invalid OpenAI API key format"}), 500
        
        # Get image file
        if 'image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        # Read and encode image
        image_bytes = file.read()
        image_b64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Get optional plant name hint
        plant_name_hint = request.form.get('plant_name', '')
        
        # Initialize OpenAI client
        client = OpenAI(api_key=clean_key)
        
        system_prompt = """You are an expert botanist and horticulturist specializing in plant identification and care.
Analyze the provided plant image and generate comprehensive plant information in JSON format.

Return your analysis as strict JSON with these exact keys:
- plant_name (common name of the plant, e.g., "Kangkong")
- scientific_name (binomial nomenclature, e.g., "Ipomoea aquatica")
- common_names (array of alternative common names, e.g., ["Water Spinach", "Ong Choy"])
- plant_type (one of: "vegetable", "fruit", "herb", "flower", "tree", "shrub", "other")
- description (detailed description of appearance, characteristics, origin - 2-3 sentences)
- care_instructions (comprehensive care guide including: watering frequency, sunlight requirements, soil type, fertilizing schedule, pruning needs, temperature range - formatted as a paragraph)

Be accurate and specific. If you cannot identify the plant with confidence, indicate uncertainty in the description.
For Philippine/tropical plants, provide region-specific care instructions."""

        user_prompt = f"""Analyze this plant image and generate complete plant information.
{f'User suggests the plant name might be: {plant_name_hint}' if plant_name_hint else ''}

Provide detailed, accurate information about:
1. Plant identification (common name, scientific name, alternative names)
2. Plant type/category
3. Physical description (appearance, size, leaves, flowers if visible)
4. Comprehensive care instructions (watering, sunlight, soil, fertilizing, pruning, temperature)

Format all information as detailed JSON."""

        print(f"🤖 Generating plant info with OpenAI...")
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
            max_tokens=1500
        )
        
        result = json.loads(completion.choices[0].message.content)
        print(f"✅ Plant info generated successfully")
        
        # Ensure all fields are present with defaults
        return jsonify({
            "plant_name": result.get("plant_name", ""),
            "scientific_name": result.get("scientific_name", ""),
            "common_names": result.get("common_names", []),
            "plant_type": result.get("plant_type", ""),
            "description": result.get("description", ""),
            "care_instructions": result.get("care_instructions", "")
        }), 200
        
    except Exception as e:
        print(f"Error in generate_plant_info: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Failed to generate plant information: {str(e)}"}), 500

@views.route('/api/train-plant', methods=['POST'])
def train_new_plant():
    """
    Submit training data for a newly discovered plant
    Accepts both JSON and form data
    Uses OpenAI to enhance the submission if image is provided
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
        
        # Enhance with OpenAI if image is provided and some fields are missing
        openai_key = os.getenv('OPENAI_API_KEY')
        if image_data and openai_key:
            # Check if we need to enhance the data
            needs_enhancement = (
                not data.get('scientific_name') or 
                not data.get('description') or 
                not data.get('care_instructions')
            )
            
            if needs_enhancement:
                try:
                    print(f"🤖 Enhancing training data with OpenAI...")
                    clean_key = openai_key.strip().strip('"').strip("'")
                    if clean_key.startswith('sk-'):
                        client = OpenAI(api_key=clean_key)
                        
                        system_prompt = """You are an expert botanist. Analyze the plant image and provide missing information in JSON format.
Return JSON with: scientific_name, description, care_instructions, common_names (array), plant_type."""
                        
                        user_prompt = f"""Plant Name: {data.get('plant_name', 'Unknown')}
{f'Scientific Name: {data.get("scientific_name")}' if data.get('scientific_name') else ''}
{f'Description: {data.get("description")}' if data.get('description') else ''}

Fill in any missing information based on the image. Provide comprehensive details."""
                        
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
                                            "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}
                                        }
                                    ]
                                }
                            ],
                            temperature=0.3,
                            max_tokens=1000
                        )
                        
                        ai_data = json.loads(completion.choices[0].message.content)
                        
                        # Fill in missing fields with AI-generated data
                        if not data.get('scientific_name') and ai_data.get('scientific_name'):
                            data['scientific_name'] = ai_data['scientific_name']
                        if not data.get('description') and ai_data.get('description'):
                            data['description'] = ai_data['description']
                        if not data.get('care_instructions') and ai_data.get('care_instructions'):
                            data['care_instructions'] = ai_data['care_instructions']
                        if not data.get('plant_type') and ai_data.get('plant_type'):
                            data['plant_type'] = ai_data['plant_type']
                        if ai_data.get('common_names') and not data.get('common_names'):
                            if isinstance(ai_data['common_names'], list):
                                data['common_names'] = ', '.join(ai_data['common_names'])
                        
                        print(f"✅ Training data enhanced with AI")
                except Exception as e:
                    print(f"⚠️ OpenAI enhancement failed (continuing with user data): {str(e)}")
                    # Continue with user-provided data even if OpenAI fails
        
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
            "message": "Plant training data submitted successfully. Thank you for contributing! Our team will review and add it to the system.",
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
    openai_key = os.getenv('OPENAI_API_KEY')
    plant_id_key = os.getenv('PLANT_ID_API_KEY')
    
    openai_status = "configured" if openai_key else "not configured"
    if openai_key:
        # Test if key is valid (not just placeholder)
        if openai_key.startswith('your-') or 'here' in openai_key.lower():
            openai_status = "placeholder (not set)"
        elif not openai_key.startswith('sk-'):
            openai_status = "invalid format"
    
    return jsonify({
        "status": "healthy",
        "plant_id_api_configured": bool(plant_id_key),
        "openai_api_configured": bool(openai_key),
        "openai_status": openai_status,
        "openai_key_length": len(openai_key) if openai_key else 0
    }), 200

@views.route('/api/test-openai', methods=['GET'])
def test_openai():
    """Test OpenAI API connectivity"""
    from dotenv import load_dotenv
    load_dotenv(override=True)
    
    openai_key = os.getenv('OPENAI_API_KEY')
    
    if not openai_key:
        return jsonify({
            "success": False,
            "error": "OPENAI_API_KEY not found in environment variables"
        }), 500
    
    # Clean up the key
    clean_key = openai_key.strip().strip('"').strip("'")
    if not clean_key.startswith('sk-'):
        return jsonify({
            "success": False,
            "error": f"Invalid OpenAI API key format. Key should start with 'sk-'. Got: {clean_key[:10]}..."
        }), 500
    
    try:
        client = OpenAI(api_key=clean_key)
        
        # Simple test call
        completion = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "user", "content": "Say 'OpenAI is working' in JSON format: {\"status\": \"working\"}"}
            ],
            response_format={"type": "json_object"},
            max_tokens=50
        )
        
        result = json.loads(completion.choices[0].message.content)
        
        return jsonify({
            "success": True,
            "message": "OpenAI API is working correctly",
            "response": result
        }), 200
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__
        }), 500

