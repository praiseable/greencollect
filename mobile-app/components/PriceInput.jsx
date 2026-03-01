import { View, Text, TextInput } from 'react-native';

export default function PriceInput({ label, value, onChangeText, placeholder }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: '#d1d5db',
          borderRadius: 10,
          paddingHorizontal: 12,
          backgroundColor: '#fff',
        }}
      >
        <Text style={{ fontSize: 16, color: '#6b7280', marginRight: 4 }}>RS</Text>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || '0.00'}
          keyboardType="numeric"
          style={{
            flex: 1,
            paddingVertical: 12,
            fontSize: 16,
            color: '#111827',
          }}
        />
      </View>
    </View>
  );
}
