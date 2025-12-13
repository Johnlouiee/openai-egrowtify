# Plant Identification & Soil Analysis Algorithms

This document outlines the technical workflows and algorithms used in the application to identify plants and analyze soil samples using Artificial Intelligence.

## 1. Plant Identification Algorithm (`/api/ai-recognition`)

The plant identification process utilizes a hybrid approach, combining specific botanical recognition APIs with Generative AI for detailed horticultural advice.

### **Workflow Overview**

1.  **Usage Verification**:
    *   The system checks the user's subscription status (Basic vs. Premium) and remaining usage credits.
    *   Basic users only receive the identification result.
    *   Premium users unlock detailed AI-enhanced care/diagnosis.

2.  **Image Processing**:
    *   The user uploads an image.
    *   The backend converts this image into a Base64 string for API transmission.

3.  **Step A: Botanical Identification (Plant.id API)**
    *   **Goal**: Determine the species of the plant.
    *   **API**: `https://api.plant.id/v2/identify`
    *   **Input**: The Base64 image.
    *   **Output**:
        *   Top suggestion (Scientific Name, Common Names).
        *   Confidence Score (Probability).
        *   Wiki Description & Metadata.
    *   **Logic**:
        *   If no suggestions are found, returns "Unknown".
        *   Extracts the suggestion with the highest probability.

4.  **Step B: AI Enhancement (OpenAI GPT-4o) - *Premium Only***
    *   **Goal**: Provide expert care advice, health diagnosis, and additional context based on the specific visual evidence.
    *   **Condition**: Performed only if the user is Premium AND the initial identification confidence > 30%.
    *   **Input**:
        *   The original plant image (for visual inspection).
        *   The data from Plant.id (Name, Scientific Name, Description).
    *   **System Persona**: Expert horticulturist and plant pathologist.
    *   **Analysis Request**:
        *   **Health Status**: Visual diagnosis of disease, wilting, or nutrient deficiency.
        *   **Growth Stage**: Seedling, vegetative, flowering, or fruiting.
        *   **Care Recommendations**: Water, Sunlight, Soil, Fertilizer, Pruning.
        *   **Pest & Diseases**: Potential threats based on visual signs.
        *   **Seasonal Notes**: Relevant tips for the current season.
    *   **Output Format**: Structured JSON data.

5.  **Result Aggregation**:
    *   The system merges the `Plant.id` identification data with the `OpenAI` enriched analysis (if applicable).
    *   Returns a comprehensive JSON object to the frontend.

---

## 2. Soil Analysis Algorithm (`/api/soil-analysis`)

The soil analysis feature is a pure Computer Vision task powered by Large Language Models (LLMs). It analyzes physical soil characteristics from an image to provide gardening recommendations.

### **Workflow Overview**

1.  **Access Control**:
    *   Strictly limited to **Premium Plan** users.

2.  **Image Processing**:
    *   The user uploads a close-up image of their soil.
    *   Converted to Base64.

3.  **AI Analysis (OpenAI GPT-4o)**
    *   **Goal**: Assess soil quality and suitability for gardening.
    *   **Input**: The soil image.
    *   **System Persona**: Expert soil scientist and agronomist, specifically calibrated for **Tropical Climates and Philippine Agriculture**.
    *   **Analysis Request**:
        *   **Moisture Level**: Visual wetness/dryness assessment.
        *   **Texture**: Clay, Loam, Sandy, Silt, etc.
        *   **pH Estimation**: Rough estimate based on soil color and type.
        *   **Organic Matter**: Assessment of humus/compost content.
        *   **Recommendations**: Soil amendments (lime, compost, sand, etc.).
        *   **Suitable Plants**: specific recommendations for Vegetables, Fruits, Herbs, etc., prioritizing **Common Philippine Plants**.
    *   **Output Format**: Structured JSON data.

4.  **Result Return**:
    *   The structured analysis is saved to the user's history and returned to the frontend for display.

---

## Key Technologies

*   **Plant.id API (Kindwise)**: Specialized computer vision model for taxonomic plant identification.
*   **OpenAI GPT-4o (Vision)**: Multimodal Large Language Model used for identifying qualitative traits (health, soil texture), reasoning about care requirements, and generating localized agricultural advice.
*   **Flask (Python)**: Backend framework orchestrating the API calls and logic.
