import React, { useEffect, useState } from 'react';
import { Alert, Button, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { addAction, addComment, createReport, listComments, subscribeCases, updateCaseStatus } from '../services/cases';
import { useAuth } from '../context/AuthContext';
import { CaseItem, CommentItem } from '../types/models';
import { RootStackParamList } from '../navigation/types';

export const CaseDetailScreen = ({ route }: NativeStackScreenProps<RootStackParamList, 'CaseDetail'>) => {
  const [item, setItem] = useState<CaseItem | undefined>();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [comment, setComment] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const unsub = subscribeCases((all) => setItem(all.find((c) => c.id === route.params.caseId)), { timeframe: '7d' });
    listComments(route.params.caseId).then(setComments);
    return unsub;
  }, [route.params.caseId]);

  if (!item) return <View style={{ padding: 20 }}><Text>Cargando caso...</Text></View>;

  const canChangeStatus = user?.uid && (item.createdBy === user.uid || item.currentOwner === user.uid);

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
      <Image source={{ uri: item.photos[0] }} style={{ width: '100%', height: 240, borderRadius: 12 }} />
      <Text style={{ fontSize: 20, fontWeight: '700' }}>{item.caseType} · {item.status}</Text>
      <Text>{item.description}</Text>
      <Text>Ubicación: {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}</Text>
      <Button title="Estoy yendo" onPress={() => user && addAction({ caseId: item.id, userId: user.uid, type: 'voy', status: 'ofrecido', createdAt: Date.now() })} />
      <Button title="Ofrecer tránsito" onPress={() => user && addAction({ caseId: item.id, userId: user.uid, type: 'transito', status: 'ofrecido', createdAt: Date.now() })} />
      <Button title="Ofrecer traslado" onPress={() => user && addAction({ caseId: item.id, userId: user.uid, type: 'traslado', status: 'ofrecido', createdAt: Date.now() })} />
      <Button title="Llevo a veterinario" onPress={() => user && addAction({ caseId: item.id, userId: user.uid, type: 'veterinario', status: 'ofrecido', createdAt: Date.now() })} />
      <Button title="Creo que es mío" onPress={() => user && addAction({ caseId: item.id, userId: user.uid, type: 'creo_que_es_mio', status: 'ofrecido', createdAt: Date.now() })} />
      {canChangeStatus ? <Button title="Marcar rescatado" onPress={() => updateCaseStatus(item.id, 'rescatado')} /> : null}
      <Button title="Reportar caso" onPress={() => user && createReport({ targetType: 'case', targetId: item.id, reason: 'Contenido inapropiado', userId: user.uid, createdAt: Date.now() })} />

      <Text style={{ fontWeight: '700', marginTop: 10 }}>Comentarios</Text>
      <TextInput value={comment} onChangeText={setComment} placeholder="Escribí una actualización" style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 }} />
      <Button title="Comentar" onPress={async () => {
        if (!comment.trim() || !user) return;
        await addComment({ caseId: item.id, text: comment.trim(), userId: user.uid, createdAt: Date.now() });
        setComment('');
        setComments(await listComments(item.id));
      }} />
      {comments.map((c) => (
        <View key={c.id} style={{ borderBottomWidth: 1, borderColor: '#f3f4f6', paddingVertical: 8 }}>
          <Text>{c.text}</Text>
          <Button title="Reportar comentario" onPress={() => user && createReport({ targetType: 'comment', targetId: c.id, reason: 'Spam', userId: user.uid, createdAt: Date.now() })} />
        </View>
      ))}
    </ScrollView>
  );
};
