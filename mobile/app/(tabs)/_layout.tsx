import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

function TabIcon({ name, color, focused }: { name: string; color: string; focused: boolean }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <FontAwesome5 name={name} size={19} color={color} solid />
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          borderTopWidth: 1,
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 1,
        },
        headerStyle: { backgroundColor: '#fff' },
        headerShown: false,
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#111827' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => <TabIcon name="chart-pie" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="quotations"
        options={{
          title: 'Quotations',
          tabBarIcon: ({ color, focused }) => <TabIcon name="file-invoice" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Customers',
          tabBarIcon: ({ color, focused }) => <TabIcon name="users" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ color, focused }) => <TabIcon name="box" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cost-templates"
        options={{
          title: 'Templates',
          tabBarIcon: ({ color, focused }) => <TabIcon name="calculator" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, focused }) => <TabIcon name="cog" color={color} focused={focused} />,
        }}
      />
      {/* Hidden screens - no tab */}
      <Tabs.Screen name="customers/[id]" options={{ href: null }} />
      <Tabs.Screen name="quotations/[id]" options={{ href: null }} />
      <Tabs.Screen name="create-quotation" options={{ href: null }} />
    </Tabs>
  );
}

