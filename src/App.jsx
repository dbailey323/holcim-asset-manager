import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

// --- CONFIGURATION ---
// IMPORTANT: Replace this with the URL you got from Google Apps Script (Deploy > Web App)
const API_URL = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec"; 

// --- HOLCIM THEME STYLES ---
const theme = {
  header: { backgroundColor: '#fff', borderBottom: '3px solid #04C688' },
  bg: { backgroundColor: '#F4F6F8', minHeight: '100vh', paddingBottom: '60px' },
  
  // Status Card Styles
  inUse: { borderLeft: '5px solid #04C688' }, // Green
  stock: { borderLeft: '5px solid #FFC107' }, // Yellow
  faulty: { borderLeft: '5px solid #DC3545' }, // Red
  
  // Buttons
  btnCheckout: { backgroundColor: '#04C688', color: 'white', border: 'none' },
  btnCheckin: { backgroundColor: '#1F2833', color: 'white', border: 'none' }
};

export default function App() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // 1. Fetch Data on Load
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setAssets(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("API Error:", err);
        setLoading(false);
      });
  }, []);

  // 2. Handle Check In / Check Out Actions
  const handleAction = async (id, action) => {
    let newUser = "";
    
    // Logic: If Checking OUT, we must ask who it is for.
    if (action === 'checkout') {
      newUser = prompt("Who is receiving this device?");
      if (newUser === null) return; // User pressed Cancel
      if (newUser.trim() === "") return alert("A user name is required to check out.");
    }

    setProcessingId(id); // Show spinner on the specific card

    try {
      // POST request to Google Apps Script
      // Note: We use no-cors if standard CORS fails, but standard usually works with 'text/plain' body
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ id, action, user: newUser })
      });
      
      const result = await response.json();

      if (result.success) {
        // Optimistic Update: Update the local list instantly without re-fetching
        setAssets(prev => prev.map(a => {
          if (String(a.id) === String(id)) {
            return { 
              ...a, 
              status: result.newStatus, 
              // If checking out, use new name. If checking in, API returns "" (empty string).
              user: result.newUser !== undefined ? result.newUser : a.user 
            };
          }
          return a;
        }));
        
        // --- SCANNER MODE ---
        // 1. Clear the search box
        setSearch("");
        // 2. Refocus the cursor so you can scan the next item immediately
        document.getElementById("searchInput")?.focus();

      } else {
        alert("Error: " + result.message);
      }
    } catch (error) {
      console.error(error);
      alert("Network Error. Please check your internet connection.");
    }
    setProcessingId(null);
  };

  // 3. Filter Logic (Search by Serial, User, or Asset Tag)
  const filtered = assets.filter(a => 
    search === "" ? true : 
    [a.serial, a.user, a.assetTag].some(val => String(val || "").toLowerCase().includes(search.toLowerCase()))
  );

  // Performance: Show 12 items initially, or 60 if searching
  const displayList = search === "" ? filtered.slice(0, 12) : filtered.slice(0, 60);

  return (
    <div style={theme.bg}>
      {/* Sticky Header */}
      <nav className="navbar navbar-light sticky-top shadow-sm mb-4" style={theme.header}>
        <div className="container justify-content-center">
          <span className="navbar-brand h1 mb-0">
             <img 
               src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/LogoHolcim2021.svg/250px-LogoHolcim2021.svg.png" 
               height="40" 
               alt="Holcim" 
             />
          </span>
        </div>
      </nav>

      {/* Main Content Container - Centered with Max Width */}
      <div className="container" style={{ maxWidth: '1000px' }}>
        
        {/* Search Bar */}
        <div className="row justify-content-center mb-4">
          <div className="col-12 col-md-8">
            <input 
              id="searchInput"
              type="text" 
              className="form-control form-control-lg rounded-pill shadow-sm"
              placeholder="Scan Tag, Serial, or User..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{border: '1px solid #e0e0e0'}}
            />
          </div>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="text-center mt-5 text-secondary">
            <div className="spinner-border text-success mb-2"></div>
            <p>Syncing Asset Data...</p>
          </div>
        )}

        {/* Asset Grid */}
        <div className="row g-4 justify-content-center">
          {displayList.map(asset => (
            <div key={asset.id} className="col-12 col-md-6 col-lg-4">
              <AssetCard 
                asset={asset} 
                theme={theme} 
                onAction={handleAction} 
                isProcessing={processingId === asset.id} 
              />
            </div>
          ))}
        </div>
        
        {/* No Results State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center mt-5 text-muted">
             <h5>No assets found</h5>
             <p>Try a different serial number or user.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: ASSET CARD ---
function AssetCard({ asset, theme, onAction, isProcessing }) {
  // Determine Card Style based on Status
  let cardStyle = { ...theme.stock }; // Default to Stock style (Yellow)
  let badgeClass = "badge bg-warning text-dark"; // Default Badge

  if (asset.status === 'In Use') { 
    cardStyle = theme.inUse; 
    badgeClass = "badge bg-success bg-opacity-10 text-success";
  } else if (asset.status && asset.status.includes('Faulty')) { 
    cardStyle = theme.faulty; 
    badgeClass = "badge bg-danger bg-opacity-10 text-danger";
  }

  return (
    <div className="card h-100 shadow-sm border-0" style={{...cardStyle, borderRadius: '12px'}}>
      <div className="card-body d-flex flex-column justify-content-between">
        <div>
          {/* Card Header: Serial & Status */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold m-0">{asset.serial}</h5>
            <span className={badgeClass} style={{fontSize: '0.8em', padding:'6px 10px'}}>
              {asset.status}
            </span>
          </div>
          
          {/* Card Data Grid */}
          <div className="row g-2 mb-3">
            <DataPoint label="User" value={asset.user} />
            <DataPoint label="Asset Tag" value={asset.assetTag} />
            <DataPoint label="Lease End" value={asset.leaseEnd} />
            
            {/* Description spans full width */}
            <div className="col-12 text-muted small mt-2">
              {asset.description}
            </div>
          </div>
        </div>

        {/* Buttons */}
        {asset.status === 'In Use' && (
          <button 
            className="btn w-100 py-2 fw-bold shadow-sm" 
            style={theme.btnCheckin} 
            disabled={isProcessing}
            onClick={() => onAction(asset.id, 'checkin')}
          >
            {isProcessing ? 'Updating...' : '📥 CHECK IN'}
          </button>
        )}

        {asset.status === 'Stock Room' && (
          <button 
            className="btn w-100 py-2 fw-bold shadow-sm" 
            style={theme.btnCheckout} 
            disabled={isProcessing}
            onClick={() => onAction(asset.id, 'checkout')}
          >
            {isProcessing ? 'Updating...' : '📤 CHECK OUT'}
          </button>
        )}
        
        {/* If Faulty or other status, disable button */}
        {!['In Use', 'Stock Room'].includes(asset.status) && (
           <button className="btn btn-light w-100 py-2 text-muted" disabled>
             Action Unavailable
           </button>
        )}
      </div>
    </div>
  );
}

// --- HELPER: DATA POINT ---
// Ensures labels and values look consistent
const DataPoint = ({ label, value }) => (
  <div className="col-6">
    <small className="text-uppercase text-muted fw-bold" style={{fontSize: '0.7rem'}}>
      {label}
    </small>
    <div className="text-truncate fw-medium" title={value}>
      {value || '—'}
    </div>
  </div>
);
