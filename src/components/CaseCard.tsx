import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CaseItem } from '../types/models';

export const CaseCard = ({ item, onPress }: { item: CaseItem; onPress: () => void }) => (
  <Pressable style={styles.card} onPress={onPress}>
    <Image source={{ uri: item.photos[0] }} style={styles.image} />
    <View style={styles.content}>
      <Text style={styles.type}>{item.caseType.toUpperCase()} · {item.urgency}</Text>
      <Text numberOfLines={2}>{item.description}</Text>
      <Text style={styles.meta}>{item.neighborhood || 'Sin barrio'} · {item.status}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#e5e7eb' },
  image: { width: '100%', height: 160 },
  content: { padding: 12, gap: 4 },
  type: { fontWeight: '700' },
  meta: { color: '#6b7280', fontSize: 12 },
});
