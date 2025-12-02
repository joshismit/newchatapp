// Temporary test file to verify React rendering
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AppTest() {
  console.log('AppTest rendering!');
  return (
    <View style={styles.container}>
      <Text style={styles.text}>TEST - If you see this, React is working!</Text>
      <Text style={styles.subtext}>Check browser console for errors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 16,
    color: '#666',
  },
});

