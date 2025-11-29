import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp, getDoc } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { 
  LayoutDashboard, Plus, Edit2, Trash2, Star, ShieldAlert, CheckCircle2, MapPin, 
  Users, Phone, Share2, ChevronLeft, ChevronRight, Home as HomeIcon, ArrowRight, X, Loader2, LogOut, Lock
} from 'lucide-react';

// Use BOTH databases
import { db, auth, userDb } from './firebase'; 
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';

// ==========================================
// ⚙️ CONFIGURATION & UTILS
// ==========================================
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME; 
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

// TRACKING FUNCTION
const trackActivity = async (userId, action, details) => {
  if (!userId) return;
  try {
    await addDoc(collection(userDb, "user_activity"), {
      userId: userId,
      action: action, // e.g., 'view_room', 'click_call', 'share_link'
      details: details,
      timestamp: Timestamp.now()
    });
  } catch (err) {
    console.error("Tracking error", err);
  }
};

const INITIAL_FORM_STATE = {
  title: '', location: 'Jia Sarai, Near IIT Gate', type: 'PG',
  price: '', marketPrice: '', phone: '',
  tenantType: 'Boys Only', capacity: 1,
  restrictions: 'No Smoking, No Drinking',
  amenities: 'WiFi, AC, RO Water',
  description: '', thumbnail: '', gallery: [],
  rating: 4.5, ratingCount: 10,
  googleMapsLink: '', postalAddress: ''
};

// ==========================================
// 1. COMPONENTS
// ==========================================

