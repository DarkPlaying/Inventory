// to build inventory dashbaord in mobile view 
import './in.css'
import React from 'react'
import { useState } from 'react'
{/* <div className="iteams">
        <div className="iteam"><p>Shirt</p><i class="fa-solid fa-circle-plus"></i> <span>5</span><i class="fa-solid fa-circle-minus"></i> </div>
        <div className="iteam">Pants<i class="fa-solid fa-circle-plus"></i> <span>10</span><i class="fa-solid fa-circle-minus"></i></div>
        <div className="iteam">Shoes<i class="fa-solid fa-circle-plus"></i> <span>15</span><i class="fa-solid fa-circle-minus"></i></div>
      </div> */}
function App() {
  return (
    <>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.1/css/all.css" integrity="sha512-x9WwyMYBnlXMNQ6kQ/Lyzu1NqIhLQKL5Oq6xByfXuRj7s9CskyCbLv/1IjqzJmXwFXWr0ov6jBV7Qbc0hh9nHg==" crossorigin="anonymous" referrerpolicy="no-referrer"></link>
      <div className="navi">
        <i class="fa-solid fa-bars"></i>
        <span>Inventory</span>
        <input type="text" placeholder='search iteams' />
        <i class="fa-regular fa-bell"></i>
         <i class="fa-solid fa-circle-user"></i>
      </div>
      <div className="iteamtotal">
        <div className="iteam"> Total Revenue : $5000</div>
      </div>
      <div className="iteams">
        <div className="iteam" style={{color:"purple"}}>total Iteams: 500</div>
        <div className="iteam" style={{color:"purple"}}>Out of Stocks: 50</div>
        <div className="iteam" style={{color:"purple"}}>Total sales: 500</div>
      </div>
      <div className='graph'>
        <h1>Graph</h1>
        <button>download</button>
        <button id='btn'>view</button>
        <i class="fa-solid fa-circle-chevron-left"></i>
        <i class="fa-solid fa-chart-line"></i>
        <i class="fa-solid fa-circle-chevron-right"></i>
      </div>
      
      <div className="footer">
       <button> <i class="fa-solid fa-chart-column"></i><span>Dashboard</span></button>
       <button> <i class="fa-solid fa-question"></i><span>Help</span></button>
        <button><i class="fa-solid fa-address-card"></i><span>Account</span></button>
      </div>
    </>
  )
}

export default App
