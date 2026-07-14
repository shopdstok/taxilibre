import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';

const Card = ({
  children,
  style,
  onPress,
  disabled = false,
  elevation = 'md',
  padding = 'md',
  borderRadius = 'md',
  backgroundColor = theme.colors.white,
  ...props
}) => {
  const getCardStyles = () => {
    const baseStyle = [styles.card];
    
    // Elevation styles
    switch (elevation) {
      case 'none':
        baseStyle.push(styles.cardFlat);
        break;
      case 'sm':
        baseStyle.push(styles.cardSm);
        break;
      case 'md':
        baseStyle.push(styles.cardMd);
        break;
      case 'lg':
        baseStyle.push(styles.cardLg);
        break;
      case 'xl':
        baseStyle.push(styles.cardXl);
        break;
      default:
        baseStyle.push(styles.cardMd);
    }
    
    // Padding styles
    switch (padding) {
      case 'none':
        baseStyle.push(styles.paddingNone);
        break;
      case 'xs':
        baseStyle.push(styles.paddingXs);
        break;
      case 'sm':
        baseStyle.push(styles.paddingSm);
        break;
      case 'md':
        baseStyle.push(styles.paddingMd);
        break;
      case 'lg':
        baseStyle.push(styles.paddingLg);
        break;
      case 'xl':
        baseStyle.push(styles.paddingXl);
        break;
      default:
        baseStyle.push(styles.paddingMd);
    }
    
    // Border radius styles
    switch (borderRadius) {
      case 'none':
        baseStyle.push(styles.borderRadiusNone);
        break;
      case 'sm':
        baseStyle.push(styles.borderRadiusSm);
        break;
      case 'md':
        baseStyle.push(styles.borderRadiusMd);
        break;
      case 'lg':
        baseStyle.push(styles.borderRadiusLg);
        break;
      case 'xl':
        baseStyle.push(styles.borderRadiusXl);
        break;
      case 'full':
        baseStyle.push(styles.borderRadiusFull);
        break;
      default:
        baseStyle.push(styles.borderRadiusMd);
    }
    
    // Background color
    baseStyle.push({ backgroundColor });
    
    // Disabled state
    if (disabled) {
      baseStyle.push(styles.cardDisabled);
    }
    
    return baseStyle;
  };

  const CardComponent = onPress ? TouchableOpacity : View;
  
  return (
    <CardComponent
      style={[getCardStyles(), style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={onPress ? 0.7 : 1}
      {...props}
    >
      {children}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
  },
  
  // Elevation styles
  cardFlat: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  cardSm: theme.shadows.sm,
  cardMd: theme.shadows.md,
  cardLg: theme.shadows.lg,
  cardXl: theme.shadows.xl,
  
  // Padding styles
  paddingNone: {
    padding: 0,
  },
  paddingXs: {
    padding: theme.spacing.xs,
  },
  paddingSm: {
    padding: theme.spacing.sm,
  },
  paddingMd: {
    padding: theme.spacing.md,
  },
  paddingLg: {
    padding: theme.spacing.lg,
  },
  paddingXl: {
    padding: theme.spacing.xl,
  },
  
  // Border radius styles
  borderRadiusNone: {
    borderRadius: theme.borderRadius.none,
  },
  borderRadiusSm: {
    borderRadius: theme.borderRadius.sm,
  },
  borderRadiusMd: {
    borderRadius: theme.borderRadius.md,
  },
  borderRadiusLg: {
    borderRadius: theme.borderRadius.lg,
  },
  borderRadiusXl: {
    borderRadius: theme.borderRadius.xl,
  },
  borderRadiusFull: {
    borderRadius: theme.borderRadius.full,
  },
  
  // States
  cardDisabled: {
    opacity: 0.6,
  },
});

export default Card;
