import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams } from 'react-router-dom';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, 
  onSnapshot, query, orderBy, Timestamp, getDoc 
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { 
  LayoutDashboard, Plus, Edit2, Trash2, 
  Star, ShieldAlert, CheckCircle2, MapPin, 
  Users, Phone, Share2, ChevronLeft, ChevronRight, 
  Home as HomeIcon, ArrowRight, X, Loader2
} from 'lucide-react';

import { db, auth } from './firebase'; 

// ==========================================
// ⚙️ CONFIGURATION
// ==========================================
const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME; 
const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

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
// 1. USER INTERFACE COMPONENTS
// ==========================================

// --- COMPONENT: PREMIUM ROOM CARD (Auto-Slideshow on Hover) ---
function RoomCard({ room }) {
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const isBooked = room.status === 'booked';

  // Combine thumbnail and gallery into one list
  const images = [room.media?.thumbnail, ...(room.media?.gallery || [])].filter(Boolean);

  useEffect(() => {
    let interval;
    if (isHovering && images.length > 1) {
      // Auto slide every 5 seconds (5000ms) as requested
      interval = setInterval(() => {
        setCurrentImgIndex((prev) => (prev + 1) % images.length);
      }, 2000); 
    } else {
      // Reset to main thumbnail when not hovering
      setCurrentImgIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovering, images.length]);

  return (
    <Link 
      to={`/room/${room.id}`} 
      className="block group mb-8"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 ${isBooked ? 'opacity-80 grayscale' : ''}`}>
        
        {/* Image Section */}
        <div className="relative h-64 bg-slate-200 overflow-hidden">
          <img 
            src={images[currentImgIndex] || 'https://via.placeholder.com/400'} 
            alt={room.info.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          {/* Progress Indicator (Shows which image is active during hover) */}
          {isHovering && images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10">
               {images.map((_, idx) => (
                 <div 
                   key={idx} 
                   className={`h-1 rounded-full transition-all duration-300 ${idx === currentImgIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/50'}`} 
                 />
               ))}
            </div>
          )}

          {/* Rating Badge */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1 text-slate-900">
            <Star size={12} className="text-orange-500 fill-orange-500"/> {room.rating?.average || 'New'}
          </div>

          {/* Sold Out Overlay */}
          {isBooked && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-600 text-white px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg border border-white/20">Sold Out</span>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="p-5">
          <div className="mb-3">
            <h3 className="font-bold text-slate-900 text-lg leading-tight truncate">{room.info.title}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1.5 truncate font-medium">
              <MapPin size={14} className="text-rose-500 shrink-0"/> {room.info.location}
            </p>
          </div>

          <div className="flex items-center gap-2 mb-4">
             <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 border border-indigo-100">
               <Users size={12}/> {room.rules.tenantType}
             </span>
             <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 border border-emerald-100">
               <CheckCircle2 size={12}/> Verified
             </span>
          </div>

          <div className="flex items-end justify-between border-t border-dashed border-slate-100 pt-4">
            <div>
              {room.price.marketAmount > 0 && <p className="text-xs text-slate-400 line-through font-medium">₹{room.price.marketAmount}</p>}
              <div className="flex items-baseline gap-1">
                <p className="text-2xl font-black text-slate-900">₹{room.price.amount}</p>
                <span className="text-xs text-slate-500 font-bold">/mo</span>
              </div>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors">View Details</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// --- PAGE: USER HOME (Feed) ---
// --- PAGE: USER HOME (Responsive Grid Feed) ---
// --- PAGE: USER HOME (Responsive Grid Feed) ---
function UserHome() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if(loading) return <div className="h-screen flex items-center justify-center text-rose-600"><Loader2 className="animate-spin w-8 h-8"/></div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-rose-600 p-1.5 rounded-lg text-white">
              <HomeIcon size={20} strokeWidth={3}/>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">STAY<span className="text-rose-600">SARAI</span></h1>
            </div>
          </div>
          {/* Host Login Link Removed Here */}
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* The Grid: 1 col mobile, 2 col tablet, 3 col laptop, 4 col desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-8">
          {rooms.map(room => <RoomCard key={room.id} room={room} />)}
        </div>
      </div>
    </div>
  );
}

