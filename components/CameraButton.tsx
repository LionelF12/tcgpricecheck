import { TouchableOpacity, Text, StyleSheet, View } from 'react-native'
import { Colors } from '@/constants/colors'

interface CameraButtonProps {
  onPress: () => void
  disabled?: boolean
}

export function CameraButton({ onPress, disabled }: CameraButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>📷</Text>
      </View>
      <Text style={styles.label}>Camera</Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabled: {
    opacity: 0.4,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
})
