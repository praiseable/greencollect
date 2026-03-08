import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/models/collection.model.dart';
import '../../core/mock/mock_data.dart';
import '../../core/providers/auth.provider.dart';

class CollectionDetailScreen extends ConsumerStatefulWidget {
  final String collectionId;
  const CollectionDetailScreen({super.key, required this.collectionId});

  @override
  ConsumerState<CollectionDetailScreen> createState() =>
      _CollectionDetailScreenState();
}

class _CollectionDetailScreenState
    extends ConsumerState<CollectionDetailScreen> {
  late CollectionModel _collection;
  bool _gpsVerifying = false;
  bool _uploading = false;
  final _weightController = TextEditingController();
  final _notesController = TextEditingController();
  int _qualityRating = 3;

  @override
  void initState() {
    super.initState();
    _collection = MockData.collections.firstWhere(
      (c) => c.id == widget.collectionId,
    );
    if (_collection.confirmedWeightKg != null) {
      _weightController.text = _collection.confirmedWeightKg.toString();
    }
    if (_collection.notes != null) {
      _notesController.text = _collection.notes!;
    }
    if (_collection.qualityRating != null) {
      _qualityRating = _collection.qualityRating!;
    }
  }

  @override
  void dispose() {
    _weightController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  // ── Simulate GPS check ──
  Future<void> _verifyGPS() async {
    setState(() => _gpsVerifying = true);
    await Future.delayed(const Duration(seconds: 2));
    setState(() {
      _gpsVerifying = false;
      // Simulate successful GPS verification
      _collection = CollectionModel(
        id: _collection.id,
        listingId: _collection.listingId,
        listingTitle: _collection.listingTitle,
        dealerId: _collection.dealerId,
        dealerName: _collection.dealerName,
        customerId: _collection.customerId,
        customerName: _collection.customerName,
        categoryName: _collection.categoryName,
        categoryId: _collection.categoryId,
        status: CollectionStatus.arrived,
        assignedAt: _collection.assignedAt,
        acceptedAt: _collection.acceptedAt,
        enRouteAt: _collection.enRouteAt,
        arrivedAt: DateTime.now(),
        deadlineAt: _collection.deadlineAt,
        listingLat: _collection.listingLat,
        listingLng: _collection.listingLng,
        dealerArriveLat: _collection.listingLat + 0.0002,
        dealerArriveLng: _collection.listingLng + 0.0001,
        gpsVerified: true,
        city: _collection.city,
        area: _collection.area,
        address: _collection.address,
      );
    });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('📍 GPS verified! Location confirmed.'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  // ── Step forward ──
  void _advanceStatus(CollectionStatus nextStatus) {
    setState(() {
      _collection = CollectionModel(
        id: _collection.id,
        listingId: _collection.listingId,
        listingTitle: _collection.listingTitle,
        dealerId: _collection.dealerId,
        dealerName: _collection.dealerName,
        customerId: _collection.customerId,
        customerName: _collection.customerName,
        categoryName: _collection.categoryName,
        categoryId: _collection.categoryId,
        status: nextStatus,
        assignedAt: _collection.assignedAt,
        acceptedAt: _collection.acceptedAt ?? DateTime.now(),
        enRouteAt: nextStatus == CollectionStatus.enRoute
            ? DateTime.now()
            : _collection.enRouteAt,
        arrivedAt: nextStatus == CollectionStatus.arrived
            ? DateTime.now()
            : _collection.arrivedAt,
        collectedAt: nextStatus == CollectionStatus.collected
            ? DateTime.now()
            : _collection.collectedAt,
        deliveredAt: nextStatus == CollectionStatus.deliveredToCenter
            ? DateTime.now()
            : _collection.deliveredAt,
        deadlineAt: _collection.deadlineAt,
        listingLat: _collection.listingLat,
        listingLng: _collection.listingLng,
        dealerArriveLat: _collection.dealerArriveLat,
        dealerArriveLng: _collection.dealerArriveLng,
        dealerCollectLat: nextStatus == CollectionStatus.collected
            ? _collection.dealerArriveLat
            : _collection.dealerCollectLat,
        dealerCollectLng: nextStatus == CollectionStatus.collected
            ? _collection.dealerArriveLng
            : _collection.dealerCollectLng,
        gpsVerified: _collection.gpsVerified,
        confirmedWeightKg: double.tryParse(_weightController.text),
        photoUrls: _collection.photoUrls,
        qualityRating: _qualityRating,
        notes: _notesController.text.isNotEmpty ? _notesController.text : null,
        responseTimeMin: _collection.responseTimeMin,
        collectionTimeMin: _collection.collectionTimeMin,
        totalTimeMin: _collection.totalTimeMin,
        carbonOffsetKg: _collection.carbonOffsetKg,
        city: _collection.city,
        area: _collection.area,
        address: _collection.address,
      );
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Status updated: ${_collection.statusLabel}'),
        backgroundColor: const Color(0xFF16A34A),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isOverdue = _collection.isOverdue;
    final progress = _collection.deadlineProgress;

    return Scaffold(
      appBar: AppBar(
        title: Text('Collection #${_collection.id.substring(0, 6)}'),
        actions: [
          if (isOverdue)
            Container(
              margin: const EdgeInsets.only(right: 12),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.red[100],
                borderRadius: BorderRadius.circular(20),
              ),
              child: Row(
                children: [
                  const Icon(Icons.warning, size: 16, color: Colors.red),
                  const SizedBox(width: 4),
                  Text('OVERDUE',
                      style: TextStyle(
                          color: Colors.red[800],
                          fontWeight: FontWeight.bold,
                          fontSize: 12)),
                ],
              ),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── STATUS TIMELINE ──
            _buildTimeline(),
            const SizedBox(height: 20),

            // ── DEADLINE BAR ──
            _buildDeadlineCard(isOverdue, progress),
            const SizedBox(height: 16),

            // ── LISTING INFO ──
            _buildListingInfoCard(),
            const SizedBox(height: 16),

            // ── LOCATION & GPS ──
            _buildLocationCard(),
            const SizedBox(height: 16),

            // ── COLLECTION DATA (photos, weight, quality) ──
            if (_collection.status.index >= CollectionStatus.arrived.index)
              _buildCollectionDataCard(),
            if (_collection.status.index >= CollectionStatus.arrived.index)
              const SizedBox(height: 16),

            // ── CARBON OFFSET ──
            if (_collection.confirmedWeightKg != null)
              _buildCarbonCard(),
            if (_collection.confirmedWeightKg != null)
              const SizedBox(height: 16),

            // ── ACTION BUTTONS ──
            _buildActionButtons(),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  // ── STATUS TIMELINE ──
  Widget _buildTimeline() {
    final steps = [
      _TimelineStep('Assigned', _collection.assignedAt, CollectionStatus.assigned),
      _TimelineStep('Accepted', _collection.acceptedAt, CollectionStatus.accepted),
      _TimelineStep('En Route', _collection.enRouteAt, CollectionStatus.enRoute),
      _TimelineStep('Arrived (GPS)', _collection.arrivedAt, CollectionStatus.arrived),
      _TimelineStep('Collected', _collection.collectedAt, CollectionStatus.collected),
      _TimelineStep('Delivered', _collection.deliveredAt, CollectionStatus.deliveredToCenter),
    ];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Collection Timeline',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...steps.asMap().entries.map((entry) {
              final i = entry.key;
              final step = entry.value;
              final isActive = _collection.status.index >= step.status.index;
              final isCurrent = _collection.status == step.status;
              final isLast = i == steps.length - 1;

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Timeline dot + line
                  Column(
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: isActive
                              ? const Color(0xFF16A34A)
                              : Colors.grey[300],
                          border: isCurrent
                              ? Border.all(
                                  color: const Color(0xFF16A34A), width: 3)
                              : null,
                        ),
                        child: isActive
                            ? const Icon(Icons.check,
                                size: 14, color: Colors.white)
                            : null,
                      ),
                      if (!isLast)
                        Container(
                          width: 2,
                          height: 32,
                          color: isActive
                              ? const Color(0xFF16A34A)
                              : Colors.grey[300],
                        ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  // Step info
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(bottom: 16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            step.label,
                            style: TextStyle(
                              fontWeight:
                                  isCurrent ? FontWeight.bold : FontWeight.w500,
                              color:
                                  isActive ? Colors.black87 : Colors.grey[400],
                              fontSize: 14,
                            ),
                          ),
                          if (step.time != null)
                            Text(
                              _formatTime(step.time!),
                              style: TextStyle(
                                  color: Colors.grey[500], fontSize: 12),
                            ),
                        ],
                      ),
                    ),
                  ),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }

  // ── DEADLINE CARD ──
  Widget _buildDeadlineCard(bool isOverdue, double progress) {
    return Card(
      color: isOverdue ? Colors.red[50] : null,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isOverdue ? Icons.timer_off : Icons.timer,
                  color: isOverdue ? Colors.red : Colors.orange,
                ),
                const SizedBox(width: 8),
                Text(
                  isOverdue ? 'Deadline Passed!' : 'Deadline',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isOverdue ? Colors.red[800] : null,
                  ),
                ),
                const Spacer(),
                Text(
                  isOverdue
                      ? 'Overdue by ${(-_collection.minutesToDeadline)} min'
                      : '${_collection.minutesToDeadline} min remaining',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    color: isOverdue
                        ? Colors.red[700]
                        : _collection.minutesToDeadline < 60
                            ? Colors.orange[700]
                            : Colors.grey[600],
                    fontSize: 13,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: Colors.grey[200],
                valueColor: AlwaysStoppedAnimation(
                  isOverdue
                      ? Colors.red
                      : progress > 0.75
                          ? Colors.orange
                          : const Color(0xFF16A34A),
                ),
                minHeight: 8,
              ),
            ),
            if (isOverdue) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red[100],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.warning_amber, color: Colors.red[800]),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'This collection will be escalated to an adjacent dealer if not completed soon. Your rating will be affected.',
                        style: TextStyle(
                            color: Colors.red[800], fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ── LISTING INFO ──
  Widget _buildListingInfoCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Listing Details',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _infoRow(Icons.article, 'Title', _collection.listingTitle),
            _infoRow(Icons.category, 'Category', _collection.categoryName),
            _infoRow(Icons.person, 'Customer', _collection.customerName),
            _infoRow(Icons.location_city, 'Area',
                '${_collection.area}, ${_collection.city}'),
            _infoRow(Icons.location_on, 'Address', _collection.address),
          ],
        ),
      ),
    );
  }

  // ── LOCATION & GPS VERIFICATION ──
  Widget _buildLocationCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.gps_fixed, color: Color(0xFF16A34A)),
                const SizedBox(width: 8),
                const Text('GPS Verification',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const Spacer(),
                if (_collection.gpsVerified)
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.verified, size: 14, color: Colors.green[700]),
                        const SizedBox(width: 4),
                        Text('Verified',
                            style: TextStyle(
                                color: Colors.green[700],
                                fontWeight: FontWeight.bold,
                                fontSize: 12)),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            // Pickup location
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[50],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Pickup Location',
                      style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[700],
                          fontSize: 13)),
                  const SizedBox(height: 4),
                  Text(
                      'Lat: ${_collection.listingLat.toStringAsFixed(4)}, Lng: ${_collection.listingLng.toStringAsFixed(4)}',
                      style:
                          TextStyle(color: Colors.grey[600], fontSize: 12)),
                ],
              ),
            ),
            if (_collection.dealerArriveLat != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green[50],
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Your Location at Arrival',
                        style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: Colors.green[700],
                            fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(
                        'Lat: ${_collection.dealerArriveLat!.toStringAsFixed(4)}, Lng: ${_collection.dealerArriveLng!.toStringAsFixed(4)}',
                        style:
                            TextStyle(color: Colors.green[600], fontSize: 12)),
                    const SizedBox(height: 4),
                    Text('Distance: ~20m ✅',
                        style: TextStyle(
                            color: Colors.green[800],
                            fontWeight: FontWeight.w600,
                            fontSize: 12)),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 12),
            // GPS Verify button
            if (!_collection.gpsVerified &&
                (_collection.status == CollectionStatus.enRoute ||
                    _collection.status == CollectionStatus.accepted))
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: _gpsVerifying ? null : _verifyGPS,
                  icon: _gpsVerifying
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child:
                              CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.gps_fixed),
                  label: Text(
                      _gpsVerifying ? 'Verifying GPS...' : 'Verify My Location'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue[600],
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ── COLLECTION DATA (appears after arrived) ──
  Widget _buildCollectionDataCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Collection Data',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),

            // Photos
            const Text('📷 Proof Photos',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            if (_collection.photoUrls.isNotEmpty)
              SizedBox(
                height: 100,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: _collection.photoUrls.length,
                  itemBuilder: (context, index) {
                    return Container(
                      width: 100,
                      margin: const EdgeInsets.only(right: 8),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(8),
                        image: DecorationImage(
                          image: NetworkImage(_collection.photoUrls[index]),
                          fit: BoxFit.cover,
                        ),
                      ),
                    );
                  },
                ),
              )
            else
              InkWell(
                onTap: () {
                  // Simulate adding photos
                  setState(() {
                    _collection = CollectionModel(
                      id: _collection.id,
                      listingId: _collection.listingId,
                      listingTitle: _collection.listingTitle,
                      dealerId: _collection.dealerId,
                      dealerName: _collection.dealerName,
                      customerId: _collection.customerId,
                      customerName: _collection.customerName,
                      categoryName: _collection.categoryName,
                      categoryId: _collection.categoryId,
                      status: _collection.status,
                      assignedAt: _collection.assignedAt,
                      acceptedAt: _collection.acceptedAt,
                      enRouteAt: _collection.enRouteAt,
                      arrivedAt: _collection.arrivedAt,
                      collectedAt: _collection.collectedAt,
                      deliveredAt: _collection.deliveredAt,
                      deadlineAt: _collection.deadlineAt,
                      listingLat: _collection.listingLat,
                      listingLng: _collection.listingLng,
                      dealerArriveLat: _collection.dealerArriveLat,
                      dealerArriveLng: _collection.dealerArriveLng,
                      gpsVerified: _collection.gpsVerified,
                      photoUrls: [
                        'https://picsum.photos/seed/proof1/400/300',
                        'https://picsum.photos/seed/proof2/400/300',
                      ],
                      city: _collection.city,
                      area: _collection.area,
                      address: _collection.address,
                    );
                  });
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Photos added!'),
                        backgroundColor: Colors.green),
                  );
                },
                child: Container(
                  height: 100,
                  decoration: BoxDecoration(
                    color: Colors.grey[100],
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.grey[300]!),
                  ),
                  child: Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.add_a_photo, color: Colors.grey[400], size: 32),
                        const SizedBox(height: 4),
                        Text('Tap to add collection photos',
                            style: TextStyle(
                                color: Colors.grey[500], fontSize: 12)),
                      ],
                    ),
                  ),
                ),
              ),

            const SizedBox(height: 16),

            // Weight input
            const Text('⚖️ Confirmed Weight (kg)',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _weightController,
              keyboardType:
                  const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                hintText: 'Enter confirmed weight in kg',
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8)),
                suffixText: 'kg',
              ),
            ),

            const SizedBox(height: 16),

            // Quality rating
            const Text('⭐ Material Quality Rating',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(5, (i) {
                final star = i + 1;
                return IconButton(
                  onPressed: () => setState(() => _qualityRating = star),
                  icon: Icon(
                    star <= _qualityRating ? Icons.star : Icons.star_border,
                    color: star <= _qualityRating
                        ? Colors.amber
                        : Colors.grey[400],
                    size: 36,
                  ),
                );
              }),
            ),
            Center(
              child: Text(
                _qualityRatingLabel(),
                style:
                    TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
            ),

            const SizedBox(height: 16),

            // Notes
            const Text('📝 Notes',
                style: TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              maxLines: 3,
              decoration: InputDecoration(
                hintText: 'Any observations about the material...',
                border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── CARBON OFFSET CARD ──
  Widget _buildCarbonCard() {
    final weight = double.tryParse(_weightController.text) ?? 0;
    final offset = CarbonFactors.calculate(_collection.categoryId, weight);

    return Card(
      color: Colors.green[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.eco, color: Color(0xFF16A34A)),
                const SizedBox(width: 8),
                const Text('Carbon Credit Estimate',
                    style:
                        TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: _metricBox(
                      '${weight.toStringAsFixed(1)} kg', 'Material Collected'),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _metricBox(
                      '${offset.toStringAsFixed(1)} kg', 'CO₂ Offset'),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _metricBox(
                      '₨ ${(offset * 2.5).toStringAsFixed(0)}',
                      'Credit Value'),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Factor: ${CarbonFactors.offsetPerKg[_collection.categoryId] ?? 1.0} kg CO₂/kg for ${_collection.categoryName}',
              style: TextStyle(color: Colors.green[700], fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Widget _metricBox(String value, String label) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Text(value,
              style: const TextStyle(
                  fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 4),
          Text(label,
              style: TextStyle(color: Colors.grey[600], fontSize: 11),
              textAlign: TextAlign.center),
        ],
      ),
    );
  }

  // ── ACTION BUTTONS ──
  Widget _buildActionButtons() {
    switch (_collection.status) {
      case CollectionStatus.assigned:
        return Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: () {
                  // Decline → escalate
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                        content: Text('Collection declined. It will be reassigned.'),
                        backgroundColor: Colors.orange),
                  );
                  context.pop();
                },
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Decline'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: ElevatedButton.icon(
                onPressed: () => _advanceStatus(CollectionStatus.accepted),
                icon: const Icon(Icons.check_circle),
                label: const Text('Accept Collection'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF16A34A),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        );

      case CollectionStatus.accepted:
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => _advanceStatus(CollectionStatus.enRoute),
            icon: const Icon(Icons.directions_car),
            label: const Text('Start Heading to Location'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.orange[600],
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        );

      case CollectionStatus.enRoute:
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: _gpsVerifying ? null : _verifyGPS,
            icon: _gpsVerifying
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(
                        strokeWidth: 2, color: Colors.white))
                : const Icon(Icons.gps_fixed),
            label: Text(
                _gpsVerifying ? 'Verifying GPS...' : 'I\'ve Arrived — Verify GPS'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue[600],
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        );

      case CollectionStatus.arrived:
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              if (_weightController.text.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Please enter the confirmed weight'),
                      backgroundColor: Colors.orange),
                );
                return;
              }
              if (_collection.photoUrls.isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                      content: Text('Please add proof photos first'),
                      backgroundColor: Colors.orange),
                );
                return;
              }
              _advanceStatus(CollectionStatus.collected);
            },
            icon: const Icon(Icons.inventory),
            label: const Text('Confirm Collection Complete'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.teal[600],
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        );

      case CollectionStatus.collected:
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () {
              _advanceStatus(CollectionStatus.deliveredToCenter);
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('🎉 Collection Completed!'),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                          'This collection has been delivered and verified.'),
                      const SizedBox(height: 12),
                      if (double.tryParse(_weightController.text) != null) ...[
                        Text(
                          'Carbon offset: ${CarbonFactors.calculate(_collection.categoryId, double.parse(_weightController.text)).toStringAsFixed(1)} kg CO₂',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        const Text('Your rating has been updated.'),
                      ],
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        context.pop();
                      },
                      child: const Text('Done'),
                    ),
                  ],
                ),
              );
            },
            icon: const Icon(Icons.local_shipping),
            label: const Text('Mark as Delivered to Center'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.green[700],
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
        );

      case CollectionStatus.deliveredToCenter:
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.green[50],
            borderRadius: BorderRadius.circular(12),
          ),
          child: Row(
            children: [
              Icon(Icons.verified, color: Colors.green[700], size: 32),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Collection Complete!',
                        style: TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.green[800],
                            fontSize: 16)),
                    const SizedBox(height: 4),
                    Text(
                        'This collection has been verified and delivered.',
                        style: TextStyle(
                            color: Colors.green[700], fontSize: 13)),
                  ],
                ),
              ),
            ],
          ),
        );

      default:
        return const SizedBox.shrink();
    }
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: Colors.grey[600]),
          const SizedBox(width: 10),
          SizedBox(
            width: 80,
            child: Text(label,
                style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 13,
                    fontWeight: FontWeight.w500)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontSize: 13)),
          ),
        ],
      ),
    );
  }

  String _qualityRatingLabel() {
    switch (_qualityRating) {
      case 1:
        return 'Poor — heavily contaminated';
      case 2:
        return 'Below Average — needs sorting';
      case 3:
        return 'Average — acceptable condition';
      case 4:
        return 'Good — mostly clean';
      case 5:
        return 'Excellent — premium quality';
      default:
        return '';
    }
  }

  String _formatTime(DateTime time) {
    final now = DateTime.now();
    final diff = now.difference(time);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    return '${diff.inDays}d ago';
  }
}

class _TimelineStep {
  final String label;
  final DateTime? time;
  final CollectionStatus status;

  _TimelineStep(this.label, this.time, this.status);
}
