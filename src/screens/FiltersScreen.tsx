import React from 'react';
import { SafeAreaView, Text } from 'react-native';

export const FiltersScreen = () => (
  <SafeAreaView style={{ flex: 1, padding: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: '700' }}>Filtros</Text>
    <Text>Aplicá filtros por tipo, urgencia y fecha desde Inicio (base preparada).</Text>
  </SafeAreaView>
);
