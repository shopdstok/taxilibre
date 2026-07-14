import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

interface OTPVerificationProps {
  type: 'email' | 'phone';
  identifier: string; // email or phone
}

const OTPVerification: React.FC<OTPVerificationProps> = ({ type, identifier }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimeout, setResendTimeout] = useState(0);
  const navigate = useNavigate();

  const { sendPhoneOTP, verifyPhoneOTP, sendEmailOTP, verifyEmailOTP } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (type === 'phone') {
        await verifyPhoneOTP(identifier, code);
      } else {
        await verifyEmailOTP(identifier, code);
      }

      // Navigate to next step based on context
      navigate('/profile/setup');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendTimeout(60); // Start 60 second cooldown
    try {
      if (type === 'phone') {
        await sendPhoneOTP(identifier);
      } else {
        await sendEmailOTP(identifier);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code');
    }
  };

  // Countdown timer
  React.useEffect(() => {
    if (resendTimeout > 0) {
      const timer = setTimeout(() => {
        setResendTimeout(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimeout]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Verify your {type === 'phone' ? 'phone number' : 'email address'}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We've sent a 6-digit code to your {type === 'phone' ? 'phone' : 'email'}.
            Please enter it below to continue.
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            {identifier}
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid grid-cols-6 gap-2">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <input
                key={i}
                type="text"
                maxLength={1}
                autoComplete={`one-time-code`}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 text-center focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="⁠"
                value={code[i] || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (/^[0-9]$/.test(value)) {
                    setCode(prev => {
                      const codes = prev.split('');
                      codes[i] = value;
                      return codes.join('');
                    });
                    if (i < 5) {
                      (e.target as HTMLInputElement).nextElementSibling?.focus();
                    }
                  } else {
                    setCode(prev => {
                      const codes = prev.split('');
                      codes[i] = '';
                      return codes.join('');
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !code[i] && i > 0) {
                    (e.target as HTMLInputElement).previousElementSibling?.focus();
                  }
                }}
                disabled={loading}
              />
            ))}
          </div>

          {type === 'phone' && (
            <div className="text-xs text-gray-500 mt-2">
              Standard messaging rates may apply. Reply STOP to opt out.
            </div>
          )}
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            disabled={resendTimeout > 0 || loading}
            className={`${resendTimeout > 0 ? 'opacity-50 cursor-not-allowed' : 'text-sm font-medium text-indigo-600 hover:text-indigo-500'}`}
            onClick={handleResend}
          >
            {resendTimeout > 0 ? `Resend in ${resendTimeout}s` : 'Resend code'}
          </button>

          <button
            type="button"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? 'Verifying...' : 'Verify and continue'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
