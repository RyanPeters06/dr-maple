interface DoctorAvatarProps {
  isSpeaking: boolean;
  isListening?: boolean;
}

export const DoctorAvatar = ({ isSpeaking, isListening }: DoctorAvatarProps) => {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Avatar circle */}
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 ${
            isSpeaking
              ? 'shadow-[0_0_60px_rgba(20,184,166,0.6)] scale-105'
              : isListening
              ? 'shadow-[0_0_40px_rgba(239,68,68,0.5)] scale-102'
              : 'shadow-[0_0_30px_rgba(20,184,166,0.2)]'
          }`}
        />

        {/* Pulse rings when speaking */}
        {isSpeaking && (
          <>
            <div className="absolute inset-0 rounded-full border-2 border-teal-400/40 animate-ping" />
            <div
              className="absolute inset-0 rounded-full border-2 border-teal-400/20 animate-ping"
              style={{ animationDelay: '0.3s' }}
            />
          </>
        )}

        {/* Face SVG */}
        <div className="relative w-48 h-48 rounded-full overflow-hidden bg-gradient-to-b from-teal-800 to-teal-950 border-4 border-teal-600/50">
          <svg viewBox="0 0 200 200" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            {/* Background */}
            <defs>
              <radialGradient id="faceGrad" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="#1a4a47" />
                <stop offset="100%" stopColor="#0d2b2a" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="100" fill="url(#faceGrad)" />

            {/* Stethoscope icon at top */}
            <text x="100" y="55" textAnchor="middle" fontSize="28" fill="#5eead4">🩺</text>

            {/* Eyes */}
            <ellipse cx="75" cy="90" rx="10" ry="11" fill="#e2f8f5" />
            <ellipse cx="125" cy="90" rx="10" ry="11" fill="#e2f8f5" />
            <circle cx="77" cy="91" r="6" fill="#134e4a" />
            <circle cx="127" cy="91" r="6" fill="#134e4a" />
            <circle cx="79" cy="88" r="2" fill="white" />
            <circle cx="129" cy="88" r="2" fill="white" />

            {/* Eyebrows — slight friendly arch */}
            <path d="M65 76 Q75 70 85 76" stroke="#5eead4" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M115 76 Q125 70 135 76" stroke="#5eead4" strokeWidth="2.5" fill="none" strokeLinecap="round" />

            {/* Nose */}
            <path d="M97 102 Q100 110 103 102" stroke="#5eead4" strokeWidth="1.5" fill="none" strokeLinecap="round" />

            {/* Mouth — smile or speaking */}
            {isSpeaking ? (
              <ellipse cx="100" cy="130" rx="18" ry="9" fill="#5eead4" opacity="0.9" />
            ) : (
              <path
                d="M82 126 Q100 140 118 126"
                stroke="#5eead4"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            )}

            {/* White coat collar */}
            <path d="M60 185 Q100 160 140 185" stroke="#ccfbf1" strokeWidth="3" fill="none" strokeLinecap="round" />
            <path d="M88 165 L92 185" stroke="#ccfbf1" strokeWidth="2" fill="none" />
            <path d="M112 165 L108 185" stroke="#ccfbf1" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* Name and status */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">Dr. Maple</h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          {isSpeaking ? (
            <>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-sm text-teal-400">Speaking...</span>
            </>
          ) : isListening ? (
            <>
              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
              <span className="text-sm text-red-400">Listening...</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-sm text-gray-400">AI Doctor · Online</span>
            </>
          )}
        </div>
      </div>

      {/* Speaking waveform bars */}
      <div
        className={`flex items-end gap-1 h-8 transition-opacity duration-300 ${
          isSpeaking ? 'opacity-100' : 'opacity-0'
        } ${isSpeaking ? 'avatar-speaking' : ''}`}
      >
        {[4, 7, 10, 14, 10, 7, 4].map((h, i) => (
          <div
            key={i}
            className="speak-bar w-1.5 rounded-full bg-teal-400"
            style={{ height: `${h * 2}px`, animationDelay: `${i * 0.08}s` }}
          />
        ))}
      </div>
    </div>
  );
};
