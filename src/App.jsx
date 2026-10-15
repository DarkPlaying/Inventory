import './home.css'
import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './Pages/Home'
import Menu from './Pages/Menu'
import Business from './Pages/Business'
import Search from './Components/Search'
import StockNotification from './Components/StockNotification'
import Profile from './Pages/Profile'
import Scanner from './Pages/Scanner'
import SwipeToReload from './Components/SwipeToReload'

function App() {
  return (
    <HashRouter>
      <SwipeToReload>
        <StockNotification />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/scanner" element={<Scanner />} />
          <Route path="/business" element={<Business />} />
          <Route path="/search" element={<Search />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </SwipeToReload>
    </HashRouter>
  )
}

export default App
