# How to Train the System for New Plants

Based on the current architecture, "training" for new plants is a **Data Collection & Enrichment Request** process rather than real-time model training. Since the system relies on pre-trained APIs (Plant.id and OpenAI), you cannot "train" their core models directly. Instead, you build a **Knowledge Base** layer that overrides or supplements the AI.

## The Recommended Workflow

### 1. The Submission Phase (User/Admin Action)
When a new plant is discovered:
1.  **Capture Data**: The user captures a photo and provides the local/common name.
2.  **Submit Request**: The frontend sends this to `/api/train-plant`.
    *   *Endpoint*: `POST /api/train-plant`
    *   *Payload*: Image + Plant Name (optional).
3.  **AI Auto-Enrichment**:
    *   The backend automatically calls OpenAI (GPT-4o) to "fill in the blanks".
    *   It generates scientific names, care instructions, and descriptions based on the image.
4.  **Storage**: This structured data is saved to the `PlantTrainingSubmission` database table with a status of `pending`.

### 2. The Review Phase (Admin Action)
You need an admin process to validate these submissions:
1.  **Review Submissions**: Admin checks pending submissions in the database.
2.  **Validation**: Verify the AI-generated scientific name and care details.
3.  **Approval**: Change status from `pending` to `approved`.

### 3. The Integration Phase (System Action)
Once approved, the system "knows" the plant via two methods:

#### A. Internal Knowledge Base (Immediate)
*   **Mechanism**: The `ai_plant_recognition` view should be updated to check your local `PlantTrainingSubmission` (or a dedicated `PlantProfile` table) *before* or *alongside* the external APIs.
*   **Benefit**: Allows you to instantly recognize local/rare plants that the global APIs might miss or misidentify.
*   **Implementation**:
    *   When a user queries a plant, search your internal DB for similar images (using embeddings) or match by name if the user provides a hint.
    *   *Current Gap*: The current code relies heavily on `Plant.id`. To make "training" effective, you need a way to match new images to your saved "trained" plants.

#### B. Feedback Loop (Long-term)
*   **Mechanism**: Send the verified images and correct labels back to the API providers (if they offer a feedback loop) or fine-tune a small custom classifier (e.g., a custom Vision model) for specific local variants.

## Summary of Technical Steps to Enable "Training"

1.  **Frontend**: Ensure the "Train New Plant" form (likely in your React app) calls `/api/train-plant`.
2.  **Backend**:
    *   The `/api/train-plant` endpoint is already built! It saves data to `PlantTrainingSubmission`.
    *   **CRITICAL MISSING STEP**: The identification logic (`/api/ai-recognition`) currently **does NOT** query your local database. It only calls Plant.id.
    *   **Suggestion**: You must modify `/api/ai-recognition` to search your local `PlantTrainingSubmission` (approved ones) if the external API returns low confidence. Use image similarity (complex) or simply use the collected data to build a static lookup if the user provides a name hint.

## Operational Guide (For Human Operators)

1.  **Photograph**: Take 5-10 clear photos of the new plant.
2.  **Submit**: Use the app's "Train / Submit New Plant" feature.
3.  **Verify**: An expert must review the entries in the database to ensure the AI-generated "Care Instructions" are safe and accurate for the specific region (Philippines).
