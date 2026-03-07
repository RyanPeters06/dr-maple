interface WaitTimeBadgeProps {
  waitTime: string;
  isOpen?: boolean;
  size?: 'sm' | 'md';
}

export const WaitTimeBadge = ({ waitTime, isOpen, size = 'md' }: WaitTimeBadgeProps) => {
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isOpen !== undefined && (
        <span
          className={`${textSize} px-2 py-0.5 rounded-full font-medium ${
            isOpen
              ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-700/40'
              : 'bg-red-900/40 text-red-400 border border-red-700/30'
          }`}
        >
          {isOpen ? 'Open' : 'Closed'}
        </span>
      )}
      <span
        className={`${textSize} px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-700/30 font-medium`}
      >
        ⏱ {waitTime}
      </span>
    </div>
  );
};
