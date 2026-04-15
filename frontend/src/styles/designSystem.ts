/**
 * Athens 2.0 Global Design System
 * Based on Incident Management inline CSS pattern
 * 
 * Usage:
 * import { pageStyles, cardStyles, buttonStyles, badgeStyles, kpiCardStyles } from '@/styles/designSystem';
 * <div style={pageStyles.container}>...</div>
 */

// ============================================================================
// COLOR PALETTE
// ============================================================================
export const colors = {
  // Backgrounds
  pageBackground: '#f0f2f5',
  cardBackground: '#fff',
  
  // Borders
  border: '#d9d9d9',
  borderHover: '#1890ff',
  
  // Primary
  primary: '#1890ff',
  primaryHover: '#40a9ff',
  primaryActive: '#096dd9',
  
  // Status Colors
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1890ff',
  
  // Text
  textPrimary: '#262626',
  textSecondary: '#595959',
  textMuted: '#8c8c8c',
  textDisabled: '#bfbfbf',
  
  // Grays
  gray50: '#fafafa',
  gray100: '#f5f5f5',
  gray200: '#e8e8e8',
  gray300: '#d9d9d9',
  gray400: '#bfbfbf',
  gray500: '#8c8c8c',
  gray600: '#595959',
  gray700: '#262626',
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================
export const typography = {
  h1: { fontSize: '24px', fontWeight: 600, lineHeight: '32px' },
  h2: { fontSize: '18px', fontWeight: 600, lineHeight: '24px' },
  h3: { fontSize: '16px', fontWeight: 600, lineHeight: '22px' },
  body: { fontSize: '14px', fontWeight: 400, lineHeight: '22px' },
  small: { fontSize: '12px', fontWeight: 400, lineHeight: '20px' },
  caption: { fontSize: '12px', fontWeight: 400, lineHeight: '16px', color: colors.textMuted },
};

// ============================================================================
// SPACING
// ============================================================================
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  xxl: '32px',
};

// ============================================================================
// PAGE STYLES
// ============================================================================
export const pageStyles = {
  container: {
    padding: '24px',
    background: colors.pageBackground,
    minHeight: '100vh',
  } as React.CSSProperties,
  
  header: {
    marginBottom: '16px',
  } as React.CSSProperties,
  
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    margin: 0,
  } as React.CSSProperties,
};

