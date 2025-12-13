import React from 'react'
import { ArrowLeft, GitBranch, Database, Cpu, Globe } from 'lucide-react'
import { Link } from 'react-router-dom'

function PlantAlgo() {
    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <header className="bg-green-600 text-white shadow-md">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="hover:bg-green-700 p-2 rounded-full transition">
                            <ArrowLeft size={24} />
                        </Link>
                        <h1 className="text-2xl font-bold">Plant Identification Algorithm</h1>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="prose max-w-none">
                        <h2 className="text-3xl font-bold text-gray-800 mb-6">How it Works</h2>
                        <p className="text-lg text-gray-600 mb-8">
                            The plant identification process utilizes a hybrid approach, combining specific botanical recognition APIs with Generative AI for detailed horticultural advice.
                        </p>

                        <div className="space-y-12">
                            {/* Step 1 */}
                            <div className="relative border-l-4 border-blue-500 pl-8 ml-4">
                                <div className="absolute -left-3 top-0 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm">1</div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Image Processing</h3>
                                <p className="text-gray-600">
                                    The user uploads an image, which is converted into a Base64 string for secure API transmission.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="relative border-l-4 border-green-500 pl-8 ml-4">
                                <div className="absolute -left-3 top-0 bg-green-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm">2</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Globe className="text-green-600" size={24} />
                                    <h3 className="text-xl font-bold text-gray-800">Botanical Identification (Plant.id API)</h3>
                                </div>
                                <p className="text-gray-600 mb-4">
                                    We query the <strong>Kindwise Plant.id API</strong>, a specialized computer vision model trained on millions of plant options.
                                </p>
                                <div className="bg-gray-50 p-4 rounded-lg text-sm font-mono border border-gray-200">
                                    <p className="font-bold text-gray-700 mb-2">Output:</p>
                                    <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                        <li>Scientific Name</li>
                                        <li>Common Names</li>
                                        <li>Confidence Score (%)</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative border-l-4 border-purple-500 pl-8 ml-4">
                                <div className="absolute -left-3 top-0 bg-purple-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm">3</div>
                                <div className="flex items-center gap-2 mb-2">
                                    <Cpu className="text-purple-600" size={24} />
                                    <h3 className="text-xl font-bold text-gray-800">AI Enhancement (OpenAI GPT-4o)</h3>
                                </div>
                                <p className="text-gray-600 mb-4">
                                    If the user is on the <strong>Premium Plan</strong> and confidence is high, we pass the image and identification data to GPT-4o (Vision).
                                </p>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <p className="text-blue-800 font-medium mb-2">The AI analyzes visual clues to determine:</p>
                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700">
                                        <li className="flex items-center gap-2">✅ Health Status (Disease/Pests)</li>
                                        <li className="flex items-center gap-2">✅ Exact Growth Stage</li>
                                        <li className="flex items-center gap-2">✅ Detailed Care Instructions</li>
                                        <li className="flex items-center gap-2">✅ Seasonal Requirements</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="relative border-l-4 border-gray-500 pl-8 ml-4">
                                <div className="absolute -left-3 top-0 bg-gray-500 text-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm">4</div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">Result Aggregation</h3>
                                <p className="text-gray-600">
                                    The system merges the taxonomic data from Plant.id with the horticultural advice from OpenAI to present a comprehensive plant profile.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PlantAlgo
