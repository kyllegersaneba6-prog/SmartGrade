import { useId, useSyncExternalStore } from 'react';
import { LoaderCircle, RefreshCw, ServerOff } from 'lucide-react';
import {
  checkBackendAvailability, getBackendStatus, subscribeBackendStatus,
} from '../../utils/backendAvailability';

const BackendAvailability = ({ children }) => {
  const serverGradientId = useId();
  const { status, checking, hasConnected } = useSyncExternalStore(
    subscribeBackendStatus, getBackendStatus, getBackendStatus,
  );
  const unavailable = status === 'unavailable';

  return (
    <>
      {/* Preserve mounted forms/drafts during a later outage; do not redirect,
          clear credentials, reload the browser, or automatically replay writes. */}
      {hasConnected && (
        <div hidden={status !== 'available'} inert={status !== 'available'}>
          {children}
        </div>
      )}
      {status !== 'available' && (
        <main
          className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto p-4 sm:p-6 font-sans"
          style={{ backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F3F6FA 50%, #E2E8F0 100%)' }}
        >
          <section
            role="status"
            aria-live="polite"
            aria-labelledby="backend-status-title"
            className="my-auto w-full max-w-lg rounded-2xl p-8 md:p-10 text-center shadow-[0_18px_50px_-10px_rgba(71,85,105,0.45)]"
          >
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-800 bg-gray-50 text-amber-700">
              {unavailable ? (
                <ServerOff size={28} stroke={`url(#${serverGradientId})`} aria-hidden="true">
                  <defs>
                    <linearGradient id={serverGradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="0">
                      <stop offset="0%" stopColor="#0c1925" />
                      <stop offset="50%" stopColor="#102132" />
                      <stop offset="100%" stopColor="#142a3f" />
                    </linearGradient>
                  </defs>
                </ServerOff>
              ) : <LoaderCircle size={28} className="animate-spin" aria-hidden="true" />}
            </div>
            <h1 id="backend-status-title" className="mb-3 text-xl sm:text-2xl font-bold text-[#0c1925]">
              {unavailable ? 'Service Unavailable' : 'Connecting to Service'}
            </h1>
            {unavailable && (
              <>
                <p className="text-sm leading-relaxed text-gray-600">
                  The service could not be started. We're unable to process your request at this time.
                </p>
                <button
                  type="button"
                  onClick={() => { void checkBackendAvailability(); }}
                  disabled={checking}
                  className="mx-auto mt-7 flex items-center justify-center gap-2 rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-[#0c1925] hover:bg-amber-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0c1925] disabled:opacity-60"
                >
                  <RefreshCw size={16} className={checking ? 'animate-spin' : ''} aria-hidden="true" />
                  {checking ? 'Checking Connection...' : 'Try Again'}
                </button>
              </>
            )}
          </section>
        </main>
      )}
    </>
  );
};

export default BackendAvailability;
