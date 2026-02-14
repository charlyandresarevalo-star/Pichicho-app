import React, { useEffect, useState } from 'react';
import { SafeAreaView, Switch, Text, View } from 'react-native';
import { registerForPushNotifications } from '../services/notifications';

export const SettingsScreen = () => {
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    registerForPushNotifications().then(setPushEnabled);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text>Notificaciones de comentarios y acciones</Text>
        <Switch value={pushEnabled} onValueChange={setPushEnabled} />
      </View>
    </SafeAreaView>
  );
};
