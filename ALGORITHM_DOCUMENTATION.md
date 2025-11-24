# Plant Identification and Soil Analysis Algorithm Documentation

This document explains the algorithms used in eGrowtify for plant identification and soil analysis. These algorithms combine multiple APIs and techniques to provide accurate, comprehensive results.

## Table of Contents
1. [Plant Identification Algorithm](#plant-identification-algorithm)
2. [Soil Analysis Algorithm](#soil-analysis-algorithm)
3. [API Integration Details](#api-integration-details)
4. [Implementation Guide](#implementation-guide)

---

## Plant Identification Algorithm

### Overview
The plant identification algorithm uses a **hybrid approach** combining:
1. **Plant.id API** - For initial plant identification
2. **OpenAI Vision API (GPT-4o)** - For enhanced analysis and care recommendations
3. **Rule-based fallbacks** - For offline functionality and common plant types

### Algorithm Flow

```
┌─────────────────┐
│  User Uploads   │
│  Plant Image    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 1: Image Preprocessing│
│ - Read image bytes       │
│ - Base64 encode         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 2: Plant.id API Call│
│ - Send base64 image      │
│ - Request identification │
│ - Get suggestions        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 3: Result Processing│
│ - Extract plant names   │
│ - Map to common names   │
│ - Calculate confidence  │
│ - Rank suggestions      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 4: Rule-Based       │
│ Enrichment (Optional)   │
│ - Apply plant-specific   │
│   care rules            │
│ - Infer from wiki text  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 5: OpenAI Vision     │
│ Enhancement (Optional)   │
│ - Analyze image with AI  │
│ - Get health status      │
│ - Get care recommendations│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 6: Merge Results    │
│ - Combine all data      │
│ - Prioritize AI results │
│ - Return final response │
└─────────────────────────┘
```

### Detailed Steps

#### Step 1: Image Preprocessing
```python
# Read image file
image_bytes = file.read()

# Base64 encode for API transmission
image_b64 = base64.b64encode(image_bytes).decode('utf-8')
```

#### Step 2: Plant.id API Call
**Endpoint:** `https://api.plant.id/v2/identify`

**Request Payload:**
```json
{
  "images": [base64_encoded_image],
  "modifiers": ["similar_images"],
  "plant_language": "en",
  "plant_details": [
    "common_names",
    "edible_parts",
    "url",
    "wiki_description"
  ]
}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Api-Key": "YOUR_PLANT_ID_API_KEY"
}
```

**Response Structure:**
```json
{
  "suggestions": [
    {
      "plant_name": "Scientific Name",
      "probability": 0.95,
      "plant_details": {
        "scientific_name": "Scientific Name",
        "common_names": ["Common Name 1", "Common Name 2"],
        "wiki_description": {
          "value": "Description text..."
        },
        "url": "https://..."
      }
    }
  ]
}
```

#### Step 3: Result Processing

**3.1 Name Extraction and Mapping**
- Extract plant name, scientific name, and common names
- Apply comprehensive mapping to convert scientific names to common names
- Special handling for Philippine plants (e.g., "talong" → "Eggplant")

**3.2 Confidence Calculation**
```python
confidence = float(suggestion.get('probability', 0)) * 100.0
```

**3.3 Result Ranking**
- Sort suggestions by probability
- Apply crop matching boost (+0.07) for known crops
- Select top suggestion

**3.4 Color-Based Heuristics** (Optional)
- Analyze image colors for additional validation
- Detect orange coloration for carrot detection
- Detect purple/red for grape-like plants

#### Step 4: Rule-Based Enrichment

For common plants, apply predefined care rules:

**Example Rule Structure:**
```python
{
  'growth_stage': 'Cool-season root crop',
  'care_recommendations': {
    'watering': 'Even moisture; 2.5 cm/week',
    'sunlight': 'Full sun',
    'soil': 'Loose, deep, stone-free'
  },
  'common_issues': ['Forked roots', 'Carrot fly'],
  'estimated_yield': '1–3 kg per m² in 70–80 days'
}
```

**Supported Plant Categories:**
- Vegetables: Carrot, Tomato, Cucumber, Pepper, Eggplant, Lettuce, etc.
- Fruits: Apple, Orange, Banana, Mango, etc.
- Herbs: Basil, Mint, Thyme, Rosemary, etc.
- Flowers: Rose, Tulip, Sunflower, etc.
- Succulents: Aloe, Cactus, etc.

#### Step 5: OpenAI Vision Enhancement

**System Prompt:**
```
You are an expert horticulturist and plant pathologist with 20+ years of experience.
Analyze the provided plant image and identification data to give accurate, 
image-specific guidance. Look at the actual condition of the plant in the image.
Return your analysis as strict JSON with these exact keys:
- health_status (detailed assessment based on what you see)
- growth_stage (specific stage based on what's visible)
- care_recommendations (object with watering, sunlight, soil, fertilizing, pruning)
- common_issues (array of specific problems)
- estimated_yield (realistic expectations)
- seasonal_notes (seasonal care tips)
- pest_diseases (common threats and prevention)
```

**API Call:**
```python
completion = client.chat.completions.create(
    model="gpt-4o",  # Vision-capable model
    response_format={"type": "json_object"},
    messages=[
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Analyze this plant image and provide detailed care guidance..."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_b64}"
                    }
                }
            ]
        }
    ],
    temperature=0.3,
    max_tokens=1000
)
```

**Caching:**
- Results are cached by plant name to reduce API calls
- Cache TTL: Configurable (default: 1 hour)

#### Step 6: Merge Results

**Priority Order:**
1. OpenAI Vision results (if available)
2. Rule-based enrichment
3. Wiki text inference
4. Default fallbacks

**Final Response Structure:**
```json
{
  "plant_name": "Carrot",
  "plant_type": "vegetable",
  "scientific_name": "Daucus carota",
  "common_names": ["Carrot", "Wild Carrot"],
  "confidence": 95.5,
  "health_status": "Healthy - vibrant green foliage, no visible disease",
  "growth_stage": "Vegetative stage - leaves well developed",
  "care_recommendations": {
    "watering": "Even moisture; 2.5 cm/week; avoid crusting",
    "sunlight": "Full sun",
    "soil": "Loose, deep, stone-free; avoid fresh manure",
    "fertilizing": "Light feeding with balanced fertilizer",
    "pruning": "Remove damaged leaves as needed"
  },
  "common_issues": ["Forked roots (compaction)", "Carrot fly"],
  "estimated_yield": "1–3 kg per m² in 70–80 days",
  "seasonal_notes": "Best planted in cool seasons",
  "pest_diseases": {
    "common_threats": ["Carrot fly", "Aphids"],
    "prevention": "Use row covers, companion planting"
  },
  "info_url": "https://...",
  "ai_enriched": true,
  "alternatives": [
    {"name": "Radish", "confidence": 12.3}
  ]
}
```

### Fallback Mechanism

If Plant.id API fails, the system uses basic image analysis:
- Color analysis (RGB ratios)
- Green ratio detection for plant health
- Basic classification (Leafy Plant vs Fruit/Flower)

---

## Soil Analysis Algorithm

### Overview
The soil analysis algorithm uses **OpenAI Vision API (GPT-4o)** to analyze soil images and provide comprehensive soil assessment with plant recommendations.

### Algorithm Flow

```
┌─────────────────┐
│  User Uploads   │
│  Soil Image     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 1: Image Preprocessing│
│ - Read image bytes       │
│ - Base64 encode         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 2: OpenAI Vision   │
│ Analysis                │
│ - Send image to GPT-4o  │
│ - Get detailed analysis │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 3: Result Processing│
│ - Parse JSON response   │
│ - Structure data        │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Step 4: Return Results   │
│ - Format for frontend   │
└─────────────────────────┘
```

### Detailed Steps

#### Step 1: Image Preprocessing
```python
# Read image file
image_bytes = file.read()

# Base64 encode for API transmission
image_b64 = base64.b64encode(image_bytes).decode('utf-8')
```

#### Step 2: OpenAI Vision Analysis

**System Prompt:**
```
You are an expert soil scientist, agronomist, and horticulturist with extensive 
experience in soil analysis and plant-soil relationships, SPECIFICALLY for 
tropical climates and the Philippines.

Analyze the provided soil image and return detailed, accurate soil assessment 
with specific plant recommendations. Consider visual indicators of soil health, 
texture, moisture, color, structure, and potential issues.

Return your analysis as strict JSON with these exact keys:
- moisture_level (detailed assessment with visual indicators)
- texture (specific soil type with characteristics)
- ph (estimated pH range with visual indicators)
- organic_matter (assessment of organic content)
- drainage (drainage quality assessment)
- recommendations (array of specific improvement suggestions)
- suitable_plants (detailed object with categories: vegetables, fruits, herbs, 
  flowers, trees - each containing specific plant names with brief explanations)
- nutrient_indicators (visual signs of nutrient status)
- compaction_assessment (soil structure analysis)
- soil_health_score (1-10 rating with explanation)
- seasonal_considerations (best planting times for this soil)
- soil_amendments (specific materials to add for improvement)
- water_retention (how well soil holds water)
- root_development (how well roots can grow in this soil)

IMPORTANT: For suitable_plants, prioritize and recommend COMMON PHILIPPINE PLANTS 
that are widely grown in the Philippines.

For vegetables, recommend: Kangkong (water spinach), Talong (eggplant), 
Kamatis (tomato), Sitaw (string beans), Okra, Ampalaya (bitter melon), 
Kalabasa (squash), Pechay (Chinese cabbage), Mustasa (mustard greens), 
Upo (bottle gourd), Patola (sponge gourd), Sili (chili), Sibuyas (onion), 
Bawang (garlic), Mais (corn), Labanos (radish), Pipino (cucumber).

For fruits, recommend: Mango, Saging (banana), Papaya, Pinya (pineapple), 
Bayabas (guava), Niyog (coconut), Calamansi, Atis (sugar apple), Lansones, 
Rambutan, Durian, Langka (jackfruit), Pakwan (watermelon).

For herbs, recommend: Pandan, Tanglad (lemongrass), Luya (ginger), 
Luyang Dilaw (turmeric), Balanoy (basil), Oregano, Wansoy (cilantro).

For flowers, recommend: Sampaguita (national flower), Gumamela (hibiscus), 
Santan, Bougainvillea, Kalachuchi (plumeria), Rosal (rose), Yellow Bell, 
Adelfa (oleander), Marigold.

Be specific, practical, and accurate for home gardening in the Philippines.
```

**API Call:**
```python
completion = client.chat.completions.create(
    model="gpt-4o",  # Vision-capable model
    response_format={"type": "json_object"},
    messages=[
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Analyze this soil image and provide detailed soil assessment for home gardening:"
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_b64}"
                    }
                }
            ]
        }
    ],
    temperature=0.3,
    max_tokens=1000
)
```

#### Step 3: Result Processing

**Response Structure:**
```json
{
  "moisture_level": "Moderate moisture - soil appears slightly damp with good water retention",
  "texture": "Loamy soil - good balance of sand, silt, and clay particles",
  "ph": "Neutral to slightly acidic (6.5-7.0) - based on brown coloration",
  "organic_matter": "Moderate organic content - visible organic debris present",
  "drainage": "Good drainage - soil structure allows water to percolate",
  "recommendations": [
    "Add compost to increase organic matter",
    "Test pH with soil test kit for accuracy",
    "Consider adding mulch to retain moisture"
  ],
  "suitable_plants": {
    "vegetables": {
      "Kangkong (water spinach)": "Thrives in moist, well-draining soil",
      "Talong (eggplant)": "Prefers rich, well-drained soil",
      "Kamatis (tomato)": "Needs fertile, well-drained soil"
    },
    "fruits": {
      "Mango": "Adapts well to various soil types",
      "Saging (banana)": "Prefers rich, well-drained soil"
    },
    "herbs": {
      "Pandan": "Grows well in moist soil",
      "Tanglad (lemongrass)": "Prefers well-drained soil"
    },
    "flowers": {
      "Sampaguita": "Adapts to various soil conditions",
      "Gumamela (hibiscus)": "Prefers well-drained, fertile soil"
    }
  },
  "nutrient_indicators": "Good nutrient availability - dark brown color suggests organic matter",
  "compaction_assessment": "Moderate compaction - soil appears workable",
  "soil_health_score": "7/10 - Good soil with room for improvement through organic amendments",
  "seasonal_considerations": "Best planting time: Early rainy season for most crops",
  "soil_amendments": "Add compost (2-3 inches), vermicompost, or well-rotted manure",
  "water_retention": "Good water retention - soil holds moisture without waterlogging",
  "root_development": "Favorable for root growth - loose structure allows penetration"
}
```

#### Step 4: Return Results

**Final Response Structure:**
```json
{
  "moisture_level": "...",
  "texture": "...",
  "ph": "...",
  "organic_matter": "...",
  "drainage": "...",
  "recommendations": [...],
  "suitable_plants": {...},
  "nutrient_indicators": "...",
  "compaction_assessment": "...",
  "soil_health_score": "...",
  "seasonal_considerations": "...",
  "soil_amendments": "...",
  "water_retention": "...",
  "root_development": "...",
  "ai_analyzed": true
}
```

### Fallback Mechanism

If OpenAI API fails, the system uses basic color analysis:
- RGB color analysis
- Soil type estimation based on color ranges
- Basic pH estimation
- Moisture estimation based on brightness

---

## API Integration Details

### Required APIs

#### 1. Plant.id API
- **Purpose:** Initial plant identification
- **Endpoint:** `https://api.plant.id/v2/identify`
- **Authentication:** API Key in header (`Api-Key`)
- **Request Format:** JSON with base64-encoded image
- **Response Format:** JSON with plant suggestions
- **Rate Limits:** Check Plant.id documentation
- **Cost:** Paid service (check current pricing)

#### 2. OpenAI API
- **Purpose:** Enhanced plant analysis and soil analysis
- **Endpoint:** `https://api.openai.com/v1/chat/completions`
- **Model:** `gpt-4o` (vision-capable)
- **Authentication:** Bearer token (`Authorization: Bearer YOUR_API_KEY`)
- **Request Format:** JSON with base64-encoded image in `image_url`
- **Response Format:** JSON object
- **Rate Limits:** Check OpenAI documentation
- **Cost:** Pay-per-use (check current pricing)

### Environment Variables

```env
# Plant.id API
PLANT_ID_API_KEY=your_plant_id_api_key_here

# OpenAI API
OPENAI_API_KEY=sk-your_openai_api_key_here
```

### Error Handling

**Plant.id API Errors:**
- Missing API key: Return graceful error message
- API error: Return error with status code
- No suggestions: Return "No match found" message

**OpenAI API Errors:**
- Missing API key: Return graceful error message
- Rate limit (429): Retry with exponential backoff
- Proxy errors: Fallback to direct HTTP call
- Other errors: Fallback to rule-based or heuristic analysis

### Caching Strategy

**Plant Identification:**
- Cache key: Plant scientific name or common name (lowercase)
- Cache TTL: Configurable (default: 1 hour)
- Cache storage: In-memory dictionary

**Benefits:**
- Reduces API calls for same plants
- Faster response times
- Cost savings

---

## Implementation Guide

### Prerequisites

1. **Python Dependencies:**
```python
openai==1.42.0
requests
PIL (Pillow)
numpy
base64
```

2. **API Keys:**
   - Plant.id API key from https://plant.id/
   - OpenAI API key from https://platform.openai.com/

### Code Structure

#### Plant Identification Endpoint

```python
@route('/ai-recognition', methods=['POST'])
def ai_plant_recognition():
    # 1. Validate request
    # 2. Read and encode image
    # 3. Call Plant.id API
    # 4. Process results
    # 5. Apply rule-based enrichment
    # 6. Call OpenAI Vision (optional)
    # 7. Merge results
    # 8. Return response
```

#### Soil Analysis Endpoint

```python
@route('/soil-analysis', methods=['POST'])
def soil_analysis():
    # 1. Validate request
    # 2. Read and encode image
    # 3. Call OpenAI Vision
    # 4. Process results
    # 5. Return response
```

### Key Functions

#### Image Encoding
```python
def encode_image(image_file):
    image_bytes = image_file.read()
    image_b64 = base64.b64encode(image_bytes).decode('utf-8')
    return image_b64
```

#### Plant.id API Call
```python
def call_plant_id_api(image_b64, api_key):
    payload = {
        "images": [image_b64],
        "modifiers": ["similar_images"],
        "plant_language": "en",
        "plant_details": ["common_names", "edible_parts", "url", "wiki_description"]
    }
    headers = {"Content-Type": "application/json", "Api-Key": api_key}
    response = requests.post(
        "https://api.plant.id/v2/identify",
        json=payload,
        headers=headers,
        timeout=30
    )
    return response.json()
```

#### OpenAI Vision Call
```python
def call_openai_vision(image_b64, system_prompt, user_prompt, api_key):
    client = OpenAI(api_key=api_key)
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
    return json.loads(completion.choices[0].message.content)
```

### Best Practices

1. **Error Handling:**
   - Always have fallback mechanisms
   - Return graceful error messages
   - Log errors for debugging

2. **Performance:**
   - Implement caching for repeated requests
   - Use async/await for concurrent API calls (if applicable)
   - Optimize image size before encoding

3. **Cost Optimization:**
   - Cache results aggressively
   - Use rule-based enrichment when possible
   - Only call OpenAI for enhanced analysis when needed

4. **User Experience:**
   - Provide loading indicators
   - Show confidence scores
   - Allow manual correction of results
   - Display alternatives

### Testing

**Test Plant Identification:**
1. Upload clear plant image
2. Verify Plant.id returns suggestions
3. Verify OpenAI enhancement works
4. Test fallback mechanisms

**Test Soil Analysis:**
1. Upload clear soil image
2. Verify OpenAI returns comprehensive analysis
3. Test fallback color analysis

---

## Summary

### Plant Identification Algorithm
- **Primary:** Plant.id API for identification
- **Enhancement:** OpenAI Vision for detailed analysis
- **Fallback:** Rule-based enrichment + color heuristics
- **Output:** Comprehensive plant information with care recommendations

### Soil Analysis Algorithm
- **Primary:** OpenAI Vision for complete analysis
- **Fallback:** Color-based heuristics
- **Output:** Detailed soil assessment with plant recommendations

### Key Features
- ✅ Multi-API integration for accuracy
- ✅ Intelligent fallback mechanisms
- ✅ Caching for performance and cost
- ✅ Philippine plant focus
- ✅ Comprehensive care recommendations
- ✅ Image-based analysis using vision AI

---

## Notes for New Repository

When implementing this algorithm in a new repository:

1. **Set up environment variables** for both API keys
2. **Install required dependencies** (openai, requests, PIL, numpy)
3. **Implement error handling** for API failures
4. **Add caching mechanism** to reduce API calls
5. **Test with various images** to ensure accuracy
6. **Monitor API usage** to control costs
7. **Adjust prompts** as needed for your specific use case
8. **Consider rate limiting** to prevent API abuse

The algorithm is designed to be modular - you can use Plant.id alone, OpenAI alone, or both together depending on your needs and budget.

