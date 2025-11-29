import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase"; 
import { Search, Loader2, Home as HomeIcon, SlidersHorizontal } from 'lucide-react';
import RoomCard from '../../components/RoomCard';
import { Link } from 'react-router-dom';

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    // Fetch rooms, ordered by newest first
    const q = query(collection(db, "properties"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filteredRooms = rooms.filter(room => 
    room.info.title.toLowerCase().includes(filter.toLowerCase()) ||
    room.info.location.toLowerCase().includes(filter.toLowerCase())
  );

  if(loading) return <div className="h-screen flex items-center justify-center text-rose-600 bg-slate-50"><Loader2 className="animate-spin w-10 h-10"/></div>;

  return (
    <div className="min-h-screen bg-slate-100/50 pb-20 font-sans selection:bg-rose-100 selection:text-rose-700">
      
      {/* PREMIUM STICKY HEADER & SEARCH */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/50 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-md mx-auto px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-br from-rose-500 to-orange-600 p-2 rounded-xl text-white shadow-sm">
               <HomeIcon size={22} strokeWidth={2.5}/>
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">STAY<span className="text-rose-600">SARAI</span></h1>
            </div>
          </div>
          {/* Using a subtly styled Admin link */}
          <Link to="/admin" className="text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-100 px-4 py-2 rounded-full transition hover:bg-rose-50">
            Are you a Host?
          </Link>
        </div>
        
        {/* Floating Search Input */}
        <div className="max-w-md mx-auto px-5 pb-4 mt-2">
          <div className="bg-white rounded-2xl flex items-center px-4 py-3.5 shadow-lg shadow-slate-200/40 border border-slate-100 focus-within:border-rose-300 focus-within:ring-4 focus-within:ring-rose-50 transition-all group">
            <Search size={20} className="text-slate-400 mr-3 group-focus-within:text-rose-500 transition-colors"/>
            <input 
              placeholder="Search locality, building..." 
              className="bg-transparent w-full text-[15px] outline-none text-slate-800 placeholder:text-slate-400 font-medium"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            {/* A visual filter icon (non-functional in this demo, but adds premium feel) */}
            <div className="border-l pl-3 ml-2 text-slate-400">
                <SlidersHorizontal size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Feed */}
      <div className="max-w-md mx-auto px-5 py-8 space-y-8">
        <div className="flex justify-between items-end px-1">
           <div>
             <h2 className="font-black text-slate-800 text-xl">Featured Stays</h2>
             <p className="text-slate-500 text-sm font-medium">Handpicked rooms for you</p>
           </div>
           <span className="text-xs text-slate-500 font-bold bg-white px-3 py-1.5 rounded-full border shadow-sm">{filteredRooms.length} found</span>
        </div>

        {filteredRooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-dashed border-slate-300 shadow-sm mx-4">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
                <Search size={40} className="text-slate-300"/>
            </div>
            <h3 className="font-bold text-slate-700 text-lg">No results found</h3>
            <p className="text-slate-400 font-medium text-center px-6 mt-2 text-sm">We couldn't find anything matching "{filter}". Try a different keyword.</p>
          </div>
        ) : (
          // Added extra bottom padding for scrolling past the sticky footer
          <div className="pb-6">
            {filteredRooms.map(room => <RoomCard key={room.id} room={room} />)}
          </div>
        )}
      </div>
    </div>
  );
}