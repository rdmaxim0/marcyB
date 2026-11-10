import React from 'react';
import './MarcyLogo.scss';

interface MarcyLogoProps {
  size?: number;
  variant?: 'dark' | 'crimson' | 'cream';
  showWordmark?: boolean;
}

export const MarcyLogo: React.FC<MarcyLogoProps> = ({
  size = 38,
  variant = 'crimson',
  showWordmark = true,
}) => {
  const bgMap = {
    dark: '#0f0e0c',
    crimson: '#9e1b20',
    cream: '#f6f3dd',
  };

  const fillMap = {
    dark: '#f6f3dd',
    crimson: '#f6f3dd',
    cream: '#0f0e0c',
  };

  const lineColor = bgMap[variant];
  const braidColor = fillMap[variant];

  return (
    <div className="marcy-logo">
      <div
        style={{ width: size, height: size, backgroundColor: lineColor }}
        className="marcy-logo__badge"
      >
        <svg
          viewBox="0 0 120 120"
          width={size * 0.78}
          height={size * 0.78}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Símbolo .y trançado MarcyB."
        >
          <circle cx="22" cy="86" r="12" fill={braidColor} />
          <path d="M34 18 L52 18 L66 64 L50 68 Z" fill={braidColor} />
          <path
            d="M35 28 C44 32, 50 38, 56 46 M39 42 C47 46, 53 52, 60 60 M44 56 C49 60, 54 64, 58 68"
            stroke={lineColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M84 18 L102 18 C92 52, 80 86, 60 98 C50 102, 42 100, 42 86 C54 84, 62 76, 68 62 Z"
            fill={braidColor}
          />
          <path
            d="M96 28 C88 34, 82 40, 76 48 M90 44 C82 50, 76 56, 70 64 M84 62 C76 68, 68 74, 60 80 M74 78 C66 84, 56 90, 48 94"
            stroke={lineColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {showWordmark && (
        <span className="marcy-logo__wordmark">
          Marc
          <svg
            className="marcy-logo__inline-y"
            viewBox="0 0 100 115"
            width="17"
            height="20"
            fill="none"
            aria-hidden="true"
          >
            <path d="M22 14 L42 14 L56 62 L38 66 Z" fill="#f6f3dd" />
            <path
              d="M24 26 L46 42 M30 44 L50 58"
              stroke="#0f0e0c"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M78 14 L96 14 C86 52, 72 88, 50 102 C38 106, 28 102, 28 88 C42 86, 50 76, 56 60 Z"
              fill="#f6f3dd"
            />
            <path
              d="M88 26 L68 42 M80 46 L60 62 M70 68 L48 84"
              stroke="#0f0e0c"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          <span className='letterB'>B</span><span className="marcy-logo__dot">.</span>
        </span>
      )}
    </div>
  );
};