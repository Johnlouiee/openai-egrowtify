import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Upload, Camera, Leaf, Loader2, CheckCircle2, XCircle } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function AIPlantRecognition() {
  const [activeTab, setActiveTab] = useState('plant') // 'plant' or 'soil'
  const [selectedImage, setSelectedImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [usageStatus, setUsageStatus] = useState({
    plant: { free_analyses_used: 0, remaining_total: 5 },
    soil: { free_analyses_used: 0, remaining_total: 5 }
  })
  const [showTrainingForm, setShowTrainingForm] = useState(false)
  const [trainingData, setTrainingData] = useState({
    plant_name: '',
    scientific_name: '',
    common_names: '',
    plant_type: '',
    description: '',
    care_instructions: ''
  })
  const [submittingTraining, setSubmittingTraining] = useState(false)
  
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  // Fetch usage status on mount
  useEffect(() => {
    fetchUsageStatus()
  }, [])

  const fetchUsageStatus = async () => {
    try {
      const [plantStatus, soilStatus] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/ai-usage-status`),
        axios.get(`${API_BASE_URL}/api/soil-usage-status`)
      ])
      
      setUsageStatus({
        plant: plantStatus.data,
        soil: soilStatus.data
      })
    } catch (error) {
      // Silently fail - backend might not be running yet
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNREFUSED') {
        console.error('Error fetching usage status:', error)
      }
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      if (!file.type.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
        toast.error('Please upload a valid image file (JPG, PNG, GIF, or WEBP)')
        return
      }
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result)
      }
      reader.readAsDataURL(file)
      setResults(null)
    }
  }

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleAnalyze = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first')
      return
    }

    setLoading(true)
    setResults(null)

    try {
      const formData = new FormData()
      formData.append('image', selectedImage)

      const endpoint = activeTab === 'plant' 
        ? `${API_BASE_URL}/api/ai-recognition`
        : `${API_BASE_URL}/api/soil-analysis`

      const response = await axios.post(endpoint, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setResults(response.data)
      
      // Show training form if confidence is low
      if (response.data.needs_training) {
        setShowTrainingForm(true)
        setTrainingData({
          plant_name: response.data.plant_name || '',
          scientific_name: response.data.scientific_name || '',
          common_names: Array.isArray(response.data.common_names) 
            ? response.data.common_names.join(', ') 
            : response.data.common_names || '',
          plant_type: '',
          description: '',
          care_instructions: ''
        })
      }
      
      toast.success('Analysis completed successfully!')
      fetchUsageStatus() // Refresh usage status
    } catch (error) {
      console.error('Analysis error:', error)
      
      // Check if backend is not running
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        toast.error('Backend server is not running! Please start the backend server first.')
        console.error('Backend connection error. Make sure to run: cd backend && python app.py')
      } else {
        const errorMessage = error.response?.data?.error || 'An error occurred during analysis'
        toast.error(errorMessage)
        
        if (error.response?.status === 403) {
          toast.error('Usage limit reached. Please purchase more credits.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedImage(null)
    setPreview(null)
    setResults(null)
    setShowTrainingForm(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
  }

  const handleTrainingSubmit = async (e) => {
    e.preventDefault()
    setSubmittingTraining(true)

    try {
      // Extract base64 from data URL if present
      let imageData = null
      if (preview) {
        if (preview.startsWith('data:')) {
          imageData = preview.split(',')[1] // Remove data URL prefix
        } else {
          imageData = preview
        }
      }

      const formData = {
        ...trainingData,
        common_names: trainingData.common_names.split(',').map(n => n.trim()).filter(n => n),
        image_data: imageData
      }

      const response = await axios.post(`${API_BASE_URL}/api/train-plant`, formData, {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      toast.success(response.data.message || 'Training data submitted successfully!')
      setShowTrainingForm(false)
      setTrainingData({
        plant_name: '',
        scientific_name: '',
        common_names: '',
        plant_type: '',
        description: '',
        care_instructions: ''
      })
    } catch (error) {
      console.error('Training submission error:', error)
      toast.error(error.response?.data?.error || 'Failed to submit training data')
    } finally {
      setSubmittingTraining(false)
    }
  }

  const currentUsage = activeTab === 'plant' ? usageStatus.plant : usageStatus.soil

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-green-600 text-white shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">🌱 eGrowtify</h1>
            <nav className="flex gap-4">
              <span className="px-3 py-1 bg-green-700 rounded">AI Recognition</span>
            </nav>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">AI Plant & Soil Analysis</h2>
          <p className="text-gray-600">
            Identify plants and analyze soil from a photo. Get identification, health status, moisture, texture, pH, and care suggestions.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Upload */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">Upload Photo</h3>
            
            {/* Tabs */}
            <div className="flex gap-2 mb-6 border-b">
              <button
                onClick={() => {
                  setActiveTab('plant')
                  handleReset()
                }}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'plant'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Plant
              </button>
              <button
                onClick={() => {
                  setActiveTab('soil')
                  handleReset()
                }}
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === 'soil'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Soil
              </button>
            </div>

            {/* Credits Display */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-700 mb-2">AI Recognition Credits</h4>
              <div className="text-2xl font-bold text-green-600 mb-2">
                {currentUsage.remaining_total} credits left
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Free tries: {currentUsage.free_analyses_used || 0}/5</div>
                <div>Purchased credits: {currentUsage.purchased_credits || 0}</div>
              </div>
            </div>

            {/* Upload Area */}
            {!preview ? (
              <div
                onClick={handleUploadClick}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-green-500 transition-colors"
              >
                <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                <p className="text-gray-600 mb-2">Click to upload a photo or drag and drop</p>
                <p className="text-sm text-gray-500">Supports JPG, PNG, GIF up to 10MB</p>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-64 object-cover rounded-lg mb-4"
                />
                <button
                  onClick={handleReset}
                  className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </div>
            )}

            {/* Hidden File Inputs */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Action Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleUploadClick}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                <Upload size={20} />
                Choose File
              </button>
              <button
                onClick={handleCameraClick}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white px-4 py-3 rounded-lg hover:bg-gray-700 transition"
              >
                <Camera size={20} />
                Use Camera
              </button>
            </div>

            {/* Analyze Button */}
            {preview && (
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Analyzing...
                  </>
                ) : (
                  'Analyze Image'
                )}
              </button>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4">
              {activeTab === 'plant' ? 'Plant' : 'Soil'} Results
            </h3>

            {!results && !loading && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <Leaf size={64} className="mb-4" />
                <p>Upload a {activeTab} photo to see analysis results</p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="animate-spin text-green-600 mb-4" size={48} />
                <p className="text-gray-600">Analyzing your image...</p>
              </div>
            )}

            {results && !loading && (
              <div className="space-y-4">
                {activeTab === 'plant' ? (
                  <>
                    {/* Plant Name */}
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-2xl font-bold text-green-800 mb-2">
                        {results.plant_name || 'Unknown Plant'}
                      </h4>
                      {results.scientific_name && (
                        <p className="text-sm text-gray-600 italic">
                          {results.scientific_name}
                        </p>
                      )}
                      {results.confidence && (
                        <div className="mt-2">
                          <span className="text-sm font-medium">Confidence: </span>
                          <span className="text-green-600 font-bold">
                            {results.confidence}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Health Status */}
                    {results.health_status && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h5 className="font-semibold text-blue-800 mb-2">Health Status</h5>
                        <p className="text-gray-700">{results.health_status}</p>
                      </div>
                    )}

                    {/* Growth Stage */}
                    {results.growth_stage && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h5 className="font-semibold text-purple-800 mb-2">Growth Stage</h5>
                        <p className="text-gray-700">{results.growth_stage}</p>
                      </div>
                    )}

                    {/* Care Recommendations */}
                    {results.care_recommendations && (
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h5 className="font-semibold text-yellow-800 mb-3">Care Recommendations</h5>
                        <div className="space-y-2 text-sm">
                          {results.care_recommendations.watering && (
                            <div>
                              <span className="font-medium">💧 Watering: </span>
                              <span>{results.care_recommendations.watering}</span>
                            </div>
                          )}
                          {results.care_recommendations.sunlight && (
                            <div>
                              <span className="font-medium">☀️ Sunlight: </span>
                              <span>{results.care_recommendations.sunlight}</span>
                            </div>
                          )}
                          {results.care_recommendations.soil && (
                            <div>
                              <span className="font-medium">🌱 Soil: </span>
                              <span>{results.care_recommendations.soil}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Common Issues */}
                    {results.common_issues && results.common_issues.length > 0 && (
                      <div className="bg-red-50 rounded-lg p-4">
                        <h5 className="font-semibold text-red-800 mb-2">Common Issues</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {results.common_issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Training Form - Show if confidence is low */}
                    {results.needs_training && (
                      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4 mt-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="text-orange-600 text-2xl">⚠️</div>
                          <div className="flex-1">
                            <h5 className="font-semibold text-orange-800 mb-1">
                              Low Confidence Detection ({results.confidence}%)
                            </h5>
                            <p className="text-sm text-orange-700">
                              This plant might be newly discovered or not well-documented. Help us train the system by providing more information!
                            </p>
                          </div>
                        </div>
                        
                        {!showTrainingForm ? (
                          <button
                            onClick={() => setShowTrainingForm(true)}
                            className="w-full bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 transition mt-2"
                          >
                            Train This Plant
                          </button>
                        ) : (
                          <form onSubmit={handleTrainingSubmit} className="mt-4 space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Plant Name *
                              </label>
                              <input
                                type="text"
                                required
                                value={trainingData.plant_name}
                                onChange={(e) => setTrainingData({...trainingData, plant_name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="e.g., Kangkong"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Scientific Name
                              </label>
                              <input
                                type="text"
                                value={trainingData.scientific_name}
                                onChange={(e) => setTrainingData({...trainingData, scientific_name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="e.g., Ipomoea aquatica"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Common Names (comma-separated)
                              </label>
                              <input
                                type="text"
                                value={trainingData.common_names}
                                onChange={(e) => setTrainingData({...trainingData, common_names: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                placeholder="e.g., Water Spinach, Kangkong"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Plant Type
                              </label>
                              <select
                                value={trainingData.plant_type}
                                onChange={(e) => setTrainingData({...trainingData, plant_type: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                <option value="">Select type...</option>
                                <option value="vegetable">Vegetable</option>
                                <option value="fruit">Fruit</option>
                                <option value="herb">Herb</option>
                                <option value="flower">Flower</option>
                                <option value="tree">Tree</option>
                                <option value="shrub">Shrub</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                              </label>
                              <textarea
                                value={trainingData.description}
                                onChange={(e) => setTrainingData({...trainingData, description: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                rows="3"
                                placeholder="Describe the plant's appearance, characteristics..."
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Care Instructions
                              </label>
                              <textarea
                                value={trainingData.care_instructions}
                                onChange={(e) => setTrainingData({...trainingData, care_instructions: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                rows="3"
                                placeholder="Watering, sunlight, soil requirements..."
                              />
                            </div>
                            
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={submittingTraining}
                                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition disabled:bg-gray-400"
                              >
                                {submittingTraining ? 'Submitting...' : 'Submit Training Data'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowTrainingForm(false)}
                                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Soil Analysis Results */}
                    {results.moisture_level && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <h5 className="font-semibold text-blue-800 mb-2">Moisture Level</h5>
                        <p className="text-gray-700">{results.moisture_level}</p>
                      </div>
                    )}

                    {results.texture && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h5 className="font-semibold text-green-800 mb-2">Texture</h5>
                        <p className="text-gray-700">{results.texture}</p>
                      </div>
                    )}

                    {results.ph && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <h5 className="font-semibold text-purple-800 mb-2">pH Level</h5>
                        <p className="text-gray-700">{results.ph}</p>
                      </div>
                    )}

                    {results.soil_health_score && (
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h5 className="font-semibold text-yellow-800 mb-2">Soil Health Score</h5>
                        <p className="text-gray-700">{results.soil_health_score}</p>
                      </div>
                    )}

                    {results.recommendations && results.recommendations.length > 0 && (
                      <div className="bg-orange-50 rounded-lg p-4">
                        <h5 className="font-semibold text-orange-800 mb-2">Recommendations</h5>
                        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                          {results.recommendations.map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {results.suitable_plants && (
                      <div className="bg-green-50 rounded-lg p-4">
                        <h5 className="font-semibold text-green-800 mb-2">Suitable Plants</h5>
                        <div className="space-y-2 text-sm">
                          {Object.entries(results.suitable_plants).map(([category, plants]) => (
                            <div key={category}>
                              <span className="font-medium capitalize">{category}: </span>
                              <span className="text-gray-700">
                                {typeof plants === 'object' 
                                  ? Object.keys(plants).join(', ')
                                  : plants}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4">Tips for Best Results</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                1
              </div>
              <div>
                <h4 className="font-semibold mb-1">Good Lighting</h4>
                <p className="text-sm text-gray-600">Take photos in natural light for better accuracy.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                2
              </div>
              <div>
                <h4 className="font-semibold mb-1">Clear Focus</h4>
                <p className="text-sm text-gray-600">Ensure the {activeTab} is clearly visible and in focus.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-600">
                3
              </div>
              <div>
                <h4 className="font-semibold mb-1">Multiple Angles</h4>
                <p className="text-sm text-gray-600">Take photos from different angles for better identification.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AIPlantRecognition

