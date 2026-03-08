/// Collection tracking — the complete lifecycle of garbage pickup.
///
/// FLOW:
///   ASSIGNED → ACCEPTED → EN_ROUTE → ARRIVED (GPS) → COLLECTED (photos+weight) → DELIVERED
///
/// If dealer doesn't update within deadline:
///   → Status = ESCALATED → listing pushed to adjacent dealer
///   → Dealer rating drops
enum CollectionStatus {
  assigned,           // System assigned to dealer
  accepted,           // Dealer tapped "Accept"
  enRoute,            // Dealer traveling to pickup location
  arrived,            // GPS confirmed: dealer at listing location
  collected,          // Material picked up, photos taken, weight confirmed
  deliveredToCenter,  // Delivered to recycling center
  cancelled,
  escalated,          // Deadline passed, moved to next dealer
  expired,
}

class CollectionModel {
  final String id;
  final String listingId;
  final String listingTitle;
  final String dealerId;
  final String dealerName;
  final String customerId;
  final String customerName;
  final String categoryName;
  final String categoryId;
  final CollectionStatus status;

  // ── Time tracking ──
  final DateTime assignedAt;
  final DateTime? acceptedAt;
  final DateTime? enRouteAt;
  final DateTime? arrivedAt;
  final DateTime? collectedAt;
  final DateTime? deliveredAt;
  final DateTime deadlineAt;

  // ── Location verification ──
  final double listingLat;
  final double listingLng;
  final double? dealerArriveLat;
  final double? dealerArriveLng;
  final double? dealerCollectLat;
  final double? dealerCollectLng;
  final bool gpsVerified;

  // ── Collection data ──
  final double? confirmedWeightKg;
  final List<String> photoUrls;
  final int? qualityRating; // 1-5
  final String? notes;

  // ── Computed metrics ──
  final int? responseTimeMin;
  final int? collectionTimeMin;
  final int? totalTimeMin;
  final double? carbonOffsetKg;

  // ── Location info ──
  final String city;
  final String area;
  final String address;

  CollectionModel({
    required this.id,
    required this.listingId,
    required this.listingTitle,
    required this.dealerId,
    required this.dealerName,
    required this.customerId,
    required this.customerName,
    required this.categoryName,
    required this.categoryId,
    required this.status,
    required this.assignedAt,
    this.acceptedAt,
    this.enRouteAt,
    this.arrivedAt,
    this.collectedAt,
    this.deliveredAt,
    required this.deadlineAt,
    required this.listingLat,
    required this.listingLng,
    this.dealerArriveLat,
    this.dealerArriveLng,
    this.dealerCollectLat,
    this.dealerCollectLng,
    this.gpsVerified = false,
    this.confirmedWeightKg,
    this.photoUrls = const [],
    this.qualityRating,
    this.notes,
    this.responseTimeMin,
    this.collectionTimeMin,
    this.totalTimeMin,
    this.carbonOffsetKg,
    required this.city,
    required this.area,
    required this.address,
  });

  /// Whether this collection is overdue (past deadline without completion)
  bool get isOverdue =>
      DateTime.now().isAfter(deadlineAt) &&
      status != CollectionStatus.collected &&
      status != CollectionStatus.deliveredToCenter &&
      status != CollectionStatus.cancelled;

  /// Minutes remaining until deadline
  int get minutesToDeadline =>
      deadlineAt.difference(DateTime.now()).inMinutes;

  /// Percentage of deadline used
  double get deadlineProgress {
    final total = deadlineAt.difference(assignedAt).inMinutes;
    final elapsed = DateTime.now().difference(assignedAt).inMinutes;
    return (elapsed / total).clamp(0.0, 1.0);
  }

  String get statusLabel {
    switch (status) {
      case CollectionStatus.assigned: return 'Assigned';
      case CollectionStatus.accepted: return 'Accepted';
      case CollectionStatus.enRoute: return 'En Route';
      case CollectionStatus.arrived: return 'Arrived';
      case CollectionStatus.collected: return 'Collected';
      case CollectionStatus.deliveredToCenter: return 'Delivered';
      case CollectionStatus.cancelled: return 'Cancelled';
      case CollectionStatus.escalated: return 'Escalated';
      case CollectionStatus.expired: return 'Expired';
    }
  }

  String get statusLabelUr {
    switch (status) {
      case CollectionStatus.assigned: return 'تفویض';
      case CollectionStatus.accepted: return 'قبول';
      case CollectionStatus.enRoute: return 'راستے میں';
      case CollectionStatus.arrived: return 'پہنچ گئے';
      case CollectionStatus.collected: return 'جمع کیا';
      case CollectionStatus.deliveredToCenter: return 'مرکز پہنچایا';
      case CollectionStatus.cancelled: return 'منسوخ';
      case CollectionStatus.escalated: return 'منتقل';
      case CollectionStatus.expired: return 'ختم';
    }
  }
}

/// Carbon offset factors: kg CO2 saved per kg material
class CarbonFactors {
  static const Map<String, double> offsetPerKg = {
    'c1': 4.0,    // Metals
    'c2': 1.5,    // Plastics
    'c3': 1.1,    // Paper & Cardboard
    'c4': 2.5,    // Electronics
    'c5': 0.5,    // Organic
    'c6': 0.8,    // Furniture (wood)
    'c7': 0.6,    // Household
    'c8': 0.3,    // Glass
  };

  static double calculate(String categoryId, double weightKg) {
    return weightKg * (offsetPerKg[categoryId] ?? 1.0);
  }
}

/// Dealer performance rating model
class DealerRatingModel {
  final String dealerId;
  final String dealerName;
  final double overallScore;    // 0.0 - 5.0
  final double responseScore;   // Based on response time
  final double collectionScore; // Based on collection speed
  final double complianceScore; // Status update timeliness
  final double? customerScore;  // Customer feedback
  final int totalCollections;
  final int onTimeCollections;
  final int lateCollections;
  final int escalatedCollections;
  final double avgResponseTimeMin;
  final double avgCollectionTimeMin;
  final String period;

  DealerRatingModel({
    required this.dealerId,
    required this.dealerName,
    required this.overallScore,
    required this.responseScore,
    required this.collectionScore,
    required this.complianceScore,
    this.customerScore,
    required this.totalCollections,
    required this.onTimeCollections,
    required this.lateCollections,
    required this.escalatedCollections,
    required this.avgResponseTimeMin,
    required this.avgCollectionTimeMin,
    required this.period,
  });

  double get onTimeRate =>
      totalCollections > 0 ? (onTimeCollections / totalCollections) * 100 : 0;

  String get ratingBadge {
    if (overallScore >= 4.5) return '⭐ Platinum';
    if (overallScore >= 4.0) return '🥇 Gold';
    if (overallScore >= 3.0) return '🥈 Silver';
    if (overallScore >= 2.0) return '🥉 Bronze';
    return '⚠️ At Risk';
  }
}
