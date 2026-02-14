import React from 'react';
import { Alert } from 'react-native';
import { CaseDraft, CaseForm } from '../components/CaseForm';
import { createCase, uploadCasePhoto } from '../services/cases';
import { useAuth } from '../context/AuthContext';

export const PublishScreen = () => {
  const { user } = useAuth();

  const submitCase = async (draft: CaseDraft) => {
    if (!user) return;
    const photos = await Promise.all(draft.photos.map((uri) => uploadCasePhoto(uri, user.uid)));
    await createCase({
      caseType: draft.caseType,
      status: 'visto',
      urgency: draft.urgency,
      description: draft.description,
      tags: { size: draft.size, collar: draft.collar },
      location: { lat: draft.location!.lat, lng: draft.location!.lng },
      neighborhood: draft.neighborhood,
      createdAt: Date.now(),
      createdBy: user.uid,
      photos,
    });
  };

  if (!user) {
    Alert.alert('Ingresá primero', 'Necesitás sesión para publicar.');
    return null;
  }

  return <CaseForm onSubmit={submitCase} />;
};
