import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../auth/AuthContext';
import Logo from '../../components/ui/Logo';

export default function VerifyOtp() {
  const { verifyOTP, resendOTP } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resending, setResending] = useState(false);

  const adminID = location.state?.adminID;
  const email = location.state?.email;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  // Reached directly without going through login first — send back.
  if (!adminID) {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = async ({ otp }) => {
    setServerError('');
    try {
      const newSession = await verifyOTP(adminID, otp);
      navigate(newSession.isFirstLogin ? '/force-password-change' : '/', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Invalid code. Please try again.');
    }
  };

  const handleResend = async () => {
    setServerError('');
    setResendMessage('');
    setResending(true);
    try {
      const message = await resendOTP(adminID);
      setResendMessage(message);
    } catch (err) {
      setServerError(err.message || 'Could not resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelain px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" wordmarkPlacement="bottom" />
          <p className="mt-2 text-sm text-ink-500">
            Enter the code sent to {email || 'your email'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="rounded-card bg-white p-6 shadow-sm ring-1 ring-ink-100"
          noValidate
        >
          {serverError && (
            <div
              role="alert"
              className="mb-4 rounded-control bg-danger-50 px-3 py-2 text-sm text-danger-700"
            >
              {serverError}
            </div>
          )}
          {resendMessage && (
            <div className="mb-4 rounded-control bg-success-50 px-3 py-2 text-sm text-success-700">
              {resendMessage}
            </div>
          )}

          <label className="block text-sm font-medium text-ink-700">
            6-digit code
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-center text-lg tracking-[0.5em] text-ink-900 focus:border-dodger-500"
              placeholder="······"
              {...register('otp', {
                required: 'Enter the 6-digit code',
                pattern: { value: /^\d{6}$/, message: 'Code must be 6 digits' },
              })}
            />
          </label>
          {errors.otp && (
            <p className="mt-1 text-xs text-danger-500">{errors.otp.message}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-control bg-dodger-500 py-2.5 text-sm font-semibold text-white hover:bg-dodger-600 disabled:opacity-60"
          >
            {isSubmitting ? 'Verifying…' : 'Verify and sign in'}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="mt-3 w-full rounded-control py-2 text-sm font-medium text-dodger-600 hover:bg-dodger-50 disabled:opacity-60"
          >
            {resending ? 'Resending…' : "Didn't get a code? Resend"}
          </button>
        </form>
      </div>
    </div>
  );
}
