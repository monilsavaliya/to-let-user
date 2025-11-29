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
      // Auto slide every 3 seconds for faster preview
      interval = setInterval(() => {
        setCurrentImgIndex((prev) => (prev + 1) % images.length);
      }, 3000); 
    } else {
      setCurrentImgIndex(0);
    }
    return () => clearInterval(interval);
  }, [isHovering, images.length]);

  return (
    <Link 
      to={`/room/${room.id}`} 
      className="block group h-full" // Added h-full, removed mb-8
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col ${isBooked ? 'opacity-80 grayscale' : ''}`}>
        
        {/* Image Section - Aspect Ratio Fixed */}
        <div className="relative aspect-[4/3] bg-slate-200 overflow-hidden">
          <img 
            src={images[currentImgIndex] || 'https://via.placeholder.com/400'} 
            alt={room.info.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          {/* Progress Indicator */}
          {isHovering && images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-10 px-4">
               {images.map((_, idx) => (
                 <div 
                   key={idx} 
                   className={`h-1 rounded-full transition-all duration-300 shadow-sm ${idx === currentImgIndex ? 'w-full bg-white' : 'w-full bg-white/30'}`} 
                 />
               ))}
            </div>
          )}

          {/* Rating Badge */}
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1 text-slate-900">
            <Star size={12} className="text-orange-500 fill-orange-500"/> {room.rating?.average || 'New'}
          </div>

          {isBooked && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="bg-red-600 text-white px-4 py-1.5 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg border border-white/20">Sold Out</span>
            </div>
          )}
        </div>

        {/* Details Section */}
        <div className="p-4 flex flex-col flex-1">
          <div className="mb-2">
            <div className="flex justify-between items-start gap-2">
              <h3 className="font-bold text-slate-900 text-lg leading-tight line-clamp-1">{room.info.title}</h3>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 font-medium truncate">
              <MapPin size={14} className="text-slate-400 shrink-0"/> {room.info.location}
            </p>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
             <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold flex items-center gap-1">
               <Users size={12}/> {room.rules.tenantType}
             </span>
             <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md font-bold flex items-center gap-1">
               <CheckCircle2 size={12}/> Verified
             </span>
          </div>

          {/* Price Footer (Pushed to bottom) */}
          <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex flex-col">
              {room.price.marketAmount > 0 && <span className="text-[10px] text-slate-400 line-through">₹{room.price.marketAmount}</span>}
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black text-slate-900">₹{room.price.amount}</span>
                <span className="text-xs text-slate-500 font-bold">/mo</span>
              </div>
            </div>
             <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                <ArrowRight size={16}/>
             </div>
          </div>
        </div>
      </div>
    </Link>
  );
}