import type { Config } from 'tailwindcss';

/**
 * Classora design tokens — "Porcelain Minimalist".
 *
 * These tokens are the single source of truth for the visual language and are
 * derived from the approved Stitch UI. When the exported Stitch HTML is
 * available, any token that differs should be updated HERE (never inline).
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces
        canvas: '#F5F5F7',
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#FAFAFB',
          sunken: '#F0F0F3',
        },
        // Text
        ink: {
          DEFAULT: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        // Brand accent (premium indigo / blue-violet)
        brand: {
          50: '#EEF0FF',
          100: '#E0E3FF',
          200: '#C6C9FF',
          300: '#A5A8FF',
          400: '#8183FA',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        // Attendance status
        safe: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warning: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        critical: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#EF4444',
          600: '#DC2626',
          700: '#B91C1C',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['30px', { lineHeight: '38px', letterSpacing: '-0.03em', fontWeight: '700' }],
        'metric-xl': ['34px', { lineHeight: '42px', letterSpacing: '-0.03em', fontWeight: '700' }],
        'metric-sm': ['19px', { lineHeight: '24px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['23px', { lineHeight: '29px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-md': ['18px', { lineHeight: '24px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-sm': ['15px', { lineHeight: '21px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg': ['14.5px', { lineHeight: '21px', letterSpacing: '-0.005em', fontWeight: '400' }],
        'body-md': ['13px', { lineHeight: '18px', letterSpacing: '0em', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '16px', letterSpacing: '0em', fontWeight: '400' }],
        'label-lg': ['13px', { lineHeight: '17px', letterSpacing: '0.01em', fontWeight: '600' }],
        'label-md': ['11.5px', { lineHeight: '15px', letterSpacing: '0.02em', fontWeight: '600' }],
        'label-sm': ['10.5px', { lineHeight: '14px', letterSpacing: '0.03em', fontWeight: '500' }],
      },
      borderRadius: {
        card: '24px',
        'card-lg': '28px',
        block: '16px',
        pill: '9999px',
      },
      boxShadow: {
        // Extremely soft ambient shadows — never harsh.
        ambient: '0 1px 2px rgba(17, 24, 39, 0.04), 0 8px 24px -12px rgba(17, 24, 39, 0.10)',
        elevated: '0 2px 4px rgba(17, 24, 39, 0.04), 0 16px 40px -16px rgba(17, 24, 39, 0.14)',
        floating: '0 8px 16px -6px rgba(17, 24, 39, 0.10), 0 24px 48px -20px rgba(17, 24, 39, 0.22)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
      spacing: {
        touch: '44px',
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
      },
      maxWidth: {
        app: '430px',
        'app-wide': '560px',
        content: '1100px',
      },
      transitionTimingFunction: {
        porcelain: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'progress-grow': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 280ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 180ms ease-out',
        'rise-in': 'rise-in 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'progress-grow': 'progress-grow 600ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
