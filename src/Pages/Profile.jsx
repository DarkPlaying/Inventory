import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../Css/profile.css';
import StockStatusModal from '../Components/StockStatusModal';
import supabase from '../supabase';
import couldImg from '../assets/could.png';
import avaterImg from '../assets/avater.png';

export default function Profile() {
  const navigate = useNavigate();
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    async function getCompanies() {
      const { data } = await supabase.from('items').select('dealer_name');
      if (data) {
        const unique = [...new Set(data.map(i => i.dealer_name?.trim()).filter(Boolean))];
        setCompanies(unique);
      }
    }
    getCompanies();

    const channel = supabase
      .channel('profile-companies-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        getCompanies();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Shorthand for available companies: empty fallback or truncated with "..."
  const companyText = !companies.length
    ? 'Till no company added'
    : companies.length > 1
      ? `${companies.slice(0, 1).join(', ')}...`
      : companies.join(',');

  return (
    <div className="profile-page">
      <header className="navi">
        <button className="back-btn" onClick={() => navigate('/')}>
          <i className="fa-solid fa-arrow-left-long"></i> Back
        </button>

        <span className="menu-title">Profile</span>
        <div className="menu-icons">
          <i
            className="fa-regular fa-bell"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowStatusModal(true)}
          ></i>
          <i className="fa-solid fa-circle-user"></i>
        </div>
      </header>
      <main>
        <div className="container">
          <img className='could' src={couldImg} alt="Clouds Cover" />
          <Link to="/" style={{ textDecoration: 'none' }}>
          <button className='follow'> Inventory App <i className="fa-solid fa-plus"></i> </button></Link>
          <img className='avater' src={avaterImg} alt="Avatar" />
          <p className='started'>Started At 2026</p>
          <h1 className='name'>Sanjay</h1>
          <p className='info'>Manage and monitor your inventory efficiently in one place. Track stock levels, manage product details, monitor incoming and outgoing items, and stay updated on stock availability.</p>
          <div className="detail">
            <span className="companies-highlight"><strong>Companies: </strong>{companyText}</span>
          </div>
           
        </div>
      </main>

      <footer className="footer">
        <Link to="/" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-chart-column"></i><span>Overview</span></button>
        </Link>
        <Link to="/menu" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-bars"></i><span>Menu</span></button>
        </Link>
        <Link to="/billing" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-receipt"></i><span>Billing</span></button>
        </Link>
        <Link to="/business" style={{ textDecoration: 'none' }}>
          <button><i className="fa-solid fa-briefcase"></i><span>Business</span></button>
        </Link>
        <Link to="/profile" style={{ textDecoration: 'none' }}>
          <button className="active-nav"><i className="fa-solid fa-address-card"></i><span>Profile</span></button>
        </Link>
      </footer>

      

      <StockStatusModal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
      />
    </div>
  );
}