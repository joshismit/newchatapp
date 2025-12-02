// MINIMAL TEST - Replace App.tsx content with this to test React rendering
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  console.log('✅ MINIMAL APP RENDERING!');
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🎉 REACT IS WORKING!</Text>
      <Text style={styles.subtext}>If you see this, React renders correctly</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ff0000', // Red background to make it obvious
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
  },
});

