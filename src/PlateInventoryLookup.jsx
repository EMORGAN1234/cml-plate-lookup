import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

// ─── Supabase ───────────────────────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase      = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Constants ───────────────────────────────────────────────────────────────
const SITE_PW  = import.meta.env.VITE_SITE_PASSWORD || 'cml2025'; // ← site-wide login
const ADMIN_PW = 'cml2025'; // ← admin upload panel (can be different)

const DENSITIES = {
  '1100': 0.098, '2024': 0.101, '3003': 0.099, '5052': 0.0968,
  '6061': 0.0975, '6063': 0.097, '7050': 0.102, '7075': 0.102, 'MIC6': 0.0975,
};

const LOC_COLORS = {
  AURORA:       'bg-blue-100 text-blue-800',
  'COON RAPIDS':'bg-green-100 text-green-800',
  GLENPOOL:     'bg-red-100 text-red-800',
  'SANTA TERESA':'bg-purple-100 text-purple-800',
};

// ─── Row parser ──────────────────────────────────────────────────────────────
// Column layout (0-indexed) from "On Hand Inventory":
// 0 Product | 2 Date | 4 Form | 5 Grade | 6 Finish | 9 Size (thickness str)
// 10 SHT SZ | 12 Width | 13 Length | 14 Location | 15 WHS | 17 Invt Qlty
// 22 Tag | 25 Master Age | 27 OH Value | 28 On Hand | 29 Ord Resrv
// 30 Prod Resrv | 31 Ship Resrv | 32 Available Lbs | 33 TAG COST
function parseRow(row) {
  const thStr = String(row[9] ?? '').trim();
  return {
    grade:        String(row[5]  ?? '').trim(),
    finish:       String(row[6]  ?? '').trim(),
    thickness_str: thStr,
    thickness:    parseFloat(thStr) || 0,
    sht_sz:       String(row[10] ?? '').trim(),
    width:        parseFloat(row[12]) || 0,
    length:       parseFloat(row[13]) || 0,
    location:     String(row[14] ?? '').trim(),
    whs:          String(row[15] ?? '').trim(),
    invt_qlty:    String(row[17] ?? '').trim(),
    tag:          String(row[22] ?? '').trim(),
    master_age:   parseInt(row[25])   || 0,
    oh_value:     parseFloat(row[27]) || 0,
    on_hand:      parseFloat(row[28]) || 0,
    ord_resrv:    parseFloat(row[29]) || 0,
    available_lbs:parseFloat(row[32]) || 0,
    tag_cost:     parseFloat(row[33]) || 0,
  };
}

function approxPcs(row) {
  const d = DENSITIES[row.grade] || 0.0975;
  const pcWt = row.width * row.length * row.thickness * d;
  if (pcWt <= 0 || row.available_lbs <= 0) return null;
  return Math.round(row.available_lbs / pcWt);
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return '—'; }
}

