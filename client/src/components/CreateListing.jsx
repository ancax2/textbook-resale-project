import React, { useState } from 'react';

function CreateListing({ user, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    book_title: '',
    author: '',
    publish_year: '',
    program_name: '',
    program_year: '',
    price: '',
    condition_type: '',
    comments: ''
  });

  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit to 3 images
    if (files.length > 3) {
      setError('Maximum 3 images allowed');
      return;
    }

    // Validate file types (PNG, JPEG only)
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const invalidFiles = files.filter(file => !validTypes.includes(file.type));
    
    if (invalidFiles.length > 0) {
      setError('Only PNG and JPEG images are allowed');
      return;
    }

    setImages(files);
    
    // Create preview URLs
    const previews = files.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    // Validate at least one image
    if (images.length === 0) {
      setError('At least one image is required');
      setLoading(false);
      return;
    }

    // Create FormData for file upload
    const formDataToSend = new FormData();
    
    // Append all form fields
    Object.keys(formData).forEach(key => {
      formDataToSend.append(key, formData[key]);
    });

    // Append images
    images.forEach(image => {
      formDataToSend.append('images', image);
    });

    try {
      const response = await fetch('http://localhost:5000/api/listings', {
        method: 'POST',
        credentials: 'include',
        body: formDataToSend
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Listing created successfully!');
        // Reset form
        setFormData({
          book_title: '',
          author: '',
          publish_year: '',
          program_name: '',
          program_year: '',
          price: '',
          condition_type: '',
          comments: ''
        });
        setImages([]);
        setImagePreviews([]);
        
        // Call success callback if provided
        if (onSuccess) {
          setTimeout(() => onSuccess(), 1500);
        }
      } else {
        setError(data.error || 'Failed to create listing');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Check if form has any data
    const hasData = Object.values(formData).some(value => value !== '') || images.length > 0;
    
    if (hasData) {
      const confirmLeave = window.confirm('You have unsaved changes. Are you sure you want to leave?');
      if (confirmLeave) {
        onCancel();
      }
    } else {
      onCancel();
    }
  };

  return (
    <div className="container mt-4">
      {/* Navigation Bar */}
      <nav className="navbar navbar-light bg-light mb-4">
        <div className="container-fluid">
          <span className="navbar-brand">
            📚 Create New Listing
          </span>
          <div>
            <button 
              className="btn btn-outline-secondary me-2" 
              onClick={handleCancel}
              disabled={loading}
            >
              ← Back to Home
            </button>
            <span className="text-muted">
              {user.first_name} {user.last_name}
            </span>
          </div>
        </div>
      </nav>

      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title mb-4">Create New Listing</h3>

              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  {error}
                  <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
              )}

              {success && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                  {success}
                  <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Book Title */}
                <div className="mb-3">
                  <label className="form-label">
                    Book Title <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="book_title"
                    value={formData.book_title}
                    onChange={handleInputChange}
                    placeholder="e.g., Introduction to Programming"
                    required
                  />
                </div>

                {/* Author */}
                <div className="mb-3">
                  <label className="form-label">
                    Author <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    placeholder="e.g., John Smith"
                    required
                  />
                </div>

                {/* Publish Year */}
                <div className="mb-3">
                  <label className="form-label">
                    Publish Year <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    name="publish_year"
                    value={formData.publish_year}
                    onChange={handleInputChange}
                    placeholder="e.g., 2023"
                    min="1900"
                    max="2026"
                    required
                  />
                </div>

                {/* Program Name */}
                <div className="mb-3">
                  <label className="form-label">
                    Program Name <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    name="program_name"
                    value={formData.program_name}
                    onChange={handleInputChange}
                    placeholder="e.g., Computer Science"
                    required
                  />
                </div>

                {/* Program Year */}
                <div className="mb-3">
                  <label className="form-label">
                    Year of Program <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="program_year"
                    value={formData.program_year}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select year...</option>
                    <option value="1">Year 1</option>
                    <option value="2">Year 2</option>
                    <option value="3">Year 3</option>
                    <option value="4">Year 4</option>
                  </select>
                </div>

                {/* Price */}
                <div className="mb-3">
                  <label className="form-label">
                    Price (CAD) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="e.g., 45.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                {/* Condition */}
                <div className="mb-3">
                  <label className="form-label">
                    Condition <span className="text-danger">*</span>
                  </label>
                  <select
                    className="form-select"
                    name="condition_type"
                    value={formData.condition_type}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select condition...</option>
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>

                {/* Comments (Optional) */}
                <div className="mb-3">
                  <label className="form-label">Comments (Optional)</label>
                  <textarea
                    className="form-control"
                    name="comments"
                    value={formData.comments}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="Any additional information about the book..."
                  ></textarea>
                </div>

                {/* Images */}
                <div className="mb-3">
                  <label className="form-label">
                    Book Images (Max 3) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/png, image/jpeg, image/jpg"
                    multiple
                    onChange={handleImageChange}
                    required
                  />
                  <small className="form-text text-muted">
                    Accepted formats: PNG, JPEG. Maximum 3 images.
                  </small>
                </div>

                {/* Image Previews */}
                {imagePreviews.length > 0 && (
                  <div className="mb-3">
                    <label className="form-label">Image Previews:</label>
                    <div className="row">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="col-md-4 mb-2">
                          <img 
                            src={preview} 
                            alt={`Preview ${index + 1}`}
                            className="img-fluid img-thumbnail"
                            style={{ maxHeight: '200px', objectFit: 'cover', width: '100%' }}
                          />
                          <p className="text-center small mt-1">
                            {images[index].name}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submit and Cancel Buttons */}
                <div className="d-grid gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating Listing...
                      </>
                    ) : (
                      'Create Listing'
                    )}
                  </button>
                  
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>

                <p className="text-muted text-center mt-3 small">
                  <span className="text-danger">*</span> Required fields
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateListing;