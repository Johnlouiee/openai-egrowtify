import React, { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Upload, Camera, Leaf, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronUp, Sparkles, Droplets, Shovel, Scale, ArrowDown, ArrowUp, Beaker, Hand, Sprout, Sun, FileText, Bell, AlertCircle, X, Crown, ShoppingCart } from 'lucide-react'

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
  const [expandedSections, setExpandedSections] = useState({
    careRecommendations: true,
    seasonalNotes: true,
    pestDisease: true
  })
  const [showPlantModal, setShowPlantModal] = useState(false)
  const [isPremium, setIsPremium] = useState(false) // Subscription toggle
  const [showTrainPlantModal, setShowTrainPlantModal] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)
  const trainImageInputRef = useRef(null)

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
      formData.append('is_premium', isPremium ? 'true' : 'false')

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

  const handleAIGenerate = async () => {
    if (!preview || !selectedImage) {
      toast.error('Please upload a plant image first')
      return
    }

    setAiGenerating(true)
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

      const formData = new FormData()
      formData.append('image', selectedImage)
      if (trainingData.plant_name) {
        formData.append('plant_name', trainingData.plant_name)
      }

      const response = await axios.post(`${API_BASE_URL}/api/train-plant/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const aiData = response.data
      
      // Update training data with AI-generated information
      setTrainingData({
        plant_name: aiData.plant_name || trainingData.plant_name || '',
        scientific_name: aiData.scientific_name || trainingData.scientific_name || '',
        common_names: Array.isArray(aiData.common_names) 
          ? aiData.common_names.join(', ') 
          : (aiData.common_names || trainingData.common_names || ''),
        plant_type: aiData.plant_type || trainingData.plant_type || '',
        description: aiData.description || trainingData.description || '',
        care_instructions: aiData.care_instructions || trainingData.care_instructions || ''
      })

      toast.success('AI has generated plant information! Review and edit as needed.')
    } catch (error) {
      console.error('AI generation error:', error)
      toast.error(error.response?.data?.error || 'Failed to generate plant information with AI')
    } finally {
      setAiGenerating(false)
    }
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
      setShowTrainPlantModal(false)
      setTrainingData({
        plant_name: '',
        scientific_name: '',
        common_names: '',
        plant_type: '',
        description: '',
        care_instructions: ''
      })
      setPreview(null)
      setSelectedImage(null)
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
            <nav className="flex items-center gap-4">
              <span className="px-3 py-1 bg-green-700 rounded">AI Recognition</span>
              {/* Train New Plant Button */}
              <button
                onClick={() => setShowTrainPlantModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition"
                title="Train a newly discovered plant"
              >
                <Sprout size={18} />
                <span className="text-sm font-medium">Train New Plant</span>
              </button>
              {/* Subscription Toggle */}
              <button
                onClick={() => setIsPremium(!isPremium)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                  isPremium 
                    ? 'bg-purple-600 hover:bg-purple-700' 
                    : 'bg-gray-600 hover:bg-gray-700'
                }`}
                title={isPremium ? 'Switch to Basic Plan' : 'Switch to Premium Plan'}
              >
                <Crown size={18} />
                <span className="text-sm font-medium">
                  {isPremium ? 'Premium' : 'Basic'}
                </span>
              </button>
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
              <h4 className="font-semibold text-gray-700 mb-2">
                {activeTab === 'plant' ? 'AI Recognition Credits' : 'Soil Analysis Credits'}
              </h4>
              <div className={`text-2xl font-bold mb-2 ${currentUsage.remaining_total === 0 ? 'text-red-600' : 'text-green-600'}`}>
                {currentUsage.remaining_total} credits left
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Free tries: {currentUsage.free_analyses_used || 0}/3</div>
              </div>
              {currentUsage.remaining_total > 0 && currentUsage.remaining_total <= 2 && (
                <p className="text-sm text-orange-600 mt-2">Running low on credits!</p>
              )}
              {currentUsage.remaining_total === 0 ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm text-gray-700">No credits remaining. Choose an option:</p>
                  <div className="flex flex-col gap-2">
                    <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2">
                      <ShoppingCart size={16} />
                      {activeTab === 'plant' ? 'Buy 1 Recognition (₱20.00)' : 'Buy More'}
                    </button>
                    <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2">
                      <Crown size={16} />
                      Subscribe to Premium
                    </button>
                  </div>
                </div>
              ) : currentUsage.remaining_total <= 2 ? (
                <div className="mt-4 flex flex-col gap-2">
                  <button className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2">
                    <ShoppingCart size={16} />
                    Buy More
                  </button>
                  <button className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2">
                    <Crown size={16} />
                    Subscribe
                  </button>
                </div>
              ) : null}
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
              <div className="relative mb-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full aspect-square object-cover rounded-lg"
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
                className={`w-full mt-4 text-white px-6 py-3 rounded-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  activeTab === 'soil' 
                    ? 'bg-blue-600 hover:bg-blue-700' 
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Analyzing...
                  </>
                ) : (
                  <>
                    {activeTab === 'soil' && <Leaf size={20} />}
                    {activeTab === 'plant' ? 'Analyze Plant' : 'Analyze Soil'}
                  </>
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
                    {isPremium ? (
                      /* Premium Plan - Detailed Layout */
                      <>
                        {/* Plant Name with Confidence and AI Enhanced Badge */}
                        <div className="mb-4 flex items-center gap-3 flex-wrap">
                          <h4 className="text-2xl font-bold text-gray-800">
                            {(results.common_names && results.common_names.length > 0) 
                              ? results.common_names[0] 
                              : results.plant_name || 'Unknown Plant'}
                            {results.confidence && (
                              <span className="text-lg font-normal text-gray-600 ml-2">
                                ({results.confidence}% confidence)
                              </span>
                            )}
                          </h4>
                          {results.ai_enriched && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Sparkles size={12} />
                              AI Enhanced
                            </span>
                          )}
                        </div>

                        {/* Health Status and Growth Stage - Side by Side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          {/* Health Status */}
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative">
                            {results.ai_enriched && (
                              <div className="absolute top-2 right-2">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                  <Sparkles size={10} />
                                  AI
                                </span>
                              </div>
                            )}
                            <h5 className="font-semibold text-gray-800 mb-2">Health Status</h5>
                            <p className="text-sm text-gray-700">
                              {results.health_status || 'Health assessment in progress...'}
                            </p>
                          </div>

                          {/* Growth Stage */}
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm relative">
                            {results.ai_enriched && (
                              <div className="absolute top-2 right-2">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                  <Sparkles size={10} />
                                  AI
                                </span>
                              </div>
                            )}
                            <h5 className="font-semibold text-gray-800 mb-2">Growth Stage</h5>
                            <p className="text-sm text-gray-700">
                              {results.growth_stage || 'Growth stage assessment in progress...'}
                            </p>
                          </div>
                        </div>

                        {/* Care Recommendations - Collapsible (5 items for Premium) */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedSections({...expandedSections, careRecommendations: !expandedSections.careRecommendations})}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <h5 className="font-semibold text-gray-800">
                                Care Recommendations (5 items)
                              </h5>
                              {results.ai_enriched && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                  <Sparkles size={10} />
                                  Powered by OpenAI
                                </span>
                              )}
                            </div>
                            {expandedSections.careRecommendations ? (
                              <ChevronUp className="text-gray-600" size={20} />
                            ) : (
                              <ChevronDown className="text-gray-600" size={20} />
                            )}
                          </button>
                          {expandedSections.careRecommendations && (
                            <div className="p-4 space-y-3">
                              {/* Fertilizing */}
                              <div className="bg-white border border-gray-200 rounded-lg p-3 relative">
                                {results.ai_enriched && results.care_recommendations?.fertilizing && (
                                  <div className="absolute top-2 right-2">
                                    <Sparkles size={12} className="text-blue-500" />
                                  </div>
                                )}
                                <h6 className="font-semibold text-gray-800 mb-1">Fertilizing</h6>
                                <p className="text-sm text-gray-700">
                                  {results.care_recommendations?.fertilizing || 'Apply a balanced fertilizer every few weeks during the growing season.'}
                                </p>
                              </div>
                              {/* Pruning */}
                              <div className="bg-white border border-gray-200 rounded-lg p-3 relative">
                                {results.ai_enriched && results.care_recommendations?.pruning && (
                                  <div className="absolute top-2 right-2">
                                    <Sparkles size={12} className="text-blue-500" />
                                  </div>
                                )}
                                <h6 className="font-semibold text-gray-800 mb-1">Pruning</h6>
                                <p className="text-sm text-gray-700">
                                  {results.care_recommendations?.pruning || 'Remove any dead or damaged leaves to encourage healthy growth.'}
                                </p>
                              </div>
                              {/* Soil */}
                              <div className="bg-white border border-gray-200 rounded-lg p-3 relative">
                                {results.ai_enriched && results.care_recommendations?.soil && (
                                  <div className="absolute top-2 right-2">
                                    <Sparkles size={12} className="text-blue-500" />
                                  </div>
                                )}
                                <h6 className="font-semibold text-gray-800 mb-1">Soil</h6>
                                <p className="text-sm text-gray-700">
                                  {results.care_recommendations?.soil || 'Prefers well-draining soil with a neutral to slightly alkaline pH.'}
                                </p>
                              </div>
                              {/* Sunlight */}
                              <div className="bg-white border border-gray-200 rounded-lg p-3 relative">
                                {results.ai_enriched && results.care_recommendations?.sunlight && (
                                  <div className="absolute top-2 right-2">
                                    <Sparkles size={12} className="text-blue-500" />
                                  </div>
                                )}
                                <h6 className="font-semibold text-gray-800 mb-1">Sunlight</h6>
                                <p className="text-sm text-gray-700">
                                  {results.care_recommendations?.sunlight || 'Ensure full sun exposure for at least 6-8 hours a day.'}
                                </p>
                              </div>
                              {/* Watering */}
                              <div className="bg-white border border-gray-200 rounded-lg p-3 relative">
                                {results.ai_enriched && results.care_recommendations?.watering && (
                                  <div className="absolute top-2 right-2">
                                    <Sparkles size={12} className="text-blue-500" />
                                  </div>
                                )}
                                <h6 className="font-semibold text-gray-800 mb-1">Watering</h6>
                                <p className="text-sm text-gray-700">
                                  {results.care_recommendations?.watering || 'Water deeply once a week, ensuring the soil is moist but not waterlogged.'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Seasonal Care Notes - Premium Only */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedSections({...expandedSections, seasonalNotes: !expandedSections.seasonalNotes})}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <h5 className="font-semibold text-gray-800">Seasonal Care Notes</h5>
                              {results.ai_enriched && results.seasonal_notes && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                  <Sparkles size={10} />
                                  AI
                                </span>
                              )}
                            </div>
                            {expandedSections.seasonalNotes ? (
                              <ChevronUp className="text-gray-600" size={20} />
                            ) : (
                              <ChevronDown className="text-gray-600" size={20} />
                            )}
                          </button>
                          {expandedSections.seasonalNotes && (
                            <div className="p-4">
                              <p className="text-sm text-gray-700">
                                {results.seasonal_notes || 'As it\'s spring, ensure the plant is protected from any late frosts.'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Pest & Disease Prevention - Premium Only */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedSections({...expandedSections, pestDisease: !expandedSections.pestDisease})}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <h5 className="font-semibold text-gray-800">Pest & Disease Prevention</h5>
                              {results.ai_enriched && results.pest_diseases && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                                  <Sparkles size={10} />
                                  AI
                                </span>
                              )}
                            </div>
                            {expandedSections.pestDisease ? (
                              <ChevronUp className="text-gray-600" size={20} />
                            ) : (
                              <ChevronDown className="text-gray-600" size={20} />
                            )}
                          </button>
                          {expandedSections.pestDisease && (
                            <div className="p-4">
                              <p className="text-sm text-gray-700">
                                {typeof results.pest_diseases === 'string' 
                                  ? results.pest_diseases 
                                  : (results.pest_diseases && typeof results.pest_diseases === 'object')
                                    ? JSON.stringify(results.pest_diseases)
                                    : 'Watch for aphids and caterpillars; use insecticidal soap if necessary.'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Bottom Section - AI Enhanced Badge and Add to Garden Button */}
                        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                          {results.ai_enriched && (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <Sparkles size={12} />
                                AI Enhanced
                              </span>
                              <span className="text-xs text-gray-500">
                                Powered by OpenAI GPT-4o Vision
                              </span>
                            </div>
                          )}
                          <button className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                            <Leaf size={16} />
                            Add to Garden
                          </button>
                        </div>
                      </>
                    ) : (
                      /* Basic Plan - Simplified Layout */
                      <>
                        {/* Plant Name with Confidence in Green Box */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="text-green-600" size={20} />
                            <h4 className="text-xl font-bold text-green-800">
                              {(results.common_names && results.common_names.length > 0) 
                                ? results.common_names[0] 
                                : results.plant_name || 'Unknown Plant'}
                              {results.confidence && (
                                <span className="text-base font-normal ml-2">
                                  ({results.confidence}% confidence)
                                </span>
                              )}
                            </h4>
                          </div>
                        </div>

                        {/* Care Recommendations - Basic (3 items only) */}
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => setExpandedSections({...expandedSections, careRecommendations: !expandedSections.careRecommendations})}
                            className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                          >
                            <h5 className="font-semibold text-gray-800">
                              Care Recommendations (3 items)
                            </h5>
                            {expandedSections.careRecommendations ? (
                              <ChevronUp className="text-gray-600" size={20} />
                            ) : (
                              <ChevronDown className="text-gray-600" size={20} />
                            )}
                          </button>
                          {expandedSections.careRecommendations && (
                            <div className="p-4 space-y-3">
                              {/* Soil */}
                              <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <h6 className="font-semibold text-gray-800 mb-1">Soil</h6>
                                <p className="text-sm text-gray-700">
                                  {results.care_recommendations?.soil || 'Well-draining; stake tall varieties'}
                                </p>
                              </div>
                              {/* Sunlight */}
                              <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <h6 className="font-semibold text-gray-800 mb-1">Sunlight</h6>
                                <p className="text-sm text-gray-700">
                                  {results.care_recommendations?.sunlight || 'Full sun'}
                                </p>
                              </div>
                              {/* Watering */}
                              <div className="bg-white border border-gray-200 rounded-lg p-3">
                                <h6 className="font-semibold text-gray-800 mb-1">Watering</h6>
                                <p className="text-sm text-gray-700">
                                  {results.care_recommendations?.watering || 'Deep watering; drought tolerant once established'}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Bottom Section - Add to Garden Button (Basic Plan) */}
                        <div className="flex items-center justify-end pt-4 border-t border-gray-200">
                          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2">
                            <Leaf size={16} />
                            Add to Garden
                          </button>
                        </div>
                      </>
                    )}

                    {/* Common Issues - Keep for backward compatibility */}
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
                    {isPremium ? (
                      /* Premium Plan - Detailed Soil Layout */
                      <div className="space-y-4">
                        {/* Moisture - Full Width */}
                        {results.moisture_level && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Droplets className="text-blue-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-1">Moisture</h5>
                                <p className="text-sm text-gray-700">{results.moisture_level}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Texture and pH - Two Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {results.texture && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <Shovel className="text-green-600" size={20} />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-800 mb-1">Texture</h5>
                                  <p className="text-sm text-gray-700">{results.texture}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {results.ph && (
                            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <Scale className="text-purple-600" size={20} />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-800 mb-1">pH</h5>
                                  <p className="text-sm text-gray-700">{results.ph}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                      {/* Organic Matter and Drainage - Two Columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.organic_matter && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Leaf className="text-green-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-1">Organic Matter</h5>
                                <p className="text-sm text-gray-700">{results.organic_matter}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {results.drainage && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
                                <Droplets className="text-blue-600" size={16} />
                                <ArrowDown className="text-blue-600 absolute bottom-1" size={10} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-1">Drainage</h5>
                                <p className="text-sm text-gray-700">{results.drainage}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Soil Health Score - Full Width */}
                      {results.soil_health_score && (
                        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="text-green-600" size={20} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h5 className="font-semibold text-gray-800">Soil Health Score</h5>
                                {typeof results.soil_health_score === 'string' && results.soil_health_score.match(/\d+/) ? (
                                  <span className="text-2xl font-bold text-green-600">
                                    {results.soil_health_score.match(/\d+/)[0]}
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-sm text-gray-700">
                                {typeof results.soil_health_score === 'string' 
                                  ? results.soil_health_score 
                                  : `Score: ${results.soil_health_score}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Nutrient Indicators and Compaction - Two Columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.nutrient_indicators && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Beaker className="text-yellow-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-1">Nutrient Indicators</h5>
                                <p className="text-sm text-gray-700">{results.nutrient_indicators}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {results.compaction_assessment && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                <Hand className="text-orange-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-1">Compaction</h5>
                                <p className="text-sm text-gray-700">{results.compaction_assessment}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Water Retention and Root Development - Two Columns */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {results.water_retention && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
                                <Droplets className="text-blue-600" size={16} />
                                <ArrowUp className="text-blue-600 absolute top-1" size={10} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-1">Water Retention</h5>
                                <p className="text-sm text-gray-700">{results.water_retention}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {results.root_development && (
                          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <Sprout className="text-green-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-1">Root Development</h5>
                                <p className="text-sm text-gray-700">{results.root_development}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Seasonal Considerations - Full Width (Premium Only) */}
                      {results.seasonal_considerations && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                              <Bell className="text-orange-600" size={20} />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-orange-800 mb-1">Seasonal Considerations</h5>
                              <p className="text-sm text-gray-700">{results.seasonal_considerations}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recommended Soil Amendments - Full Width */}
                      {results.soil_amendments && (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                              <Shovel className="text-purple-600" size={20} />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-purple-800 mb-1">Recommended Soil Amendments</h5>
                              <p className="text-sm text-gray-700">{results.soil_amendments}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Recommendations - Full Width */}
                      {results.recommendations && results.recommendations.length > 0 && (
                        <div className="bg-white rounded-lg p-4">
                          <h5 className="font-semibold text-gray-800 mb-3">Recommendations</h5>
                          <ul className="space-y-2">
                            {results.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-gray-700">{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Plants for This Soil */}
                      {results.suitable_plants && (
                        <div className="bg-white rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-gray-800">Recommended Plants for This Soil</h5>
                            <button
                              onClick={() => setShowPlantModal(true)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                            >
                              <Leaf size={16} />
                              View Plant Recommendations
                            </button>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            Click the button above to view detailed plant recommendations with images for each category.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.keys(results.suitable_plants).map((category) => (
                              <span
                                key={category}
                                className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium"
                              >
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Enhanced with AI Vision Analysis */}
                      {results.ai_analyzed && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="text-green-600" size={20} />
                            </div>
                            <div className="flex-1">
                              <h5 className="font-semibold text-green-800 mb-1">Enhanced with AI Vision Analysis</h5>
                              <p className="text-sm text-gray-700">
                                This soil analysis has been enhanced using advanced AI vision to analyze your specific soil image and provide personalized plant recommendations based on the actual soil conditions visible in your photo.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    ) : (
                      /* Basic Plan - Simplified Soil Layout */
                      <div className="space-y-4">
                        {/* Moisture - Full Width */}
                        {results.moisture_level && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                <Droplets className="text-blue-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-1">Moisture</h5>
                                <p className="text-sm text-gray-700">{results.moisture_level}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Soil Type - Full Width */}
                        {results.texture && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Shovel className="text-yellow-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-1">Soil Type</h5>
                                <p className="text-sm text-gray-700">
                                  {results.texture.includes('Loam') || results.texture.includes('loam') 
                                    ? 'Loam Soil' 
                                    : results.texture}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Texture - Full Width */}
                        {results.texture && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Shovel className="text-yellow-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-gray-800 mb-1">Texture</h5>
                                <p className="text-sm text-gray-700">{results.texture}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Two-Column Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Organic Matter */}
                          {results.organic_matter && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <Leaf className="text-green-600" size={20} />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-800 mb-1">Organic Matter</h5>
                                  <p className="text-sm text-gray-700">{results.organic_matter}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Drainage */}
                          {results.drainage && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
                                  <Droplets className="text-blue-600" size={16} />
                                  <ArrowDown className="text-blue-600 absolute bottom-1" size={10} />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-800 mb-1">Drainage</h5>
                                  <p className="text-sm text-gray-700">{results.drainage}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Nutrient Indicators */}
                          {results.nutrient_indicators && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <Beaker className="text-purple-600" size={20} />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-800 mb-1">Nutrient Indicators</h5>
                                  <p className="text-sm text-gray-700">{results.nutrient_indicators}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Compaction */}
                          {results.compaction_assessment && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                  <Hand className="text-orange-600" size={20} />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-800 mb-1">Compaction</h5>
                                  <p className="text-sm text-gray-700">{results.compaction_assessment}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Water Retention */}
                          {results.water_retention && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center relative">
                                  <Droplets className="text-blue-600" size={16} />
                                  <ArrowUp className="text-blue-600 absolute top-1" size={10} />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-800 mb-1">Water Retention</h5>
                                  <p className="text-sm text-gray-700">{results.water_retention}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Root Development */}
                          {results.root_development && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <Sprout className="text-green-600" size={20} />
                                </div>
                                <div className="flex-1">
                                  <h5 className="font-semibold text-gray-800 mb-1">Root Development</h5>
                                  <p className="text-sm text-gray-700">{results.root_development}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Enhanced with AI Vision Analysis */}
                        {results.ai_analyzed && (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="text-green-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <h5 className="font-semibold text-green-800 mb-1">Enhanced with AI Vision Analysis</h5>
                                <p className="text-sm text-gray-700">
                                  This soil analysis has been enhanced using advanced AI vision to analyze your specific soil image and provide personalized plant recommendations based on the actual soil conditions visible in your photo.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
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

      {/* Train New Plant Modal */}
      {showTrainPlantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sprout className="text-green-600" size={24} />
                <h3 className="text-2xl font-bold text-gray-800">Train New Plant</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <Sparkles size={12} />
                  AI-Powered
                </span>
              </div>
              <button
                onClick={() => {
                  setShowTrainPlantModal(false)
                  setTrainingData({
                    plant_name: '',
                    scientific_name: '',
                    common_names: '',
                    plant_type: '',
                    description: '',
                    care_instructions: ''
                  })
                  setPreview(null)
                  setSelectedImage(null)
                }}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="text-blue-600 mt-0.5" size={20} />
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">AI-Powered Plant Training</h4>
                    <p className="text-sm text-blue-700">
                      Upload a photo of a newly discovered plant, and our AI will help generate scientific information, 
                      descriptions, and care instructions. You can edit and enhance the AI-generated data before submitting.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleTrainingSubmit} className="space-y-4">
                {/* Image Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Plant Image *
                  </label>
                  {!preview ? (
                    <div
                      onClick={() => trainImageInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
                    >
                      <Camera className="mx-auto mb-4 text-gray-400" size={48} />
                      <p className="text-gray-600 mb-2">Click to upload plant photo</p>
                      <p className="text-sm text-gray-500">Supports JPG, PNG, GIF up to 10MB</p>
                    </div>
                  ) : (
                    <div className="relative">
                      <img
                        src={preview}
                        alt="Plant preview"
                        className="w-full max-h-64 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreview(null)
                          setSelectedImage(null)
                          if (trainImageInputRef.current) trainImageInputRef.current.value = ''
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  <input
                    ref={trainImageInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {preview && (
                    <button
                      type="button"
                      onClick={handleAIGenerate}
                      disabled={aiGenerating}
                      className="mt-3 w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {aiGenerating ? (
                        <>
                          <Loader2 className="animate-spin" size={18} />
                          AI is analyzing and generating plant data...
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          Generate Plant Info with AI
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Plant Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plant Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={trainingData.plant_name}
                    onChange={(e) => setTrainingData({...trainingData, plant_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Kangkong, Water Spinach"
                  />
                </div>

                {/* Scientific Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scientific Name
                  </label>
                  <input
                    type="text"
                    value={trainingData.scientific_name}
                    onChange={(e) => setTrainingData({...trainingData, scientific_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Ipomoea aquatica"
                  />
                </div>

                {/* Common Names */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Common Names (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={trainingData.common_names}
                    onChange={(e) => setTrainingData({...trainingData, common_names: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Water Spinach, Kangkong, Ong Choy"
                  />
                </div>

                {/* Plant Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plant Type
                  </label>
                  <select
                    value={trainingData.plant_type}
                    onChange={(e) => setTrainingData({...trainingData, plant_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={trainingData.description}
                    onChange={(e) => setTrainingData({...trainingData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows="4"
                    placeholder="Describe the plant's appearance, characteristics, origin..."
                  />
                </div>

                {/* Care Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Care Instructions
                  </label>
                  <textarea
                    value={trainingData.care_instructions}
                    onChange={(e) => setTrainingData({...trainingData, care_instructions: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows="4"
                    placeholder="Watering, sunlight, soil requirements, fertilizing, pruning..."
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={submittingTraining || !trainingData.plant_name}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {submittingTraining ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Submit Training Data
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTrainPlantModal(false)
                      setTrainingData({
                        plant_name: '',
                        scientific_name: '',
                        common_names: '',
                        plant_type: '',
                        description: '',
                        care_instructions: ''
                      })
                      setPreview(null)
                      setSelectedImage(null)
                    }}
                    className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Plant Recommendations Modal */}
      {showPlantModal && results?.suitable_plants && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-gray-800">Recommended Plants for Your Soil</h3>
              <button
                onClick={() => setShowPlantModal(false)}
                className="text-gray-500 hover:text-gray-700 transition"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              {Object.entries(results.suitable_plants).map(([category, plants]) => {
                const categoryEmojis = {
                  flowers: '🌸',
                  fruits: '🍓',
                  herbs: '🌿',
                  vegetables: '🥬',
                  trees: '🌳'
                }
                const emoji = categoryEmojis[category.toLowerCase()] || '🌱'
                
                return (
                  <div key={category} className="mb-8">
                    <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span>{emoji}</span>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {typeof plants === 'object' && plants !== null ? (
                        Object.entries(plants).map(([plantName, plantInfo]) => {
                          const info = typeof plantInfo === 'string' ? { description: plantInfo } : plantInfo
                          const difficulty = info.difficulty || 'Easy'
                          const careTips = info.care_tips || info.care || 'Well-draining soil, full sun, water regularly'
                          const harvest = info.harvest || 'Varies by plant type'
                          const planting = info.planting || 'Plant seedlings'
                          
                          return (
                            <div key={plantName} className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="font-semibold text-gray-800">{plantName}</h5>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  difficulty.toLowerCase() === 'easy' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-orange-100 text-orange-800'
                                }`}>
                                  {difficulty}
                                </span>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex items-start gap-2">
                                  <FileText size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-gray-700">{planting}</p>
                                    <p className="text-gray-600">A suitable plant for this soil type.</p>
                                  </div>
                                </div>
                                <div>
                                  <div className="flex items-start gap-2 mb-1">
                                    <Leaf size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                                    <span className="font-semibold text-gray-800">Care Tips:</span>
                                  </div>
                                  <div className="ml-6 bg-green-50 rounded p-2">
                                    <p className="text-gray-700">{careTips}</p>
                                  </div>
                                </div>
                                <div className="flex items-start gap-2">
                                  <Loader2 size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <span className="font-semibold text-gray-800">Harvest: </span>
                                    <span className="text-gray-700">{harvest}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-lg p-4">
                          <p className="text-gray-700">{plants}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AIPlantRecognition

