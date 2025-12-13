import React, { useState, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { Camera, Upload, Loader2, Sparkles, Sprout, CheckCircle2, X } from 'lucide-react'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function PlantTraining() {
    const [selectedImage, setSelectedImage] = useState(null)
    const [preview, setPreview] = useState(null)
    const [trainingData, setTrainingData] = useState({
        plant_name: '',
        scientific_name: '',
        common_names: '',
        plant_type: '',
        description: '',
        care_instructions: ''
    })
    const [aiGenerating, setAiGenerating] = useState(false)
    const [submittingTraining, setSubmittingTraining] = useState(false)

    const trainImageInputRef = useRef(null)

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
        }
    }

    const handleAIGenerate = async () => {
        if (!preview || !selectedImage) {
            toast.error('Please upload a plant image first')
            return
        }

        setAiGenerating(true)
        try {
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
            let imageData = null
            if (preview) {
                if (preview.startsWith('data:')) {
                    imageData = preview.split(',')[1]
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

            // Reset form
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
            if (trainImageInputRef.current) trainImageInputRef.current.value = ''
        } catch (error) {
            console.error('Training submission error:', error)
            toast.error(error.response?.data?.error || 'Failed to submit training data')
        } finally {
            setSubmittingTraining(false)
        }
    }

    const handleReset = () => {
        setPreview(null)
        setSelectedImage(null)
        if (trainImageInputRef.current) trainImageInputRef.current.value = ''
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-green-600 text-white shadow-md">
                <div className="container mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Sprout size={24} />
                        <h1 className="text-2xl font-bold">eGrowtify Training Center</h1>
                    </div>
                    <nav className="flex gap-4 text-sm font-medium">
                        <Link to="/plant-algo" className="hover:text-green-100 transition">Plant Algo</Link>
                        <Link to="/soil-algo" className="hover:text-green-100 transition">Soil Algo</Link>
                    </nav>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <div className="bg-white rounded-lg shadow-md p-6">
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

                    <form onSubmit={handleTrainingSubmit} className="space-y-6">
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
                                        className="w-full max-h-96 object-contain rounded-lg bg-gray-100"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 shadow-md"
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
                                onChange={(e) => setTrainingData({ ...trainingData, plant_name: e.target.value })}
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
                                onChange={(e) => setTrainingData({ ...trainingData, scientific_name: e.target.value })}
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
                                onChange={(e) => setTrainingData({ ...trainingData, common_names: e.target.value })}
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
                                onChange={(e) => setTrainingData({ ...trainingData, plant_type: e.target.value })}
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
                                onChange={(e) => setTrainingData({ ...trainingData, description: e.target.value })}
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
                                onChange={(e) => setTrainingData({ ...trainingData, care_instructions: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                rows="4"
                                placeholder="Watering, sunlight, soil requirements, fertilizing, pruning..."
                            />
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4 border-t border-gray-200">
                            <button
                                type="submit"
                                disabled={submittingTraining || !trainingData.plant_name}
                                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium text-lg"
                            >
                                {submittingTraining ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} />
                                        Submitting Training Data...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={20} />
                                        Submit to Training Database
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default PlantTraining
