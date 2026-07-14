import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { Card } from '../components/common';

const AdminScreen = () => {
  const stats = [
    { label: 'Active Rides', value: '12', color: theme.colors.primary },
    { label: 'Online Drivers', value: '8', color: theme.colors.success },
    { label: 'Total Users', value: '154', color: theme.colors.info },
    { label: 'Today\'s Revenue', value: '€452', color: theme.colors.warning },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Admin Dashboard</Text>

        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <Card key={index} style={styles.statCard}>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </Card>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <Card>
          <Text style={styles.activityItem}>• New driver registered: John Doe</Text>
          <Text style={styles.activityItem}>• Ride #1024 completed (€15.50)</Text>
          <Text style={styles.activityItem}>• Support ticket #45 raised</Text>
          <Text style={styles.activityItem}>• System update completed</Text>
        </Card>
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
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
    marginBottom: theme.spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    marginBottom: theme.spacing.md,
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  activityItem: {
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.gray[100],
  }
});

export default AdminScreen;
