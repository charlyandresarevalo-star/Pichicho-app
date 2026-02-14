import React from 'react';
import { SafeAreaView, Text } from 'react-native';

export const ReportScreen = () => (
  <SafeAreaView style={{ flex: 1, padding: 16 }}>
    <Text style={{ fontSize: 18, fontWeight: '700' }}>Reportar</Text>
    <Text>Podés reportar casos y comentarios desde el detalle.</Text>
  </SafeAreaView>
);
