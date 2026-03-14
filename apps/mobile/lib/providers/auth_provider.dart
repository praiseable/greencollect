import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  bool get isAuthenticated => _user != null;
  String? get error => _error;

  AuthProvider() {
    _loadUser();
  }

  Future<void> _loadUser() async {
    final userData = await StorageService().getUser();
    if (userData != null) {
      _user = User.fromJson(userData);
      notifyListeners();
    }
  }

  Future<bool> loginWithPhone(String phone) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      // Ensure +92 prefix
      final formattedPhone = phone.startsWith('+92') ? phone : '+92$phone';
      await ApiService().post('/auth/send-otp', body: {'phone': formattedPhone});
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> verifyOtp(String phone, String otp) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final formattedPhone = phone.startsWith('+92') ? phone : '+92$phone';
      final response = await ApiService().post('/auth/verify-otp', body: {
        'phone': formattedPhone,
        'otp': otp,
      });

      final token = response['accessToken'] ?? response['token'];
      final expiresIn = response['expiresIn'] as int? ?? 900; // Default 15 minutes
      if (token != null) {
        await StorageService().setToken(token, expiresIn);
      }
      if (response['refreshToken'] != null) {
        await StorageService().setRefreshToken(response['refreshToken']);
      }
      if (response['user'] != null) {
        _user = User.fromJson(response['user']);
        await StorageService().setUser(response['user']);
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> loginWithEmail(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await ApiService().post('/auth/login', body: {
        'email': email,
        'password': password,
      });

      final token = response['accessToken'] ?? response['token'];
      final expiresIn = response['expiresIn'] as int? ?? 900; // Default 15 minutes
      if (token != null) await StorageService().setToken(token, expiresIn);
      if (response['refreshToken'] != null) {
        await StorageService().setRefreshToken(response['refreshToken']);
      }
      if (response['user'] != null) {
        _user = User.fromJson(response['user']);
        await StorageService().setUser(response['user']);
      }

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> register({
    required String firstName,
    required String lastName,
    required String phone,
    String? email,
    String? password,
    String role = 'CUSTOMER',
  }) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final body = {
        'firstName': firstName,
        'lastName': lastName,
        'phone': phone.startsWith('+92') ? phone : '+92$phone',
        'role': role,
      };
      if (email != null) body['email'] = email;
      if (password != null) body['password'] = password;

      await ApiService().post('/auth/register', body: body);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    try {
      await ApiService().post('/auth/logout');
    } catch (_) {}
    await StorageService().clearAuth();
    _user = null;
    notifyListeners();
  }
}
