import React from 'react';
import { StyleSheet, View } from 'react-native';
import { CardGrid } from '../src/components/CardGrid';
import { SessionControls } from '../src/components/SessionControls';
import { C } from '../src/theme';

export default function ReferenceScreen() {
  return (
    <View style={styles.container}>
      <SessionControls />
      <CardGrid />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
});
