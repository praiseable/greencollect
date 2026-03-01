import { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import api from '../../services/api';

const statusColors = {
  pending: { bg: '#fef3c7', text: '#b45309' },
  confirmed: { bg: '#dbeafe', text: '#1d4ed8' },
  picked_up: { bg: '#e9d5ff', text: '#7c3aed' },
  completed: { bg: '#d1fae5', text: '#059669' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    try {
      const res = await api.get('/bulk-orders/my');
      setOrders(res.data.orders);
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickupDone(orderId) {
    Alert.alert('Confirm Pickup', 'Have you picked up this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes, Done',
        onPress: async () => {
          setProcessing(orderId);
          try {
            await api.put(`/bulk-orders/${orderId}/pickup-done`);
            Alert.alert('Pickup Complete! ✓', 'Order marked as completed.');
            loadOrders();
          } catch (err) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to complete');
          } finally {
            setProcessing(null);
          }
        },
      },
    ]);
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
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const statusStyle = statusColors[item.status] || statusColors.pending;
          return (
            <View style={{
              backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12,
              shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
                  {item.garbage_type_name}
                </Text>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
                  backgroundColor: statusStyle.bg,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: statusStyle.text }}>
                    {item.status?.toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 13, color: '#6b7280' }}>
                📍 {item.collection_point_name}
              </Text>
              <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                <Text style={{ fontSize: 13, color: '#374151' }}>
                  ⚖️ {item.requested_weight_kg}kg
                </Text>
                <Text style={{ fontSize: 13, color: '#374151' }}>
                  💰 RS {item.agreed_price_per_kg}/kg
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#059669' }}>
                  Total: RS {parseFloat(item.total_amount).toFixed(0)}
                </Text>
              </View>

              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>

              {item.status === 'confirmed' && (
                <TouchableOpacity
                  onPress={() => handlePickupDone(item.id)}
                  disabled={processing === item.id}
                  style={{
                    marginTop: 12, paddingVertical: 10, borderRadius: 8,
                    backgroundColor: '#10b981', alignItems: 'center',
                    opacity: processing === item.id ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700' }}>
                    {processing === item.id ? 'Processing...' : 'Mark Pickup Done ✓'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 48 }}>🛒</Text>
            <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>No orders yet</Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
              Browse inventory to place your first bulk order
            </Text>
          </View>
        }
      />
    </View>
  );
}
