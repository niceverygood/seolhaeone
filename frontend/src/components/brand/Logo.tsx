type Props = {
  size?: number;
  showText?: boolean;
  color?: string;
  textColor?: string;
  className?: string;
};

export function Logo({
  size = 48,
  showText = true,
  color = "currentColor",
  textColor = "currentColor",
  className = "",
}: Props) {
  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="설해원 로고"
      >
        {/* Square frame with notched (concave) corners */}
        <path
          d="M 18 10
             L 82 10
             Q 82 18 90 18
             L 90 82
             Q 82 82 82 90
             L 18 90
             Q 18 82 10 82
             L 10 18
             Q 18 18 18 10 Z"
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <span
          className="font-display text-[10px] font-semibold tracking-[0.35em]"
          style={{ color: textColor }}
        >
          SEOLHAEONE
        </span>
      )}
    </div>
  );
}

/** 아이콘만 (텍스트 없이) */
export function LogoMark({
  size = 24,
  color = "currentColor",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="설해원"
    >
      <path
        d="M 18 10
           L 82 10
           Q 82 18 90 18
           L 90 82
           Q 82 82 82 90
           L 18 90
           Q 18 82 10 82
           L 10 18
           Q 18 18 18 10 Z"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
