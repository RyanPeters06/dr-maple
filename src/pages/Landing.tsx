import { useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';
import { CANADIAN_RESOURCES } from '../constants';
import { useScrollReveal } from '../hooks/useScrollReveal';

export const Landing = () => {
  const { loginWithRedirect, isAuthenticated } = useAuth0();
  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  useScrollReveal(pageRef);

  return (
    <div ref={pageRef} className="min-h-screen bg-white flex flex-col overflow-hidden">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-rose-100">
        <button type="button" onClick={() => navigate('/')} className="flex items-center">
          <img src="/dr-maple-logo.png" alt="Dr. Maple" className="h-28 object-contain" />
        </button>

        <div className="hidden md:flex items-center gap-8">
          {['How It Works', 'Features', 'For Canadians'].map(label => (
            <a
              key={label}
              href={`#${label.toLowerCase().replace(/\s+/g, '-')}`}
              className="text-sm text-gray-500 hover:text-rose-600 transition-colors font-medium"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <button onClick={() => navigate('/dashboard')} className="btn-primary py-2 px-5 text-sm">
              Go to Dashboard
            </button>
          ) : (
            <>
              <button onClick={() => loginWithRedirect()} className="text-sm text-gray-500 hover:text-rose-600 font-medium transition-colors">
                Sign In
              </button>
              <button onClick={() => loginWithRedirect()} className="btn-primary py-2 px-5 text-sm">
                Try for Free
              </button>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="flex items-center px-8 md:px-16 lg:px-24 py-14 max-w-7xl mx-auto w-full gap-8">
        {/* Left */}
        <div className="flex-1 flex flex-col gap-6 max-w-xl">
          <h1 className="fade-in-up delay-1 text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight">
            Dr. Maple —{' '}
            <span className="text-rose-600">Your Personal</span>{' '}
            AI Health Assistant
          </h1>

          <p className="fade-in-up delay-2 text-gray-500 text-lg leading-relaxed">
            A voice and vision AI triage assistant designed for Canadians. Talk about your symptoms,
            get real-time vitals from your camera, and receive a clear recommendation — before you
            decide to call 911 or rest at home.
          </p>

          <div className="fade-in-up delay-3 flex items-center gap-4 flex-wrap">
            {isAuthenticated ? (
              <button onClick={() => navigate('/dashboard')} className="btn-primary text-base px-8 py-3.5">
                Go to Dashboard
              </button>
            ) : (
              <button onClick={() => loginWithRedirect()} className="btn-primary text-base px-8 py-3.5">
                Get Started Free
              </button>
            )}
            <button
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 text-gray-500 hover:text-rose-600 text-sm font-medium transition-colors"
            >
              <span className="w-8 h-8 rounded-full border-2 border-gray-200 hover:border-rose-300 flex items-center justify-center text-xs transition-colors">
                ▶
              </span>
              See how it works
            </button>
          </div>

          <p className="fade-in-up delay-4 text-xs text-gray-400">
            Not a substitute for professional medical advice · In emergencies, call {CANADIAN_RESOURCES.emergency}
          </p>
        </div>

        {/* Right — mascot */}
        <div className="hidden md:flex flex-1 items-center justify-center relative">
          <div className="absolute w-96 h-96 rounded-full bg-rose-100 blur-3xl opacity-60" />
          <div className="absolute w-64 h-64 rounded-full bg-red-50 blur-2xl opacity-80 translate-x-10 translate-y-6" />

          <div className="relative z-10 fade-in-up delay-2">
            {/* Speech bubble */}
            <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-max">
              <div className="relative bg-white border border-rose-200 shadow-md rounded-2xl px-5 py-3">
                <p className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  How can I help you today? 🍁
                </p>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-rose-200 rotate-45" />
              </div>
            </div>

            <img
              src="/mascot-wave.png"
              alt="Dr. Maple"
              className="w-80 h-80 object-contain drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ── Feature cards ───────────────────────────────────────────────────── */}
      <section id="features" className="px-8 md:px-16 lg:px-24 pb-16 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { img: '/mascot-phone.png',  title: 'Voice Conversation', desc: 'Talk naturally about your symptoms', delay: 'delay-1' },
            { img: '/mascot-heart.png',  title: 'Camera Vitals',       desc: 'Real-time heart rate and stress from your webcam', delay: 'delay-2' },
            { img: '/mascot-report.png', title: 'AI Triage',           desc: 'Clear recommendation — ER, clinic, or home', delay: 'delay-3' },
            { img: '/mascot-map.png',    title: 'Clinic Finder',       desc: 'Nearby ERs and walk-ins with wait times', delay: 'delay-4' },
          ].map((f) => (
            <div key={f.title} className={`fade-in-up ${f.delay} bg-white border border-rose-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-rose-300 transition-all group flex flex-col items-center text-center`}>
              <img
                src={f.img}
                alt={f.title}
                className="w-24 h-24 object-contain mb-3 group-hover:scale-105 transition-transform duration-300"
              />
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{f.title}</h3>
              <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-rose-50 px-8 md:px-16 lg:px-24 py-16">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Describe Your Symptoms', desc: 'Talk to Dr. Maple naturally by voice. No forms, no typing — just a conversation.', delay: 'delay-1' },
              { step: '02', title: 'Vitals Captured Live',   desc: 'Your webcam passively monitors heart rate, breathing rate, and stress level in real time.', delay: 'delay-3' },
              { step: '03', title: 'Get Your Triage Result', desc: 'Dr. Maple gives you a clear action — plus a downloadable PDF report and nearby clinic options.', delay: 'delay-5' },
            ].map((s) => (
              <div key={s.step} className={`fade-in-up ${s.delay} bg-white rounded-2xl p-6 border border-rose-100 shadow-sm flex flex-col gap-3`}>
                <span className="text-xs font-bold text-rose-400 tracking-widest">{s.step}</span>
                <h3 className="font-bold text-gray-800 text-lg">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Canadian resources ──────────────────────────────────────────────── */}
      <section id="for-canadians" className="px-8 md:px-16 lg:px-24 py-14 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center gap-8 bg-white border border-rose-100 rounded-3xl p-8 shadow-sm">
          <img src="/mascot-wave.png" alt="Dr. Maple" className="w-28 h-28 object-contain drop-shadow" />
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Built for Canadians</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              Dr. Maple understands the Canadian healthcare system — long ER waits, walk-in availability,
              and the value of telehealth. Every session includes province-specific resources like{' '}
              <span className="text-rose-600 font-semibold">811 (Health Line)</span>,
              Telehealth Ontario, Health Link Alberta, and more.
            </p>
          </div>
          <button onClick={() => isAuthenticated ? navigate('/dashboard') : loginWithRedirect()} className="btn-primary whitespace-nowrap px-8 py-3.5">
            {isAuthenticated ? 'Go to Dashboard' : 'Get Started Free'}
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-rose-100 bg-white px-8 py-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <img src="/dr-maple-logo.png" alt="Dr. Maple" className="h-20 object-contain" />
          <p className="text-xs text-gray-400 text-center max-w-md">
            Dr. Maple is for triage guidance only — not a substitute for professional medical advice.
            In emergencies, call 911. For non-emergency advice, call 811.
          </p>
          <p className="text-xs text-gray-300">Built for Hack Canada 2026</p>
        </div>
      </footer>

    </div>
  );
};
