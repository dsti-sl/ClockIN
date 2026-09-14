'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Navigation, Search, Loader2, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

const LeafletMap = dynamic(() => import('./LeafletMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-gray-50 dark:bg-slate-900 text-sm text-gray-500 dark:text-slate-400">
      Loading map…
    </div>
  ),
});

interface Props {
  onLocationSelect: (lat: number, lng: number, addressName?: string) => void;
  initialLat?: number;
  initialLng?: number;
}

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

export default function LocationPicker({ onLocationSelect, initialLat, initialLng }: Props) {
  const [pickerMode, setPickerMode] = useState<'current' | 'search'>('search');
  const [marker, setMarker] = useState<[number, number] | null>(
    initialLat && initialLng ? [initialLat, initialLng] : null
  );
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [center, setCenter] = useState<[number, number] | null>(marker ?? [8.4844, -13.2344]); // default Freetown

  // Current location states
  const [fetchingLoc, setFetchingLoc] = useState(false);
  const [locError, setLocError] = useState('');
  const [currentAddress, setCurrentAddress] = useState('');

  const abortRef = useRef<AbortController | null>(null);

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      const data = await res.json();
      if (data && data.display_name) {
        return data.display_name;
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  };

  const handleUseCurrentLocation = useCallback(() => {
    setPickerMode('current');
    setLocError('');
    setFetchingLoc(true);

    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      setFetchingLoc(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setMarker([lat, lng]);
        setCenter([lat, lng]);

        const address = await reverseGeocode(lat, lng);
        setCurrentAddress(address);
        onLocationSelect(lat, lng, address);
        setFetchingLoc(false);
      },
      (err) => {
        setFetchingLoc(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocError('Location permission denied. Please allow location access or use Search.');
        } else {
          setLocError('Failed to retrieve your location. Please try again or use Search.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, [onLocationSelect]);

  const runSearch = useCallback(async (query: string): Promise<SearchResult[]> => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setSearchError('');
      setSearching(false);
      return [];
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    setSearchError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=sl&viewbox=-17.5,6.9,-10.2,10.0&bounded=1&limit=8&dedupe=1&q=${encodeURIComponent(q)}`,
        { signal: controller.signal }
      );
      const data: SearchResult[] = await res.json();
      if (controller.signal.aborted) return [];
      setResults(data);
      if (data.length === 0) setSearchError('No matching locations found. Try re-spelling or a nearby landmark.');
      return data;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return [];
      setSearchError('Search failed. Please try again.');
      return [];
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (pickerMode !== 'search') return;
    const q = search.trim();
    const timer = setTimeout(() => {
      if (q.length < 2) {
        abortRef.current?.abort();
        setResults([]);
        setSearchError('');
        setSearching(false);
        return;
      }
      void runSearch(q);
    }, q.length < 2 ? 0 : 400);
    return () => clearTimeout(timer);
  }, [search, runSearch, pickerMode]);

  const handleSearch = async () => {
    const q = search.trim();
    if (!q) return;
    let data = results;
    if (data.length === 0) {
      data = await runSearch(q);
    }
    if (data.length > 0) selectResult(data[0]);
  };

  const selectResult = (r: SearchResult) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    setMarker([lat, lon]);
    setCenter([lat, lon]);
    onLocationSelect(lat, lon, r.display_name);
    setResults([]);
    setSearchError('');
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setMarker([lat, lng]);
    const address = await reverseGeocode(lat, lng);
    onLocationSelect(lat, lng, address);
  };

  return (
    <div className="space-y-3">
      {/* Mode selection buttons */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-slate-800/80 border border-gray-200/60 dark:border-slate-700/60 rounded-xl">
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            pickerMode === 'current'
              ? 'bg-white text-indigo-600 border border-gray-200/80 shadow-sm dark:bg-slate-700 dark:text-indigo-300 dark:border-slate-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
          }`}
        >
          {fetchingLoc ? (
            <Loader2 className="h-4 w-4 animate-spin text-indigo-600 dark:text-indigo-400" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          <span>Use Current Location</span>
        </button>

        <button
          type="button"
          onClick={() => setPickerMode('search')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            pickerMode === 'search'
              ? 'bg-white text-indigo-600 border border-gray-200/80 shadow-sm dark:bg-slate-700 dark:text-indigo-300 dark:border-slate-600'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/50'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Search for Location</span>
        </button>
      </div>

      {/* Mode 1: Current location mode */}
      {pickerMode === 'current' && (
        <div className="space-y-3">
          {fetchingLoc && (
            <div className="flex items-center justify-center gap-2 p-4 rounded-xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Fetching your current GPS position...</span>
            </div>
          )}

          {locError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/40 dark:border-red-900 text-red-700 dark:text-red-400 text-xs sm:text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p>{locError}</p>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-red-800 dark:text-red-300 underline cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            </div>
          )}

          {!fetchingLoc && marker && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>Pinned to your current location</span>
                </div>
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" /> Re-sync GPS
                </button>
              </div>
              {currentAddress && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 pl-5 truncate">
                  {currentAddress}
                </p>
              )}
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 pl-5">
                Coordinates: {marker[0].toFixed(5)}, {marker[1].toFixed(5)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Search mode */}
      {pickerMode === 'search' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search location (e.g. Cotton Tree, Freetown)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-base flex-1"
            />
            <button type="button" onClick={() => void handleSearch()} className="btn-secondary" disabled={searching}>
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
          {searchError && <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p>}
          {results.length > 0 && (
            <ul className="max-h-48 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-700 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
              {results.map((r, i) => (
                <li key={`${r.lat}-${r.lon}-${i}`}>
                  <button
                    type="button"
                    onClick={() => selectResult(r)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 dark:hover:bg-slate-700 text-gray-800 dark:text-slate-200"
                  >
                    {r.display_name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Map display */}
      <div className="h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
        <LeafletMap
          center={center ?? [8.4844, -13.2344]}
          marker={marker}
          onMapClick={handleMapClick}
        />
      </div>
    </div>
  );
}

