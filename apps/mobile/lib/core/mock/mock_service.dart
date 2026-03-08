import '../models/listing.model.dart';
import '../models/user.model.dart';
import '../models/category.model.dart';
import '../models/transaction.model.dart';
import '../models/notification.model.dart';
import 'mock_data.dart';

class MockService {
  Future<T> simulate<T>(T data, {int ms = 600}) async {
    await Future.delayed(Duration(milliseconds: ms));
    return data;
  }

  Future<List<ListingModel>> getListings({String? categoryId, String? role, String? userId}) {
    // Geo-fenced: only return listings the user is allowed to see
    final allListings = MockData.listingsForUser(userId);
    return simulate(allListings
        .where((l) => categoryId == null || l.categoryId == categoryId)
        .toList());
  }

  /// Login: resolve user by phone first, fall back to role string
  Future<UserModel> login(String phone, String role) {
    // Try to find user by phone number
    final roleKey = MockData.phoneToRole[phone];
    if (roleKey != null && MockData.users.containsKey(roleKey)) {
      return simulate(MockData.users[roleKey]!);
    }
    // Fall back to role-based lookup
    return simulate(MockData.users[role] ?? MockData.users['customer']!);
  }

  /// Login by user ID — used for restoring persisted sessions
  Future<UserModel?> loginById(String userId) {
    final user = MockData.users.values.where((u) => u.id == userId).firstOrNull;
    if (user != null) return simulate(user);
    return simulate(null);
  }

  /// Verify OTP — checks per-phone OTP, then falls back to universal 123456
  Future<bool> verifyOtp(String otp, {String? phone}) {
    if (phone != null) {
      final expected = MockData.phoneToOtp[phone];
      if (expected != null) {
        return simulate(otp == expected, ms: 800);
      }
    }
    // Universal fallback
    return simulate(otp == '123456', ms: 800);
  }

  Future<List<CategoryModel>> getCategories() =>
      simulate(MockData.categories);

  Future<List<TransactionModel>> getTransactions() =>
      simulate(MockData.transactions);

  Future<List<NotificationModel>> getNotifications() =>
      simulate(MockData.notifications);
}
