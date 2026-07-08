import '../../services/storage_service.dart';
import '../models/user.model.dart';

/// Secure session adapter for UC-AUTH-02.
///
/// Access/refresh tokens are stored via StorageService, which uses
/// flutter_secure_storage for token material. User JSON may be cached for UI
/// restoration, but credentials must never be kept in SharedPreferences.
class SecureSessionStore {
  final StorageService _storage;

  SecureSessionStore({StorageService? storage})
      : _storage = storage ?? StorageService();

  Future<String?> get accessToken => _storage.getAccessToken();

  Future<String?> get refreshToken => _storage.getRefreshToken();

  Future<UserModel?> get cachedUser async {
    final data = await _storage.getUser();
    if (data == null) return null;
    return UserModel.fromJson(data);
  }

  Future<void> saveSession({
    required String accessToken,
    String? refreshToken,
    int? expiresIn,
    UserModel? user,
  }) async {
    await _storage.saveAccessToken(accessToken, expiresIn);
    if (refreshToken != null && refreshToken.isNotEmpty) {
      await _storage.saveRefreshToken(refreshToken);
    }
    if (user != null) await _storage.saveUser(user.toJson());
  }

  Future<void> saveUser(UserModel user) => _storage.saveUser(user.toJson());

  Future<void> clear() => _storage.clearAll();
}

/// In-memory store used by unit tests. It follows the same public contract as
/// [SecureSessionStore] without touching platform secure-storage plugins.
class MemorySessionStore extends SecureSessionStore {
  String? _accessToken;
  String? _refreshToken;
  UserModel? _user;

  MemorySessionStore() : super(storage: StorageService());

  @override
  Future<String?> get accessToken async => _accessToken;

  @override
  Future<String?> get refreshToken async => _refreshToken;

  @override
  Future<UserModel?> get cachedUser async => _user;

  @override
  Future<void> saveSession({
    required String accessToken,
    String? refreshToken,
    int? expiresIn,
    UserModel? user,
  }) async {
    _accessToken = accessToken;
    if (refreshToken != null) _refreshToken = refreshToken;
    if (user != null) _user = user;
  }

  @override
  Future<void> saveUser(UserModel user) async {
    _user = user;
  }

  @override
  Future<void> clear() async {
    _accessToken = null;
    _refreshToken = null;
    _user = null;
  }
}
