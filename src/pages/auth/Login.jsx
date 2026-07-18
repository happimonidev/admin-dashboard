import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import Logo from '../../components/ui/Logo';

export default function Login() {
  const { requestOTP } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async ({ email, password }) => {
    setServerError('');
    try {
      const adminID = await requestOTP(email, password);
      navigate('/verify-otp', { state: { adminID, email } });
    } catch (err) {
      setServerError(err.message || 'Unable to sign in. Please try again.');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-porcelain px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo size="lg" wordmarkPlacement="bottom" />
          <p className="mt-2 text-sm text-ink-500">Admin sign in</p>
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

          <label className="block text-sm font-medium text-ink-700">
            Email
            <input
              type="email"
              autoComplete="email"
              className="mt-1 block w-full rounded-control border border-ink-200 px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-dodger-500"
              placeholder="you@appcredit.com"
              {...register('email', { required: 'Email is required' })}
            />
          </label>
          {errors.email && (
            <p className="mt-1 text-xs text-danger-500">
              {errors.email.message}
            </p>
          )}

          <label className="mt-4 block text-sm font-medium text-ink-700">
            Password
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="block w-full rounded-control border border-ink-200 px-3 py-2 pr-10 text-sm text-ink-900 focus:border-dodger-500"
                {...register('password', { required: 'Password is required' })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          {errors.password && (
            <p className="mt-1 text-xs text-danger-500">
              {errors.password.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-6 w-full rounded-control bg-dodger-500 py-2.5 text-sm font-semibold text-white hover:bg-dodger-600 disabled:opacity-60"
          >
            {isSubmitting ? 'Sending code…' : 'Continue'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-400">
          A one-time code will be sent to your email to complete sign in.
        </p>
      </div>
    </div>
  );
}
