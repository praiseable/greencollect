import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { getMyListings } from '../../services/listings.service';
import ListingCard from '../../components/ListingCard';

const statusFilters = ['all', 'open', 'assigned', 'collected', 'completed'];

export default function OwnerDashboard() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  async function loadListings() {
    try {
      const params = {};
      if (activeFilter !== 'all') params.status = activeFilter;
      const data = await getMyListings(params);
      setListings(data.listings);
    } catch (err) {
      console.error('Failed to load listings:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadListings();
  }, [activeFilter]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadListings();
  }, [activeFilter]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
      {/* Status Filters */}
      <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter}
            onPress={() => setActiveFilter(filter)}
            style={{
              paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
              backgroundColor: activeFilter === filter ? '#10b981' : '#e5e7eb',
            }}
          >
            <Text
              style={{
                fontSize: 12, fontWeight: '600',
                color: activeFilter === filter ? '#fff' : '#6b7280',
                textTransform: 'capitalize',
              }}
            >
              {filter}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        renderItem={({ item }) => <ListingCard listing={item} />}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 40 }}>
            <Text style={{ fontSize: 48 }}>📦</Text>
            <Text style={{ fontSize: 16, color: '#6b7280', marginTop: 8 }}>No listings yet</Text>
            <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
              Post your first garbage listing!
            </Text>
          </View>
        }
      />
    </View>
  );
}
