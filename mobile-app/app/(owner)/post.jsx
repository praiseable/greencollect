import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { postListing } from '../../services/listings.service';
import { useLocation } from '../../hooks/useLocation';
import GarbageTypeSelector from '../../components/GarbageTypeSelector';
import PhotoPicker from '../../components/PhotoPicker';
import PriceInput from '../../components/PriceInput';

export default function PostGarbage() {
  const router = useRouter();
  const { location, address, loading: locLoading, requestLocation } = useLocation();
  const [photos, setPhotos] = useState([]);
  const [garbageTypeId, setGarbageTypeId] = useState(null);
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [addressText, setAddressText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleGetLocation() {
    const coords = await requestLocation();
    if (coords) {
      // address is set by the hook
    }
  }

  async function handleSubmit() {
    if (!photos.length) {
      return Alert.alert('Missing Photo', 'Please take at least one photo');
    }
    if (!garbageTypeId) {
      return Alert.alert('Missing Type', 'Please select a garbage type');
    }
    if (!location) {
      return Alert.alert('Missing Location', 'Please get your location first');
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      photos.forEach((uri, i) => {
        formData.append('photos', {
          uri,
          name: `photo_${i}.jpg`,
          type: 'image/jpeg',
        });
      });
      formData.append('garbage_type_id', garbageTypeId);
      formData.append('latitude', location.latitude);
      formData.append('longitude', location.longitude);
      formData.append('address', addressText || address);
      if (weight) formData.append('estimated_weight', weight);
      if (price) formData.append('asking_price', price);
      if (description) formData.append('description', description);

      await postListing(formData);

      Alert.alert('Success! ♻️', 'Your listing has been posted. Nearby collectors will be notified!', [
        { text: 'OK', onPress: () => router.push('/(owner)') },
      ]);

      // Reset form
      setPhotos([]);
      setGarbageTypeId(null);
      setWeight('');
      setPrice('');
      setDescription('');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to post listing');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
        Post your garbage for nearby collectors to pick up
      </Text>

      {/* Photo Picker */}
      <PhotoPicker photos={photos} setPhotos={setPhotos} />

      {/* Garbage Type */}
      <GarbageTypeSelector selected={garbageTypeId} onSelect={setGarbageTypeId} />

      {/* Location */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>Location</Text>
        <TouchableOpacity
          onPress={handleGetLocation}
          disabled={locLoading}
          style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
            borderColor: location ? '#10b981' : '#d1d5db', padding: 14,
          }}
        >
          {locLoading ? (
            <ActivityIndicator size="small" color="#10b981" style={{ marginRight: 8 }} />
          ) : (
            <Text style={{ fontSize: 18, marginRight: 8 }}>📍</Text>
          )}
          <Text style={{ flex: 1, fontSize: 14, color: location ? '#111827' : '#9ca3af' }}>
            {location ? address || 'Location captured' : 'Tap to get your location'}
          </Text>
          {location && <Text style={{ color: '#10b981', fontSize: 16 }}>✓</Text>}
        </TouchableOpacity>
        {location && (
          <TextInput
            value={addressText}
            onChangeText={setAddressText}
            placeholder="Edit address (optional)"
            style={{
              backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
              borderColor: '#d1d5db', padding: 12, marginTop: 8, fontSize: 14,
            }}
          />
        )}
      </View>

      {/* Weight */}
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
          Estimated Weight (kg)
        </Text>
        <TextInput
          value={weight}
          onChangeText={setWeight}
          placeholder="e.g. 5.5"
          keyboardType="numeric"
          style={{
            backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
            borderColor: '#d1d5db', padding: 12, fontSize: 16,
          }}
        />
      </View>

      {/* Price */}
      <PriceInput label="Asking Price" value={price} onChangeText={setPrice} placeholder="e.g. 50" />

      {/* Description */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
          Description (optional)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="e.g. Old newspapers and cartons"
          multiline
          numberOfLines={3}
          style={{
            backgroundColor: '#fff', borderRadius: 10, borderWidth: 1,
            borderColor: '#d1d5db', padding: 12, fontSize: 14,
            textAlignVertical: 'top', minHeight: 80,
          }}
        />
      </View>

      {/* Submit */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={submitting}
        style={{
          backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12,
          opacity: submitting ? 0.7 : 1, marginBottom: 40,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
          {submitting ? 'Posting...' : 'Post Garbage ♻️'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
