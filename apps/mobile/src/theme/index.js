export const theme = {
  colors: {
    // Primary colors
    primary: '#3B82F6',
    primaryDark: '#2563EB',
    primaryLight: '#60A5FA',
    
    // Secondary colors
    secondary: '#10B981',
    secondaryDark: '#059669',
    secondaryLight: '#34D399',
    
    // Success colors
    success: '#10B981',
    successDark: '#059669',
    successLight: '#34D399',
    
    // Warning colors
    warning: '#F59E0B',
    warningDark: '#D97706',
    warningLight: '#FCD34D',
    
    // Error colors
    error: '#EF4444',
    errorDark: '#DC2626',
    errorLight: '#F87171',
    
    // Info colors
    info: '#06B6D4',
    infoDark: '#0891B2',
    infoLight: '#67E8F9',
    
    // Neutral colors
    white: '#FFFFFF',
    black: '#000000',
    gray: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    
    // Background colors
    background: '#FFFFFF',
    backgroundSecondary: '#F9FAFB',
    backgroundTertiary: '#F3F4F6',
    
    // Text colors
    text: '#111827',
    textSecondary: '#6B7280',
    textTertiary: '#9CA3AF',
    textInverse: '#FFFFFF',
    
    // Border colors
    border: '#E5E7EB',
    borderDark: '#D1D5DB',
    borderLight: '#F3F4F6',
    
    // Shadow colors
    shadow: '#000000',
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
  },
  
  typography: {
    // Font sizes
    h1: {
      fontSize: 32,
      fontWeight: '700',
      lineHeight: 40,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 32,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 28,
    },
    h4: {
      fontSize: 18,
      fontWeight: '600',
      lineHeight: 24,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 24,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 20,
    },
    small: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
    },
    caption: {
      fontSize: 10,
      fontWeight: '400',
      lineHeight: 14,
    },
  },
  
  borderRadius: {
    none: 0,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
    full: 9999,
  },
  
  shadows: {
    sm: {
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    lg: {
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    xl: {
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 10,
    },
  },
  
  breakpoints: {
    sm: 375,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
  
  // Component-specific themes
  components: {
    button: {
      primary: {
        backgroundColor: theme.colors.primary,
        color: theme.colors.white,
      },
      secondary: {
        backgroundColor: theme.colors.secondary,
        color: theme.colors.white,
      },
      outline: {
        backgroundColor: 'transparent',
        color: theme.colors.primary,
        borderWidth: 1,
        borderColor: theme.colors.primary,
      },
      ghost: {
        backgroundColor: 'transparent',
        color: theme.colors.primary,
      },
    },
    
    input: {
      default: {
        backgroundColor: theme.colors.white,
        borderColor: theme.colors.border,
        color: theme.colors.text,
      },
      error: {
        borderColor: theme.colors.error,
      },
      focused: {
        borderColor: theme.colors.primary,
      },
    },
    
    card: {
      default: {
        backgroundColor: theme.colors.white,
        borderColor: theme.colors.border,
      },
      elevated: {
        ...theme.shadows.md,
      },
    },
  },
};

export default theme;
