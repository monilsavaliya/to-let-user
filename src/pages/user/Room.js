import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { 
  ChevronLeft, MapPin, Star, Share2, ShieldCheck, 
  Users, Phone, CheckCircle2, ChevronRight, Navigation,
  Info, Check, AlertCircle, Home
} from 'lucide-react';

export default function Room() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [showShareToast, setShowShareToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Ref for the thumbnail strip to auto-scroll
  const scrollRef = useRef(null);

  useEffect(() => {
    // Scroll to top on load
    window.scrollTo(0, 0);
    const fetchRoom = async () => {
      try {
        const docRef = doc(db, "properties", id);
        const snap = await getDoc(docRef);
        if(snap.exists()) setRoom({ id: snap.id, ...snap.data() });
      } catch (error) {
        console.error("Error fetching room:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoom();
  }, [id]);

  // --- ROBUST SHARE FUNCTION ---
  const handleShare = async () => {
    const url = window.location.href;
    const shareData = {
      title: room.info.title,
      text: `Check out this amazing room in ${room.info.location} on StaySarai!`,
      url: url,
    };

    // 1. Try Native Mobile Share
    if (navigator.share && navigator.canShare(shareData)) {
      try { await navigator.share(shareData); return; } 
      catch (err) { console.log("Native share cancelled"); }
    }

    // 2. Fallback: Copy to Clipboard
    try {
      await navigator.clipboard.writeText(url);
      setToastMessage('Link Copied to Clipboard!');
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2500);
    } catch (err) {
      // 3. Last Resort: Manual Prompt
      window.prompt("Copy this link to share:", url);
    }
  };

  if(loading) return (
    <div className="h-screen bg-slate-50 flex items-center justify-center flex-col gap-4 text-rose-600">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      <p className="font-bold text-slate-500 animate-pulse">Loading Experience...</p>
    </div>
  );
  
  if(!room) return <div className="h-screen flex items-center justify-center text-slate-500 font-bold text-lg">Property Not Found</div>;

  // Combine thumbnail + gallery into one array
  const images = [room.media.thumbnail, ...(room.media.gallery || [])].filter(Boolean);
  const hasMultipleImages = images.length > 1;

  const nextImage = () => {
    const newIndex = (activeImageIndex + 1) % images.length;
    setActiveImageIndex(newIndex);
    // Auto scroll thumbnail strip
    if(scrollRef.current) {
        const thumbWidth = 80; // approx width of thumb
        scrollRef.current.scrollLeft = newIndex * thumbWidth;
    }
  };
  
  const prevImage = () => {
    const newIndex = (activeImageIndex - 1 + images.length) % images.length;
    setActiveImageIndex(newIndex);
    if(scrollRef.current) {
        const thumbWidth = 80;
        scrollRef.current.scrollLeft = newIndex * thumbWidth;
    }
  };

  const formattedPrice = new Intl.NumberFormat('en-IN').format(room.price.amount);

  return (
    <div className="bg-slate-100 min-h-screen pb-[140px] font-sans selection:bg-rose-100 selection:text-rose-700">
      
      {/* ==============================================
          1. HERO IMAGE GALLERY & THUMBNAILS
         ============================================== */}
      <div className="bg-slate-900 pb-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
        
        {/* Main Image Slider */}
        <div className="relative h-[45vh] md:h-[500px] group">
          <img 
            key={activeImageIndex}
            src={images[activeImageIndex]} 
            alt={`View ${activeImageIndex + 1}`} 
            className="w-full h-full object-cover opacity-95 transition-all duration-500 animate-fadeIn"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none"/>

          {/* Navigation Arrows */}
          {hasMultipleImages && (
            <>
              <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 text-white p-3 rounded-full hover:bg-black/60 backdrop-blur-md transition-all z-20 opacity-0 group-hover:opacity-100 active:scale-95"><ChevronLeft size={24}/></button>
              <button onClick={nextImage} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 text-white p-3 rounded-full hover:bg-black/60 backdrop-blur-md transition-all z-20 opacity-0 group-hover:opacity-100 active:scale-95"><ChevronRight size={24}/></button>
            </>
          )}

          {/* Top Navbar Overlay */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start pt-6 z-30">
            <Link to="/" className="p-3 bg-white/20 backdrop-blur-xl rounded-full text-white hover:bg-white/40 transition shadow-lg active:scale-95 border border-white/10">
              <ChevronLeft size={24} strokeWidth={2.5}/>
            </Link>
            <button onClick={handleShare} className="p-3 bg-white/20 backdrop-blur-xl rounded-full text-white hover:bg-white/40 transition shadow-lg active:scale-95 border border-white/10">
              <Share2 size={22} strokeWidth={2.5}/>
            </button>
          </div>
        </div>

        {/* Thumbnail Strip (Only if multiple images) */}
        {hasMultipleImages && (
          <div className="px-4 mt-4">
             <div 
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
             >
                {images.map((img, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-300 snap-start ${activeImageIndex === idx ? 'border-rose-500 scale-105 shadow-lg ring-2 ring-rose-500/30' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="thumbnail" />
                  </button>
                ))}
             </div>
             <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">
               {activeImageIndex + 1} of {images.length} Photos
             </p>
          </div>
        )}
      </div>

      {/* Share Toast Notification */}
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-slate-800 text-white px-6 py-3 rounded-full text-sm font-bold flex items-center gap-3 shadow-2xl transition-all duration-500 ${showShareToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8 pointer-events-none'}`}>
          <CheckCircle2 size={20} className="text-emerald-400"/> {toastMessage}
      </div>

      {/* ==============================================
          2. MAIN CONTENT DETAILS
         ============================================== */}
      <div className="max-w-3xl mx-auto px-4 -mt-6 relative z-10">
        <div className="bg-white rounded-[2.5rem] shadow-xl p-6 md:p-10 min-h-screen border border-slate-100/50">
          
          {/* Header Title & Rating */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight">{room.info.title}</h1>
            <div className="flex items-center gap-2 bg-slate-50 py-2 px-4 rounded-full border border-slate-100 shadow-sm self-start">
               <Star size={18} className="text-amber-500 fill-amber-500"/>
               <span className="text-base font-extrabold text-slate-800">{room.rating?.average || 'New'}</span>
               <span className="text-xs font-bold text-slate-400 border-l border-slate-200 pl-2 ml-1">
                 {room.rating?.count || 0} reviews
               </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-8">
             <MapPin size={20} className="text-rose-500 shrink-0"/> 
             <p className="text-slate-600 text-sm md:text-base font-semibold">{room.info.location}</p>
          </div>

          {/* Premium Badges */}
          <div className="flex flex-wrap gap-4 mb-10 pb-6 border-b border-dashed border-slate-200">
            <div className="flex items-center gap-3 bg-indigo-50 px-5 py-3 rounded-2xl border border-indigo-100/50 flex-1 min-w-[160px]">
              <div className="bg-white p-2.5 rounded-full text-indigo-600 shadow-sm"><Users size={20}/></div>
              <div>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Tenant</p>
                <p className="text-sm font-black text-slate-800">{room.rules.tenantType}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100/50 flex-1 min-w-[160px]">
              <div className="bg-white p-2.5 rounded-full text-emerald-600 shadow-sm"><ShieldCheck size={20}/></div>
              <div>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Status</p>
                <p className="text-sm font-black text-slate-800">Verified Property</p>
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="mb-12">
            <h3 className="font-extrabold text-slate-900 mb-4 text-lg flex items-center gap-2">
              <Info size={20} className="text-slate-400"/> About this space
            </h3>
            <p className="text-slate-600 text-[15px] leading-7 whitespace-pre-wrap font-medium">
              {room.description || "No specific description provided by the host."}
            </p>
          </div>

          {/* Amenities Grid */}
          <div className="mb-12">
            <h3 className="font-extrabold text-slate-900 mb-5 text-lg flex items-center gap-2">
              <CheckCircle2 size={20} className="text-slate-400"/> What this place offers
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {room.amenities.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div className="bg-white p-1.5 rounded-full shadow-sm">
                    <Check size={14} className="text-rose-500" strokeWidth={3}/>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* House Rules Section */}
          {room.rules.restrictions.length > 0 && (
            <div className="bg-orange-50/50 p-6 md:p-8 rounded-[2rem] mb-12 border border-orange-100">
               <h3 className="font-extrabold text-slate-800 mb-6 text-lg flex items-center gap-2">
                 <AlertCircle size={20} className="text-orange-500"/> House Rules
               </h3>
               <ul className="space-y-4">
                 {room.rules.restrictions.map((r,i) => (
                   <li key={i} className="flex items-start gap-4 text-sm text-slate-700 font-medium">
                     <span className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 shrink-0 shadow-sm shadow-orange-200"></span>
                     <span className="leading-relaxed">{r}</span>
                   </li>
                 ))}
               </ul>
            </div>
          )}

           {/* Location Visual Block */}
           {room.info.googleMapsLink && (
            <div className="mb-8">
               <h3 className="font-extrabold text-slate-900 mb-5 text-lg flex items-center gap-2">
                 <MapPin size={20} className="text-slate-400"/> Location
               </h3>
               <a 
                 href={room.info.googleMapsLink} 
                 target="_blank" 
                 rel="noreferrer"
                 className="block group relative h-48 rounded-3xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-lg transition-all"
               >
                 {/* Decorative Map Background Pattern */}
                 <div className="absolute inset-0 bg-[#e5e7eb] opacity-50 bg-[url('https://www.transparenttextures.com/patterns/map-cube.png')]"></div>
                 
                 <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-slate-100/90 to-transparent">
                    <div className="bg-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border border-slate-100 group-hover:scale-105 transition-transform">
                        <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                          <Navigation size={20} fill="currentColor" className="text-blue-500"/>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tap to open</p>
                          <p className="text-sm font-black text-slate-800">Google Maps</p>
                        </div>
                    </div>
                 </div>
               </a>
               <p className="text-xs text-slate-400 font-bold mt-3 ml-2 uppercase tracking-widest">{room.info.location}</p>
            </div>
          )}

        </div>
      </div>

      {/* ==============================================
          3. PREMIUM STICKY FOOTER
         ============================================== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 md:px-8 md:py-5 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-50 supports-[backdrop-filter]:bg-white/80">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-6">
          
          {/* Price Info */}
          <div className="flex flex-col shrink-0">
            {room.price.marketAmount > 0 && (
                <span className="text-xs text-slate-400 line-through font-bold ml-1">₹{new Intl.NumberFormat('en-IN').format(room.price.marketAmount)}</span>
            )}
            <div className="flex items-baseline gap-1">
               <span className="text-3xl font-black text-slate-900 leading-none tracking-tight">₹{formattedPrice}</span>
               <span className="text-xs text-slate-500 font-bold">/mo</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-1 justify-end max-w-lg">
             {/* Directions Button (Visible on all screens now) */}
             {room.info.googleMapsLink && (
                <a 
                  href={room.info.googleMapsLink} 
                  target="_blank" 
                  rel="noreferrer"
                  className="h-14 w-14 md:w-auto md:px-6 bg-blue-50 text-blue-600 font-extrabold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all border border-blue-100 hover:bg-blue-100 hover:border-blue-200 hover:text-blue-700"
                  title="Get Directions"
                >
                  <Navigation size={22} strokeWidth={2.5}/> 
                  <span className="hidden md:inline">Directions</span>
                </a>
             )}

             {/* Main Call Button */}
            <a 
              href={`tel:${room.contact.phone}`} 
              className="flex-1 h-14 bg-gradient-to-r from-rose-600 to-rose-500 text-white font-extrabold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-200/50 active:scale-95 transition-all hover:to-rose-600 hover:shadow-rose-300/50"
            >
              <Phone size={20} strokeWidth={2.5} className="animate-pulse"/> 
              <span className="text-sm md:text-base">Request Call</span>
            </a>
          </div>
        </div>
      </div>

    </div>
  );
}