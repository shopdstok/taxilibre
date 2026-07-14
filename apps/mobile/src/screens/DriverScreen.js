import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Card, Button, LoadingSpinner } from '../components/common';

const DriverScreen = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Driver Dashboard</Text>
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: theme.colors.gray[300], true: theme.colors.successLight }}
              thumbColor={isOnline ? theme.colors.success : theme.colors.gray[500]}
            />
          </View>
        </View>

        <Card style={styles.earningsCard}>
          <Text style={styles.cardLabel}>Today's Earnings</Text>
          <Text style={styles.earningsValue}>€0.00</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Rides</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0h</Text>
              <Text style={styles.statLabel}>Online</Text>
            </View>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Available Requests</Text>
        {!isOnline ? (
          <View style={styles.offlinePlaceholder}>
            <Text style={styles.offlineText}>Go online to start receiving ride requests</Text>
          </View>
        ) : (
          <View style={styles.emptyPlaceholder}>
            <Text style={styles.emptyText}>Searching for nearby rides...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginRight: theme.spacing.sm,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  earningsCard: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.lg,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: theme.typography.bodySmall.fontSize,
  },
  earningsValue: {
    color: theme.colors.white,
    fontSize: 36,
    fontWeight: '700',
    marginVertical: theme.spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  statItem: {
    flex: 1,
  },
  statValue: {
    color: theme.colors.white,
    fontSize: theme.typography.h3.fontSize,
    fontWeight: '600',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: theme.typography.small.fontSize,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.md,
  },
  offlinePlaceholder: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    backgroundColor: theme.colors.gray[100],
    borderRadius: theme.borderRadius.lg,
  },
  offlineText: {
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  emptyPlaceholder: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.colors.textSecondary,
  }
});

export default DriverScreen;
