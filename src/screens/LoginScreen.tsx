import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { signInEmail, signUpEmail } from '../services/auth';

export const LoginScreen = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    try {
      if (isRegister) {
        await signUpEmail(email, password, displayName || 'Vecino/a');
      } else {
        await signInEmail(email, password);
      }
    } catch {
      Alert.alert('Error', 'No se pudo iniciar sesión. Revisá tus datos.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pichicho</Text>
      {isRegister && <TextInput placeholder="Nombre" style={styles.input} value={displayName} onChangeText={setDisplayName} />}
      <TextInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" style={styles.input} value={email} onChangeText={setEmail} />
      <TextInput placeholder="Contraseña" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
      <Button title={isRegister ? 'Crear cuenta' : 'Ingresar'} onPress={submit} />
      <View style={{ height: 8 }} />
      <Button title={isRegister ? 'Ya tengo cuenta' : 'Crear cuenta nueva'} onPress={() => setIsRegister((v) => !v)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', gap: 10 },
  title: { fontSize: 34, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
});
