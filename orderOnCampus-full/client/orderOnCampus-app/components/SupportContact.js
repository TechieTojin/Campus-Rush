import React from 'react';
import { Linking, Text } from 'react-native';
import { space, type } from '../constants/theme';
import { useAppConfig } from '../hooks/useAppConfig';
import { Button } from './ui/primitives';

// Support contact details configured by Campus Rush admins (never hardcoded in the app).
export default function SupportContact({ subject = 'Campus Rush support' }) {
  const { support = {} } = useAppConfig();
  if (!support.email && !support.phone) {
    return <Text style={type.small}>Your college’s Campus Rush administrators haven’t published a support email or phone number yet.</Text>;
  }
  return (
    <>
      {support.email ? <Button title={support.email} icon="mail" variant="soft" size="md" style={{ marginBottom: space.xs }} onPress={() => Linking.openURL(`mailto:${support.email}?subject=${encodeURIComponent(subject)}`)} /> : null}
      {support.phone ? <Button title={support.phone} icon="phone" variant="soft" size="md" style={{ marginBottom: space.xs }} onPress={() => Linking.openURL(`tel:${support.phone.replace(/[^\d+]/g, '')}`)} /> : null}
      {support.hours ? <Text style={[type.small, { marginTop: 4 }]}>Hours: {support.hours}</Text> : null}
    </>
  );
}
