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
import AppLockScreen from './Components/AppLockScreen'

function App() {
  return (
    <HashRouter>
      <AppLockScreen>
        <SwipeToReload>
          <StockNotification />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/billing" element={<Scanner />} />
            <Route path="/scanner" element={<Scanner />} />
            <Route path="/business" element={<Business />} />
            <Route path="/search" element={<Search />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </SwipeToReload>
      </AppLockScreen>
    </HashRouter>
  )
}

export default App