function RoomCard({ room }) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const isBooked = room.status === 'booked';
  const images = [room.media?.thumbnail, ...(room.media?.gallery || [])].filter(Boolean);

  useEffect(() => {
    let interval;
    if (isHovering && images.length > 1) {
      interval = setInterval(() => setCurrentImgIndex((prev) => (prev + 1) % images.length), 2000); 
    } else { setCurrentImgIndex(0); }
    return () => clearInterval(interval);
  }, [isHovering, images.length]);

  return (
    <Link to={`/room/${room.id}`} className="block group h-full" onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
      <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col ${isBooked ? 'opacity-80 grayscale' : ''}`}>
        <div className="relative aspect-[4/3] bg-slate-200 overflow-hidden">
          <img src={images[currentImgIndex] || 'https://via.placeholder.com/400'} alt={room.info.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"/>
          {isHovering && images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 px-4">
               {images.map((_, idx) => <div key={idx} className={`h-1 rounded-full transition-all duration-300 shadow-sm ${idx === currentImgIndex ? 'w-full bg-white' : 'w-full bg-white/30'}`} />)}
            </div>
          )}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 text-slate-900">
            <Star size={12} className="text-orange-500 fill-orange-500"/> {room.rating?.average || 'New'}
          </div>
          {isBooked && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="bg-red-600 text-white px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg border border-white/20">Sold Out</span></div>}
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="mb-2">
            <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1">{room.info.title}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium truncate"><MapPin size={14} className="text-slate-400 shrink-0"/> {room.info.location}</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
             <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold flex items-center gap-1"><Users size={12}/> {room.rules.tenantType}</span>
             <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Verified</span>
          </div>
          <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
              {room.price.marketAmount > 0 && <span className="text-[10px] text-slate-400 line-through">₹{room.price.marketAmount}</span>}
              <div className="flex items-baseline gap-1"><span className="text-xl font-black text-slate-900">₹{room.price.amount}</span><span className="text-xs text-slate-500 font-bold">/mo</span></div>
            </div>
             <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors"><ArrowRight size={16}/></div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function UserHome() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const { currentUser, logout } = useAuth(); 

  useEffect(() => {
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const fetchedRooms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedRooms.sort((a, b) => (a.status === 'booked') - (b.status === 'booked'));
      setRooms(fetchedRooms);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if(loading) return <div className="h-screen flex items-center justify-center text-rose-600"><Loader2 className="animate-spin w-8 h-8"/></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 p-1.5 rounded-lg text-white"><HomeIcon size={20} strokeWidth={3}/></div>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">rent<span className="text-rose-600">X</span></h1>
          </div>
          <div className="flex items-center gap-3">
             {currentUser ? (
                <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-500 hidden sm:inline">Hi, {currentUser.email.split('@')[0]}</span>
                    <button onClick={logout} className="p-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors" title="Logout"><LogOut size={16}/></button>
                </div>
             ) : (
                <Link to="/login" className="text-xs font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-colors">Login</Link>
             )}
          </div>
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
          {rooms.map(room => <RoomCard key={room.id} room={room} />)}
        </div>
      </div>
    </div>
  );
}

// --- UPDATED ROOM DETAILS (With Login Gate, Lightbox & Tracking) ---
function UserRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth(); // Auth Check
  
  const [room, setRoom] = useState(null);
  const [activeImage, setActiveImage] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    window.scrollTo(0,0);
    const fetchRoom = async () => {
      const snap = await getDoc(doc(db, "properties", id));
      if(snap.exists()) setRoom({ id: snap.id, ...snap.data() });
    };
    fetchRoom();
    
    // Track if user is logged in
    if (currentUser) {
        trackActivity(currentUser.id, "view_room", { roomId: id });
    }
  }, [id, currentUser]);

  const images = room ? [room.media.thumbnail, ...(room.media.gallery || [])].filter(Boolean) : [];

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (images.length === 0) return;
      if (e.key === 'ArrowLeft') setActiveImage(prev => (prev - 1 + images.length) % images.length);
      else if (e.key === 'ArrowRight') setActiveImage(prev => (prev + 1) % images.length);
      else if (e.key === 'Escape') setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [images.length]);

  const handleShare = async () => {
    if (currentUser) trackActivity(currentUser.id, "share_link", { roomId: id });
    
    const url = window.location.href;
    const shareData = { title: room?.info?.title, text: `Check out: ${room?.info?.title}`, url: url };
    if (navigator.share && navigator.canShare(shareData)) {
      try { await navigator.share(shareData); return; } catch (err) {}
    }
    try { await navigator.clipboard.writeText(url); alert("Link Copied!"); } catch (err) { prompt("Copy:", url); }
  };

  const handleCall = () => {
      if (currentUser) trackActivity(currentUser.id, "click_call", { roomId: id, phone: room.contact.phone });
  };

  const nextImage = (e) => { e?.stopPropagation(); setActiveImage((prev) => (prev + 1) % images.length); };
  const prevImage = (e) => { e?.stopPropagation(); setActiveImage((prev) => (prev - 1 + images.length) % images.length); };

  if(!room) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-rose-600 w-10 h-10"/></div>;

  return (
    <div className="bg-white min-h-screen pb-28 font-sans relative">
      
      {/* --- LOGIN POPUP BARRIER --- */}
      {!currentUser && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Lock size={32}/>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Member Access Only</h2>
                <p className="text-slate-500 mb-6 font-medium">Please login to view address, contact details, and occupancy rules.</p>
                <button 
                    onClick={() => navigate('/login', { state: { from: location } })}
                    className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
                >
                    Login / Sign Up
                </button>
            </div>
        </div>
      )}

      {/* --- FULL SCREEN LIGHTBOX --- */}
      {isFullScreen && currentUser && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200" onClick={() => setIsFullScreen(false)}>
           <button className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 p-2 rounded-full backdrop-blur-md transition-all hover:bg-white/20"><X size={32} /></button>
           <img src={images[activeImage]} alt="Full View" className="max-w-full max-h-[90vh] object-contain cursor-default shadow-2xl" onClick={(e) => e.stopPropagation()} />
           {images.length > 1 && (
             <>
               <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-4 rounded-full hover:bg-white/10 transition hidden md:block"><ChevronLeft size={48} /></button>
               <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-4 rounded-full hover:bg-white/10 transition hidden md:block"><ChevronRight size={48} /></button>
             </>
           )}
           <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 font-bold text-sm tracking-widest bg-black/50 px-4 py-1 rounded-full border border-white/10">{activeImage + 1} / {images.length}</div>
        </div>
      )}

      {/* --- MAIN CONTENT (Blurred if locked) --- */}
      <div className={!currentUser ? "blur-md pointer-events-none select-none h-screen overflow-hidden" : ""}>
          
          {/* Gallery */}
          <div className="bg-slate-900 pb-6 rounded-b-[2rem] shadow-2xl overflow-hidden relative">
            <div className="relative h-[45vh] md:h-[500px] group">
              <img 
                src={images[activeImage]} 
                alt="Room View" 
                onClick={() => setIsFullScreen(true)} 
                className="w-full h-full object-cover opacity-95 transition-all duration-300 cursor-zoom-in active:scale-[1.02]"
              />
              <div className="absolute top-0 left-0 right-0 p-4 flex justify-between pt-6 bg-gradient-to-b from-black/60 to-transparent z-10 pointer-events-none">
                <Link to="/" className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition shadow-lg pointer-events-auto"><ChevronLeft size={22}/></Link>
                <button onClick={handleShare} className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition shadow-lg pointer-events-auto"><Share2 size={20}/></button>
              </div>
              {images.length > 1 && (
                <>
                  <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white p-2.5 rounded-full backdrop-blur-sm transition z-10"><ChevronLeft size={24}/></button>
                  <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white p-2.5 rounded-full backdrop-blur-sm transition z-10"><ChevronRight size={24}/></button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="px-4 -mt-2 relative z-10">
                <div className="flex gap-3 overflow-x-auto pb-2 pt-4 scrollbar-hide snap-x">
                  {images.map((img, idx) => (
                    <button key={idx} onClick={() => setActiveImage(idx)} className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 snap-start ${activeImage === idx ? 'border-rose-500 scale-105 shadow-lg ring-2 ring-rose-500/30' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <img src={img} className="w-full h-full object-cover" alt="thumbnail" />
                    </button>
                  ))}
                </div>
                <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{activeImage + 1} of {images.length} Photos</p>
              </div>
            )}
          </div>

          <div className="px-6 py-8 max-w-2xl mx-auto">
            <div className="flex justify-between items-start mb-2">
              <h1 className="text-3xl font-black text-slate-900 leading-tight w-3/4">{room.info.title}</h1>
              <div className="bg-green-100 text-green-700 px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1 shadow-sm border border-green-200">
                {room.rating?.average} <Star size={12} fill="currentColor"/>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mb-8">
               <MapPin size={18} className="text-rose-500 shrink-0"/> 
               <p className="text-slate-600 text-sm font-bold">{room.info.location}</p>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide mb-8">
              <div className="flex items-center gap-3 bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100 whitespace-nowrap min-w-[140px]">
                <div className="bg-white p-2 rounded-full shadow-sm text-indigo-600"><Users size={18}/></div>
                <div><p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Tenant</p><p className="text-sm font-black text-slate-800">{room.rules.tenantType}</p></div>
              </div>
              <div className="flex items-center gap-3 bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 whitespace-nowrap min-w-[140px]">
                <div className="bg-white p-2 rounded-full shadow-sm text-emerald-600"><ShieldAlert size={18}/></div>
                <div><p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Status</p><p className="text-sm font-black text-slate-800">Verified</p></div>
              </div>
            </div>

            <div className="space-y-10">
              <div>
                <h3 className="font-extrabold text-slate-900 mb-3 text-lg">About this place</h3>
                <p className="text-slate-600 text-[15px] leading-relaxed font-medium whitespace-pre-line">{room.description || "No description provided."}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="bg-orange-50/80 p-5 rounded-3xl border border-orange-100">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="bg-white p-2 rounded-full text-orange-500 shadow-sm"><Users size={16}/></div>
                       <h4 className="font-extrabold text-orange-900 text-sm uppercase tracking-wider">Occupancy</h4>
                    </div>
                    <p className="text-orange-900 font-black text-lg pl-1">Max {room.rules.capacity} Person{room.rules.capacity > 1 ? 's' : ''}</p>
                 </div>
                 {room.rules.restrictions && room.rules.restrictions.length > 0 && (
                   <div className="bg-red-50/80 p-5 rounded-3xl border border-red-100">
                      <div className="flex items-center gap-3 mb-3">
                         <div className="bg-white p-2 rounded-full text-red-500 shadow-sm"><ShieldAlert size={16}/></div>
                         <h4 className="font-extrabold text-red-900 text-sm uppercase tracking-wider">House Rules</h4>
                      </div>
                      <ul className="space-y-2 pl-1">
                        {room.rules.restrictions.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm font-bold text-red-800/80 leading-tight">
                            <span className="text-red-400 text-[10px] mt-1">●</span> {rule}
                          </li>
                        ))}
                      </ul>
                   </div>
                 )}
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 mb-4 text-lg">Amenities</h3>
                <div className="grid grid-cols-2 gap-3">
                  {room.amenities.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <CheckCircle2 size={18} className="text-rose-500 shrink-0"/>
                      <span className="text-sm font-bold">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                 <h3 className="font-extrabold text-slate-900 mb-4 text-lg">Location</h3>
                 <div className="space-y-4">
                    {room.info.postalAddress && (
                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 flex gap-4 items-start">
                         <div className="bg-white p-3 rounded-full text-slate-500 shadow-sm border border-slate-100 mt-1"><MapPin size={20}/></div>
                         <div>
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Full Address</p>
                           <p className="text-sm font-bold text-slate-800 leading-relaxed select-text">{room.info.postalAddress}</p>
                         </div>
                      </div>
                    )}
                    {room.info.googleMapsLink && (
                      <a href={room.info.googleMapsLink} target="_blank" rel="noreferrer" className="block bg-blue-50/50 border border-blue-100 rounded-3xl p-5 flex items-center justify-between group hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="bg-blue-600 p-3 rounded-full text-white shadow-md shadow-blue-200"><MapPin size={20}/></div>
                          <div><p className="text-sm font-black text-slate-900">View on Google Maps</p><p className="text-xs text-slate-500 font-medium mt-0.5">Get Directions</p></div>
                        </div>
                        <div className="bg-white p-2 rounded-full text-blue-500 shadow-sm group-hover:translate-x-1 transition-transform"><ArrowRight size={20}/></div>
                      </a>
                    )}
                 </div>
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
              <div className="flex flex-col">
                {room.price.marketAmount > 0 && <span className="text-xs text-slate-400 line-through font-bold">₹{room.price.marketAmount}</span>}
                <div className="flex items-baseline gap-1"><span className="text-3xl font-black text-slate-900 leading-none">₹{room.price.amount}</span><span className="text-xs text-slate-500 font-bold">/mo</span></div>
              </div>
              <a href={`tel:${room.contact.phone}`} onClick={handleCall} className="flex-1 bg-gradient-to-r from-rose-600 to-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200 active:scale-95 transition-all">
                <Phone size={20}/> Contact Owner
              </a>
            </div>
          </div>
      </div>
    </div>
  );
}

// ... [Admin functions hidden for brevity but MUST BE KEPT] ...
function AdminEditor({ initialData, onCancel, onSave }) {
  const isEditing = !!initialData.id;
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(""); 
  
  const [formData, setFormData] = useState(() => {
    if (!isEditing) return { ...INITIAL_FORM_STATE };
    return {
      title: initialData.info?.title, location: initialData.info?.location, type: initialData.info?.type,
      price: initialData.price?.amount, marketPrice: initialData.price?.marketAmount,
      phone: initialData.contact?.phone, tenantType: initialData.rules?.tenantType,
      capacity: initialData.rules?.capacity, restrictions: initialData.rules?.restrictions?.join(', '),
      amenities: initialData.amenities?.join(', '), description: initialData.description,
      thumbnail: initialData.media?.thumbnail, gallery: initialData.media?.gallery || [],
      rating: initialData.rating?.average, ratingCount: initialData.rating?.count,
      googleMapsLink: initialData.info?.googleMapsLink, postalAddress: initialData.info?.postalAddress
    };
  });

  const handleUpload = async (e, type) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadStatus(`Uploading...`);
    
    for (const file of Array.from(files)) {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        data.append("cloud_name", CLOUDINARY_CLOUD_NAME);

        try {
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: "POST", body: data });
          const json = await res.json();
          if(json.secure_url) {
             if (type === 'thumbnail') setFormData(p => ({ ...p, thumbnail: json.secure_url }));
             else setFormData(p => ({ ...p, gallery: [...p.gallery, json.secure_url] }));
             setUploadStatus("✅ Success!");
          }
        } catch (err) { setUploadStatus("❌ Error"); }
    }
    setTimeout(() => setUploadStatus(""), 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const payload = {
      info: { title: formData.title, location: formData.location, type: formData.type, googleMapsLink: formData.googleMapsLink, postalAddress: formData.postalAddress },
      price: { amount: Number(formData.price), marketAmount: Number(formData.marketPrice) },
      media: { thumbnail: formData.thumbnail, gallery: formData.gallery },
      rules: { tenantType: formData.tenantType, capacity: Number(formData.capacity), restrictions: formData.restrictions.split(',').map(s=>s.trim()).filter(Boolean) },
      amenities: formData.amenities.split(',').map(s=>s.trim()).filter(Boolean),
      contact: { phone: formData.phone }, rating: { average: Number(formData.rating), count: Number(formData.ratingCount) },
      description: formData.description, status: initialData.status || 'available', createdAt: initialData.createdAt || Timestamp.now()
    };

    try {
      if (isEditing) await updateDoc(doc(db, "properties", initialData.id), payload);
      else await addDoc(collection(db, "properties"), payload);
      onSave();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border overflow-hidden max-w-4xl mx-auto my-8">
      <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
        <h2 className="text-2xl font-bold">{isEditing ? 'Edit' : 'Add'} Property</h2>
        <button onClick={onCancel}><X/></button>
      </div>
      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid md:grid-cols-2 gap-6">
          <input required className="w-full border p-3 rounded" placeholder="Title" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
          <input required className="w-full border p-3 rounded" placeholder="Short Location" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} />
          <input className="w-full border p-3 rounded" placeholder="Google Maps Link" value={formData.googleMapsLink} onChange={e=>setFormData({...formData, googleMapsLink: e.target.value})} />
          <select className="w-full border p-3 rounded" value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}><option>PG</option><option>Room</option><option>Flat</option></select>
        </div>
        
        <div className="border-2 border-dashed p-6 rounded bg-indigo-50">
           <div className="flex gap-4 mb-4">
             {formData.thumbnail && <img src={formData.thumbnail} className="w-20 h-20 rounded object-cover"/>}
             <input type="file" onChange={(e)=>handleUpload(e, 'thumbnail')} />
           </div>
           <div className="flex gap-2 flex-wrap">
             {formData.gallery.map((url, i) => <img key={i} src={url} className="w-20 h-20 rounded object-cover"/>)}
             <input type="file" multiple onChange={(e)=>handleUpload(e, 'gallery')} />
           </div>
           {uploadStatus && <p className="text-indigo-600 text-sm mt-2">{uploadStatus}</p>}
        </div>

        <div className="grid grid-cols-3 gap-6">
           <input type="number" className="border p-3 rounded" placeholder="Rent" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} required/>
           <input type="number" className="border p-3 rounded" placeholder="Market Price" value={formData.marketPrice} onChange={e=>setFormData({...formData, marketPrice: e.target.value})} />
           <input className="border p-3 rounded" placeholder="Phone" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} required/>
        </div>

        <div className="space-y-4 pt-6 border-t">
           <div className="grid grid-cols-2 gap-6">
              <select className="border p-3 rounded" value={formData.tenantType} onChange={e=>setFormData({...formData, tenantType: e.target.value})}><option>Boys Only</option><option>Girls Only</option><option>Family</option><option>Any</option></select>
              <input type="number" className="border p-3 rounded" placeholder="Capacity" value={formData.capacity} onChange={e=>setFormData({...formData, capacity: e.target.value})} />
           </div>
           <input className="w-full border p-3 rounded" placeholder="Amenities (comma sep)" value={formData.amenities} onChange={e=>setFormData({...formData, amenities: e.target.value})} />
           <input className="w-full border p-3 rounded" placeholder="Restrictions" value={formData.restrictions} onChange={e=>setFormData({...formData, restrictions: e.target.value})} />
           <textarea className="w-full border p-3 rounded h-32" placeholder="Description" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t">
          <button type="button" onClick={onCancel} className="px-6 py-3 rounded text-slate-600 hover:bg-slate-100">Cancel</button>
          <button type="submit" disabled={loading} className="px-8 py-3 bg-rose-600 text-white rounded hover:bg-rose-700">{loading ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}

function AdminDashboard({ onAdd, onEdit }) {
  const [rooms, setRooms] = useState([]);
  
  useEffect(() => {
    signInAnonymously(auth);
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleToggle = async (room) => {
    await updateDoc(doc(db, "properties", room.id), { status: room.status === 'booked' ? 'available' : 'booked' });
  };

  const handleDelete = async (id) => {
    if(window.confirm("Delete?")) await deleteDoc(doc(db, "properties", id));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Admin Dashboard</h1>
        <button onClick={onAdd} className="bg-rose-600 text-white px-6 py-3 rounded-lg font-bold flex gap-2 shadow-lg hover:bg-rose-700 transition"><Plus/> Add Room</button>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map(room => (
          <div key={room.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-lg transition-shadow">
            <div className="relative h-48 bg-slate-200 rounded-lg mb-4 overflow-hidden">
               {room.media?.thumbnail && <img src={room.media.thumbnail} className="w-full h-full object-cover"/>}
               <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${room.status === 'booked' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{room.status}</div>
            </div>
            <h3 className="font-bold text-lg mb-1">{room.info.title}</h3>
            <p className="text-sm text-slate-500 mb-4 truncate">{room.info.location}</p>
            <div className="flex gap-2">
               <button onClick={() => handleToggle(room)} className="flex-1 border p-2 rounded-lg text-xs font-bold hover:bg-slate-50">{room.status === 'booked' ? 'Set Available' : 'Set Booked'}</button>
               <button onClick={() => onEdit(room)} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"><Edit2 size={18}/></button>
               <button onClick={() => handleDelete(room.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={18}/></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPage() {
  const [editingRoom, setEditingRoom] = useState(null);
  return editingRoom ? (
    <AdminEditor initialData={editingRoom} onCancel={() => setEditingRoom(null)} onSave={() => setEditingRoom(null)} />
  ) : (
    <AdminDashboard onAdd={() => setEditingRoom({})} onEdit={setEditingRoom} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<UserHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/room/:id" element={<UserRoom />} /> 
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}