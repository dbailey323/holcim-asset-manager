import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

// --- CONFIGURATION ---
// IMPORTANT: Paste your Web App URL here
const API_URL = "https://script.google.com/macros/s/AKfycbw3RS-BUP-A0ohs9Zv_ebF8Vw3x0p8qiqmf7E5MM6kCBThKGjERaOeb3cDKgot7vgVX/exec"; 

// --- HOLCIM THEME STYLES ---
const theme = {
  header: { backgroundColor: '#fff', borderBottom: '3px solid #04C688' },
  bg: { backgroundColor: '#F4F6F8', minHeight: '100vh', paddingBottom: '60px' },
  
  // Status Card Styles
  inUse: { borderLeft: '5px solid #04C688' }, 
  stock: { borderLeft: '5px solid #FFC107' }, 
  faulty: { borderLeft: '5px solid #DC3545' }, 
  
  // Buttons
  btnCheckout: { backgroundColor: '#04C688', color: 'white', border: 'none' },
  btnCheckin: { backgroundColor: '#1F2833', color: 'white', border: 'none' }
};

export default function App() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

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

  const handleAction = async (id, action) => {
    let newUser = "";
    if (action === 'checkout') {
      newUser = prompt("Who is receiving this device?");
      if (newUser === null) return; 
      if (newUser.trim() === "") return alert("A user name is required.");
    }

    setProcessingId(id);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ id, action, user: newUser })
      });
      
      const result = await response.json();

      if (result.success) {
        setAssets(prev => prev.map(a => {
          if (String(a.id) === String(id)) {
            return { 
              ...a, 
              status: result.newStatus, 
              user: result.newUser !== undefined ? result.newUser : a.user 
            };
          }
          return a;
        }));
        
        setSearch("");
        document.getElementById("searchInput")?.focus();

      } else {
        alert("Error: " + result.message);
      }
    } catch (error) {
      console.error(error);
      alert("Network Error.");
    }
    setProcessingId(null);
  };

  const filtered = assets.filter(a => 
    search === "" ? true : 
    [a.serial, a.user, a.assetTag].some(val => String(val || "").toLowerCase().includes(search.toLowerCase()))
  );

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

      {/* --- MAIN CONTAINER FIX --- */}
      {/* 'mx-auto' forces horizontal margins to auto (centering the block) */}
      <div 
        className="container mx-auto" 
        style={{ maxWidth: '1000px', marginLeft: 'auto', marginRight: 'auto' }}
      >
        
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
        {/* 'justify-content-center' ensures cards start in the middle if there are only a few */}
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

// --- ASSET CARD COMPONENT ---
function AssetCard({ asset, theme, onAction, isProcessing }) {
  let cardStyle = { ...theme.stock }; 
  let badgeClass = "badge bg-warning text-dark"; 

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
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold m-0">{asset.serial}</h5>
            <span className={badgeClass} style={{fontSize: '0.8em', padding:'6px 10px'}}>
              {asset.status}
            </span>
          </div>
          
          <div className="row g-2 mb-3">
            <DataPoint label="User" value={asset.user} />
            <DataPoint label="Asset Tag" value={asset.assetTag} />
            <DataPoint label="Lease End" value={asset.leaseEnd} />
            <div className="col-12 text-muted small mt-2">
              {asset.description}
            </div>
          </div>
        </div>

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
        
        {!['In Use', 'Stock Room'].includes(asset.status) && (
           <button className="btn btn-light w-100 py-2 text-muted" disabled>
             Action Unavailable
           </button>
        )}
      </div>
    </div>
  );
}

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
