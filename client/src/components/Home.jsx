import React, { useState, useEffect } from 'react';

function Home({ user, onLogout, onNavigate }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/listings');
      const data = await response.json();
      setListings(data);
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <nav className="navbar navbar-light bg-light mb-4">
        <div className="container-fluid">
          <span className="navbar-brand">
            Welcome, {user.first_name} {user.last_name}
          </span>
          <div>
            <button 
              className="btn btn-success me-2" 
              onClick={() => onNavigate('create')}
            >
              + Create Listing
            </button>
            <button className="btn btn-outline-danger" onClick={onLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <h2>Available Textbooks</h2>
      
      {loading ? (
        <div className="text-center mt-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="alert alert-info">
          No listings available. Be the first to post!
        </div>
      ) : (
        <div className="row">
          {listings.map((listing) => (
            <div className="col-md-4 mb-3" key={listing.listing_id}>
              <div className="card h-100">
                <div className="card-body">
                  <h5 className="card-title">{listing.book_title}</h5>
                  <p className="card-text">
                    <strong>Author:</strong> {listing.author}<br/>
                    <strong>Program:</strong> {listing.program_name}<br/>
                    <strong>Year:</strong> Year {listing.program_year}<br/>
                    <strong>Price:</strong> ${parseFloat(listing.price).toFixed(2)}<br/>
                    <strong>Condition:</strong> <span className="badge bg-secondary">{listing.condition_type}</span>
                  </p>
                  <p className="text-muted small mb-0">
                    Seller: {listing.first_name} {listing.last_name}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Home;