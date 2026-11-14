type DeviceLayoutInput = {
  platform: string
  tablet?: boolean
  width: number
  screenWidth: number
  screenHeight: number
}

export function mobileDeviceLayout(input: DeviceLayoutInput): 'phone' | 'tablet' {
  if (input.platform === 'ios') return input.tablet ? 'tablet' : 'phone'
  if (input.platform === 'web') return input.width >= 900 ? 'tablet' : 'phone'
  return input.width >= 600 && Math.min(input.screenWidth, input.screenHeight) >= 600 ? 'tablet' : 'phone'
}
