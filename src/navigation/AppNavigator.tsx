import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { FeedScreen } from '../screens/FeedScreen';
import { MapScreen } from '../screens/MapScreen';
import { PublishScreen } from '../screens/PublishScreen';
import { LostDogScreen } from '../screens/LostDogScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { CaseDetailScreen } from '../screens/CaseDetailScreen';
import { FiltersScreen } from '../screens/FiltersScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator();

const iconByRoute: Record<string, keyof typeof Ionicons.glyphMap> = {
  Inicio: 'home-outline',
  Mapa: 'map-outline',
  Publicar: 'add-circle-outline',
  'Perdí mi perro': 'paw-outline',
  Perfil: 'person-outline',
};

const TabsNavigator = () => (
  <Tabs.Navigator screenOptions={({ route }) => ({
    tabBarIcon: ({ color, size }) => <Ionicons name={iconByRoute[route.name]} color={color} size={size} />,
  })}>
    <Tabs.Screen name="Inicio" component={FeedScreen} />
    <Tabs.Screen name="Mapa" component={MapScreen} />
    <Tabs.Screen name="Publicar" component={PublishScreen} />
    <Tabs.Screen name="Perdí mi perro" component={LostDogScreen} />
    <Tabs.Screen name="Perfil" component={ProfileScreen} />
  </Tabs.Navigator>
);

export const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />
      <Stack.Screen name="CaseDetail" component={CaseDetailScreen} options={{ title: 'Detalle del caso' }} />
      <Stack.Screen name="Filters" component={FiltersScreen} options={{ title: 'Filtros' }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Ajustes' }} />
      <Stack.Screen name="Report" component={ReportScreen} options={{ title: 'Reportar' }} />
    </Stack.Navigator>
  </NavigationContainer>
);
