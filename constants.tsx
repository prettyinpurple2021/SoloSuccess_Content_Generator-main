import React from 'react';

export const CalendarIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

export const ListIcon = ({ className = 'h-6 w-6' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

export const SparklesIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path
      fillRule="evenodd"
      d="M9 4.5a.75.75 0 01.75.75V9a.75.75 0 01-1.5 0V5.25A.75.75 0 019 4.5zm6.303 3.303a.75.75 0 010 1.06l-2.25 2.25a.75.75 0 01-1.06-1.06l2.25-2.25a.75.75 0 011.06 0zm-1.06 8.44l2.25 2.25a.75.75 0 01-1.06 1.06l-2.25-2.25a.75.75 0 011.06-1.06zM15 15a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V15.75a.75.75 0 01.75-.75zm-6.303-3.303a.75.75 0 010-1.06l2.25-2.25a.75.75 0 011.06 1.06l-2.25 2.25a.75.75 0 01-1.06 0zm1.06-8.44l-2.25-2.25a.75.75 0 011.06-1.06l2.25 2.25a.75.75 0 01-1.06 1.06zM9 15a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V15.75A.75.75 0 019 15zm-6.303 3.303a.75.75 0 010-1.06l2.25-2.25a.75.75 0 111.06 1.06l-2.25 2.25a.75.75 0 01-1.06 0zM4.5 9a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H5.25A.75.75 0 014.5 9zm11.303 3.303a.75.75 0 010-1.06l2.25-2.25a.75.75 0 011.06 1.06l-2.25 2.25a.75.75 0 01-1.06 0zM19.5 9a.75.75 0 01.75-.75h3.75a.75.75 0 010 1.5H20.25a.75.75 0 01-.75-.75z"
      clipRule="evenodd"
    />
  </svg>
);

export const CopyIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);

export const Spinner = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg
    className={`animate-spin ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <defs>
      <linearGradient id="spinner-gradient">
        <stop offset="0%" stopColor="var(--primary)" />
        <stop offset="100%" stopColor="var(--secondary)" />
      </linearGradient>
    </defs>
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="url(#spinner-gradient)"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

const SocialIcons: { [key: string]: React.FC<{ className?: string }> } = {
  Twitter: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path>
    </svg>
  ),
  LinkedIn: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"></path>
    </svg>
  ),
  Facebook: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v2.385z"></path>
    </svg>
  ),
  Instagram: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919 1.266-.058 1.644-.07 4.85-.07zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948s.014 3.667.072 4.947c.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072s3.667-.014 4.947-.072c4.358-.2 6.78-2.618 6.98-6.98.059-1.281.073-1.689.073-4.948s-.014-3.667-.072-4.947c-.2-4.358-2.618-6.78-6.98-6.98-1.281-.059-1.689-.073-4.948-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.162 6.162 6.162 6.162-2.759 6.162-6.162-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4s1.791-4 4-4 4 1.79 4 4-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44 1.441-.645 1.441-1.44-.645-1.44-1.441-1.44z"></path>
    </svg>
  ),
  Threads: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.93,16.52c-1.12-1.1-2.8-1.7-4.47-1.7s-3.35,0.6-4.47,1.7c-0.27,0.27-0.71,0.27-0.99,0s-0.27-0.71,0-0.99 c1.35-1.33,3.29-2.08,5.46-2.08s4.1,0.75,5.46,2.08c0.27,0.27,0.27,0.71,0,0.99S16.2,16.79,15.93,16.52z M12,12.44 c-2.17,0-4.1-0.75-5.46-2.08c-0.27-0.27-0.27-0.71,0-0.99s0.71-0.27,0.99,0c1.12,1.1,2.8,1.7,4.47,1.7s3.35-0.6,4.47-1.7 c0.27-0.27,0.71-0.27,0.99,0s0.27,0.71,0,0.99C16.1,11.69,14.17,12.44,12,12.44z M17.47,8.27c-0.27-0.27-0.71-0.27-0.99,0 c-1.12,1.1-2.8,1.7-4.47,1.7s-3.35-0.6-4.47-1.7c-0.27-0.27-0.71-0.27-0.99,0s-0.27,0.71,0,0.99c1.35,1.33,3.29,2.08,5.46,2.08 s4.1-0.75,5.46-2.08C17.74,8.98,17.74,8.54,17.47,8.27z M12,0C5.37,0,0,5.37,0,12s5.37,12,12,12s12-5.37,12-12S18.63,0,12,0z M12,22.29C6.32,22.29,1.71,17.68,1.71,12S6.32,1.71,12,1.71s10.29,4.6,10.29,10.29S17.68,22.29,12,22.29z"></path>
    </svg>
  ),
  Bluesky: ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"></path>
    </svg>
  ),
};

export const PLATFORMS = ['Twitter', 'LinkedIn', 'Facebook', 'Instagram', 'Threads', 'Bluesky'];
export const TONES = ['Informal', 'Formal', 'Humorous', 'Informative'];
export const AUDIENCES = ['General', 'Professionals', 'Students', 'Tech Enthusiasts'];

export const PLATFORM_CONFIG: {
  [key: string]: { icon: React.FC<{ className?: string }>; charLimit?: number };
} = {
  Twitter: { icon: SocialIcons['Twitter'], charLimit: 280 },
  LinkedIn: { icon: SocialIcons['LinkedIn'] },
  Facebook: { icon: SocialIcons['Facebook'] },
  Instagram: { icon: SocialIcons['Instagram'] },
  Threads: { icon: SocialIcons['Threads'], charLimit: 500 },
  Bluesky: { icon: SocialIcons['Bluesky'], charLimit: 300 },
};
