import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../theme';
import { Card, Button } from '../common';

const RecentRides = ({ rides, onRidePress, onBookRide }) => {
  if (!rides || rides.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyText}>No recent rides found</Text>
        <Button title="Book Your First Ride" onPress={onBookRide} />
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recent Rides</Text>
      {rides.map((ride) => (
        <TouchableOpacity key={ride.id} onPress={() => onRidePress(ride)}>
          <Card style={styles.rideCard}>
            <View style={styles.rideInfo}>
              <View style={styles.rideHeader}>
                <Text style={styles.dateText}>{new Date(ride.createdAt).toLocaleDateString()}</Text>
                <Text style={styles.priceText}>€{ride.totalPrice}</Text>
              </View>
              <Text style={styles.addressText} numberOfLines={1}>📍 {ride.pickupAddress}</Text>
              <Text style={styles.addressText} numberOfLines={1}>🏁 {ride.dropoffAddress}</Text>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  rideCard: {
    marginBottom: theme.spacing.sm,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xs,
  },
  dateText: {
    fontSize: theme.typography.small.fontSize,
    color: theme.colors.textSecondary,
  },
  priceText: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  addressText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.text,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    marginBottom: theme.spacing.md,
    color: theme.colors.textSecondary,
  },
});

export default RecentRides;
