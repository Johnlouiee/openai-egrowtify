from flask import Blueprint, jsonify, request, session
from website import db
from website.models import AIUsageTracking, AIAnalysisUsage, SoilAnalysisUsage, PlantTrainingSubmission
import os
import base64
import requests
import json
import time
import httpx
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
        client = OpenAI(api_key=clean_key, http_client=httpx.Client())
        
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
                        client = OpenAI(api_key=clean_key, http_client=httpx.Client())
                        
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

