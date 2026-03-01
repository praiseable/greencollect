import { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import api from '../../services/api';

export default function CollectorInventory() {
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    loadSummary();
  }, []);

  async function loadSummary() {
    try {
      const res = await api.get('/payments/history', { params: { role: 'payer' } });
      setTotalEarnings(res.data.total_amount || 0);

      // Group payments by garbage type for a summary view
      const payments = res.data.payments || [];
      const grouped = {};
      payments.forEach((p) => {
        const type = p.garbage_type || 'Other';
        if (!grouped[type]) {
          grouped[type] = { type, count: 0, total: 0 };
        }
        grouped[type].count++;
        grouped[type].total += parseFloat(p.amount);
      });
      setSummary(Object.values(grouped));
    } catch (err) {
      console.error('Failed to load summary:', err);
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
      {/* Stats */}
      <View style={{
        backgroundColor: '#10b981', margin: 16, borderRadius: 16, padding: 20,
      }}>
        <Text style={{ color: '#d1fae5', fontSize: 14 }}>Total Spent on Collections</Text>
        <Text style={{ color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 }}>
          RS {totalEarnings.toFixed(0)}
        </Text>
      </View>

      <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 8 }}>
        Collection Summary
      </Text>

      <FlatList
        data={summary}
        keyExtractor={(item) => item.type}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8,
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#111827' }}>{item.type}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                {item.count} pickups
              </Text>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#059669' }}>
              RS {item.total.toFixed(0)}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 48 }}>📊</Text>
            <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>No collections yet</Text>
          </View>
        }
      />
    </View>
  );
}
