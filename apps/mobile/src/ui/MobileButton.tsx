import type { MobileMetrics } from './mobileMetrics'
import { useMobileStyles } from './theme/useMobileTheme'
import type { MobileColors } from './theme/mobilePalette'
import type { ReactNode } from 'react'
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Button, type ButtonProps } from '../components/ui/button'
import { Text } from '../components/ui/text'
import { cn } from '../components/ui/utils'

type MobileButtonVariant = 'primary' | 'secondary' | 'ghost'
type MobileButtonDensity = 'default' | 'compact' | 'status'
type MobileButtonTone = 'default' | 'danger'

type MobileButtonProps = {
  accessibilityLabel?: string
  accessibilityRole?: ButtonProps['role']
  accessibilityState?: ButtonProps['accessibilityState']
  density?: MobileButtonDensity
  disabled?: boolean
  icon?: ReactNode
  label: string
  onPress?: () => void
  style?: StyleProp<ViewStyle>
  testID?: string
  tone?: MobileButtonTone
  variant?: MobileButtonVariant
}

export function MobileButton(props: MobileButtonProps) {
  const { styles, buttonDensityStyles, buttonVariantStyles, labelDensityStyles, labelColorStyles } =
    useMobileStyles(createThemeStyles)
  const {
    accessibilityLabel,
    accessibilityRole,
    accessibilityState,
    density = 'default',
    disabled = false,
    icon,
    label,
    style,
    tone = 'default',
    variant = 'secondary',
    ...buttonProps
  } = props
  const hitSlop =
    density === 'status'
      ? { top: 12, bottom: 12, left: 8, right: 8 }
      : density === 'compact'
        ? { top: 8, bottom: 8, left: 4, right: 4 }
        : undefined
  const buttonStyle = [
    styles.base,
    buttonDensityStyles[density],
    buttonVariantStyles[variant],
    disabled ? styles.disabled : null,
    style,
  ]
  const labelStyle = [
    labelDensityStyles[density],
    labelColorStyles[variant],
    tone === 'danger' ? styles.labelDanger : null,
  ]

  return (
    <Button
      {...buttonProps}
      accessibilityLabel={accessibilityLabel ?? label}
      role={accessibilityRole ?? 'button'}
      accessibilityState={accessibilityState}
      aria-selected={accessibilityState?.selected}
      aria-checked={accessibilityState?.checked}
      aria-expanded={accessibilityState?.expanded}
      aria-busy={accessibilityState?.busy}
      className={cn(buttonDensityClassNames[density], buttonClassNames[variant])}
      disabled={disabled}
      hitSlop={hitSlop}
      size="sm"
      style={StyleSheet.flatten(buttonStyle)}
      variant={buttonVariantByMobileVariant[variant]}
    >
      {icon}
      <Text
        className={cn(
          labelDensityClassNames[density],
          tone === 'danger' ? 'text-destructive' : labelClassNames[variant],
        )}
        numberOfLines={1}
        style={labelStyle}
      >
        {label}
      </Text>
    </Button>
  )
}

const buttonVariantByMobileVariant: Record<MobileButtonVariant, ButtonProps['variant']> = {
  ghost: 'ghost',
  primary: 'default',
  secondary: 'secondary',
}

const buttonClassNames: Record<MobileButtonVariant, string> = {
  ghost: 'bg-transparent shadow-none',
  primary: '',
  secondary: 'bg-secondary',
}

const buttonDensityClassNames: Record<MobileButtonDensity, string> = {
  compact: 'min-h-8 rounded-md px-2 py-1 active:opacity-75',
  default: 'min-h-9 rounded-md px-3 active:opacity-75',
  status: 'h-6 min-h-0 rounded-sm px-1 py-0.5 active:opacity-75',
}

const labelClassNames: Record<MobileButtonVariant, string> = {
  ghost: 'text-muted-foreground',
  primary: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
}

const labelDensityClassNames: Record<MobileButtonDensity, string> = {
  compact: 'text-xs font-medium',
  default: 'text-sm font-medium',
  status: 'text-xs font-medium',
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const styles = StyleSheet.create({
    ...buttonFrameStyles(metrics),
    ...buttonToneStyles(mobileColors),
    ...buttonLabelStyles(mobileColors, metrics),
  })

  const buttonDensityStyles = {
    compact: styles.compact,
    default: styles.default,
    status: styles.status,
  } as const

  const labelColorStyles = {
    ghost: styles.labelGhost,
    primary: styles.labelPrimary,
    secondary: styles.labelSecondary,
  } as const

  const labelDensityStyles = {
    compact: styles.labelCompact,
    default: styles.labelDefault,
    status: styles.labelStatus,
  } as const

  const buttonVariantStyles = {
    ghost: styles.ghost,
    primary: styles.primary,
    secondary: styles.secondary,
  } as const
  return { mobileColors, styles, buttonDensityStyles, labelColorStyles, labelDensityStyles, buttonVariantStyles }
}

function buttonFrameStyles(metrics: MobileMetrics) {
  return StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: metrics.size(6),
    },
    default: {
      minHeight: Math.max(48, metrics.size(36)),
      borderRadius: 6,
      paddingHorizontal: metrics.size(12),
    },
    disabled: {
      opacity: 0.5,
    },
    compact: {
      minHeight: metrics.size(32),
      borderRadius: 6,
      paddingHorizontal: metrics.size(8),
      paddingVertical: metrics.size(4),
    },
    status: {
      minHeight: 0,
      height: metrics.size(24),
      borderRadius: 4,
      paddingHorizontal: metrics.size(4),
      paddingVertical: metrics.size(2),
    },
  })
}

function buttonToneStyles(mobileColors: MobileColors) {
  return StyleSheet.create({
    primary: {
      backgroundColor: mobileColors.primary,
    },
    secondary: {
      backgroundColor: mobileColors.control,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
  })
}

function buttonLabelStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    labelDefault: {
      fontSize: metrics.size(14),
      fontWeight: '500',
    },
    labelCompact: {
      fontSize: metrics.size(12),
      fontWeight: '500',
    },
    labelDanger: {
      color: mobileColors.red,
    },
    labelStatus: {
      fontSize: metrics.size(12),
      fontWeight: '500',
    },
    labelGhost: {
      color: mobileColors.textMuted,
    },
    labelPrimary: {
      color: mobileColors.textInverse,
    },
    labelSecondary: {
      color: mobileColors.text,
    },
  })
}
