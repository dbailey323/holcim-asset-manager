import { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

// --- CONFIG ---
const API_URL = "https://script.google.com/macros/s/AKfycbw3RS-BUP-A0ohs9Zv_ebF8Vw3x0p8qiqmf7E5MM6kCBThKGjERaOeb3cDKgot7vgVX/exec"; // PASTE URL HERE

// --- HOLCIM STYLES ---
const styles = {
  header: { backgroundColor: '#fff', borderBottom: '3px solid #04C688' },
  bg: { backgroundColor: '#F4F6F8', minHeight: '100vh', paddingBottom: '40px' },
  cardInUse: { borderLeft: '5px solid #04C688' },
  cardStock: { borderLeft: '5px solid #FFC107' },
  cardFaulty: { borderLeft: '5px solid #DC3545' },
  badgeInUse: { backgroundColor: 'rgba(4, 198, 136, 0.15)', color: '#038c60' },
  badgeStock: { backgroundColor: 'rgba(255, 193, 7, 0.15)', color: '#997404' },
  btnCheckout: { backgroundColor: '#04C688', color: 'white', border: 'none' },
  btnCheckin: { backgroundColor: '#1F2833', color: 'white', border: 'none' }
};

export default function App() {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  // 1. Fetch Data on Load
  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setAssets(data);
        setLoading(false);
      })
      .catch(err => console.error("Error fetching data:", err));
  }, []);

  // 2. Handle Actions
  const handleUpdate = async (id, action) => {
    let newUser = "";
    if (action === 'checkout') {
      newUser = prompt("Who is receiving this device?");
      if (!newUser) return;
    }

    setProcessing(id); // Show spinner on specific card

    // Send POST request to Google Script
    // Note: We use stringify and no-cors mode might be needed if simple CORS fails, 
    // but usually standard fetch works with "text/plain" body to avoid preflight issues in GAS.
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ id, action, user: newUser })
      });
      
      const result = await response.json();

      if (result.success) {
        // Update Local State
        setAssets(prev => prev.map(a => {
          if (String(a.id) === String(id)) {
            return { ...a, status: result.newStatus, user: result.newUser || a.user };
          }
          return a;
        }));
        setSearch(""); // Clear search for next scan
        
        // Focus search bar (Scanner Mode)
        document.getElementById("searchInput")?.focus();
      } else {
        alert("Error: " + result.message);
      }
    } catch (error) {
      alert("Network Error");
    }
    setProcessing(null);
  };

  // 3. Filter Logic
  const filteredAssets = assets.filter(a => 
    search === "" ? true : 
    [a.serial, a.user, a.assetTag].some(f => String(f).toLowerCase().includes(search.toLowerCase()))
  );

  const displayList = search === "" ? filteredAssets.slice(0, 12) : filteredAssets.slice(0, 60);

  return (
    <div style={theme.bg}>
      {/* Sticky Header */}
      <nav className="navbar navbar-light sticky-top shadow-sm mb-4" style={theme.header}>
        <div className="container justify-content-center">
          <span className="navbar-brand h1 mb-0">
             <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/LogoHolcim2021.svg/250px-LogoHolcim2021.svg.png" height="40" alt="Holcim" />
          </span>
        </div>
      </nav>

      {/* Main Container - UPDATED with maxWidth to center it nicely */}
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

        {/* Loading State */}
        {loading && (
          <div className="text-center mt-5 text-secondary">
            <div className="spinner-border text-success mb-2"></div>
            <p>Syncing Asset Data...</p>
          </div>
        )}

        {/* Asset Grid - UPDATED with 'justify-content-center' */}
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
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-Component for Cards
function AssetCard({ asset, styles, onAction, isProcessing }) {
  let borderStyle = {};
  let badgeStyle = "badge bg-secondary";
  
  if (asset.status === 'In Use') { borderStyle = styles.cardInUse; badgeStyle = styles.badgeInUse; }
  else if (asset.status === 'Stock Room') { borderStyle = styles.cardStock; badgeStyle = styles.badgeStock; }
  else if (asset.status.includes('Faulty')) { borderStyle = styles.cardFaulty; badgeStyle = "badge bg-danger"; }

  return (
    <div className="card h-100 shadow-sm border-0" style={borderStyle}>
      <div className="card-body d-flex flex-column justify-content-between">
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="fw-bold m-0">{asset.serial}</h5>
            <span className="badge rounded-pill" style={typeof badgeStyle === 'string' ? {} : badgeStyle}>
               {typeof badgeStyle === 'string' ? <span className={badgeStyle}>{asset.status}</span> : asset.status}
            </span>
          </div>
          
          <div className="row g-2 mb-3">
            <div className="col-6">
              <small className="text-uppercase text-muted fw-bold" style={{fontSize: '0.75rem'}}>User</small>
              <div className="text-truncate">{asset.user || '—'}</div>
            </div>
            <div className="col-6">
              <small className="text-uppercase text-muted fw-bold" style={{fontSize: '0.75rem'}}>Asset Tag</small>
              <div>{asset.assetTag || '—'}</div>
            </div>
             <div className="col-6">
              <small className="text-uppercase text-muted fw-bold" style={{fontSize: '0.75rem'}}>Lease End</small>
              <div>{asset.leaseEnd || '—'}</div>
            </div>
            <div className="col-12 text-muted small mt-2">{asset.description}</div>
          </div>
        </div>

        {asset.status === 'In Use' && (
          <button 
            className="btn w-100 py-2 fw-bold" 
            style={styles.btnCheckin} 
            disabled={isProcessing}
            onClick={() => onAction(asset.id, 'checkin')}
          >
            {isProcessing ? 'Updating...' : '📥 CHECK IN'}
          </button>
        )}

        {asset.status === 'Stock Room' && (
          <button 
            className="btn w-100 py-2 fw-bold" 
            style={styles.btnCheckout} 
            disabled={isProcessing}
            onClick={() => onAction(asset.id, 'checkout')}
          >
            {isProcessing ? 'Updating...' : '📤 CHECK OUT'}
          </button>
        )}
      </div>
    </div>
  );
}
