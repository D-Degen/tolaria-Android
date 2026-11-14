import { X } from 'phosphor-react-native'
import type { MobileMetrics } from './mobileMetrics'
import { useMobileStyles } from './theme/useMobileTheme'
import type { MobileColors } from './theme/mobilePalette'
import { Platform, Pressable, StyleSheet, View, type TextInputProps } from 'react-native'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

import { mobileRadius } from './tokens'

export function MobileTextInput({
  label,
  onChangeText,
  style,
  testID,
  value,
  ...props
}: TextInputProps & {
  label: string
  testID?: string
}) {
  const { styles, mobileColors } = useMobileStyles(createThemeStyles)
  const showAndroidClear = Platform.OS === 'android' && Boolean(value) && Boolean(onChangeText)
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <Input
          autoCapitalize="none"
          clearButtonMode="while-editing"
          onChangeText={onChangeText}
          placeholderTextColor={mobileColors.textFaint}
          style={[styles.input, showAndroidClear ? styles.inputWithClear : null, style]}
          testID={testID}
          value={value}
          {...props}
        />
        {showAndroidClear ? (
          <Pressable
            accessibilityLabel="Clear"
            accessibilityRole="button"
            android_ripple={{ color: 'rgba(128, 128, 128, 0.22)', borderless: true }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.clearButton}
            onPress={() => onChangeText?.('')}
          >
            <X color={mobileColors.textMuted} size={16} />
          </Pressable>
        ) : null}
      </View>
    </View>
  )
}

function createThemeStyles(mobileColors: MobileColors, metrics: MobileMetrics) {
  const { space: mobileSpace, type: mobileType, property: desktopPropertyParity } = metrics
  const styles = StyleSheet.create({
    field: {
      gap: mobileSpace.xs,
    },
    inputRow: {
      position: 'relative',
      justifyContent: 'center',
    },
    input: {
      minHeight: Math.max(48, metrics.size(36)),
      borderColor: mobileColors.borderStrong,
      borderRadius: mobileRadius.md,
      borderWidth: StyleSheet.hairlineWidth,
      color: mobileColors.text,
      fontSize: mobileType.body,
      paddingHorizontal: mobileSpace.sm,
      paddingVertical: mobileSpace.xs,
    },
    inputWithClear: {
      paddingRight: 40,
    },
    clearButton: {
      position: 'absolute',
      right: 6,
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
    },
    label: {
      color: mobileColors.textMuted,
      fontSize: desktopPropertyParity.labelTextSize,
    },
  })
  return { mobileColors, styles }
}
