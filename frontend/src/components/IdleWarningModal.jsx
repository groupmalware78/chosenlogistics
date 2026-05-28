import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const WARNING_SECONDS = 60;

export default function IdleWarningModal() {
  const { idleWarning, extendSession, logout } = useAuth();
  const [countdown, setCountdown] = useState(WARNING_SECONDS);

  // Reset and start countdown whenever the warning appears
  useEffect(() => {
    if (!idleWarning) {
      setCountdown(WARNING_SECONDS);
      return;
    }
    setCountdown(WARNING_SECONDS);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [idleWarning]);

  if (!idleWarning) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <ClockIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Session Expiring Soon</h2>
            <p className="text-sm text-gray-500">You've been inactive for a while</p>
          </div>
        </div>

        {/* Countdown ring */}
        <div className="flex flex-col items-center my-5">
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke={countdown <= 15 ? '#ef4444' : '#f59e0b'}
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - countdown / WARNING_SECONDS)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-xl font-bold tabular-nums ${countdown <= 15 ? 'text-red-500' : 'text-amber-600'}`}>
                {countdown}
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-3 text-center">
            You'll be logged out automatically in{' '}
            <span className={`font-semibold ${countdown <= 15 ? 'text-red-500' : 'text-amber-600'}`}>
              {countdown}s
            </span>
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={extendSession}
            className="flex-1 bg-blue-700 hover:bg-blue-800 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Stay Logged In
          </button>
          <button
            onClick={logout}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}

function ClockIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
