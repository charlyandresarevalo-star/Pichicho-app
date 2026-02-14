import React, { useEffect, useState } from 'react';
import { FlatList, SafeAreaView, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CaseCard } from '../components/CaseCard';
import { subscribeCases } from '../services/cases';
import { CaseFilters, CaseItem } from '../types/models';
import { RootStackParamList } from '../navigation/types';

export const FeedScreen = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'Tabs'>) => {
  const [items, setItems] = useState<CaseItem[]>([]);
  const [filters] = useState<CaseFilters>({ timeframe: '7d' });

  useEffect(() => subscribeCases(setItems, filters), [filters]);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={items}
        contentContainerStyle={{ padding: 12 }}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<Text style={{ fontWeight: '700', fontSize: 20, marginBottom: 8 }}>Casos recientes</Text>}
        ListEmptyComponent={<View><Text>No hay casos todavía.</Text></View>}
        renderItem={({ item }) => <CaseCard item={item} onPress={() => navigation.navigate('CaseDetail', { caseId: item.id })} />}
      />
    </SafeAreaView>
  );
};
