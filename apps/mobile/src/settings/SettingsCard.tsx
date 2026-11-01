import type { ReactNode } from 'react'
import { StyleSheet, View } from 'react-native'
import { Text } from '../components/ui/text'
import { useMobileStyles } from '../ui/theme/useMobileTheme'
import type { MobileColors } from '../ui/theme/mobilePalette'
import type { MobileMetrics } from '../ui/mobileMetrics'

type SettingsCardProps = {
  badgeBg?: string
  children: ReactNode
  description?: string
  icon?: ReactNode
  testID?: string
  title: string
  trailing?: ReactNode
}

export function SettingsCard({
  badgeBg,
  children,
  description,
  icon,
  testID,
  title,
  trailing,
}: SettingsCardProps) {
  const styles = useMobileStyles(createStyles)

  return (
    <View style={styles.card} testID={testID}>
      <View style={styles.header}>
        {icon ? (
          <View style={[styles.badge, badgeBg ? { backgroundColor: badgeBg } : null]}>
            {icon}
          </View>
        ) : null}
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {trailing}
      </View>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  )
}

function createStyles(colors: MobileColors, metrics: MobileMetrics) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: metrics.size(16),
      gap: metrics.size(14),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: metrics.size(12),
    },
    badge: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.graySoft,
    },
    headerText: {
      flex: 1,
      gap: metrics.size(2),
    },
    title: {
      fontSize: metrics.size(15),
      fontWeight: '600',
      color: colors.text,
    },
    description: {
      fontSize: metrics.size(12),
      color: colors.textMuted,
      lineHeight: metrics.size(16),
    },
    content: {
      gap: metrics.size(12),
    },
  })
}
