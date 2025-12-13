import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import PlantTraining from './pages/PlantTraining'
import PlantAlgo from './pages/PlantAlgo'
import SoilAlgo from './pages/SoilAlgo'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<PlantTraining />} />
          <Route path="/train-plant" element={<PlantTraining />} />
          <Route path="/plant-algo" element={<PlantAlgo />} />
          <Route path="/soil-algo" element={<SoilAlgo />} />
        </Routes>
        <Toaster position="top-right" />
      </div>
    </Router>
  )
}

export default App

