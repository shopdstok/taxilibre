import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import MapViewNative, { Marker } from 'react-native-maps';
import { theme } from '../../theme';

const MapView = ({ location }) => {
  if (!location) {
    return (
      <View style={styles.placeholder}>
        <Text>Map loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapViewNative
        style={styles.map}
        initialRegion={{
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={{
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }}
          title="You are here"
        />
      </MapViewNative>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    marginBottom: theme.spacing.lg,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    height: 200,
    backgroundColor: theme.colors.gray[200],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.lg,
  },
});

export default MapView;
