import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { Alert, Button, Image, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { CaseType, Urgency } from '../types/models';

export interface CaseDraft {
  caseType: CaseType;
  urgency: Urgency;
  description: string;
  size: 'chico' | 'mediano' | 'grande';
  collar: boolean;
  neighborhood: string;
  location?: { lat: number; lng: number };
  photos: string[];
}

export const CaseForm = ({ onSubmit, initialType }: { onSubmit: (draft: CaseDraft) => Promise<void>; initialType?: CaseType }) => {
  const [draft, setDraft] = useState<CaseDraft>({
    caseType: initialType || 'visto',
    urgency: 'media',
    description: '',
    size: 'mediano',
    collar: false,
    neighborhood: '',
    photos: [],
  });
  const [saving, setSaving] = useState(false);

  const pickPhotos = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.7, selectionLimit: 5 });
    if (!res.canceled) setDraft((d) => ({ ...d, photos: res.assets.map((a) => a.uri).slice(0, 5) }));
  };

  const getLocation = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return Alert.alert('Permiso requerido', 'Necesitamos ubicación para publicar.');
    const loc = await Location.getCurrentPositionAsync({});
    setDraft((d) => ({ ...d, location: { lat: loc.coords.latitude, lng: loc.coords.longitude } }));
  };

  const submit = async () => {
    if (!draft.location || draft.photos.length === 0) return Alert.alert('Falta información', 'Agregá al menos una foto y ubicación.');
    setSaving(true);
    try {
      await onSubmit(draft);
      Alert.alert('Publicado', 'Tu caso ya está visible para la comunidad.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Tipo</Text>
      <TextInput style={styles.input} value={draft.caseType} onChangeText={(t) => setDraft({ ...draft, caseType: t as CaseType })} placeholder="perdido/encontrado/visto/herido" />
      <Text style={styles.label}>Urgencia</Text>
      <TextInput style={styles.input} value={draft.urgency} onChangeText={(t) => setDraft({ ...draft, urgency: t as Urgency })} placeholder="baja/media/alta" />
      <Text style={styles.label}>Descripción</Text>
      <TextInput style={[styles.input, styles.textarea]} multiline value={draft.description} onChangeText={(description) => setDraft({ ...draft, description })} />
      <Text style={styles.label}>Barrio</Text>
      <TextInput style={styles.input} value={draft.neighborhood} onChangeText={(neighborhood) => setDraft({ ...draft, neighborhood })} />
      <View style={styles.row}><Text>Tiene collar</Text><Switch value={draft.collar} onValueChange={(collar) => setDraft({ ...draft, collar })} /></View>
      <Button title="Seleccionar fotos (1-5)" onPress={pickPhotos} />
      <ScrollView horizontal>{draft.photos.map((p) => <Image key={p} source={{ uri: p }} style={styles.thumb} />)}</ScrollView>
      <Button title={draft.location ? 'Ubicación capturada' : 'Usar ubicación actual'} onPress={getLocation} />
      <View style={{ height: 8 }} />
      <Button title={saving ? 'Publicando...' : 'Publicar caso'} onPress={submit} disabled={saving} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  label: { fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
  textarea: { minHeight: 80, textAlignVertical: 'top' },
  thumb: { width: 76, height: 76, marginRight: 8, borderRadius: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
