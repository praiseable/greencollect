import { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import api from '../../services/api';

export default function EarningsHistory() {
  const [payments, setPayments] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, []);

  async function loadPayments() {
    try {
      const res = await api.get('/payments/history', { params: { role: 'payee' } });
      setPayments(res.data.payments);
      setTotalAmount(res.data.total_amount);
      setTotalCount(res.data.total_count);
    } catch (err) {
      console.error('Failed to load payments:', err);
    } finally {
      setLoading(false);
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
      {/* Summary Card */}
      <View style={{
        backgroundColor: '#10b981', margin: 16, borderRadius: 16, padding: 20,
        shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 4,
      }}>
        <Text style={{ color: '#d1fae5', fontSize: 14 }}>Total Earnings</Text>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 }}>
          RS {totalAmount.toFixed(0)}
        </Text>
        <Text style={{ color: '#a7f3d0', fontSize: 13, marginTop: 8 }}>
          {totalCount} completed transactions
        </Text>
      </View>

      {/* Payments List */}
      <FlatList
        data={payments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827' }}>
                {item.garbage_type || 'Garbage Pickup'}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                From: {item.payer_name} • {item.method}
              </Text>
              <Text style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                {new Date(item.created_at).toLocaleDateString()}
              </Text>
            </View>
            <Text style={{
              fontSize: 16, fontWeight: '700',
              color: item.status === 'completed' ? '#059669' : '#d97706',
            }}>
              +RS {parseFloat(item.amount).toFixed(0)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 48 }}>💰</Text>
            <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>No earnings yet</Text>
          </View>
        }
      />
    </View>
  );
}
