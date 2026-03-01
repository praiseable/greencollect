import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { getNearbyListings, acceptListing } from '../../services/listings.service';
import ListingCard from '../../components/ListingCard';

export default function CollectorMap() {
  const [listings, setListings] = useState([]);
  const [myLocation, setMyLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [accepting, setAccepting] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location permission is needed to find nearby listings.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMyLocation(loc.coords);
      const data = await getNearbyListings(loc.coords.latitude, loc.coords.longitude, 5);
      setListings(data);
    } catch (err) {
      console.error('Failed to load:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAccept(listing) {
    Alert.alert(
      'Accept Job?',
      `Pickup ${listing.garbage_type || 'garbage'} (${listing.distance_km}km away) for RS ${listing.asking_price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            setAccepting(listing.id);
            try {
              await acceptListing(listing.id);
              Alert.alert('Job Accepted! 🚛', 'Navigate to the pickup location.');
              loadData();
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to accept');
            } finally {
              setAccepting(null);
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={{ marginTop: 12, color: '#6b7280' }}>Finding nearby listings...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Toggle Map/List */}
      <View style={{ flexDirection: 'row', padding: 8, backgroundColor: '#fff', gap: 8 }}>
        <TouchableOpacity
          onPress={() => setViewMode('map')}
          style={{
            flex: 1, paddingVertical: 8, borderRadius: 8,
            backgroundColor: viewMode === 'map' ? '#10b981' : '#f3f4f6',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '600', color: viewMode === 'map' ? '#fff' : '#6b7280' }}>
            🗺️ Map
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setViewMode('list')}
          style={{
            flex: 1, paddingVertical: 8, borderRadius: 8,
            backgroundColor: viewMode === 'list' ? '#10b981' : '#f3f4f6',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontWeight: '600', color: viewMode === 'list' ? '#fff' : '#6b7280' }}>
            📋 List ({listings.length})
          </Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'map' ? (
        <MapView
          style={{ flex: 1 }}
          initialRegion={{
            latitude: myLocation?.latitude || 31.5204,
            longitude: myLocation?.longitude || 74.3587,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation
        >
          {listings.map((l) => (
            <Marker
              key={l.id}
              coordinate={{ latitude: parseFloat(l.latitude), longitude: parseFloat(l.longitude) }}
              title={`${l.garbage_type} — RS ${l.asking_price}`}
              description={`${l.distance_km}km away • ${l.estimated_weight || '?'}kg`}
              pinColor="#10b981"
              onCalloutPress={() => handleAccept(l)}
            />
          ))}
        </MapView>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View>
              <ListingCard listing={item} showDistance onPress={handleAccept} />
              <TouchableOpacity
                onPress={() => handleAccept(item)}
                disabled={accepting === item.id}
                style={{
                  backgroundColor: '#10b981', paddingVertical: 10, borderRadius: 8,
                  marginTop: -4, marginBottom: 12, opacity: accepting === item.id ? 0.7 : 1,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', textAlign: 'center' }}>
                  {accepting === item.id ? 'Accepting...' : 'Accept Pickup 🚛'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ fontSize: 48 }}>🗺️</Text>
              <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>No nearby listings</Text>
              <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
                Pull down to refresh or check back later
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
