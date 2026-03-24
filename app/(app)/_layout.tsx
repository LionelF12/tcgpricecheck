import { Tabs } from 'expo-router'
import { View, Text } from 'react-native'
import { Colors } from '@/constants/colors'

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center', gap: 2, minWidth: 72 }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          color: focused ? Colors.primary : Colors.textMuted,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  )
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 84,
          paddingBottom: 20,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="search"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔍" label="Search" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📚" label="Collection" focused={focused} />
          ),
        }}
      />
    </Tabs>
  )
}
