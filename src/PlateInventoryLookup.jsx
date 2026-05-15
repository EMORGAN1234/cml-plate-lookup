export default function PlateInventoryLookup() {
  return (
    <div
      style={{ fontFamily: "'Inter', sans-serif" }}
      className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-black flex items-center justify-center p-6"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.4s ease-out forwards; }
      ` }} />

      <div className="w-full max-w-md fade-up">
        <div className="bg-white rounded-2xl shadow-2xl border-t-4 border-red-600 p-10 text-center">

          {/* Logo */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg mx-auto mb-6">
            <svg className="w-7 h-7" viewBox="0 0 32 32" fill="none">
              <rect x="7" y="8" width="18" height="4" rx="2" fill="white"/>
              <rect x="5" y="15" width="18" height="4" rx="2" fill="white"/>
              <rect x="3" y="22" width="18" height="4" rx="2" fill="white"/>
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold text-neutral-900 tracking-tight mb-2">
            This tool has moved
          </h1>
          <p className="text-neutral-500 text-sm leading-relaxed mb-6">
            The Plate & Sheet Stock Lookup has been upgraded and consolidated into the new
            <span className="font-semibold text-neutral-700"> Transactional Stock Lookup</span> —
            which now covers all product categories across all warehouses.
          </p>

          <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 mb-6 text-left">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">To get access</p>
            <p className="text-sm text-neutral-700">
              Reach out to <span className="font-bold text-neutral-900">Erin Morgan</span> at{' '}
              <a
                href="mailto:emorgan@champagnemetals.com"
                className="text-red-600 font-semibold hover:underline"
              >
                emorgan@champagnemetals.com
              </a>{' '}
              to receive your sign-in credentials.
            </p>
          </div>

          <p className="text-xs text-neutral-400">
            Champagne Metals — authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}
