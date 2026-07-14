import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useLocation } from '../contexts/LocationContext';
import { LoadingSpinner, Card, Button } from '../components/common';
import { MapView, LocationCard, QuickActions, RecentRides } from '../components/home';
import { theme } from '../theme';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';

const HomeScreen = ({ navigation }) => {
  const { user, isAuthenticated } = useAuth();
  const { connected } = useSocket();
  const { currentLocation, requestLocationPermission } = useLocation();
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeRide, setActiveRide] = useState(null);
  const [recentRides, setRecentRides] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadHomeData();
      requestLocationPermission();
    }
  }, [isAuthenticated]);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      
      // Load active ride
      const activeRideResponse = await axios.get(`${API_BASE_URL}/rides/active`);
      if (activeRideResponse.data.success) {
        setActiveRide(activeRideResponse.data.ride);
      }

      // Load recent rides
      const ridesResponse = await axios.get(`${API_BASE_URL}/rides/history?limit=3`);
      if (ridesResponse.data.success) {
        setRecentRides(ridesResponse.data.rides);
      }

      // Load user statistics
      const statsResponse = await axios.get(`${API_BASE_URL}/users/statistics`);
      if (statsResponse.data.success) {
        setStats(statsResponse.data.statistics);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHomeData();
    setRefreshing(false);
  };

  const handleBookRide = () => {
    if (!currentLocation) {
      Alert.alert(
        'Location Required',
        'Please enable location services to book a ride.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: requestLocationPermission }
        ]
      );
      return;
    }
    navigation.navigate('BookRide');
  };

  const handleActiveRidePress = () => {
    if (activeRide) {
      navigation.navigate('ActiveRide', { rideId: activeRide.id });
    }
  };

  const renderWelcomeSection = () => (
    <View style={styles.welcomeSection}>
      <Text style={styles.welcomeText}>
        Welcome back, {user?.firstName || 'User'}! 👋
      </Text>
      <View style={styles.statusRow}>
        <View style={[
          styles.statusIndicator, 
          { backgroundColor: connected ? theme.colors.success : theme.colors.error }
        ]} />
        <Text style={styles.statusText}>
          {connected ? 'Connected' : 'Offline'}
        </Text>
      </View>
    </View>
  );

  const renderActiveRideCard = () => {
    if (!activeRide) return null;

    return (
      <Card style={styles.activeRideCard}>
        <TouchableOpacity onPress={handleActiveRidePress}>
          <Text style={styles.cardTitle}>Active Ride</Text>
          <View style={styles.rideStatus}>
            <Text style={styles.statusBadge}>
              {activeRide.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <View style={styles.rideDetails}>
            <Text style={styles.locationText}>From: {activeRide.pickupAddress}</Text>
            <Text style={styles.locationText}>To: {activeRide.dropoffAddress}</Text>
            <Text style={styles.priceText}>
              €{activeRide.estimatedPrice || activeRide.totalPrice}
            </Text>
          </View>
          <Button 
            title="Track Ride" 
            onPress={handleActiveRidePress}
            style={styles.trackButton}
          />
        </TouchableOpacity>
      </Card>
    );
  };

  const renderQuickActions = () => (
    <QuickActions
      actions={[
        {
          title: 'Book Ride',
          icon: '🚗',
          onPress: handleBookRide,
          color: theme.colors.primary
        },
        {
          title: 'Ride History',
          icon: '📋',
          onPress: () => navigation.navigate('History'),
          color: theme.colors.secondary
        },
        {
          title: 'Payment',
          icon: '💳',
          onPress: () => navigation.navigate('Payment'),
          color: theme.colors.info
        },
        {
          title: 'Support',
          icon: '🆘',
          onPress: () => navigation.navigate('Support'),
          color: theme.colors.warning
        }
      ]}
    />
  );

  const renderStats = () => {
    if (!stats) return null;

    return (
      <Card style={styles.statsCard}>
        <Text style={styles.cardTitle}>Your Stats</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalRides || 0}</Text>
            <Text style={styles.statLabel}>Total Rides</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              €{stats.totalSpent ? stats.totalSpent.toFixed(2) : '0.00'}
            </Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {stats.averageRating ? stats.averageRating.toFixed(1) : 'N/A'}
            </Text>
            <Text style={styles.statLabel}>Your Rating</Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderRecentRides = () => (
    <RecentRides 
      rides={recentRides}
      onRidePress={(ride) => navigation.navigate('RideDetails', { rideId: ride.id })}
      onBookRide={handleBookRide}
    />
  );

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderWelcomeSection()}
        {renderActiveRideCard()}
        {renderQuickActions()}
        {renderStats()}
        {renderRecentRides()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  welcomeSection: {
    marginBottom: theme.spacing.lg,
  },
  welcomeText: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.xs,
  },
  statusText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  activeRideCard: {
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.primary + '10',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  cardTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  rideStatus: {
    marginBottom: theme.spacing.md,
  },
  statusBadge: {
    fontSize: theme.typography.small.fontSize,
    fontWeight: '600',
    color: theme.colors.primary,
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    overflow: 'hidden',
  },
  rideDetails: {
    marginBottom: theme.spacing.md,
  },
  locationText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  priceText: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  trackButton: {
    marginTop: theme.spacing.sm,
  },
  statsCard: {
    marginBottom: theme.spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: theme.typography.small.fontSize,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },
});

export default HomeScreen;
