export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || !('navigator' in window) || !navigator.vibrate) return;
  try {
    if (localStorage.getItem('mds_disable_haptics') === 'true') return;
    switch (type) {
      case 'light':
        navigator.vibrate(8);
        break;
      case 'medium':
        navigator.vibrate(18);
        break;
      case 'heavy':
        navigator.vibrate(35);
        break;
      case 'success':
        navigator.vibrate([10, 30, 15]);
        break;
      case 'warning':
        navigator.vibrate([20, 40, 20]);
        break;
      case 'error':
        navigator.vibrate([40, 60, 40]);
        break;
    }
  } catch {
    // Ignore environments where vibration is restricted
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  if (enabled) {
    localStorage.removeItem('mds_disable_haptics');
  } else {
    localStorage.setItem('mds_disable_haptics', 'true');
  }
}
