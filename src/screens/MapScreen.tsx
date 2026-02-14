import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { subscribeCases } from '../services/cases';
import { CaseItem } from '../types/models';
import { statusColor } from '../utils/location';
import { RootStackParamList } from '../navigation/types';

export const MapScreen = ({ navigation }: NativeStackScreenProps<RootStackParamList, 'Tabs'>) => {
  const [items, setItems] = useState<CaseItem[]>([]);

  useEffect(() => subscribeCases(setItems, { timeframe: '7d' }), []);

  return (
    <View style={{ flex: 1 }}>
      <MapView style={StyleSheet.absoluteFillObject} initialRegion={{ latitude: -34.6037, longitude: -58.3816, latitudeDelta: 0.2, longitudeDelta: 0.2 }}>
        {items.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.location.lat, longitude: item.location.lng }}
            pinColor={statusColor(item.status, item.urgency)}
            title={`${item.caseType} · ${item.urgency}`}
            description={item.description}
            onCalloutPress={() => navigation.navigate('CaseDetail', { caseId: item.id })}
          />
        ))}
      </MapView>
      <View style={styles.legend}><Text>Mapa de casos de perros</Text></View>
    </View>
  );
};

const styles = StyleSheet.create({
  legend: { position: 'absolute', top: 50, left: 12, right: 12, backgroundColor: '#fff', borderRadius: 8, padding: 10 },
});
