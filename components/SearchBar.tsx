import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native'
import { Colors } from '@/constants/colors'

interface SearchBarProps {
  value: string
  onChangeText: (text: string) => void
  onSubmit: () => void
  placeholder?: string
  isLoading?: boolean
}

export function SearchBar({
  value,
  onChangeText,
  onSubmit,
  placeholder = 'Search by card name, set, grade…',
  isLoading = false,
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={styles.inputRow}>
        <Text style={styles.icon}>🔍</Text>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={onSubmit}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isLoading}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearBtn}>
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[styles.searchBtn, isLoading && styles.searchBtnDisabled]}
        onPress={onSubmit}
        disabled={isLoading || value.trim().length === 0}
        activeOpacity={0.8}
      >
        <Text style={styles.searchBtnText}>{isLoading ? 'Searching…' : 'Search'}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  icon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: 12,
  },
  clearBtn: {
    padding: 4,
  },
  clearText: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.4,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
})
