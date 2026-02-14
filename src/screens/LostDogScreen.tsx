import React from 'react';
import { CaseDraft, CaseForm } from '../components/CaseForm';
import { useAuth } from '../context/AuthContext';
import { createCase, uploadCasePhoto } from '../services/cases';
import { approximateLocation } from '../utils/location';

export const LostDogScreen = () => {
  const { user } = useAuth();

  const submitCase = async (draft: CaseDraft) => {
    if (!user || !draft.location) return;
    const photos = await Promise.all(draft.photos.map((uri) => uploadCasePhoto(uri, user.uid)));
    const approx = approximateLocation(draft.location.lat, draft.location.lng);
    await createCase({
      caseType: 'perdido',
      status: 'visto',
      urgency: draft.urgency,
      description: draft.description,
      tags: { size: draft.size, collar: draft.collar },
      location: approx,
      neighborhood: draft.neighborhood,
      createdAt: Date.now(),
      createdBy: user.uid,
      photos,
    });
  };

  return <CaseForm onSubmit={submitCase} initialType="perdido" />;
};
