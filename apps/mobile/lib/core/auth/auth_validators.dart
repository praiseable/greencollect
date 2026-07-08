/// Pure validation and payload helpers for UC-AUTH and UC-KYC.
class AuthValidators {
  const AuthValidators._();

  static final RegExp _phoneDigits = RegExp(r'[^0-9+]');
  static final RegExp cnicPattern = RegExp(r'^\d{5}-\d{7}-\d{1}$');
  static final RegExp ntnPattern = RegExp(r'^[0-9]{7,9}(-[0-9])?$');
  static final RegExp strnPattern = RegExp(r'^[0-9]{13}$');

  static String normalizePakistanPhone(String input) {
    var phone = input.trim().replaceAll(_phoneDigits, '');
    if (phone.startsWith('0092')) phone = '+92${phone.substring(4)}';
    if (phone.startsWith('92') && !phone.startsWith('+92')) {
      phone = '+92${phone.substring(2)}';
    }
    if (phone.startsWith('03')) phone = '+92${phone.substring(1)}';
    if (phone.startsWith('3')) phone = '+92$phone';
    return phone;
  }

  static bool isValidPakistanPhone(String input) {
    return RegExp(r'^\+923\d{9}$').hasMatch(normalizePakistanPhone(input));
  }

  static bool isValidOtp(String input) => RegExp(r'^\d{6}$').hasMatch(input);

  static bool isValidCnic(String input) => cnicPattern.hasMatch(input.trim());

  static bool isValidOptionalNtn(String? input) {
    if (input == null || input.trim().isEmpty) return true;
    return ntnPattern.hasMatch(input.trim());
  }

  static bool isValidOptionalStrn(String? input) {
    if (input == null || input.trim().isEmpty) return true;
    return strnPattern.hasMatch(input.trim());
  }

  static Map<String, dynamic> loginPayload({
    required String emailOrPhone,
    required String password,
  }) {
    final normalized = normalizePakistanPhone(emailOrPhone);
    if (isValidPakistanPhone(normalized)) {
      return {'phone': normalized, 'password': password};
    }
    return {'email': emailOrPhone.trim(), 'password': password};
  }

  static Map<String, dynamic> registerPayload({
    required String firstName,
    required String lastName,
    required String phone,
    required String password,
    String? email,
  }) {
    return {
      'firstName': firstName.trim(),
      'lastName': lastName.trim(),
      'phone': normalizePakistanPhone(phone),
      'password': password,
      if (email != null && email.trim().isNotEmpty) 'email': email.trim(),
    };
  }

  static Map<String, dynamic> proKycPayload({
    required String requestedRole,
    required String cnicNumber,
    required String businessName,
    required String businessAddress,
    String? ntnNumber,
    String? strnNumber,
    String? businessType,
  }) {
    return {
      'requestedRole': requestedRole,
      'cnicNumber': cnicNumber.trim(),
      'businessName': businessName.trim(),
      'businessAddress': businessAddress.trim(),
      if (ntnNumber != null && ntnNumber.trim().isNotEmpty)
        'ntnNumber': ntnNumber.trim(),
      if (strnNumber != null && strnNumber.trim().isNotEmpty)
        'strnNumber': strnNumber.trim(),
      if (businessType != null && businessType.trim().isNotEmpty)
        'businessType': businessType.trim(),
    };
  }
}
