// components/attendance/ManualAttendanceUpload.tsx
'use client';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Camera, Loader2, Trash2, Download, X, UserPlus, ShieldCheck, Clock, Calendar, MapPin, Search } from 'lucide-react';
import { validateAttendanceForm, type FormErrors } from '@/lib/validation';

const supabase = createClient();

interface ManualAttendanceRecord {
  id: string;
  event_id: string;
  session_id: string | null;
  image_path: string;
  caption: string | null;
  created_at: string;
}

interface ManualAttendanceUploadProps {
  eventId: string;
  sessionId?: string;
  eventLocation?: string;
  eventLat?: number | null;
  eventLng?: number | null;
}

const getEmptyForm = (defaultLocation = '') => ({
  full_name: '',
  email: '',
  phone: '',
  institution: '',
  mda: '',
  designation: '',
  location: defaultLocation,
});

export default function ManualAttendanceUpload({
  eventId,
  sessionId,
  eventLocation,
  eventLat,
  eventLng,
}: ManualAttendanceUploadProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState<'input' | 'photo' | null>(null);
  const [images, setImages] = useState<ManualAttendanceRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ManualAttendanceRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [eventDetails, setEventDetails] = useState<{
    location: string;
    lat: number | null;
    lng: number | null;
  }>({
    location: eventLocation || '',
    lat: eventLat ?? null,
    lng: eventLng ?? null,
  });

  const [manualForm, setManualForm] = useState(getEmptyForm(eventLocation || ''));
  const [manualErrors, setManualErrors] = useState<FormErrors>({});
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');
  const [manualSuccess, setManualSuccess] = useState('');

  // MDA combobox (same function as the add-admin MDA picker)
  const [mdas,        setMdas]        = useState<{ id: string; name: string }[]>([]);
  const [mdaQuery,    setMdaQuery]    = useState('');
  const [mdaOpen,     setMdaOpen]     = useState(false);

  useEffect(() => {
    supabase
      .from('mdas')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data }) => {
        if (data) setMdas(data as { id: string; name: string }[]);
      });
  }, []);

  useEffect(() => {
    if (eventLocation !== undefined && eventLocation !== '') {
      setEventDetails({
        location: eventLocation,
        lat: eventLat ?? null,
        lng: eventLng ?? null,
      });
      setManualForm(f => ({
        ...f,
        location: f.location || eventLocation,
      }));
    } else {
      supabase
        .from('events')
        .select('location, lat, lng')
        .eq('id', eventId)
        .single()
        .then(({ data }) => {
          if (data) {
            const loc = data.location || '';
            setEventDetails({
              location: loc,
              lat: data.lat ?? null,
              lng: data.lng ?? null,
            });
            setManualForm(f => ({
              ...f,
              location: f.location || loc,
            }));
          }
        });
    }
  }, [eventId, eventLocation, eventLat, eventLng]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateAttendanceForm(manualForm);
    if (Object.keys(errors).length > 0) {
      setManualErrors(errors);
      return;
    }
    setManualErrors({});
    setManualError('');
    setManualSuccess('');
    setManualSaving(true);

    const baseLocation = manualForm.location.trim() || eventDetails.location.trim() || 'Event Location';

    const { error } = await supabase.from('attendees').insert({
      event_id: eventId,
      session_id: sessionId || null,
      full_name: manualForm.full_name.trim(),
      email: manualForm.email.trim(),
      phone: manualForm.phone.trim(),
      institution: manualForm.institution.trim(),
      mda: manualForm.mda.trim() || null,
      designation: manualForm.designation.trim(),
      device_fingerprint: `manual-admin-input-${Date.now()}`,
      qr_token_used: null,
      lat: eventDetails.lat ?? null,
      lng: eventDetails.lng ?? null,
      location_label: baseLocation,
      method: 'manual',
    });

    setManualSaving(false);
    if (error) {
      let msg = error.message;
      if (msg.includes('duplicate') || msg.includes('unique')) {
        msg = 'This attendee already exists for this event/session (duplicate phone or email).';
      }
      setManualError(msg);
      return;
    }
    setManualSuccess('Attendee added. Refresh the attendees list to see them.');
    setManualForm(getEmptyForm(eventDetails.location));
    router.refresh();
  };

  useEffect(() => {
    let cancelled = false;

    const loadImages = async () => {
      let query = supabase
        .from('manual_attendance')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else {
        query = query.is('session_id', null);
      }

      const { data } = await query;
      if (!cancelled) setImages(data || []);
    };

    loadImages();
    return () => { cancelled = true; };
  }, [eventId, sessionId]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `manual/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('attendance')
      .upload(filePath, file);

    if (uploadError) {
      alert('Upload failed: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: newRow, error: insertError } = await supabase
      .from('manual_attendance')
      .insert({
        event_id: eventId,
        session_id: sessionId || null,
        image_path: filePath,
      })
      .select('*')
      .single();

    if (insertError || !newRow) {
      alert('Failed to save record');
      setUploading(false);
      return;
    }

    setImages(prev => [newRow as ManualAttendanceRecord, ...prev]);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string, imagePath: string) => {
    await supabase.storage.from('attendance').remove([imagePath]);
    await supabase.from('manual_attendance').delete().eq('id', id);
    setImages(prev => prev.filter(img => img.id !== id));
    if (selectedImage?.id === id) setSelectedImage(null);
  };

  const getPublicUrl = (path: string) =>
    supabase.storage.from('attendance').getPublicUrl(path).data.publicUrl;

  const handleDownload = async (e: React.MouseEvent, imagePath: string) => {
    e.stopPropagation();
    const url = getPublicUrl(imagePath);
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = imagePath.split('/').pop() || 'image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-700 dark:text-slate-200 font-medium">
          Did you take manual attendance?
        </p>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => {
            if (enabled) setMode(null);
            setEnabled(prev => !prev);
          }}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
            enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <>
      {/* Mode selection buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode(prev => (prev === 'photo' ? null : 'photo'))}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
            mode === 'photo'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>Upload Photo</span>
        </button>

        <button
          type="button"
          onClick={() => setMode(prev => (prev === 'input' ? null : 'input'))}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
            mode === 'input'
              ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white'
          }`}
        >
          <UserPlus className="h-4 w-4" />
          <span>Manual Input</span>
        </button>
      </div>

      {mode === 'input' && (
      <form onSubmit={handleManualSubmit} className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Add attendee manually</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Full name *</label>
              <input
                className="input-base"
                value={manualForm.full_name}
                onChange={(e) => setManualForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="Attendee full name"
              />
              {manualErrors.full_name && <p className="mt-1 text-xs text-red-600">{manualErrors.full_name}</p>}
            </div>
            <div>
              <label className="label">Phone *</label>
              <input
                className="input-base"
                value={manualForm.phone}
                onChange={(e) => setManualForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Phone number"
              />
              {manualErrors.phone && <p className="mt-1 text-xs text-red-600">{manualErrors.phone}</p>}
            </div>
            <div>
              <label className="label">Email *</label>
              <input
                type="email"
                className="input-base"
                value={manualForm.email}
                onChange={(e) => setManualForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Email address"
              />
              {manualErrors.email && <p className="mt-1 text-xs text-red-600">{manualErrors.email}</p>}
            </div>
            <div>
              <label className="label">Institution *</label>
              <input
                className="input-base"
                value={manualForm.institution}
                onChange={(e) => setManualForm(f => ({ ...f, institution: e.target.value }))}
                placeholder="Institution / organization"
              />
              {manualErrors.institution && <p className="mt-1 text-xs text-red-600">{manualErrors.institution}</p>}
            </div>
            {/* MDA combobox — optional, same function as add-admin MDA picker */}
            <div className="relative">
              <label className="label">MDA (optional)</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                <input
                  type="text"
                  role="combobox"
                  aria-expanded={mdaOpen}
                  aria-controls="manual-mda-listbox"
                  aria-autocomplete="list"
                  autoComplete="off"
                  placeholder={mdas.length ? 'Start typing to search…' : 'No MDAs available'}
                  value={mdaQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setMdaQuery(v);
                    const exact = mdas.find(m => m.name.toLowerCase() === v.trim().toLowerCase());
                    setManualForm(f => ({ ...f, mda: exact ? exact.name : v.trim() }));
                    setMdaOpen(true);
                  }}
                  onFocus={() => setMdaOpen(true)}
                  onBlur={() => setTimeout(() => setMdaOpen(false), 120)}
                  className="input-base pl-9"
                />
                {manualForm.mda && (
                  <button
                    type="button"
                    aria-label="Clear MDA"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setManualForm(f => ({ ...f, mda: '' }));
                      setMdaQuery('');
                      setMdaOpen(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {mdaOpen && (
                <ul
                  id="manual-mda-listbox"
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
                >
                  {(() => {
                    const q = mdaQuery.trim().toLowerCase();
                    const matches = q ? mdas.filter(m => m.name.toLowerCase().includes(q)) : mdas;
                    if (matches.length === 0) {
                      return (
                        <li className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400">No MDA found matching “{mdaQuery.trim()}”.</li>
                      )
                    }
                    return matches.map(m => (
                      <li key={m.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={m.name === manualForm.mda}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setManualForm(f => ({ ...f, mda: m.name }));
                            setMdaQuery(m.name);
                            setMdaOpen(false);
                          }}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-left text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-slate-700 ${
                            m.name === manualForm.mda
                              ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-slate-700 dark:text-white'
                              : 'text-gray-700 dark:text-slate-200'
                          }`}
                        >
                          {m.name}
                        </button>
                      </li>
                    ))
                  })()}
                </ul>
              )}
            </div>
            <div>
              <label className="label">Designation *</label>
              <input
                className="input-base"
                value={manualForm.designation}
                onChange={(e) => setManualForm(f => ({ ...f, designation: e.target.value }))}
                placeholder="Designation / role"
              />
              {manualErrors.designation && <p className="mt-1 text-xs text-red-600">{manualErrors.designation}</p>}
            </div>
            <div>
              <label className="label flex items-center justify-between">
                <span>Location (Event Default)</span>
                <span className="text-[10px] text-gray-400 font-normal dark:text-slate-400">Saved as: Event location</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  className="input-base pl-9"
                  value={manualForm.location}
                  onChange={(e) => setManualForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Event default location"
                />
              </div>
            </div>
          </div>

          {manualError && <p className="text-sm text-red-600">{manualError}</p>}
          {manualSuccess && <p className="text-sm text-green-600">{manualSuccess}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={() => { setEnabled(false); setMode(null); }} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={manualSaving} className="btn-primary inline-flex items-center gap-1">
              {manualSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {manualSaving ? 'Adding…' : 'Add attendee'}
            </button>
          </div>
        </form>
      )}

      {mode === 'photo' && (
        <>
      <div className="flex items-center justify-between">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
                id={`manual-upload-${eventId}${sessionId || ''}`}
              />
              <label
                htmlFor={`manual-upload-${eventId}${sessionId || ''}`}
                className="btn-secondary inline-flex items-center gap-1.5 cursor-pointer text-xs"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                ) : (
                  <Camera className="h-4 w-4 text-indigo-600" />
                )}
                <span className="hidden sm:inline">{uploading ? 'Uploading…' : 'Add Photo'}</span>
                <span className="sm:hidden">{uploading ? '…' : 'Add Photo'}</span>
              </label>
            </div>
          </div>

          {images.length === 0 && (
            <p className="text-xs sm:text-sm text-gray-400 dark:text-slate-400 text-center py-6 bg-gray-50/50 dark:bg-slate-900/40 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
              No manual attendance photos yet. Click &quot;Add Photo&quot; to upload proof of manual attendance.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {images.map((img) => (
              <div
                key={img.id}
                className="relative group border border-gray-200 rounded-xl overflow-hidden cursor-pointer bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-indigo-600"
                onClick={() => setSelectedImage(img)}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                  <Image
                    src={getPublicUrl(img.image_path)}
                    alt="Manual attendance photo"
                    width={320}
                    height={240}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    unoptimized
                  />

                  {/* Top-right badge marker */}
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600/90 backdrop-blur-sm px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                      <ShieldCheck className="h-3 w-3" />
                      Admin
                    </span>
                  </div>

                  {/* Overlay buttons */}
                  <div className="absolute top-2 left-2 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleDownload(e, img.image_path)}
                      className="bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Download photo"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(img.id, img.image_path);
                      }}
                      className="bg-red-600/90 backdrop-blur-sm hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                      title="Delete photo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card footer details */}
                <div className="p-3 bg-white dark:bg-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-300" />
                      Added by Admin
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-300">
                    <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500 flex-shrink-0" />
                    <span>
                      {new Date(img.created_at).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Full-view Modal */}
          {selectedImage && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200"
              onClick={() => setSelectedImage(null)}
            >
              <div
                className="relative max-w-4xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] dark:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 bg-gray-50/80 dark:border-slate-700 dark:bg-slate-900/60">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:ring-indigo-800">
                      <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-300" />
                      Added by Admin
                    </span>
                    <span className="text-xs text-gray-500 dark:text-slate-300 hidden sm:inline">• Manual Attendance Photo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleDownload(e, selectedImage.image_path)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Download className="h-4 w-4 text-gray-500 dark:text-slate-400" />
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedImage(null)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Image View */}
                <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden p-3 min-h-[300px]">
                  <Image
                    src={getPublicUrl(selectedImage.image_path)}
                    alt="Manual attendance photo full view"
                    width={1200}
                    height={800}
                    className="max-h-[70vh] w-auto max-w-full object-contain rounded-lg shadow-xl"
                    unoptimized
                  />
                </div>

                {/* Modal Footer with Marker and Timestamp */}
                <div className="border-t border-gray-100 bg-white p-4 sm:px-6 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 flex-shrink-0 dark:bg-indigo-950/30 dark:border-indigo-900 dark:text-indigo-300">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Verification</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">Photo added by Admin</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3.5 py-2 border border-gray-200/70 text-xs sm:text-sm text-gray-700 dark:bg-slate-900/60 dark:border-slate-700 dark:text-slate-200">
                      <Calendar className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                      <span className="font-medium text-gray-500 dark:text-slate-300">Date & Time Uploaded:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {new Date(selectedImage.created_at).toLocaleString([], {
                          dateStyle: 'full',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
        </>
      )}
    </div>
  );
}
