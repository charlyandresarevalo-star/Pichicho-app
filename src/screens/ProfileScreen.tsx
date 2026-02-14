import React from 'react';
import { Button, SafeAreaView, Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { logout } from '../services/auth';

export const ProfileScreen = ({ navigation }: any) => {
  const { profile } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 20, fontWeight: '700' }}>{profile?.displayName || 'Vecino/a'}</Text>
      <Text>{profile?.email}</Text>
      <Text>Ayudas registradas: {profile?.helpsCount || 0}</Text>
      <Button title="Ajustes" onPress={() => navigation.navigate('Settings')} />
      <Button title="Cerrar sesión" onPress={() => logout()} />
    </SafeAreaView>
  );
};
