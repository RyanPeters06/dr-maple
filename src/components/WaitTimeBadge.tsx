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
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-red-100 text-red-600 border border-red-200'
          }`}
        >
          {isOpen ? 'Open' : 'Closed'}
        </span>
      )}
      <span
        className={`${textSize} px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-medium`}
      >
        ⏱ {waitTime}
      </span>
    </div>
  );
};