function unique(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

// ─── Login Gate ──────────────────────────────────────────────────────────────
function LoginGate({ onAuth }) {
  const [input, setInput]   = useState('');
  const [shake, setShake]   = useState(false);
  const [error, setError]   = useState(false);

  function attempt() {
    if (input === SITE_PW) {
      sessionStorage.setItem('cml_plate_auth', '1');
      onAuth();
    } else {
      setShake(true);
      setError(true);
      setInput('');
      setTimeout(() => setShake(false), 500);
    }
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-black flex items-center justify-center p-4"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
        .shake { animation: shake 0.45s ease-in-out; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s ease-out forwards; }
      ` }} />

      <div className={`w-full max-w-sm fade-up ${shake ? 'shake' : ''}`}>
        {/* Logo card */}
        <div className="bg-white rounded-2xl shadow-2xl border-t-4 border-red-600 p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg mb-4">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight">
              CML Plate Stock Lookup
            </h1>
            <p className="text-sm text-neutral-500 mt-1">Champagne Metals — Internal</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={input}
                onChange={e => { setInput(e.target.value); setError(false); }}
                onKeyDown={e => e.key === 'Enter' && attempt()}
                autoFocus
                placeholder="Enter password"
                className={`w-full px-4 py-3 text-sm border-2 rounded-xl outline-none font-medium transition-colors
                  ${error
                    ? 'border-red-400 bg-red-50 text-red-800 placeholder-red-300'
                    : 'border-neutral-300 bg-white focus:border-red-500'
                  }`}
              />
              {error && (
                <p className="text-xs text-red-500 font-semibold mt-1.5">
                  Incorrect password — try again
                </p>
              )}
            </div>

            <button
              onClick={attempt}
              className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold text-sm hover:from-red-700 hover:to-red-800 transition-all shadow-md hover:shadow-lg"
            >
              Enter
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-600 mt-4">
          Champagne Metals — authorized personnel only
        </p>
      </div>
    </div>
  );
}

// ─── Main inventory component (all hooks unconditional) ──────────────────────
function PlateInventoryMain() {
  const [inventory, setInventory]     = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filename, setFilename]       = useState('');
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState(null);

  // Filters
  const [fGrade,    setFGrade]    = useState('ALL');
  const [fFinish,   setFFinish]   = useState('ALL');
  const [fThick,    setFThick]    = useState('ALL');
  const [fLoc,      setFLoc]      = useState('ALL');
  const [fMinLbs,   setFMinLbs]   = useState('1');
  const [fWidMin,   setFWidMin]   = useState('');
  const [fWidMax,   setFWidMax]   = useState('');
  const [fLenMin,   setFLenMin]   = useState('');
  const [fLenMax,   setFLenMax]   = useState('');
  const [search,    setSearch]    = useState('');

  // Sort
  const [sortCol, setSortCol] = useState('grade');
  const [sortDir, setSortDir] = useState('asc');

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // Admin
  const [showAdmin,  setShowAdmin]  = useState(false);
  const [adminInput, setAdminInput] = useState('');
  const [adminAuth,  setAdminAuth]  = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [uploadMsg,  setUploadMsg]  = useState('');
  const fileRef = useRef();

  // ── Load from Supabase on mount ──
  useEffect(() => {
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { data, error } = await supabase
          .from('cml_plate_inventory')
          .select('*')
          .eq('id', 1)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          setInventory(data.data || []);
          setLastUpdated(data.upload_date);
          setFilename(data.filename || '');
        }
      } catch (e) {
        setLoadError('Could not load inventory. Check Supabase connection.');
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Upload handler ──
  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setUploadMsg('Reading file…');
    try {
      const buf = await file.arrayBuffer();
      const wb  = XLSX.read(buf, { type: 'array', cellDates: true });

      const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('on hand'))
                     ?? wb.SheetNames[0];
      const ws   = wb.Sheets[sheetName];
      const raw  = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });

      if (raw.length < 2) throw new Error('Sheet appears empty or wrong tab selected.');

      // Grab report date from first data row col 2
      const rawDate    = raw[1]?.[2];
      const reportDate = rawDate instanceof Date ? rawDate.toISOString()
                       : typeof rawDate === 'number'
                         ? new Date(Math.round((rawDate - 25569) * 864e5)).toISOString()
                         : new Date().toISOString();

      const parsed = raw.slice(1)
        .filter(r => r[5]) // must have Grade
        .map(parseRow);

      setUploadMsg(`Parsed ${parsed.length} rows — saving…`);

      const { error: upsertErr } = await supabase
        .from('cml_plate_inventory')
        .upsert({
          id:          1,
          data:        parsed,
          upload_date: reportDate,
          filename:    file.name,
          row_count:   parsed.length,
        });
      if (upsertErr) throw upsertErr;

      setInventory(parsed);
      setLastUpdated(reportDate);
      setFilename(file.name);
      setUploadMsg(`✓ ${parsed.length} records loaded from ${file.name}`);

      // Lock down and close after 2 seconds
      setTimeout(() => {
        setAdminAuth(false);
        setAdminInput('');
        setShowAdmin(false);
        setUploadMsg('');
      }, 2000);
    } catch (e) {
      setUploadMsg(`Error: ${e.message}`);
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  // ── Derived filter options ──
  const grades     = useMemo(() => ['ALL', ...unique(inventory.map(r => r.grade)).sort()], [inventory]);
  const finishes   = useMemo(() => ['ALL', ...unique(inventory.map(r => r.finish)).sort()], [inventory]);
  const thicks     = useMemo(() => ['ALL', ...unique(inventory.map(r => r.thickness_str))
    .sort((a, b) => parseFloat(a) - parseFloat(b))], [inventory]);
  const locations  = useMemo(() => ['ALL', ...unique(inventory.map(r => r.location)).sort()], [inventory]);

  // ── Filter + sort ──
  const filtered = useMemo(() => {
    let rows = inventory;
    if (fGrade  !== 'ALL') rows = rows.filter(r => r.grade        === fGrade);
    if (fFinish !== 'ALL') rows = rows.filter(r => r.finish       === fFinish);
    if (fThick  !== 'ALL') rows = rows.filter(r => r.thickness_str === fThick);
    if (fLoc    !== 'ALL') rows = rows.filter(r => r.location     === fLoc);
    const minLbs = parseFloat(fMinLbs);
    if (!isNaN(minLbs))   rows = rows.filter(r => r.available_lbs >= minLbs);
    if (fWidMin) rows = rows.filter(r => r.width  >= parseFloat(fWidMin));
    if (fWidMax) rows = rows.filter(r => r.width  <= parseFloat(fWidMax));
    if (fLenMin) rows = rows.filter(r => r.length >= parseFloat(fLenMin));
    if (fLenMax) rows = rows.filter(r => r.length <= parseFloat(fLenMax));
    if (search.trim()) {
      const s = search.toLowerCase();
      rows = rows.filter(r =>
        r.tag?.toLowerCase().includes(s)        ||
        r.grade?.toLowerCase().includes(s)      ||
        r.finish?.toLowerCase().includes(s)     ||
        r.location?.toLowerCase().includes(s)   ||
        r.thickness_str?.includes(s)            ||
        r.sht_sz?.toLowerCase().includes(s)
      );
    }
    return [...rows].sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'number')
        return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc'
        ? String(av ?? '').localeCompare(String(bv ?? ''))
        : String(bv ?? '').localeCompare(String(av ?? ''));
    });
  }, [inventory, fGrade, fFinish, fThick, fLoc, fMinLbs, fWidMin, fWidMax, fLenMin, fLenMax, search, sortCol, sortDir]);

  const totalLbs   = useMemo(() => filtered.reduce((s, r) => s + (r.available_lbs || 0), 0), [filtered]);
  const totalValue = useMemo(() => filtered.reduce((s, r) => s + (r.oh_value || 0), 0), [filtered]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function toggleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  }
  function resetFilters() {
    setFGrade('ALL'); setFFinish('ALL'); setFThick('ALL'); setFLoc('ALL');
    setFMinLbs('1'); setFWidMin(''); setFWidMax(''); setFLenMin(''); setFLenMax('');
    setSearch(''); setPage(1);
  }

  const Arrow = ({ col }) =>
    sortCol === col
      ? <span className="ml-1 text-red-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
      : <span className="ml-1 text-neutral-400 opacity-0 group-hover:opacity-100">↕</span>;

  const TH = ({ col, label, right = false }) => (
    <th
      onClick={() => toggleSort(col)}
      className={`group px-3 py-3 text-left text-xs font-semibold text-neutral-300 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:text-white transition-colors ${right ? 'text-right' : ''}`}
    >
      {label}<Arrow col={col}/>
    </th>
  );

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .pulse-red { animation: pulse-red 2.5s ease-in-out infinite; }
        @keyframes pulse-red {
          0%,100% { box-shadow: 0 0 0 0 rgba(220,38,38,0.2); }
          50%      { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
        }
        .row-hover:hover { background: rgba(220,38,38,0.04) !important; }
      ` }} />

      <div
        className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-black p-4 sm:p-6"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="max-w-screen-xl mx-auto space-y-4">

          {/* ── HEADER ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-2xl border-t-4 border-red-600 px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg pulse-red flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                    CML Plate Stock Lookup
                  </h1>
                  <p className="text-sm text-neutral-500 font-medium mt-0.5">
                    Champagne Metals — Aluminum Plate Inventory
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                {lastUpdated && (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-xl shadow-md">
                    <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
                    <span className="text-sm font-bold text-white tracking-wide">
                      As of {fmtDate(lastUpdated)}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => setShowAdmin(v => !v)}
                  title="Admin upload"
                  className="p-2.5 rounded-xl hover:bg-neutral-100 transition-colors border border-neutral-200"
                >
                  <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* ── ADMIN PANEL ─────────────────────────────────────────────── */}
          {showAdmin && (
            <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-5">
              <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600" />
                Admin — Upload New Inventory Report
              </h2>

              {!adminAuth ? (
                <div className="flex gap-3 items-center">
                  <input
                    type="password"
                    placeholder="Admin password"
                    value={adminInput}
                    onChange={e => setAdminInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (adminInput === ADMIN_PW ? setAdminAuth(true) : (setAdminInput('')))}
                    className="px-3 py-2 text-sm border border-neutral-300 rounded-lg w-52 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                  <button
                    onClick={() => adminInput === ADMIN_PW ? setAdminAuth(true) : setAdminInput('')}
                    className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg text-sm font-semibold hover:from-red-700 hover:to-red-800"
                  >
                    Unlock
                  </button>
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center gap-2 text-xs text-green-600 font-semibold">
                    <span>✓ Admin access granted</span>
                    <button onClick={() => setAdminAuth(false)} className="ml-2 text-neutral-400 hover:text-red-500 text-xs">Lock</button>
                  </div>

                  <div
                    className="border-2 border-dashed border-neutral-300 rounded-xl p-10 text-center hover:border-red-400 transition-colors cursor-pointer"
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
                  >
                    <div className="text-4xl mb-3">📊</div>
                    <p className="font-semibold text-neutral-700 mb-1">Drop XLSX / XLSM here</p>
                    <p className="text-sm text-neutral-500 mb-2">or click to browse</p>
                    <p className="text-xs text-amber-600 font-medium">
                      ⚠ File must be saved <strong>without a password</strong> before uploading.
                      Save As → uncheck "Encrypt with Password" in Excel first.
                    </p>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.xlsm,.xls,.csv"
                      className="hidden"
                      onChange={e => handleFile(e.target.files[0])}
                    />
                  </div>

                  {uploading && (
                    <p className="mt-3 text-sm text-blue-600 font-medium animate-pulse">{uploadMsg}</p>
                  )}
                  {!uploading && uploadMsg && (
                    <p className={`mt-3 text-sm font-semibold ${uploadMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                      {uploadMsg}
                    </p>
                  )}
                  {filename && (
                    <p className="mt-1 text-xs text-neutral-400">Current source: {filename}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── FILTERS ─────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-neutral-600" />Filter Inventory
              </h2>
              <button
                onClick={resetFilters}
                className="text-xs font-semibold text-neutral-400 hover:text-red-600 transition-colors"
              >
                Reset all
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Grade', val: fGrade,  set: setFGrade,  opts: grades },
                { label: 'Temper', val: fFinish, set: setFFinish, opts: finishes },
                { label: 'Thickness"', val: fThick, set: setFThick, opts: thicks },
                { label: 'Location', val: fLoc,   set: setFLoc,   opts: locations },
              ].map(({ label, val, set, opts }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold mb-1.5 text-neutral-600">{label}</label>
                  <select
                    value={val}
                    onChange={e => { set(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white font-medium outline-none"
                  >
                    {opts.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-neutral-600">Min Avail Lbs</label>
                <input
                  type="number"
                  value={fMinLbs}
                  onChange={e => { setFMinLbs(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white font-medium outline-none"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-neutral-600">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                  className="w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:ring-2 focus:ring-red-500 bg-white font-medium outline-none"
                  placeholder="Tag, grade, size…"
                />
              </div>
            </div>

            {/* Dimension range row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-3 border-t border-neutral-100">
              {[
                { label: 'Width ≥"',  val: fWidMin, set: setFWidMin },
                { label: 'Width ≤"',  val: fWidMax, set: setFWidMax },
                { label: 'Length ≥"', val: fLenMin, set: setFLenMin },
                { label: 'Length ≤"', val: fLenMax, set: setFLenMax },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="block text-xs font-semibold mb-1.5 text-neutral-400">{label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={val}
                    onChange={e => { set(e.target.value); setPage(1); }}
                    className="w-full px-3 py-2 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-red-500 bg-white outline-none"
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── RESULTS TABLE ───────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden">
            {/* Table header bar */}
            <div className="bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 px-5 py-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Results</h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {filtered.length.toLocaleString()} records &nbsp;·&nbsp;
                  <span className="text-neutral-200 font-semibold">{Math.round(totalLbs).toLocaleString()} lbs</span>
                  &nbsp;available&nbsp;·&nbsp;
                  <span className="text-green-400 font-semibold">
                    ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} OH value
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg bg-neutral-700 text-white hover:bg-neutral-600 disabled:opacity-30 font-bold"
                >◀</button>
                <span className="text-neutral-300 font-semibold min-w-16 text-center">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded-lg bg-neutral-700 text-white hover:bg-neutral-600 disabled:opacity-30 font-bold"
                >▶</button>
              </div>
            </div>

            {/* Content */}
            {loading ? (
              <div className="p-20 text-center text-neutral-400 animate-pulse text-sm font-medium">
                Loading inventory data…
              </div>
            ) : loadError ? (
              <div className="p-20 text-center text-red-500 font-medium">{loadError}</div>
            ) : inventory.length === 0 ? (
              <div className="p-20 text-center">
                <div className="text-5xl mb-4">📋</div>
                <p className="font-bold text-lg text-neutral-700 mb-1">No inventory loaded</p>
                <p className="text-sm text-neutral-400">
                  Click the ⚙ gear icon above to upload a report.
                </p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-20 text-center">
                <div className="text-5xl mb-4">🔍</div>
                <p className="font-bold text-lg text-neutral-700 mb-1">No records match</p>
                <button onClick={resetFilters} className="text-sm text-red-600 font-semibold hover:underline mt-1">
                  Reset filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-800">
                    <tr>
                      <TH col="grade"         label="Grade"       />
                      <TH col="finish"        label="Temper"      />
                      <TH col="thickness"     label='Thick"'      />
                      <TH col="width"         label='Width"'      />
                      <TH col="length"        label='Length"'     />
                      <TH col="location"      label="Location"    />
                      <TH col="available_lbs" label="Avail Lbs"   />
                      <TH col="on_hand"       label="On Hand"     />
                      <TH col="tag"           label="Tag #"       />
                      <TH col="tag_cost"      label="$/lb"        />
                      <TH col="master_age"    label="Age"         />
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((row, i) => {
                      const pcs       = approxPcs(row);
                      const locCls    = LOC_COLORS[row.location] || 'bg-neutral-100 text-neutral-700';
                      const hasResrv  = (row.on_hand - row.available_lbs) > 0.5;

                      return (
                        <tr
                          key={i}
                          className={`row-hover border-b border-neutral-100 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}
                        >
                          {/* Grade */}
                          <td className="px-3 py-2.5 font-bold text-neutral-900 whitespace-nowrap">
                            {row.grade}
                          </td>
                          {/* Temper */}
                          <td className="px-3 py-2.5 font-medium text-neutral-600 whitespace-nowrap">
                            {row.finish}
                          </td>
                          {/* Thickness */}
                          <td className="px-3 py-2.5 font-bold text-red-700 whitespace-nowrap">
                            {row.thickness_str}"
                          </td>
                          {/* Width */}
                          <td className="px-3 py-2.5 text-neutral-700">
                            {row.width}"
                          </td>
                          {/* Length */}
                          <td className="px-3 py-2.5 text-neutral-700">
                            {row.length}"
                          </td>
                          {/* Location */}
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${locCls}`}>
                              {row.location}
                            </span>
                          </td>
                          {/* Available Lbs */}
                          <td className="px-3 py-2.5 font-bold text-neutral-900 whitespace-nowrap">
                            {row.available_lbs.toLocaleString()}
                            {pcs !== null && (
                              <span className="ml-1.5 text-xs font-normal text-neutral-400">
                                (~{pcs} {pcs === 1 ? 'pc' : 'pcs'})
                              </span>
                            )}
                          </td>
                          {/* On Hand */}
                          <td className="px-3 py-2.5 text-neutral-500 whitespace-nowrap">
                            {row.on_hand.toLocaleString()}
                            {hasResrv && (
                              <span className="ml-1 text-xs text-amber-600 font-semibold" title="Has reservations">
                                ⚠ resrv
                              </span>
                            )}
                          </td>
                          {/* Tag */}
                          <td className="px-3 py-2.5 font-mono text-xs text-neutral-500 whitespace-nowrap">
                            {row.tag || '—'}
                          </td>
                          {/* $/lb */}
                          <td className="px-3 py-2.5 font-medium text-green-700 whitespace-nowrap">
                            ${row.tag_cost ? row.tag_cost.toFixed(4) : '—'}
                          </td>
                          {/* Age */}
                          <td className={`px-3 py-2.5 font-semibold whitespace-nowrap ${row.master_age > 120 ? 'text-red-600' : 'text-neutral-400'}`}>
                            {row.master_age > 0 ? row.master_age : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Bottom pagination */}
            {filtered.length > PAGE_SIZE && (
              <div className="border-t border-neutral-100 px-5 py-3 flex items-center justify-between text-sm bg-neutral-50">
                <span className="text-neutral-500 text-xs">
                  Showing {((page-1)*PAGE_SIZE)+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(1)} disabled={page===1} className="px-3 py-1 rounded-lg bg-neutral-200 text-neutral-700 hover:bg-neutral-300 disabled:opacity-30 font-semibold text-xs">««</button>
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="px-3 py-1 rounded-lg bg-neutral-200 text-neutral-700 hover:bg-neutral-300 disabled:opacity-30 font-semibold text-xs">‹ Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page>=totalPages} className="px-3 py-1 rounded-lg bg-neutral-200 text-neutral-700 hover:bg-neutral-300 disabled:opacity-30 font-semibold text-xs">Next ›</button>
                  <button onClick={() => setPage(totalPages)} disabled={page>=totalPages} className="px-3 py-1 rounded-lg bg-neutral-200 text-neutral-700 hover:bg-neutral-300 disabled:opacity-30 font-semibold text-xs">»»</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

// ─── Auth wrapper — keeps hooks rules clean ───────────────────────────────────
export default function PlateInventoryLookup() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('cml_plate_auth') === '1'
  );

  if (!authed) return <LoginGate onAuth={() => setAuthed(true)} />;
  return <PlateInventoryMain />;
}
