import { useAuth0 } from '@auth0/auth0-react';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const { isAuthenticated, loginWithRedirect, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-rose-600 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">Loading Dr. Maple...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50 px-4">
        <div className="bg-white rounded-3xl shadow-xl border border-rose-100 p-10 flex flex-col items-center gap-6 max-w-sm w-full text-center">
          <img src="/mascot-wave.png" alt="Dr. Maple" className="w-44 h-44 object-contain drop-shadow-md" />
          <div>
            <img src="/dr-maple-logo.png" alt="Dr. Maple" className="h-28 object-contain mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Sign in to access your AI health assistant and view your health history.</p>
          </div>
          <button onClick={() => loginWithRedirect()} className="btn-primary w-full text-center">
            Sign In / Create Account
          </button>
          <p className="text-xs text-gray-400">Secured by Auth0 · Your data is private and encrypted</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
