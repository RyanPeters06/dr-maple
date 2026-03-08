interface DoctorAvatarProps {
  isSpeaking: boolean;
  isListening?: boolean;
  isThinking?: boolean;
}

const getAvatarImage = (isSpeaking: boolean, isListening: boolean, isThinking: boolean) => {
  if (isListening) return '/mascot-listening.png';
  if (isSpeaking)  return '/mascot-talking.png';
  if (isThinking)  return '/mascot-thinking.png';
  return '/mascot-wave.png';
};

const getAvatarTranslate = (isSpeaking: boolean, isListening: boolean): string => {
  if (isListening) return 'translateY(22%)';
  if (isSpeaking)  return 'translateY(17%)';
  return 'translateY(12px)';
};

export const DoctorAvatar = ({ isSpeaking, isListening = false, isThinking = false }: DoctorAvatarProps) => {
  const avatarSrc = getAvatarImage(isSpeaking, isListening, isThinking);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Avatar */}
      <div className="relative">
        {isSpeaking && (
          <>
            <div className="absolute inset-0 rounded-full border-4 border-rose-300/60 animate-ping" />
            <div className="absolute inset-0 rounded-full border-4 border-rose-200/30 animate-ping" style={{ animationDelay: '0.3s' }} />
          </>
        )}
        <div className={`relative w-64 h-64 rounded-full overflow-hidden border-4 shadow-xl transition-all duration-300 ${
          isSpeaking  ? 'border-rose-400 shadow-rose-200' :
          isListening ? 'border-red-400 shadow-red-200'   :
          isThinking  ? 'border-amber-300 shadow-amber-100':
                        'border-rose-200 shadow-rose-100'
        } bg-rose-50`}>
          <img
            key={avatarSrc}
            src={avatarSrc}
            alt="Dr. Maple"
            className="w-full h-full object-contain object-center scale-105"
            style={{ transform: `scale(1.05) ${getAvatarTranslate(isSpeaking, isListening)}` }}
          />
        </div>
      </div>

      {/* Name / status */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-800">Dr. Maple</h2>
        <div className="flex items-center justify-center gap-2 mt-1">
          {isSpeaking ? (
            <><span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" /><span className="text-sm text-rose-500">Speaking...</span></>
          ) : isListening ? (
            <><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /><span className="text-sm text-red-500">Listening...</span></>
          ) : (
            <><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-sm text-gray-400">AI Doctor · Online</span></>
          )}
        </div>
      </div>

      {/* Speaking waveform */}
      <div className={`flex items-end gap-1 h-8 transition-opacity duration-300 ${isSpeaking ? 'opacity-100 avatar-speaking' : 'opacity-0'}`}>
        {[4, 7, 10, 14, 10, 7, 4].map((h, i) => (
          <div key={i} className="speak-bar w-1.5 rounded-full bg-rose-400" style={{ height: `${h * 2}px`, animationDelay: `${i * 0.08}s` }} />
        ))}
      </div>
    </div>
  );
};
