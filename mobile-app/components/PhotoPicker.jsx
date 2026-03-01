import { View, Text, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function PhotoPicker({ photos, setPhotos, maxPhotos = 5 }) {
  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is needed.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: maxPhotos - photos.length,
    });

    if (!result.canceled && result.assets) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
        Photos ({photos.length}/{maxPhotos})
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {photos.map((uri, idx) => (
          <View key={idx} style={{ marginRight: 8, position: 'relative' }}>
            <Image source={{ uri }} style={{ width: 80, height: 80, borderRadius: 8 }} />
            <TouchableOpacity
              onPress={() => removePhoto(idx)}
              style={{
                position: 'absolute', top: -6, right: -6,
                backgroundColor: '#ef4444', borderRadius: 10,
                width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        {photos.length < maxPhotos && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={pickFromCamera}
              style={{
                width: 80, height: 80, borderRadius: 8, borderWidth: 2,
                borderColor: '#d1d5db', borderStyle: 'dashed',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24 }}>📷</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickFromGallery}
              style={{
                width: 80, height: 80, borderRadius: 8, borderWidth: 2,
                borderColor: '#d1d5db', borderStyle: 'dashed',
                alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 24 }}>🖼️</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af' }}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
