import { View, Text, TouchableOpacity, Image } from 'react-native';

const statusColors = {
  open: { bg: '#dbeafe', text: '#1d4ed8' },
  assigned: { bg: '#fef3c7', text: '#b45309' },
  in_progress: { bg: '#fed7aa', text: '#c2410c' },
  collected: { bg: '#e9d5ff', text: '#7c3aed' },
  completed: { bg: '#d1fae5', text: '#059669' },
  cancelled: { bg: '#fee2e2', text: '#dc2626' },
};

export default function ListingCard({ listing, onPress, showDistance }) {
  const statusStyle = statusColors[listing.status] || statusColors.open;

  return (
    <TouchableOpacity
      onPress={() => onPress?.(listing)}
      style={{
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827' }}>
              {listing.garbage_type || listing.garbage_type_name || 'Garbage'}
            </Text>
            <View
              style={{
                marginLeft: 8,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: statusStyle.bg,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: statusStyle.text }}>
                {listing.status?.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          {listing.description && (
            <Text style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }} numberOfLines={2}>
              {listing.description}
            </Text>
          )}

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
            {listing.estimated_weight && (
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>⚖️ {listing.estimated_weight}kg</Text>
            )}
            {(listing.asking_price || listing.final_price) && (
              <Text style={{ fontSize: 12, color: '#059669', fontWeight: '600' }}>
                💰 RS {listing.final_price || listing.asking_price}
              </Text>
            )}
            {showDistance && listing.distance_km && (
              <Text style={{ fontSize: 12, color: '#3b82f6' }}>📍 {listing.distance_km}km</Text>
            )}
          </View>
        </View>

        {listing.photo_urls?.[0] && (
          <Image
            source={{ uri: listing.photo_urls[0] }}
            style={{ width: 60, height: 60, borderRadius: 8, marginLeft: 12 }}
          />
        )}
      </View>
    </TouchableOpacity>
  );
}
