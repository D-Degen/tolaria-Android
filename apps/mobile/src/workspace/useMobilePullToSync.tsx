import { useCallback, useContext, useRef, useState } from 'react'
import { RefreshControl } from 'react-native'
import { useMobileColors } from '../ui/theme/useMobileTheme'
import { MobileVaultControlsContext } from './MobileVaultContext'
import { mobilePullToSyncProps } from './mobilePullToSync'

export function useMobilePullToSync() {
  const controls = useContext(MobileVaultControlsContext)
  const colors = useMobileColors()
  const [refreshing, setRefreshing] = useState(false)
  const refreshingRef = useRef(false)
  const props = mobilePullToSyncProps(controls, refreshing)
  const finishRefresh = useCallback(() => {
    refreshingRef.current = false
    setRefreshing(false)
  }, [])
  const onRefresh = useCallback(() => {
    if (!props || refreshingRef.current) return
    const operation = props.onRefresh()
    if (!operation) return
    refreshingRef.current = true
    setRefreshing(true)
    void operation.then(
      () => finishRefresh(),
      () => finishRefresh(),
    )
  }, [finishRefresh, props])

  return props ? (
    <RefreshControl
      colors={[colors.primary]}
      progressBackgroundColor={colors.card}
      refreshing={refreshing}
      tintColor={colors.primary}
      onRefresh={onRefresh}
    />
  ) : undefined
}
