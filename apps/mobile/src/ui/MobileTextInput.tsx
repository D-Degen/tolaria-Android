import type { MobileMetrics } from './mobileMetrics'
import { useMobileStyles } from './theme/useMobileTheme'
import type { MobileColors } from './theme/mobilePalette'
import { StyleSheet, View, type TextInputProps } from 'react-native'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

import { mobileRadius } from './tokens'

export function MobileTextInput({
  label,
  style,
  testID,
  ...props
}: TextInputProps & {
  label: string
  testID?: string
}) {
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Input
        autoCapitalize="none"
        clearButtonMode="while-editing"
        placeholderTextColor={mobileColors.textFaint}
        style={[styles.input, style]}
        testID={testID}
        {...props}
      />
    </View>
  )
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, type: mobileType, property: desktopPropertyParity } = metrics
  const styles = StyleSheet.create({
    field: {
      gap: mobileSpace.xs,
    },
    input: {
      minHeight: Math.max(44, metrics.size(36)),
      borderColor: mobileColors.borderStrong,
      borderRadius: mobileRadius.md,
      borderWidth: StyleSheet.hairlineWidth,
      color: mobileColors.text,
      fontSize: mobileType.body,
      paddingHorizontal: mobileSpace.sm,
      paddingVertical: mobileSpace.xs,
    },
    label: {
      color: mobileColors.textMuted,
      fontSize: desktopPropertyParity.labelTextSize,
    },
  })
  return { mobileColors, styles }
}
