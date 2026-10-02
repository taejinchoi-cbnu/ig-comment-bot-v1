export const theme = {
  colors: {
    brand: '#3478F6',
    brandStrong: '#2467E8',
    brandSoft: '#EAF1FF',
    canvas: '#F3F6FE',
    surface: '#FFFFFF',
    text: '#121826',
    muted: '#667085',
    subtle: '#98A2B3',
    line: '#E8ECF4',
    success: '#16794A',
    successBg: '#EFFBF4',
    warning: '#9A6700',
    warningBg: '#FFF8E6',
    danger: '#D92D20',
  },
  radius: {
    card: '28px',
    field: '20px',
    pill: '999px',
  },
  shadow: {
    card: '0 16px 44px rgba(35, 55, 90, 0.10)',
    floating: '0 12px 28px rgba(52, 120, 246, 0.28)',
  },
} as const;

export type AppTheme = typeof theme;

declare module '@emotion/react' {
  export interface Theme extends AppTheme {}
}
