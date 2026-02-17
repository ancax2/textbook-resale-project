import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Home from './components/Home';
import CreateListing from './components/CreateListing';
import ListingDetail from './components/ListingDetail';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user has active session when app loads
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/user', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage('home');
  };

  const handleLogout = async () => {
    await fetch('http://localhost:5000/api/logout', {
      method: 'POST',
      credentials: 'include'
    });
    setUser(null);
    setCurrentPage('home');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  const handleViewListing = (listingId) => {
    setSelectedListingId(listingId);
    setCurrentPage('detail');
  };

  const handleBackFromDetail = () => {
    setCurrentPage('home');
    setSelectedListingId(null);
  };

  const handleListingCreated = () => {
    setCurrentPage('home');
  };

  const handleCancelCreate = () => {
    setCurrentPage('home');
  };

  // Show loading spinner while checking session
  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading...</p>
      </div>
    );
  }

  // Render different pages based on currentPage
  const renderPage = () => {
    if (!user) {
      return <Login onLogin={handleLogin} />;
    }

    switch (currentPage) {
      case 'create':
        return (
          <CreateListing 
            user={user} 
            onSuccess={handleListingCreated}
            onCancel={handleCancelCreate}
          />
        );
      case 'detail':
        return (
          <ListingDetail
            listingId={selectedListingId}
            onBack={handleBackFromDetail}
          />
        );
      case 'home':
      default:
        return (
          <Home 
            user={user} 
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            onViewListing={handleViewListing}
          />
        );
    }
  };

  return (
    <div className="App">
      {renderPage()}
    </div>
  );
}

export default App;