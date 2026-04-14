import React, { useState, useEffect } from 'react';
import './App.css';
import AppShell from './components/AppShell';
import Login from './components/Login';
import Home from './components/Home';
import CreateListing from './components/CreateListing';
import EditListing from './components/EditListing';
import ListingDetail from './components/ListingDetail';
import MyListings from './components/MyListings';
import MyBookmarks from './components/MyBookmarks';
import Admin from './components/Admin';
import Profile from './components/Profile';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedListingId, setSelectedListingId] = useState(null);
  const [editListingId, setEditListingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);

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
    try {
      setLogoutLoading(true);
      await fetch('http://localhost:5000/api/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setUser(null);
      setCurrentPage('home');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLogoutLoading(false);
    }
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

  const handleEditListing = (listingId) => {
    setEditListingId(listingId);
    setCurrentPage('edit');
  };

  const handleEditSuccess = () => {
    setEditListingId(null);
    setCurrentPage('mylistings');
  };

  const handleCancelEdit = () => {
    setEditListingId(null);
    setCurrentPage('mylistings');
  };

  // Show loading spinner while checking session
  if (loading) {
    return (
      <div className="App login-nbcc-hero d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Loading…</p>
        </div>
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
      case 'edit':
        return (
          <EditListing
            listingId={editListingId}
            user={user}
            onSuccess={handleEditSuccess}
            onCancel={handleCancelEdit}
          />
        );
      case 'detail':
        return (
          <ListingDetail
            listingId={selectedListingId}
            user={user}
            onBack={handleBackFromDetail}
            onNavigate={setCurrentPage}
          />
        );
      case 'mylistings':
        return (
          <MyListings
            user={user}
            onNavigate={handleNavigate}
            onViewListing={handleViewListing}
            onEditListing={handleEditListing}
          />
        );
      case 'bookmarks':
        return (
          <MyBookmarks
            user={user}
            onNavigate={handleNavigate}
            onViewListing={handleViewListing}
          />
        );
      case 'admin':
        return (
          <Admin
            user={user}
            onNavigate={handleNavigate}
            onViewListing={handleViewListing}
          />
        );
      case 'profile':
        return (
          <Profile
            user={user}
            onNavigate={handleNavigate}
          />
        );
      case 'home':
      default:
        return (
          <Home 
            user={user}
            onNavigate={handleNavigate}
            onViewListing={handleViewListing}
          />
        );
    }
  };

  if (!user) {
    return (
      <div className="App min-vh-100">
        {renderPage()}
      </div>
    );
  }

  return (
    <div className="App">
      <AppShell
        user={user}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        isLoggingOut={logoutLoading}
      />
      <main className="app-main">
        {renderPage()}
      </main>
      <footer className="app-footer" role="contentinfo">
        <div className="container">
          © {new Date().getFullYear()} NBCC Textbook Resale — A student project for{' '}
          <a href="https://www.nbcc.ca" target="_blank" rel="noopener noreferrer">NBCC</a>.
        </div>
      </footer>
    </div>
  );
}

export default App;