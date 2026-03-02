class User {
  final String id;
  final String? email;
  final String? phone;
  final String firstName;
  final String lastName;
  final String? roleName;
  final String? profilePicture;
  final String? address;
  final String? cityName;
  final String? geoZoneName;

  User({
    required this.id,
    this.email,
    this.phone,
    required this.firstName,
    required this.lastName,
    this.roleName,
    this.profilePicture,
    this.address,
    this.cityName,
    this.geoZoneName,
  });

  String get fullName => '$firstName $lastName';
  String get initials => '${firstName.isNotEmpty ? firstName[0] : ''}${lastName.isNotEmpty ? lastName[0] : ''}';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] ?? '',
      email: json['email'],
      phone: json['phone'],
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      roleName: json['role']?['name'] ?? json['roleName'],
      profilePicture: json['profilePicture'],
      address: json['address'],
      cityName: json['city']?['name'] ?? json['cityName'],
      geoZoneName: json['geoZone']?['name'] ?? json['geoZoneName'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'email': email,
        'phone': phone,
        'firstName': firstName,
        'lastName': lastName,
        'roleName': roleName,
        'profilePicture': profilePicture,
        'address': address,
        'cityName': cityName,
        'geoZoneName': geoZoneName,
      };
}