// --- PAGE: ROOM DETAILS (Amazon Style Gallery) ---
function UserRoom() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    window.scrollTo(0,0);
    const fetchRoom = async () => {
      const snap = await getDoc(doc(db, "properties", id));
      if(snap.exists()) setRoom({ id: snap.id, ...snap.data() });
    };
    fetchRoom();
  }, [id]);

  if(!room) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-rose-600 w-10 h-10"/></div>;

  const images = [room.media.thumbnail, ...(room.media.gallery || [])].filter(Boolean);

  const nextImage = () => setActiveImage((prev) => (prev + 1) % images.length);
  const prevImage = () => setActiveImage((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="bg-white min-h-screen pb-28 font-sans">
      
      {/* --- PREMIUM GALLERY SECTION --- */}
      <div className="bg-slate-900 pb-6 rounded-b-[2rem] shadow-2xl overflow-hidden relative">
        
        {/* Main Large Image */}
        <div className="relative h-[45vh] md:h-[500px] group">
          <img 
            src={images[activeImage]} 
            alt="Room View" 
            className="w-full h-full object-cover opacity-95 transition-all duration-300"
          />
          {/* Top Navbar Overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between pt-6 bg-gradient-to-b from-black/60 to-transparent z-10">
            <Link to="/" className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition shadow-lg"><ChevronLeft size={22}/></Link>
            <button className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/30 transition shadow-lg"><Share2 size={20}/></button>
          </div>

          {/* Left/Right Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white p-2.5 rounded-full backdrop-blur-sm transition z-10"><ChevronLeft size={24}/></button>
              <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/20 hover:bg-black/50 text-white p-2.5 rounded-full backdrop-blur-sm transition z-10"><ChevronRight size={24}/></button>
            </>
          )}
        </div>

        {/* Thumbnail Strip (Amazon Style) */}
        {images.length > 1 && (
          <div className="px-4 -mt-2 relative z-10">
            <div className="flex gap-3 overflow-x-auto pb-2 pt-4 scrollbar-hide snap-x">
              {images.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 snap-start ${activeImage === idx ? 'border-rose-500 scale-105 shadow-lg ring-2 ring-rose-500/30' : 'border-transparent opacity-60 hover:opacity-100'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="thumbnail" />
                </button>
              ))}
            </div>
            <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">{activeImage + 1} of {images.length} Photos</p>
          </div>
        )}
      </div>

      {/* --- CONTENT SECTION --- */}
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

        {/* Feature Pills */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide mb-8">
          <div className="flex items-center gap-3 bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100 whitespace-nowrap min-w-[140px]">
            <div className="bg-white p-2 rounded-full shadow-sm text-indigo-600"><Users size={18}/></div>
            <div>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Tenant</p>
              <p className="text-sm font-black text-slate-800">{room.rules.tenantType}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 whitespace-nowrap min-w-[140px]">
            <div className="bg-white p-2 rounded-full shadow-sm text-emerald-600"><ShieldAlert size={18}/></div>
            <div>
              <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Status</p>
              <p className="text-sm font-black text-slate-800">Verified</p>
            </div>
          </div>
        </div>

        {/* Info Blocks */}
        <div className="space-y-10">
          <div>
            <h3 className="font-extrabold text-slate-900 mb-3 text-lg">About this place</h3>
            <p className="text-slate-600 text-[15px] leading-relaxed font-medium">{room.description || "No description provided."}</p>
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

          {room.info.googleMapsLink && (
            <div>
               <h3 className="font-extrabold text-slate-900 mb-4 text-lg">Location</h3>
               <a href={room.info.googleMapsLink} target="_blank" rel="noreferrer" className="block bg-blue-50/50 border border-blue-100 rounded-3xl p-5 flex items-center justify-between group hover:border-blue-300 transition-colors">
                 <div className="flex items-center gap-4">
                   <div className="bg-white p-3.5 rounded-full text-blue-600 shadow-sm border border-blue-50"><MapPin size={24}/></div>
                   <div>
                     <p className="text-sm font-black text-slate-800">Open in Google Maps</p>
                     <p className="text-xs text-slate-500 font-medium truncate w-56 mt-0.5">{room.info.postalAddress || room.info.location}</p>
                   </div>
                 </div>
                 <div className="bg-white p-2 rounded-full text-blue-400 shadow-sm group-hover:translate-x-1 transition-transform">
                    <ArrowRight size={20}/>
                 </div>
               </a>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
          <div className="flex flex-col">
            {room.price.marketAmount > 0 && <span className="text-xs text-slate-400 line-through font-bold">₹{room.price.marketAmount}</span>}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900 leading-none">₹{room.price.amount}</span>
              <span className="text-xs text-slate-500 font-bold">/mo</span>
            </div>
          </div>
          <a href={`tel:${room.contact.phone}`} className="flex-1 bg-gradient-to-r from-rose-600 to-orange-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200 active:scale-95 transition-all">
            <Phone size={20}/> Contact Owner
          </a>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// 2. ADMIN INTERFACE COMPONENTS
// ==========================================

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

// ==========================================
// 3. MASTER ROUTER
// ==========================================
export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserHome />} />
        <Route path="/room/:id" element={<UserRoom />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </Router>
  );
}