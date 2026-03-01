import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import useAuthStore from '../store/auth.store';

export default function Index() {
  const router = useRouter();
  const { isLoggedIn, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isLoggedIn) {
      router.replace('/(auth)/login');
      return;
    }

    // Route based on role
    switch (user?.role) {
      case 'house_owner':
        router.replace('/(owner)');
        break;
      case 'local_collector':
        router.replace('/(collector)');
        break;
      case 'regional_collector':
        router.replace('/(regional)');
        break;
      default:
        router.replace('/(auth)/login');
    }
  }, [isLoggedIn, isLoading, user]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ecfdf5' }}>
      <ActivityIndicator size="large" color="#10b981" />
    </View>
  );
}
