import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { CANADIAN_RESOURCES } from '../constants';

export const Landing = () => {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const navigate = useNavigate();

  const handleCTA = () => {
    if (isAuthenticated) {
      navigate('/call');
    } else {
      loginWithRedirect();
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🩺</span>
          <span className="text-xl font-bold text-white">Dr. Maple</span>
          <span className="text-xs bg-teal-600/20 text-teal-400 border border-teal-600/30 px-2 py-0.5 rounded-full ml-1">
            Hack Canada 2026
          </span>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <button onClick={() => navigate('/dashboard')} className="text-gray-400 hover:text-white text-sm transition-colors">
                My History
              </button>
              <button onClick={() => navigate('/call')} className="btn-primary py-2 px-5 text-sm">
                Start Call
              </button>
            </>
          ) : (
            <button onClick={() => loginWithRedirect()} className="btn-primary py-2 px-5 text-sm">
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto">
        <div className="mb-6 relative">
          <div className="w-28 h-28 rounded-full bg-teal-600/20 border-2 border-teal-500/50 flex items-center justify-center text-6xl mx-auto shadow-2xl shadow-teal-900/50">
            🩺
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm animate-pulse">
            🍁
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 leading-tight">
          Dr. Maple
        </h1>
        <p className="text-xl text-teal-400 font-medium mb-4">
          "The call you make before the call"
        </p>
        <p className="text-gray-400 text-lg max-w-2xl mb-10">
          A voice + vision AI triage assistant for Canadians. Talk to Dr. Maple about your symptoms, 
          get real-time vitals from your camera, and receive a clear recommendation — before you 
          decide whether to call 911 or rest at home.
        </p>

        <button onClick={handleCTA} className="btn-primary text-lg px-10 py-4 mb-4">
          {isAuthenticated ? '📞 Start a Call with Dr. Maple' : '🚀 Get Started — It\'s Free'}
        </button>
        <p className="text-xs text-gray-600">
          Not a substitute for professional medical advice · In emergencies, call {CANADIAN_RESOURCES.emergency}
        </p>

        {/* Feature grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-16 w-full max-w-3xl">
          {[
            { icon: '🎙️', title: 'Voice Conversation', desc: 'Talk naturally about your symptoms in plain English' },
            { icon: '📷', title: 'Camera Vitals', desc: 'Real-time heart rate, breathing & stress from your webcam' },
            { icon: '🧠', title: 'AI Triage', desc: 'Gemini AI synthesizes everything into a clear recommendation' },
            { icon: '🗺️', title: 'Clinic Finder', desc: 'Nearby clinics & ERs with estimated wait times' },
            { icon: '📄', title: 'Health Report', desc: 'Download a PDF summary of every session' },
            { icon: '🍁', title: 'Canadian-First', desc: '811, Telehealth, province-specific resources built in' },
          ].map((f) => (
            <div key={f.title} className="card hover:border-teal-700 transition-colors text-left">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-white text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-500">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Disclaimer */}
        <div className="mt-12 max-w-2xl text-center">
          <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-6 py-4 text-xs text-amber-400/80">
            ⚠️ Dr. Maple is an AI assistant for triage guidance only. It is NOT a substitute for professional 
            medical advice, diagnosis, or treatment. In case of emergency, call 911 immediately. 
            For non-emergency advice, call 811 (Ontario/BC/AB) or your provincial telehealth line.
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-gray-700 py-4">
        Built with ❤️ for Hack Canada 2026 · Dr. Maple is not a licensed medical service
      </footer>
    </div>
  );
};
