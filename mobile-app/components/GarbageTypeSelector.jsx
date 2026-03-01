import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import api from '../services/api';

const typeIcons = {
  paper: '📰', plastic: '🥤', metal: '🔩', glass: '🍶',
  organic: '🥬', ewaste: '📱', cloth: '👕',
};

export default function GarbageTypeSelector({ selected, onSelect }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTypes();
  }, []);

  async function loadTypes() {
    try {
      const res = await api.get('/garbage-types');
      setTypes(res.data.types);
    } catch (err) {
      console.error('Failed to load garbage types:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <ActivityIndicator size="small" color="#10b981" style={{ marginVertical: 12 }} />;
  }

  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
        Garbage Type
      </Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={types}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => onSelect(item.id)}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: selected === item.id ? '#10b981' : '#e5e7eb',
              backgroundColor: selected === item.id ? '#ecfdf5' : '#fff',
              marginRight: 8,
              alignItems: 'center',
              minWidth: 80,
            }}
          >
            <Text style={{ fontSize: 24 }}>{typeIcons[item.slug] || '♻️'}</Text>
            <Text
              style={{
                fontSize: 11,
                fontWeight: selected === item.id ? '700' : '500',
                color: selected === item.id ? '#059669' : '#6b7280',
                marginTop: 4,
              }}
            >
              {item.name.split('/')[0].trim()}
            </Text>
            {item.base_price_per_kg && (
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>RS {item.base_price_per_kg}/kg</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
