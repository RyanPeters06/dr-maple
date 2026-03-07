import { useAuth0 } from '@auth0/auth0-react';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const { isAuthenticated, loginWithRedirect, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-teal-600 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">Loading Dr. Nova...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 px-4">
        <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center">
          <div className="w-20 h-20 rounded-full bg-teal-600/20 border-2 border-teal-500 flex items-center justify-center text-4xl">
            🩺
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dr. Nova</h1>
            <p className="text-gray-400">Sign in to access your AI health assistant and view your health history.</p>
          </div>
          <button
            onClick={() => loginWithRedirect()}
            className="btn-primary w-full text-center"
          >
            Sign In / Create Account
          </button>
          <p className="text-xs text-gray-600">
            Secured by Auth0 · Your data is private and encrypted
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
