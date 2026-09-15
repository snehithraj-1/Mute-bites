import React, { useState, useEffect, useMemo } from 'react';
import { X, User, Mail, Phone, MapPin, Hash, RefreshCw, ShoppingBag, Search, Calendar, AlertCircle, GraduationCap } from 'lucide-react';

export default function StudentsModal({ isOpen, onClose }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Primary fetch
      let res = await fetch('/api/students', {
        headers: { 'Accept': 'application/json' }
      });

      // 2. Fallback to live backend if relative fetch returns non-OK or HTML
      if (!res.ok) {
        try {
          const fallbackRes = await fetch('https://mutebites-std.vercel.app/api/students', {
            headers: { 'Accept': 'application/json' }
          });
          if (fallbackRes.ok) {
            res = fallbackRes;
          }
        } catch (fbErr) {
          console.warn('Fallback students fetch failed:', fbErr);
        }
      }

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.students || data.data || []);
      setStudents(list);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      setError(err.message || 'Failed to load student profiles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    return students.filter(s => {
      const name = (s.name || '').toLowerCase();
      const email = (s.email || '').toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const stuId = (s.student_id || '').toLowerCase();
      const hostel = (s.hostel_block || '').toLowerCase();
      const room = (s.room_number || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || stuId.includes(q) || hostel.includes(q) || room.includes(q);
    });
  }, [students, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div onClick={onClose} className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity" />

      <div className="relative bg-[#111827] border border-slate-700 w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 sm:space-y-5 text-white text-xs animate-scale-in max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-xl border border-blue-500/30 shrink-0">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black font-['Outfit'] text-white">
                  Student Database Records
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono text-[11px] font-bold border border-blue-500/30">
                  {students.length} Registered
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Synchronized live with Neon PostgreSQL (<code className="text-emerald-400 font-mono">students</code> table)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={fetchStudents}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Students"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin text-blue-400' : ''} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative shrink-0">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, email, phone, room, or hostel..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Search status / count */}
        {searchQuery.trim() && (
          <div className="text-[11px] text-slate-400 px-1 shrink-0 flex justify-between items-center">
            <span>
              Showing <strong className="text-white">{filteredStudents.length}</strong> of {students.length} students
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-blue-400 hover:underline cursor-pointer"
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchStudents}
              className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-[11px] font-bold border border-red-500/40 transition-colors cursor-pointer shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        {/* Student Records List */}
        <div className="overflow-y-auto space-y-2.5 pr-1 flex-1 min-h-[220px]">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-9 h-9 rounded-full border-2 border-blue-500 border-t-transparent animate-spin mx-auto" />
              <p className="text-slate-400 text-xs font-medium">Loading registered students from Neon PostgreSQL...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="py-16 text-center space-y-2 text-slate-400 text-xs">
              <div className="w-10 h-10 rounded-2xl bg-slate-800/80 text-slate-400 mx-auto flex items-center justify-center text-lg">
                👥
              </div>
              <p className="font-semibold text-slate-300">
                {searchQuery ? 'No matching students found' : 'No student profiles recorded yet'}
              </p>
              <p className="text-slate-500 text-[11px] max-w-sm mx-auto">
                {searchQuery
                  ? `No students matched "${searchQuery}". Try searching by another keyword.`
                  : 'Students are automatically registered into Neon PostgreSQL whenever they sign in or order on CampusBites.'}
              </p>
            </div>
          ) : (
            filteredStudents.map((student) => {
              const orderCount = Number(student.total_orders || 0);
              const formattedDate = student.created_at || student.updated_at
                ? new Date(student.updated_at || student.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : null;

              return (
                <div
                  key={student.id || student.email}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-extrabold text-sm text-white truncate">
                        {student.name || 'Anonymous Student'}
                      </span>
                      {student.student_id && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[10px] font-bold border border-slate-700">
                          {student.student_id}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        orderCount > 0
                          ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800/80'
                          : 'text-slate-400 bg-slate-800/60 border-slate-700'
                      }`}>
                        <ShoppingBag size={10} />
                        {orderCount} {orderCount === 1 ? 'Order' : 'Orders'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 text-[11px] pt-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail size={12} className="text-blue-400 shrink-0" />
                      <span className="font-mono truncate">{student.email}</span>
                    </div>

                    {student.phone ? (
                      <div className="flex items-center gap-1.5">
                        <Phone size={12} className="text-emerald-400 shrink-0" />
                        <span className="font-mono">{student.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone size={12} className="text-slate-600 shrink-0" />
                        <span className="font-mono italic text-[10px]">No phone listed</span>
                      </div>
                    )}

                    {(student.hostel_block || student.room_number) && (
                      <div className="flex items-center gap-1.5 sm:col-span-2">
                        <MapPin size={12} className="text-[#FF5722] shrink-0" />
                        <span>
                          {student.hostel_block || 'Hostel'} {student.room_number ? `• Room ${student.room_number}` : ''}
                        </span>
                      </div>
                    )}

                    {formattedDate && (
                      <div className="flex items-center gap-1.5 sm:col-span-2 text-slate-400 text-[10px] pt-0.5 border-t border-slate-800/60">
                        <Calendar size={11} className="text-slate-400 shrink-0" />
                        <span>Last active: {formattedDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-400 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Persisted securely in Neon AWS PostgreSQL</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold cursor-pointer border border-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
