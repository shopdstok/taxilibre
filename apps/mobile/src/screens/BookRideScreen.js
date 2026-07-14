import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useLocation } from '../contexts/LocationContext';
import { LoadingSpinner, Button, Card } from '../components/common';
import { LocationSearch, RideSummary, VehicleSelector } from '../components/ride';
import { theme } from '../theme';
import { API_BASE_URL } from '../config/api';
import axios from 'axios';

const BookRideScreen = ({ navigation }) => {
  const { user } = useAuth();
  const { requestRide } = useSocket();
  const { currentLocation } = useLocation();
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: locations, 2: vehicle, 3: confirmation
  
  // Form data
  const [pickupLocation, setPickupLocation] = useState(null);
  const [dropoffLocation, setDropoffLocation] = useState(null);
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [rideEstimate, setRideEstimate] = useState(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  
  // Map state
  const [region, setRegion] = useState({
    latitude: currentLocation?.latitude || 40.7128,
    longitude: currentLocation?.longitude || -74.0060,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [showMap, setShowMap] = useState(false);
  const [mapMode, setMapMode] = useState('pickup'); // 'pickup' or 'dropoff'
  
  // Available vehicles
  const [vehicles, setVehicles] = useState([
    { id: 'sedan', name: 'Standard', price: 1.0, capacity: 4, icon: '🚗' },
    { id: 'suv', name: 'SUV', price: 1.5, capacity: 6, icon: '🚙' },
    { id: 'van', name: 'Van', price: 2.0, capacity: 8, icon: '🚐' },
    { id: 'luxury', name: 'Luxury', price: 3.0, capacity: 4, icon: '🏎️' },
  ]);

  useEffect(() => {
    if (currentLocation && !pickupLocation) {
      setPickupLocation({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      });
      setPickupAddress('Current Location');
    }
  }, [currentLocation, pickupLocation]);

  useEffect(() => {
    if (pickupLocation && dropoffLocation && selectedVehicle) {
      calculateRideEstimate();
    }
  }, [pickupLocation, dropoffLocation, selectedVehicle]);

  const calculateRideEstimate = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/rides/estimate`, {
        pickupLatitude: pickupLocation.latitude,
        pickupLongitude: pickupLocation.longitude,
        dropoffLatitude: dropoffLocation.latitude,
        dropoffLongitude: dropoffLocation.longitude,
        vehicleType: selectedVehicle.id,
        passengerCount
      });

      if (response.data.success) {
        setRideEstimate(response.data.estimate);
      }
    } catch (error) {
    }
  };

  const handleLocationSelect = (location, address, mode) => {
    if (mode === 'pickup') {
      setPickupLocation(location);
      setPickupAddress(address);
    } else {
      setDropoffLocation(location);
      setDropoffAddress(address);
    }
    setShowMap(false);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!pickupLocation || !dropoffLocation) {
        Alert.alert('Missing Information', 'Please select both pickup and dropoff locations');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!selectedVehicle) {
        Alert.alert('Missing Information', 'Please select a vehicle type');
        return;
      }
      setStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleBookRide = async () => {
    if (!rideEstimate) {
      Alert.alert('Error', 'Unable to calculate ride estimate');
      return;
    }

    try {
      setLoading(true);
      
      const rideData = {
        pickupLatitude: pickupLocation.latitude,
        pickupLongitude: pickupLocation.longitude,
        pickupAddress,
        dropoffLatitude: dropoffLocation.latitude,
        dropoffLongitude: dropoffLocation.longitude,
        dropoffAddress,
        vehicleType: selectedVehicle.id,
        passengerCount,
        specialRequests,
        estimatedPrice: rideEstimate.price,
        estimatedDuration: rideEstimate.duration,
        estimatedDistance: rideEstimate.distance
      };

      // Create ride request
      const response = await axios.post(`${API_BASE_URL}/rides/request`, rideData);
      
      if (response.data.success) {
        const ride = response.data.ride;
        
        // Send socket request to drivers
        requestRide({
          rideId: ride.id,
          passengerId: user.id,
          pickup: {
            latitude: pickupLocation.latitude,
            longitude: pickupLocation.longitude,
            address: pickupAddress
          },
          dropoff: {
            latitude: dropoffLocation.latitude,
            longitude: dropoffLocation.longitude,
            address: dropoffAddress
          },
          estimatedPrice: rideEstimate.price
        });

        Alert.alert(
          'Ride Requested',
          'Your ride request has been sent to nearby drivers. We\'ll notify you when a driver accepts.',
          [
            {
              text: 'Track Ride',
              onPress: () => navigation.navigate('ActiveRide', { rideId: ride.id })
            }
          ]
        );
        
        navigation.navigate('ActiveRide', { rideId: ride.id });
      } else {
        Alert.alert('Error', response.data.message || 'Failed to request ride');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to book ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((stepNum) => (
        <View key={stepNum} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            step >= stepNum && styles.stepActive
          ]}>
            <Text style={[
              styles.stepNumber,
              step >= stepNum && styles.stepNumberActive
            ]}>
              {stepNum}
            </Text>
          </View>
          <Text style={[
            styles.stepLabel,
            step >= stepNum && styles.stepLabelActive
          ]}>
            {stepNum === 1 ? 'Locations' : stepNum === 2 ? 'Vehicle' : 'Confirm'}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <LocationSearch
        pickupLocation={pickupLocation}
        dropoffLocation={dropoffLocation}
        pickupAddress={pickupAddress}
        dropoffAddress={dropoffAddress}
        onPickupPress={() => {
          setMapMode('pickup');
          setShowMap(true);
        }}
        onDropoffPress={() => {
          setMapMode('dropoff');
          setShowMap(true);
        }}
        onPickupAddressChange={setPickupAddress}
        onDropoffAddressChange={setDropoffAddress}
      />
      
      <View style={styles.passengerCount}>
        <Text style={styles.label}>Passengers</Text>
        <View style={styles.passengerButtons}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((count) => (
            <TouchableOpacity
              key={count}
              style={[
                styles.passengerButton,
                passengerCount === count && styles.passengerButtonActive
              ]}
              onPress={() => setPassengerCount(count)}
            >
              <Text style={[
                styles.passengerButtonText,
                passengerCount === count && styles.passengerButtonTextActive
              ]}>
                {count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <VehicleSelector
        vehicles={vehicles}
        selectedVehicle={selectedVehicle}
        onSelectVehicle={setSelectedVehicle}
        passengerCount={passengerCount}
      />
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <RideSummary
        pickupAddress={pickupAddress}
        dropoffAddress={dropoffAddress}
        selectedVehicle={selectedVehicle}
        rideEstimate={rideEstimate}
        passengerCount={passengerCount}
        specialRequests={specialRequests}
        onSpecialRequestsChange={setSpecialRequests}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book a Ride</Text>
        <View style={{ width: 50 }} />
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <Button
            title="Previous"
            onPress={handlePreviousStep}
            style={styles.previousButton}
            textStyle={styles.previousButtonText}
          />
        )}
        <Button
          title={step === 3 ? 'Book Ride' : 'Next'}
          onPress={step === 3 ? handleBookRide : handleNextStep}
          loading={loading}
          style={[
            styles.nextButton,
            step === 3 && styles.bookButton
          ]}
        />
      </View>

      {/* Map Modal */}
      <Modal
        visible={showMap}
        animationType="slide"
        onRequestClose={() => setShowMap(false)}
      >
        <View style={styles.mapContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setShowMap(false)}>
              <Text style={styles.mapCloseButton}>×</Text>
            </TouchableOpacity>
            <Text style={styles.mapTitle}>
              Select {mapMode === 'pickup' ? 'Pickup' : 'Dropoff'} Location
            </Text>
            <View style={{ width: 30 }} />
          </View>
          
          <MapView
            style={styles.map}
            region={region}
            onRegionChange={setRegion}
            onPress={(e) => {
              const { coordinate } = e.nativeEvent;
              // In a real app, you'd use reverse geocoding here
              handleLocationSelect(
                coordinate,
                `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`,
                mapMode
              );
            }}
          >
            {pickupLocation && mapMode === 'pickup' && (
              <Marker
                coordinate={pickupLocation}
                title="Pickup Location"
                pinColor="green"
              />
            )}
            {dropoffLocation && mapMode === 'dropoff' && (
              <Marker
                coordinate={dropoffLocation}
                title="Dropoff Location"
                pinColor="red"
              />
            )}
          </MapView>
        </View>
      </Modal>

      {loading && <LoadingSpinner overlay />}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight,
    color: theme.colors.text,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  stepItem: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  stepActive: {
    backgroundColor: theme.colors.primary,
  },
  stepNumber: {
    fontSize: theme.typography.small.fontSize,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  stepNumberActive: {
    color: theme.colors.white,
  },
  stepLabel: {
    fontSize: theme.typography.small.fontSize,
    color: theme.colors.textSecondary,
  },
  stepLabelActive: {
    color: theme.colors.primary,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: theme.spacing.md,
  },
  stepContent: {
    flex: 1,
  },
  passengerCount: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  passengerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  passengerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passengerButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  passengerButtonText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
    fontWeight: '600',
  },
  passengerButtonTextActive: {
    color: theme.colors.white,
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  previousButton: {
    flex: 1,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previousButtonText: {
    color: theme.colors.text,
  },
  nextButton: {
    flex: 2,
  },
  bookButton: {
    backgroundColor: theme.colors.success,
  },
  mapContainer: {
    flex: 1,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  mapCloseButton: {
    fontSize: 24,
    color: theme.colors.text,
    fontWeight: 'bold',
  },
  mapTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight,
    color: theme.colors.text,
  },
  map: {
    flex: 1,
  },
});

export default BookRideScreen;
