import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, Timestamp, getDoc 
} from "firebase/firestore";
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { 
  LayoutDashboard, Plus, Database, Eye, EyeOff, Edit2, Trash2, 
  ImageIcon, Save, X, UploadCloud, Loader2, Star, ShieldAlert,
  CheckCircle2, MapPin, DollarSign, Users, List, Phone, Share2, 
  ChevronLeft, ChevronRight, Home as HomeIcon, ArrowRight, LogOut, Lock,
  LayoutGrid
} from 'lucide-react';

// Use BOTH databases
import { db, auth, userDb } from './firebase'; 
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/auth/Login';

// ==========================================
// ⚙️ CONFIGURATION & UTILS
// ==========================================
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || "dvtye0dk9";
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || "to-let";

// TRACKING FUNCTION
const trackActivity = async (userId, action, details) => {
  if (!userId) return;
  try {
    await addDoc(collection(userDb, "user_activity"), {
      userId: userId,
      action: action, 
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
  totalUnits: 1, availableUnits: 1, 
  restrictions: 'No Smoking, No Drinking',
  amenities: 'WiFi, AC, RO Water',
  description: '', thumbnail: '', gallery: [],
  rating: 4.5, ratingCount: 10,
  googleMapsLink: '', postalAddress: ''
};

// ==========================================
// 1. USER COMPONENTS
// ==========================================

function RoomCard({ room }) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  
  const isBooked = room.status === 'booked' || (room.rules?.availableUnits === 0);
  const isMultiUnit = room.rules?.totalUnits > 1;
  const availableCount = room.rules?.availableUnits || 0;
  const totalCount = room.rules?.totalUnits || 1;

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
          <img 
            src={images[currentImgIndex] || 'https://via.placeholder.com/400'} 
            alt={room.info.title || "Property"} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          <div className="absolute top-3 left-3 flex gap-2">
             {isBooked ? (
                <span className="bg-red-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm">Sold Out</span>
             ) : (
                isMultiUnit ? (
                  <span className="bg-slate-900/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm flex items-center gap-1 border border-white/20">
                    <LayoutGrid size={12}/> {availableCount}/{totalCount} Rooms Left
                  </span>
                ) : (
                  <span className="bg-emerald-500/90 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm">Available</span>
                )
             )}
          </div>

          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 text-slate-900">
            <Star size={12} className="text-orange-500 fill-orange-500"/> {room.rating?.average || 'New'}
          </div>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <div className="mb-2">
            <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1">{room.info.title}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium truncate"><MapPin size={14} className="text-slate-400 shrink-0"/> {room.info.location}</p>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
             <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold flex items-center gap-1"><Users size={12}/> {room.rules.tenantType}</span>
             
             {isMultiUnit && !isBooked && (
               <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2 self-center">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(availableCount / totalCount) * 100}%` }}></div>
               </div>
             )}
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
    // 1. Query ALL properties (Ordered by Newest First)
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    
    const unsub = onSnapshot(q, (snap) => {
      const fetchedRooms = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // 2. Sort them: Available rooms go to TOP, Sold Out rooms go to BOTTOM
      fetchedRooms.sort((a, b) => {
         const countA = Array.isArray(a.rules?.availableRoomNumbers) ? a.rules.availableRoomNumbers.length : (a.rules?.availableUnits || 0);
         const countB = Array.isArray(b.rules?.availableRoomNumbers) ? b.rules.availableRoomNumbers.length : (b.rules?.availableUnits || 0);
         
         const soldOutA = a.status === 'booked' || countA === 0;
         const soldOutB = b.status === 'booked' || countB === 0;
         
         // If one is sold out and the other isn't, prioritize the available one
         if (soldOutA !== soldOutB) {
             return soldOutA - soldOutB;
         }
         
         // If both are available (or both sold out), keep the 'createdAt' order (Newest First)
         return 0; 
      });

      // 3. Set ALL rooms (I removed the .slice() here so everything shows up)
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
            <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">Rent<span className="text-rose-600">X</span></h1>
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
        {/* Grid Layout: Shows ALL rooms now */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
          {rooms.map(room => <RoomCard key={room.id} room={room} />)}
        </div>
      </div>
    </div>
  );
}
function UserRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth(); 
  
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
    if (currentUser) trackActivity(currentUser.id, "view_room", { roomId: id });
  }, [id, currentUser]);

  const images = room ? [room.media.thumbnail, ...(room.media.gallery || [])].filter(Boolean) : [];
  
  const isMultiUnit = room?.rules?.totalUnits > 1;
  const totalCount = room?.rules?.totalUnits || 1;
  
  // 🔴 FIX: Read the specific list of available room numbers
  const availableRoomNumbers = room?.rules?.availableRoomNumbers || [];
  // Fallback: If the list is empty (old data), use the count
  const availableCount = availableRoomNumbers.length > 0 ? availableRoomNumbers.length : (room?.rules?.availableUnits || 0);

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
    if (navigator.share && navigator.canShare(shareData)) { try { await navigator.share(shareData); return; } catch (err) {} }
    try { await navigator.clipboard.writeText(url); alert("Link Copied!"); } catch (err) { prompt("Copy:", url); }
  };

  const handleCall = () => { if (currentUser) trackActivity(currentUser.id, "click_call", { roomId: id, phone: room.contact.phone }); };
  const nextImage = (e) => { e?.stopPropagation(); setActiveImage((prev) => (prev + 1) % images.length); };
  const prevImage = (e) => { e?.stopPropagation(); setActiveImage((prev) => (prev - 1 + images.length) % images.length); };

  if(!room) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-rose-600 w-10 h-10"/></div>;

  return (
    <div className="bg-white min-h-screen pb-28 font-sans relative">
      
      {/* LOGIN BARRIER */}
      {!currentUser && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in duration-300">
                <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32}/></div>
                <h2 className="text-2xl font-black text-slate-900 mb-2">Member Access Only</h2>
                <p className="text-slate-500 mb-6 font-medium">Please login to view details.</p>
                <button onClick={() => navigate('/login', { state: { from: location } })} className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all active:scale-95 shadow-lg">Login / Sign Up</button>
            </div>
        </div>
      )}

      {/* FULLSCREEN LIGHTBOX */}
      {isFullScreen && currentUser && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200" onClick={() => setIsFullScreen(false)}>
           <button className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 p-2 rounded-full transition-all"><X size={32} /></button>
           <img src={images[activeImage]} alt="Full Screen View" className="max-w-full max-h-[90vh] object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
           {images.length > 1 && (
             <>
               <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-4 rounded-full hover:bg-white/10 transition hidden md:block"><ChevronLeft size={48} /></button>
               <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-4 rounded-full hover:bg-white/10 transition hidden md:block"><ChevronRight size={48} /></button>
             </>
           )}
           <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/60 font-bold text-sm tracking-widest bg-black/50 px-4 py-1 rounded-full border border-white/10">{activeImage + 1} / {images.length}</div>
        </div>
      )}

      {/* MAIN CONTENT (Blurred if locked) */}
      <div className={!currentUser ? "blur-md pointer-events-none select-none h-screen overflow-hidden" : ""}>
          {/* Gallery */}
          <div className="bg-slate-900 pb-6 rounded-b-[2rem] shadow-2xl overflow-hidden relative">
            <div className="relative h-[45vh] md:h-[500px] group">
              <img src={images[activeImage]} alt="Main Room View" onClick={() => setIsFullScreen(true)} className="w-full h-full object-cover opacity-95 transition-all duration-300 cursor-zoom-in active:scale-[1.02]"/>
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
                      <img src={img} className="w-full h-full object-cover" alt={`Thumbnail ${idx + 1}`} />
                    </button>
                  ))}
                </div>
                <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{activeImage + 1} of {images.length} Photos</p>
              </div>
            )}
          </div>

          <div className="px-6 py-8 max-w-2xl mx-auto">
            <div className="mb-8">
               <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">{room.info.title}</h1>
               <div className="flex items-center gap-2 text-slate-600 font-bold text-sm"><MapPin size={18} className="text-rose-500 shrink-0"/> {room.info.location}</div>
            </div>

            {/* --- MULTI-UNIT AVAILABILITY VISUALIZER --- */}
            {isMultiUnit && (
               <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 mb-8">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="font-extrabold text-slate-800 flex items-center gap-2"><LayoutGrid size={18} className="text-slate-400"/> Room Availability</h3>
                     <span className="text-xs font-bold bg-white border px-3 py-1 rounded-full text-slate-600">{availableCount} / {totalCount} Available</span>
                  </div>
                  
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-2">
                     {Array.from({ length: totalCount }).map((_, idx) => {
                        const roomNum = idx + 1;
                        
                        // 🔴 LOGIC FIX: Check if this specific room number is in the list
                        let isAvailable = false;
                        if (availableRoomNumbers.length > 0) {
                            isAvailable = availableRoomNumbers.includes(roomNum);
                        } else {
                            // Fallback for old data: assume first N rooms are taken? No, old logic assumed last N were available.
                            // We stick to the new logic primarily.
                            isAvailable = idx < availableCount; // Rough fallback
                        }

                        return (
                           <div key={idx} className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold border ${isAvailable ? 'bg-emerald-100 text-emerald-700 border-emerald-200 shadow-sm' : 'bg-slate-200 text-slate-400 border-transparent'}`}>
                              {roomNum}
                           </div>
                        )
                     })}
                  </div>
                  <div className="flex gap-4 mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     <span className="flex items-center gap-1"><div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded"></div> Available</span>
                     <span className="flex items-center gap-1"><div className="w-3 h-3 bg-slate-200 rounded"></div> Booked</span>
                  </div>
               </div>
            )}

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
                     <p className="text-orange-900 font-black text-lg pl-1">Max {room.rules.capacity} Person{room.rules.capacity > 1 ? 's' : ''} / Room</p>
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

// ==========================================
// 2. ADMIN INTERFACE
// ==========================================

function AdminEditor({ initialData, onCancel, onSave }) {
  const isEditing = !!initialData.id;
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(""); 
  
  const [formData, setFormData] = useState(() => {
    if (!isEditing) return { ...INITIAL_FORM_STATE };
    return {
      title: initialData.info?.title || '',
      location: initialData.info?.location || '', 
      type: initialData.info?.type || 'PG',
      price: initialData.price?.amount || '',
      marketPrice: initialData.price?.marketAmount || '',
      phone: initialData.contact?.phone || '',
      tenantType: initialData.rules?.tenantType || 'Boys Only',
      capacity: initialData.rules?.capacity || 1,
      totalUnits: initialData.rules?.totalUnits || 1, // Default 1
      availableUnits: initialData.rules?.availableUnits || 1, // Default 1
      restrictions: initialData.rules?.restrictions?.join(', ') || '',
      amenities: initialData.amenities?.join(', ') || '',
      description: initialData.description || '',
      thumbnail: initialData.media?.thumbnail || '',
      gallery: initialData.media?.gallery || [], 
      rating: initialData.rating?.average || 4.5,
      ratingCount: initialData.rating?.count || 0,
      googleMapsLink: initialData.info?.googleMapsLink || '',
      postalAddress: initialData.info?.postalAddress || ''
    };
  });

  const handleUpload = async (e, type) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadStatus(`Uploading to Cloudinary...`);
    
    const fileList = Array.from(files);
    
    for (const file of fileList) {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
        data.append("cloud_name", CLOUDINARY_CLOUD_NAME);

        try {
          const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
            method: "POST",
            body: data
          });

          const uploadImage = await res.json();
          
          if(uploadImage.secure_url) {
             if (type === 'thumbnail') {
                 setFormData(prev => ({ ...prev, thumbnail: uploadImage.secure_url }));
             } else {
                 setFormData(prev => ({ ...prev, gallery: [...prev.gallery, uploadImage.secure_url] }));
             }
             setUploadStatus("✅ Success!");
          } else {
             console.error(uploadImage);
             throw new Error("Cloudinary rejected the file");
          }

        } catch (err) {
          console.error(err);
          setUploadStatus("❌ Failed.");
          alert("Upload Failed. Check console for details.");
        }
    }
    setTimeout(() => setUploadStatus(""), 3000);
  };

  const removeGalleryImage = (indexToRemove) => {
      setFormData(prev => ({
          ...prev,
          gallery: prev.gallery.filter((_, index) => index !== indexToRemove)
      }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      info: { 
          title: formData.title, 
          location: formData.location, 
          type: formData.type,
          googleMapsLink: formData.googleMapsLink,
          postalAddress: formData.postalAddress
      },
      price: { amount: Number(formData.price), marketAmount: Number(formData.marketPrice) },
      media: { thumbnail: formData.thumbnail, gallery: formData.gallery },
      rules: { 
        tenantType: formData.tenantType, 
        capacity: Number(formData.capacity), 
        totalUnits: Number(formData.totalUnits),
        availableUnits: Number(formData.availableUnits),
        restrictions: formData.restrictions.toString().split(',').map(s=>s.trim()).filter(Boolean) 
      },
      amenities: formData.amenities.toString().split(',').map(s=>s.trim()).filter(Boolean),
      contact: { phone: formData.phone },
      rating: { average: Number(formData.rating), count: Number(formData.ratingCount) },
      description: formData.description,
      status: initialData.status || 'available',
      createdAt: initialData.createdAt || Timestamp.now()
    };

    try {
      if (isEditing) await updateDoc(doc(db, "properties", initialData.id), payload);
      else await addDoc(collection(db, "properties"), payload);
      onSave();
    } catch (err) { alert(err.message); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-w-4xl mx-auto my-8">
      <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            {isEditing ? <Edit2 size={24}/> : <Plus size={24}/>} 
            {isEditing ? 'Edit Property Details' : 'Add New Property'}
          </h2>
          <p className="text-slate-400 text-sm mt-1">Control Panel: Manage details & photos</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-slate-700 rounded-full transition"><X size={24}/></button>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Property Title</label>
             <input required className="w-full border-2 border-slate-200 p-3 rounded-lg text-lg font-medium focus:border-rose-500 outline-none" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} />
          </div>
          
          <div className="md:col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-4">
              <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <MapPin size={16} /> Precise Location Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Area (Short)</label>
                      <input required className="w-full border-2 border-white p-3 rounded-lg outline-none" placeholder="e.g. Jia Sarai, Near IIT" value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Google Maps Link</label>
                      <input className="w-full border-2 border-white p-3 rounded-lg outline-none" placeholder="https://maps.app.goo.gl/..." value={formData.googleMapsLink} onChange={e=>setFormData({...formData, googleMapsLink: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Postal Address</label>
                      <textarea className="w-full border-2 border-white p-3 rounded-lg h-20 resize-none outline-none" placeholder="House No, Floor, Street, Landmark, Pin Code" value={formData.postalAddress} onChange={e=>setFormData({...formData, postalAddress: e.target.value})} />
                  </div>
              </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Type</label>
             <select className="w-full border-2 border-slate-200 p-3 rounded-lg bg-white" value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}>
               <option>PG</option><option>Room</option><option>Flat</option>
             </select>
          </div>
        </div>

        <div className="bg-indigo-50 p-6 rounded-xl border-2 border-dashed border-indigo-200">
           <h3 className="text-sm font-bold text-indigo-900 mb-4 flex items-center gap-2">
             <UploadCloud size={18} /> Photos (Cloudinary Hosting)
             {uploadStatus && <span className="ml-auto text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full animate-pulse">{uploadStatus}</span>}
           </h3>
           
           <div className="space-y-6">
             <div className="flex items-start gap-4">
               <div className="w-24 h-24 bg-white rounded-lg border-2 flex items-center justify-center overflow-hidden shrink-0 relative">
                 {formData.thumbnail ? <img src={formData.thumbnail} className="w-full h-full object-cover" alt="thumb"/> : <ImageIcon className="text-slate-300 h-8 w-8"/>}
               </div>
               <div>
                 <p className="text-xs font-bold text-slate-500 mb-1">Main Thumbnail</p>
                 <input type="file" onChange={(e) => handleUpload(e, 'thumbnail')} className="text-xs file:mr-2 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer" />
                 <p className="text-[10px] text-slate-400 mt-2">Required. Shows on the card.</p>
               </div>
             </div>

             <div className="h-px bg-indigo-200 w-full"></div>

             <div>
               <div className="flex justify-between items-center mb-2">
                   <p className="text-xs font-bold text-slate-500">Gallery Images ({formData.gallery.length})</p>
                   <label className="cursor-pointer bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full hover:bg-indigo-700 transition flex items-center gap-1">
                       <Plus size={14}/> Add Images
                       <input type="file" multiple onChange={(e) => handleUpload(e, 'gallery')} className="hidden" />
                   </label>
               </div>
               
               <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                   {formData.gallery.map((imgUrl, index) => (
                       <div key={index} className="relative aspect-square bg-white rounded-lg border overflow-hidden group">
                           <img src={imgUrl} className="w-full h-full object-cover" alt={`gallery-${index}`} />
                           <button 
                               type="button"
                               onClick={() => removeGalleryImage(index)}
                               className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-red-700"
                               title="Remove Image"
                           >
                               <X size={12} />
                           </button>
                       </div>
                   ))}
                   {formData.gallery.length === 0 && (
                       <div className="col-span-3 text-xs text-slate-400 italic py-4">No gallery images uploaded yet.</div>
                   )}
               </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
           <div className="col-span-2">
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Monthly Rent (₹)</label>
             <div className="flex items-center border-2 border-slate-200 rounded-lg px-3">
               <span className="text-slate-400 font-bold">₹</span>
               <input required type="number" className="w-full p-3 outline-none font-bold text-slate-800" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} />
             </div>
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rating (1-5)</label>
             <input type="number" step="0.1" max="5" className="w-full border-2 border-slate-200 p-3 rounded-lg" value={formData.rating} onChange={e=>setFormData({...formData, rating: e.target.value})} />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Review Count</label>
             <input type="number" className="w-full border-2 border-slate-200 p-3 rounded-lg" value={formData.ratingCount} onChange={e=>setFormData({...formData, ratingCount: e.target.value})} />
           </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-slate-100">
           <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><ShieldAlert size={18}/> House Rules & Amenities</h3>
           <div className="grid grid-cols-2 gap-6">
             <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tenant Type</label>
                 <select className="w-full border-2 border-slate-200 p-3 rounded-lg bg-white" value={formData.tenantType} onChange={e=>setFormData({...formData, tenantType: e.target.value})}>
                   <option>Boys Only</option><option>Girls Only</option><option>Family</option><option>Any</option>
                 </select>
             </div>
             <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Capacity</label>
                 <input type="number" className="w-full border-2 border-slate-200 p-3 rounded-lg" value={formData.capacity} onChange={e=>setFormData({...formData, capacity: e.target.value})} />
             </div>
           </div>

           {/* NEW: Multi-Unit Controls */}
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3">Room Inventory (Hostel Mode)</h3>
              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="text-xs font-bold text-slate-400">Total Rooms</label>
                    <input type="number" className="w-full border p-2 rounded mt-1 bg-white" value={formData.totalUnits} onChange={e=>setFormData({...formData, totalUnits: e.target.value})} />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400">Available Now</label>
                    <input type="number" className="w-full border p-2 rounded mt-1 bg-white" value={formData.availableUnits} onChange={e=>setFormData({...formData, availableUnits: e.target.value})} />
                 </div>
              </div>
           </div>

           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Amenities</label>
             <input className="w-full border-2 border-slate-200 p-3 rounded-lg" placeholder="WiFi, AC, Geyser..." value={formData.amenities} onChange={e=>setFormData({...formData, amenities: e.target.value})} />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Restrictions</label>
             <input className="w-full border-2 border-slate-200 p-3 rounded-lg" placeholder="No Drinking..." value={formData.restrictions} onChange={e=>setFormData({...formData, restrictions: e.target.value})} />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Owner Phone</label>
             <input required className="w-full border-2 border-slate-200 p-3 rounded-lg" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
           </div>
           <div>
             <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Full Description</label>
             <textarea className="w-full border-2 border-slate-200 p-3 rounded-lg h-32 resize-none" value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} />
           </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
          <button type="button" onClick={onCancel} className="px-6 py-3 rounded-lg text-slate-600 font-bold hover:bg-slate-100 transition">Cancel</button>
          <button type="submit" disabled={loading} className="px-8 py-3 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 shadow-lg shadow-rose-200 transition flex items-center gap-2 disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin"/> : <Save size={20}/>}
            {loading ? 'Saving...' : 'Publish Property'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// COMPONENT 2: THE DASHBOARD (Inventory)
// ==========================================
function Dashboard({ onAdd, onEdit }) {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => { if (!u) signInAnonymously(auth); });
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsubData = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => { unsubAuth(); unsubData(); };
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("⚠️ Are you sure? This cannot be undone.")) return;
    try { await deleteDoc(doc(db, "properties", id)); } catch (e) { alert(e); }
  };

  const handleToggle = async (room) => {
    const newStatus = room.status === 'booked' ? 'available' : 'booked';
    await updateDoc(doc(db, "properties", room.id), { status: newStatus });
  };

  if (loading) return <div className="h-screen flex items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-lg flex justify-between items-center">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="text-rose-500" />
          <div><h1 className="text-xl font-bold">Admin Panel</h1><p className="text-[10px] text-slate-400">Jia Sarai Management System</p></div>
        </div>
        <div className="bg-slate-800 px-3 py-1 rounded text-xs font-mono">{rooms.length} Units</div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <div className="flex justify-between items-end mb-6">
          <div><h2 className="text-2xl font-bold text-slate-800">Property Inventory</h2><p className="text-slate-500 text-sm">Manage listings, edit details, and track status.</p></div>
          <button onClick={onAdd} className="bg-rose-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition flex items-center gap-2"><Plus size={20}/> Add New Room</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map(room => (
            <div key={room.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${room.status === 'booked' ? 'border-slate-200 opacity-75' : 'border-slate-200'}`}>
              <div className="relative h-48 bg-slate-200 group cursor-pointer" onClick={() => onEdit(room)}>
                {room.media?.thumbnail ? <img src={room.media.thumbnail} alt={room.info.title} className={`w-full h-full object-cover transition ${room.status === 'booked' ? 'grayscale' : ''}`} /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={32}/></div>}
                <div className={`absolute top-3 right-3 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${room.status === 'booked' ? 'bg-slate-800 text-white' : 'bg-green-500 text-white shadow-sm'}`}>{room.status === 'booked' ? 'Sold Out' : 'Live'}</div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center"><span className="text-white font-bold border-2 border-white px-4 py-2 rounded-lg flex items-center gap-2"><Edit2 size={16}/> Edit Details</span></div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-slate-900 line-clamp-1 text-lg">{room.info?.title}</h3></div>
                
                {/* SHOW UNIT COUNT IN DASHBOARD */}
                {room.rules?.totalUnits > 1 && (
                   <p className="text-xs font-bold text-slate-500 mb-2 bg-slate-100 inline-block px-2 py-1 rounded border border-slate-200">
                      Inv: {room.rules.availableUnits} / {room.rules.totalUnits} Units
                   </p>
                )}

                <div className="flex items-center gap-2 text-xs text-slate-500 mb-4"><MapPin size={14}/> {room.info?.location}</div>
                <div className="flex gap-2 mb-4">
                  <div className="bg-slate-50 px-2 py-1 rounded text-xs font-bold text-slate-600 flex items-center gap-1 border border-slate-200"><DollarSign size={12}/> {room.price?.amount}</div>
                  <div className="bg-slate-50 px-2 py-1 rounded text-xs font-bold text-slate-600 flex items-center gap-1 border border-slate-200"><Users size={12}/> {room.rules?.tenantType}</div>
                  <div className="bg-slate-50 px-2 py-1 rounded text-xs font-bold text-slate-600 flex items-center gap-1 border border-slate-200 ml-auto"><Star size={12} className="text-orange-400 fill-orange-400"/> {room.rating?.average || 4.5}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                  <button onClick={() => handleToggle(room)} className={`py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition ${room.status === 'booked' ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{room.status === 'booked' ? <Eye size={14}/> : <EyeOff size={14}/>} {room.status === 'booked' ? 'Activate' : 'Mark Sold'}</button>
                  <button onClick={() => handleDelete(room.id)} className="py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center justify-center gap-2"><Trash2 size={14}/> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MASTER APP
// ==========================================
export default function App() {
  const [editingRoom, setEditingRoom] = useState(null); 
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<UserHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/room/:id" element={<UserRoom />} /> 
          
          {/* ADMIN ROUTES INTEGRATED */}
          <Route path="/admin" element={
             editingRoom ? (
                <AdminEditor initialData={editingRoom} onCancel={() => setEditingRoom(null)} onSave={() => setEditingRoom(null)} />
             ) : (
                <Dashboard onAdd={() => setEditingRoom({})} onEdit={(room) => setEditingRoom(room)} />
             )
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
