import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function RegionalLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#10b981' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: { paddingBottom: 4, height: 56 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Browse Inventory',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗂️</Text>,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'My Orders',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🛒</Text>,
        }}
      />
    </Tabs>
  );
}
