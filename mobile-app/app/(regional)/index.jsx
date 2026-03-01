import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../../services/api';

export default function BrowseInventory() {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [selectedLot, setSelectedLot] = useState(null);
  const [orderWeight, setOrderWeight] = useState('');
  const [offerPrice, setOfferPrice] = useState('');
  const [ordering, setOrdering] = useState(false);

  useEffect(() => {
    loadLots();
  }, []);

  async function loadLots() {
    setLoading(true);
    try {
      const params = {};
      if (city) params.city = city;
      const res = await api.get('/bulk-orders/available', { params });
      setLots(res.data.lots);
    } catch (err) {
      console.error('Failed to load lots:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePlaceOrder(lot) {
    if (!orderWeight || !offerPrice) {
      return Alert.alert('Error', 'Please enter weight and price');
    }

    setOrdering(true);
    try {
      await api.post('/bulk-orders', {
        collection_point_id: lot.collection_point_id,
        garbage_type_id: lot.garbage_type_id,
        requested_weight_kg: parseFloat(orderWeight),
        offered_price_per_kg: parseFloat(offerPrice),
      });
      Alert.alert('Order Placed! 🛒', 'The collection point manager will review your order.');
      setSelectedLot(null);
      setOrderWeight('');
      setOfferPrice('');
      loadLots();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to place order');
    } finally {
      setOrdering(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Search */}
      <View style={{ padding: 12, backgroundColor: '#fff' }}>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Filter by city..."
          onSubmitEditing={loadLots}
          returnKeyType="search"
          style={{
            backgroundColor: '#f3f4f6', borderRadius: 10, paddingHorizontal: 14,
            paddingVertical: 10, fontSize: 14,
          }}
        />
      </View>

      <FlatList
        data={lots}
        keyExtractor={(_, idx) => idx.toString()}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
            shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                {item.garbage_type}
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#059669' }}>
                {item.available_weight_kg}kg
              </Text>
            </View>
            <Text style={{ fontSize: 13, color: '#6b7280' }}>
              📍 {item.collection_point_name}
            </Text>
            <Text style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
              {item.city}{item.state ? `, ${item.state}` : ''}
            </Text>
            <Text style={{ fontSize: 13, color: '#10b981', fontWeight: '600', marginTop: 4 }}>
              Suggested: RS {item.suggested_price_per_kg}/kg
            </Text>

            {selectedLot === item ? (
              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 12 }}>
                <TextInput
                  value={orderWeight}
                  onChangeText={setOrderWeight}
                  placeholder="Weight (kg)"
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
                    padding: 10, marginBottom: 8, fontSize: 14,
                  }}
                />
                <TextInput
                  value={offerPrice}
                  onChangeText={setOfferPrice}
                  placeholder="Your price per kg (RS)"
                  keyboardType="numeric"
                  style={{
                    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
                    padding: 10, marginBottom: 12, fontSize: 14,
                  }}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => setSelectedLot(null)}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 8,
                      backgroundColor: '#f3f4f6', alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: '#6b7280', fontWeight: '600' }}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handlePlaceOrder(item)}
                    disabled={ordering}
                    style={{
                      flex: 1, paddingVertical: 10, borderRadius: 8,
                      backgroundColor: '#10b981', alignItems: 'center',
                      opacity: ordering ? 0.7 : 1,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>
                      {ordering ? 'Placing...' : 'Place Order'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setSelectedLot(item);
                  setOfferPrice(String(item.suggested_price_per_kg || ''));
                }}
                style={{
                  marginTop: 12, paddingVertical: 10, borderRadius: 8,
                  backgroundColor: '#10b981', alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Place Bulk Order 🛒</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 48 }}>🗂️</Text>
            <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>No inventory available</Text>
          </View>
        }
      />
    </View>
  );
}