// ============================================================================
// CARD STYLES
// ============================================================================
export const cardStyles = {
  base: {
    background: colors.cardBackground,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '24px',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  
  hover: {
    background: colors.cardBackground,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '24px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  } as React.CSSProperties,
  
  compact: {
    background: colors.cardBackground,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '12px',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
};

// ============================================================================
// KPI CARD STYLES
// ============================================================================
export const kpiCardStyles = {
  container: {
    background: colors.cardBackground,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  
  iconRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    background: colors.gray100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  } as React.CSSProperties,
  
  content: {
    flex: 1,
  } as React.CSSProperties,
  
  value: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: colors.textPrimary,
    margin: 0,
    lineHeight: '1.2',
  } as React.CSSProperties,
  
  label: {
    fontSize: '14px',
    color: colors.textSecondary,
    margin: 0,
    fontWeight: 500,
  } as React.CSSProperties,
  
  subtitle: {
    fontSize: '12px',
    color: colors.textMuted,
    margin: 0,
  } as React.CSSProperties,
  
  trend: {
    fontSize: '12px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  } as React.CSSProperties,
};

// ============================================================================
// MODULE CARD STYLES
// ============================================================================
export const moduleCardStyles = {
  container: {
    background: colors.cardBackground,
    border: `1px solid ${colors.border}`,
    borderRadius: '8px',
    padding: '24px',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
  } as React.CSSProperties,
  
  iconWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
  } as React.CSSProperties,
  
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: '8px',
  } as React.CSSProperties,
  
  description: {
    ...typography.small,
    color: colors.textMuted,
    margin: 0,
  } as React.CSSProperties,
};

// ============================================================================
// BUTTON STYLES
// ============================================================================
export const buttonStyles = {
  primary: {
    background: colors.primary,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  
  secondary: {
    background: colors.cardBackground,
    color: colors.textPrimary,
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  
  success: {
    background: colors.success,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  
  danger: {
    background: colors.error,
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  } as React.CSSProperties,
  
  small: {
    padding: '4px 12px',
    fontSize: '12px',
  } as React.CSSProperties,
};

// ============================================================================
// BADGE STYLES
// ============================================================================
export const badgeStyles = {
  success: {
    background: '#f6ffed',
    color: colors.success,
    border: `1px solid #b7eb8f`,
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
  } as React.CSSProperties,
  
  warning: {
    background: '#fffbe6',
    color: colors.warning,
    border: `1px solid #ffe58f`,
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
  } as React.CSSProperties,
  
  error: {
    background: '#fff2f0',
    color: colors.error,
    border: `1px solid #ffccc7`,
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
  } as React.CSSProperties,
  
  info: {
    background: '#e6f7ff',
    color: colors.info,
    border: `1px solid #91d5ff`,
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
  } as React.CSSProperties,
  
  default: {
    background: colors.gray100,
    color: colors.textSecondary,
    border: `1px solid ${colors.gray300}`,
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: 500,
  } as React.CSSProperties,
};

// ============================================================================
// INPUT STYLES
// ============================================================================
export const inputStyles = {
  base: {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    outline: 'none',
  } as React.CSSProperties,
  
  select: {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    outline: 'none',
    background: colors.cardBackground,
    cursor: 'pointer',
  } as React.CSSProperties,
  
  textarea: {
    width: '100%',
    padding: '8px 12px',
    border: `1px solid ${colors.border}`,
    borderRadius: '6px',
    fontSize: '14px',
    transition: 'all 0.3s ease',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '80px',
  } as React.CSSProperties,
};

// ============================================================================
// TABLE STYLES
// ============================================================================
export const tableStyles = {
  container: {
    width: '100%',
    overflowX: 'auto' as const,
  } as React.CSSProperties,
  
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  } as React.CSSProperties,
  
  th: {
    textAlign: 'left' as const,
    padding: '12px',
    borderBottom: `2px solid ${colors.border}`,
    fontSize: '14px',
    fontWeight: 600,
    color: colors.textPrimary,
    background: colors.gray50,
  } as React.CSSProperties,
  
  td: {
    padding: '12px',
    borderBottom: `1px solid ${colors.border}`,
    fontSize: '14px',
    color: colors.textPrimary,
  } as React.CSSProperties,
  
  trHover: {
    transition: 'background 0.2s ease',
  } as React.CSSProperties,
};

// ============================================================================
// GRID LAYOUTS
// ============================================================================
export const gridStyles = {
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  } as React.CSSProperties,
  
  moduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  } as React.CSSProperties,
  
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
  } as React.CSSProperties,
  
  threeColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
  } as React.CSSProperties,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================
export const getHoverStyle = (baseStyle: React.CSSProperties): React.CSSProperties => ({
  ...baseStyle,
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  borderColor: colors.borderHover,
});

export const getGradientBackground = (color1: string, color2: string): string => 
  `linear-gradient(135deg, ${color1}, ${color2})`;

// ============================================================================
// PRESET GRADIENTS
// ============================================================================
export const gradients = {
  blue: getGradientBackground('#1890ff', '#096dd9'),
  green: getGradientBackground('#52c41a', '#389e0d'),
  orange: getGradientBackground('#fa8c16', '#d46b08'),
  purple: getGradientBackground('#722ed1', '#531dab'),
  red: getGradientBackground('#f5222d', '#cf1322'),
  cyan: getGradientBackground('#13c2c2', '#08979c'),
  magenta: getGradientBackground('#eb2f96', '#c41d7f'),
  yellow: getGradientBackground('#faad14', '#d48806'),
};
