import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import api from '../../services/api';
import { collectListing, completePayment } from '../../services/listings.service';

export default function ActiveJob() {
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actualWeight, setActualWeight] = useState('');
  const [finalPrice, setFinalPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadActiveJobs();
  }, []);

  async function loadActiveJobs() {
    try {
      // Get listings assigned to this collector
      const res = await api.get('/listings/assigned');
      setActiveJobs(res.data.listings || []);
    } catch (err) {
      // Collectors use a different endpoint - fetch from nearby and filter
      setActiveJobs([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCollect(jobId) {
    if (!actualWeight) {
      return Alert.alert('Error', 'Please enter the actual weight');
    }
    setProcessing(true);
    try {
      await collectListing(jobId, {
        actual_weight: parseFloat(actualWeight),
        final_price: parseFloat(finalPrice) || null,
      });
      Alert.alert('Collected! ✓', 'Garbage marked as collected. Now process payment.');
      loadActiveJobs();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to mark as collected');
    } finally {
      setProcessing(false);
    }
  }

  async function handlePayment(jobId) {
    if (!finalPrice) {
      return Alert.alert('Error', 'Please enter the payment amount');
    }
    setProcessing(true);
    try {
      await completePayment(jobId, {
        payment_method: paymentMethod,
        amount: parseFloat(finalPrice),
      });
      Alert.alert('Payment Complete! 💰', 'House owner has been notified.');
      loadActiveJobs();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (activeJobs.length === 0) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <Text style={{ fontSize: 48 }}>📋</Text>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 12 }}>
          No Active Jobs
        </Text>
        <Text style={{ fontSize: 13, color: '#9ca3af', marginTop: 4 }}>
          Accept a pickup from the Nearby tab
        </Text>
      </View>
    );
  }

  const job = activeJobs[0];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8fafc' }} contentContainerStyle={{ padding: 16 }}>
      {/* Job Info */}
      <View style={{
        backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
      }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 8 }}>
          {job.garbage_type_name || 'Garbage Pickup'}
        </Text>
        <Text style={{ fontSize: 14, color: '#6b7280' }}>Owner: {job.owner_name}</Text>
        <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
          Est. Weight: {job.estimated_weight}kg • Asking: RS {job.asking_price}
        </Text>
        <View style={{
          marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
          backgroundColor: job.status === 'assigned' ? '#fef3c7' : '#e9d5ff',
          alignSelf: 'flex-start',
        }}>
          <Text style={{
            fontSize: 12, fontWeight: '600',
            color: job.status === 'assigned' ? '#b45309' : '#7c3aed',
          }}>
            {job.status?.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Collection Form */}
      {job.status === 'assigned' && (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
            Mark as Collected
          </Text>

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
            Actual Weight (kg)
          </Text>
          <TextInput
            value={actualWeight}
            onChangeText={setActualWeight}
            placeholder="e.g. 4.8"
            keyboardType="numeric"
            style={{
              borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
              padding: 12, fontSize: 16, marginBottom: 12,
            }}
          />

          <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 }}>
            Final Price (RS)
          </Text>
          <TextInput
            value={finalPrice}
            onChangeText={setFinalPrice}
            placeholder="e.g. 45"
            keyboardType="numeric"
            style={{
              borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8,
              padding: 12, fontSize: 16, marginBottom: 16,
            }}
          />

          <TouchableOpacity
            onPress={() => handleCollect(job.id)}
            disabled={processing}
            style={{
              backgroundColor: '#10b981', paddingVertical: 14, borderRadius: 10,
              opacity: processing ? 0.7 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
              {processing ? 'Processing...' : 'Mark as Collected ✓'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Payment Form */}
      {job.status === 'collected' && (
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 }}>
            Complete Payment
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
            {['cash', 'upi'].map((method) => (
              <TouchableOpacity
                key={method}
                onPress={() => setPaymentMethod(method)}
                style={{
                  flex: 1, paddingVertical: 10, borderRadius: 8,
                  borderWidth: 2,
                  borderColor: paymentMethod === method ? '#10b981' : '#d1d5db',
                  backgroundColor: paymentMethod === method ? '#ecfdf5' : '#fff',
                  alignItems: 'center',
                }}
              >
                <Text style={{ fontWeight: '600', textTransform: 'uppercase' }}>{method}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => handlePayment(job.id)}
            disabled={processing}
            style={{
              backgroundColor: '#059669', paddingVertical: 14, borderRadius: 10,
              opacity: processing ? 0.7 : 1,
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' }}>
              {processing ? 'Processing...' : `Pay RS ${finalPrice || job.final_price || '0'} 💰`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}
