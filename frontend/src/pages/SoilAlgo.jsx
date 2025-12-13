import React from 'react'
import { ArrowLeft, Layers, Microscope, ThumbsUp } from 'lucide-react'
import { Link } from 'react-router-dom'

function SoilAlgo() {
    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-orange-600 text-white shadow-md">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="hover:bg-orange-700 p-2 rounded-full transition">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-2xl font-bold">Soil Analysis Algorithm</h1>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="prose max-w-none">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">How it Works</h2>
                        <p className="text-lg text-gray-600 mb-8">
                            The soil analysis feature is a pure Computer Vision task powered by Large Language Models (LLMs). It analyzes physical soil characteristics directly from the image.
                        </p>

                        <div className="space-y-12">
                            {/* Step 1 */}
                            <div className="relative border-l-4 border-orange-500 pl-8 ml-4">
                                <div className="absolute -left-3 top-0 bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Input & Validation</h3>
                                <p className="text-gray-600">
                                    This feature is strictly limited to <strong>Premium Plan</strong> users. We ensure the image is high-resolution (min 800x600 recommended) to allow for texture analysis.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="relative border-l-4 border-indigo-500 pl-8 ml-4">
                                <div className="absolute -left-3 top-0 bg-indigo-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Microscope className="text-indigo-600" size={24} />
                                    <h3 className="text-xl font-bold text-gray-800">Visual Analysis (GPT-4o Vision)</h3>
                                </div>
                                <p className="text-gray-600 mb-4">
                                    We use an expert system prompt calibrated for <strong>Tropical Climates (Philippines)</strong>. The AI examines the image for:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="font-bold text-gray-700 mb-2">Physical Properties</h4>
                                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                                            <li>Color (Dark = Organic matter)</li>
                                            <li>Clumping (Clay vs. Sandy)</li>
                                            <li>Moisture Level (Wet/Dry)</li>
                                            <li>Aggregate Structure</li>
                                        </ul>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <h4 className="font-bold text-gray-700 mb-2">Chemical Inferences</h4>
                                        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                                            <li>pH Estimate (based on color/type)</li>
                                            <li>Drainage Capability</li>
                                            <li>Nutrient Deficiency signs</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative border-l-4 border-green-500 pl-8 ml-4">
                                <div className="absolute -left-3 top-0 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm">3</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <ThumbsUp className="text-green-600" size={24} />
                                    <h3 className="text-xl font-bold text-gray-800">Recommendation System</h3>
                                </div>
                                <p className="text-gray-600 mb-4">
                                    Based on the identified soil type, the system generates localized recommendations:
                                </p>
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <ul className="space-y-2 text-green-800">
                                        <li>🌱 <strong>Suitable Plants:</strong> Recommends specific Philippine crops (e.g., Kangkong for wet soil, Okra for clay-loam).</li>
                                        <li>🛠️ <strong>Amendments:</strong> Recommends organic fertilizers or structure improvers available locally.</li>
                                    </ul>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default SoilAlgo
