import type { MobileMetrics } from './mobileMetrics'
import { useMobileStyles } from './theme/useMobileTheme'
import type { MobileColors } from './theme/mobilePalette'
import type { ReactNode } from 'react'
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native'
import { Text } from '../components/ui/text'
import { type MobileLayoutProbe, probeProps } from '../qa/mobileLayoutProbe'



export function MobilePropertyRow({
  accessibilityLabel,
  icon,
  label,
  layoutProbe,
  layoutProbeId,
  onPress,
  testID,
  value,
}: {
  accessibilityLabel?: string
  icon?: ReactNode
  label: string
  layoutProbe?: MobileLayoutProbe
  layoutProbeId?: string
  onPress?: () => void
  testID?: string
  value: ReactNode
}) {
  const { styles } = useMobileStyles(createThemeStyles)
  const { fontScale } = useWindowDimensions()
  const stacked = fontScale > 1.3
  const rowStyle = [styles.row, stacked && styles.stackedRow]
  const metricId = layoutProbeId ?? testID
  const content = (
    <>
      <View style={[styles.labelSlot, stacked && styles.stackedLabelSlot]}>
        {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
        <Text
          {...propertyProbe(layoutProbe, metricId, 'label')}
          style={[styles.label, stacked && styles.stackedLabel]}
          testID={testID ? `${testID}-label` : undefined}
        >
          {label}
        </Text>
      </View>
      <View
        {...propertyProbe(layoutProbe, metricId, 'value')}
        style={[styles.value, stacked && styles.stackedValue]}
        testID={testID ? `${testID}-value` : undefined}
      >
        {typeof value === 'string' ? <Text style={[styles.valueText, stacked && styles.stackedValueText]}>{value}</Text> : value}
      </View>
    </>
  )

  if (onPress) {
    return (
      <Pressable
        {...propertyProbe(layoutProbe, metricId, 'row')}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityRole="button"
        style={rowStyle}
        testID={testID}
        onPress={onPress}
      >
        {content}
      </Pressable>
    )
  }

  return (
    <View {...propertyProbe(layoutProbe, metricId, 'row')} style={rowStyle} testID={testID}>
      {content}
    </View>
  )
}

function propertyProbe(layoutProbe: MobileLayoutProbe | undefined, metricId: string | undefined, part: string) {
  return metricId ? probeProps(layoutProbe, `${metricId}.${part}`) : {}
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { property: desktopPropertyParity, space: mobileSpace, type: mobileType } = metrics
  const styles = StyleSheet.create({
    labelSlot: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: metrics.size(6),
      width: 104,
    },
    iconContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 16,
      height: 16,
    },
    label: {
      flex: 1,
      color: mobileColors.textMuted,
      fontSize: desktopPropertyParity.labelTextSize,
    },
    row: {
      minHeight: desktopPropertyParity.rowMinHeight,
      flexShrink: 0,
      alignItems: 'center',
      flexDirection: 'row',
      gap: mobileSpace.sm,
      borderBottomColor: mobileColors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: desktopPropertyParity.rowPaddingHorizontal,
    },
    value: {
      flex: 1,
      alignItems: 'flex-end',
      flexShrink: 1,
      minWidth: 0,
    },
    valueText: {
      color: mobileColors.text,
      fontSize: mobileType.caption,
      fontWeight: '400',
      textAlign: 'right',
    },
    stackedLabelSlot: {
      width: '100%',
    },
    stackedLabel: {
      width: '100%',
    },
    stackedRow: {
      alignItems: 'stretch',
      flexDirection: 'column',
      paddingVertical: mobileSpace.sm,
    },
    stackedValue: {
      alignItems: 'flex-start',
      flex: 0,
    },
    stackedValueText: {
      textAlign: 'left',
    },
  })
  return { mobileColors, styles }
}
