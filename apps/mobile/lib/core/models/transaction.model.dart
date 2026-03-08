enum TransactionStatus {
  negotiating,
  finalized,
  cancelled,
  completed,
}

class TransactionModel {
  final String id;
  final String listingId;
  final String listingTitle;
  final String buyerName;
  final String sellerName;
  final int offeredPricePkr;
  final int? finalPricePkr;
  final double quantity;
  final String unit;
  final TransactionStatus status;
  final int totalPkr;
  final DateTime createdAt;

  TransactionModel({
    required this.id,
    required this.listingId,
    required this.listingTitle,
    required this.buyerName,
    required this.sellerName,
    required this.offeredPricePkr,
    this.finalPricePkr,
    required this.quantity,
    required this.unit,
    required this.status,
    required this.totalPkr,
    required this.createdAt,
  });
}
