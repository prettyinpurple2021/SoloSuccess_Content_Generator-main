/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
    './*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Updated to use the fonts from your CSS file
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        body: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Your existing colors
        primary: {
          DEFAULT: '#ff0080',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#00ff80',
          foreground: '#000000',
        },
        accent: {
          DEFAULT: '#8000ff',
          foreground: '#ffffff',
        },
        muted: {
          DEFAULT: 'rgba(255, 255, 255, 0.1)',
          foreground: '#ffffff',
        },
        card: {
          DEFAULT: 'rgba(255, 255, 255, 0.95)',
          foreground: '#000000',
        },
        border: 'rgba(255, 255, 255, 0.3)',
        background: '#000000',
        foreground: '#ffffff',

        // New colors from your CSS file
        'holo-pink': '#ff69b4',
        'holo-purple': '#da70d6',
        'holo-cyan': '#00ffff',
        'holo-gold': '#ffd700',
        'holo-silver': '#c0c0c0',
        'glass-border': 'rgba(255, 255, 255, 0.2)',
      },
      backgroundImage: {
        // New gradients from your CSS file
        'rainbow-gradient':
          'linear-gradient(45deg, #ff0080, #ff8c00, #ffd700, #00ff80, #00bfff, #8000ff, #ff0080)',
        'glass-bg': 'rgba(255, 255, 255, 0.1)',
      },
      boxShadow: {
        // Your existing shadows
        'neon-primary': '0 0 30px rgba(255, 0, 128, 0.8), 0 0 60px rgba(255, 0, 128, 0.4)',
        'neon-secondary': '0 0 30px rgba(0, 255, 128, 0.8), 0 0 60px rgba(0, 255, 128, 0.4)',
        'neon-accent': '0 0 30px rgba(128, 0, 255, 0.8), 0 0 60px rgba(128, 0, 255, 0.4)',
        rainbow:
          '0 0 40px rgba(255, 0, 128, 0.6), 0 0 80px rgba(0, 255, 128, 0.4), 0 0 120px rgba(128, 0, 255, 0.3)',
        glass: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
        holographic:
          '0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 0, 255, 0.3), 0 0 60px rgba(0, 255, 255, 0.2)',

        // New shadows from your CSS file
        '3d': '0 10px 30px rgba(255, 105, 180, 0.3), 0 20px 60px rgba(138, 43, 226, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
        '3d-hover':
          '0 15px 40px rgba(255, 105, 180, 0.4), 0 25px 70px rgba(138, 43, 226, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)',
      },
      backdropBlur: {
        xs: '2px',
        // Added the stronger blur from your glass effect
        xl: '20px',
      },
      animation: {
        // Merged and added animations
        sparkle: 'sparkle 2s infinite',
        'rainbow-shift': 'rainbow-shift 3s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        holographic: 'holographic 4s linear infinite',
        spin: 'spin 1s linear infinite',
      },
      keyframes: {
        // Merged and added keyframes from your CSS file
        sparkle: {
          '0%, 100%': { opacity: '0', transform: 'scale(0) rotate(0deg)' },
          '50%': { opacity: '1', transform: 'scale(1) rotate(180deg)' },
        },
        'rainbow-shift': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        'glow-pulse': {
          '0%, 100%': {
            boxShadow:
              '0 0 20px rgba(255, 105, 180, 0.5), 0 0 40px rgba(255, 105, 180, 0.3), 0 0 60px rgba(255, 105, 180, 0.1)',
          },
          '50%': {
            boxShadow:
              '0 0 30px rgba(255, 105, 180, 0.8), 0 0 60px rgba(255, 105, 180, 0.5), 0 0 90px rgba(255, 105, 180, 0.3)',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(5deg)' },
        },
        holographic: {
          '0%, 100%': { backgroundPosition: '0% 50%', filter: 'hue-rotate(0deg)' },
          '25%': { backgroundPosition: '100% 50%', filter: 'hue-rotate(90deg)' },
          '50%': { backgroundPosition: '100% 100%', filter: 'hue-rotate(180deg)' },
          '75%': { backgroundPosition: '0% 100%', filter: 'hue-rotate(270deg)' },
        },
        spin: {
          to: { transform: 'rotate(360deg)' },
        },
      },
    },
  },
  plugins: [],
};
