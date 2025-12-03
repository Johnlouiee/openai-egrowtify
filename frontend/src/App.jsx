import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AIPlantRecognition from './pages/AIPlantRecognition'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<AIPlantRecognition />} />
          <Route path="/ai-recognition" element={<AIPlantRecognition />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </Router>
  )
}

export default App

