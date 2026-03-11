import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/providers/app_providers.dart';
import '../../core/models/user.model.dart';

class TerritoryScreen extends ConsumerWidget {
  const TerritoryScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider);
    final isDealer = user != null &&
        (user.role == UserRole.localDealer ||
            user.role == UserRole.cityFranchise ||
            user.role == UserRole.wholesale);

    // Mock territory data based on user id and role
    final territories = _getMockTerritories(user?.role, userId: user?.id);
    final escalationRules = _getEscalationRules();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Territory'),
        centerTitle: true,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Role Badge
            if (user != null) _buildRoleBanner(user),
            const SizedBox(height: 20),

            // Stats
            _buildStatsRow(territories),
            const SizedBox(height: 24),

            // Territories List
            Text(
              'Assigned Zones',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              'Listings in these areas will be routed to you',
              style: TextStyle(color: Colors.grey[600], fontSize: 12),
            ),
            const SizedBox(height: 12),

            if (territories.isEmpty)
              _buildEmptyState()
            else
              ...territories.map((t) => _buildTerritoryCard(context, t)),

            const SizedBox(height: 24),

            // Escalation Timeline
            _buildEscalationTimeline(context, escalationRules),

            const SizedBox(height: 24),

            // Info Card
            _buildInfoCard(context, isDealer),
          ],
        ),
      ),
    );
  }

  Widget _buildRoleBanner(dynamic user) {
    final roleConfig = _getRoleConfig(user.role);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [roleConfig['color'] as Color, (roleConfig['color'] as Color).withOpacity(0.7)],
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            roleConfig['icon'] as String,
            style: const TextStyle(fontSize: 28),
          ),
          const SizedBox(height: 8),
          Text(
            user.name ?? 'Dealer',
            style: const TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          Text(
            roleConfig['label'] as String,
            style: TextStyle(
              color: Colors.white.withOpacity(0.9),
              fontSize: 14,
            ),
          ),
          if (user.city != null)
            Padding(
              padding: const EdgeInsets.only(top: 4),
              child: Text(
                '📍 ${user.city}',
                style: TextStyle(
                  color: Colors.white.withOpacity(0.8),
                  fontSize: 13,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildStatsRow(List<Map<String, dynamic>> territories) {
    final totalAreas = territories.fold<int>(
        0, (sum, t) => sum + ((t['subAreas'] as List?)?.length ?? 0));
    final exclusive = territories.where((t) => t['exclusive'] == true).length;

    return Row(
      children: [
        _statCard('Zones', '${territories.length}', Colors.green),
        const SizedBox(width: 8),
        _statCard('Exclusive', '$exclusive', Colors.amber),
        const SizedBox(width: 8),
        _statCard('Sub-Areas', '$totalAreas', Colors.purple),
      ],
    );
  }

  Widget _statCard(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(fontSize: 11, color: color),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTerritoryCard(BuildContext context, Map<String, dynamic> territory) {
    final zoneType = territory['type'] as String;
    final zoneConfig = _getZoneTypeConfig(zoneType);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: (zoneConfig['color'] as Color).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  zoneConfig['icon'] as String,
                  style: const TextStyle(fontSize: 20),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      territory['name'] as String,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                    Text(
                      '${territory['type']} • ${territory['parent'] ?? ''}',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              if (territory['exclusive'] == true)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.amber.shade50,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.amber.shade200),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shield, size: 12, color: Colors.amber),
                      SizedBox(width: 4),
                      Text(
                        'Exclusive',
                        style: TextStyle(fontSize: 10, color: Colors.amber, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
            ],
          ),
          // Sub-areas
          if ((territory['subAreas'] as List?)?.isNotEmpty == true) ...[
            const SizedBox(height: 12),
            const Text(
              'Sub-Areas:',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey),
            ),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: (territory['subAreas'] as List<String>).map((area) {
                return Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(area, style: TextStyle(fontSize: 11, color: Colors.grey[700])),
                );
              }).toList(),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildEscalationTimeline(BuildContext context, List<Map<String, dynamic>> rules) {
    final levels = ['LOCAL', 'NEIGHBOR', 'CITY', 'PROVINCE', 'NATIONAL', 'PUBLIC'];
    final colors = {
      'LOCAL': Colors.green,
      'NEIGHBOR': Colors.blue,
      'CITY': Colors.purple,
      'PROVINCE': Colors.amber,
      'NATIONAL': Colors.red,
      'PUBLIC': Colors.grey,
    };

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFFFFF7ED), Color(0xFFFEF3C7)],
        ),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.amber.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.schedule, color: Colors.amber, size: 20),
              SizedBox(width: 8),
              Text(
                'Auto-Escalation Timeline',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF92400E)),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'If no deal is made, listings automatically widen their reach:',
            style: TextStyle(fontSize: 12, color: Colors.amber.shade800),
          ),
          const SizedBox(height: 16),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: levels.asMap().entries.map((entry) {
                final i = entry.key;
                final level = entry.value;
                final rule = rules.where((r) => r['from'] == level).firstOrNull;

                return Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                      decoration: BoxDecoration(
                        color: colors[level],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        level,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    if (rule != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: Column(
                          children: [
                            Text(
                              '${rule['hours']}h',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[600],
                              ),
                            ),
                            const Icon(Icons.arrow_forward, size: 14, color: Colors.grey),
                          ],
                        ),
                      ),
                  ],
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 40),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          const Text('🗺️', style: TextStyle(fontSize: 48)),
          const SizedBox(height: 12),
          const Text(
            'No Territories Assigned',
            style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey),
          ),
          const SizedBox(height: 4),
          Text(
            'Contact admin to get your area assigned.',
            style: TextStyle(fontSize: 12, color: Colors.grey[400]),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, bool isDealer) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.blue.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.info_outline, color: Colors.blue, size: 18),
              SizedBox(width: 8),
              Text(
                'How Territories Work',
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.blue, fontSize: 14),
              ),
            ],
          ),
          const SizedBox(height: 8),
          _infoPoint('When a listing is posted in your zone, you are notified immediately'),
          _infoPoint('If no deal is made, the listing escalates to adjacent dealers'),
          _infoPoint('Exclusive zones mean no other same-level dealer can operate there'),
          _infoPoint('Escalation timeline: LOCAL → NEIGHBOR → CITY → PROVINCE → NATIONAL → PUBLIC'),
        ],
      ),
    );
  }

  Widget _infoPoint(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('• ', style: TextStyle(color: Colors.blue.shade700, fontSize: 12)),
          Expanded(
            child: Text(text, style: TextStyle(fontSize: 12, color: Colors.blue.shade700)),
          ),
        ],
      ),
    );
  }

  // ─── Mock Data ─────────────────────────────────────────

  List<Map<String, dynamic>> _getMockTerritories(dynamic role, {String? userId}) {
    // ── Islamabad area-specific dealers ──
    if (userId == 'u5') {
      // Usman — Bara Kahu dealer
      return [
        {
          'name': 'Bara Kahu',
          'type': 'LOCAL_AREA',
          'parent': 'Islamabad, Islamabad Capital',
          'exclusive': true,
          'subAreas': <String>[],
        },
      ];
    } else if (userId == 'u6') {
      // Tariq — G-6 dealer
      return [
        {
          'name': 'G-6',
          'type': 'LOCAL_AREA',
          'parent': 'Islamabad, Islamabad Capital',
          'exclusive': true,
          'subAreas': <String>[],
        },
      ];
    } else if (userId == 'u7') {
      // Kashif — G-8 dealer
      return [
        {
          'name': 'G-8',
          'type': 'LOCAL_AREA',
          'parent': 'Islamabad, Islamabad Capital',
          'exclusive': true,
          'subAreas': <String>[],
        },
      ];
    } else if (userId == 'u8') {
      // Zubair — Islamabad city franchise
      return [
        {
          'name': 'Islamabad',
          'type': 'CITY',
          'parent': 'Islamabad Capital',
          'exclusive': true,
          'subAreas': [
            'Bara Kahu', 'G-6', 'G-8', 'F-6', 'F-7', 'F-8',
            'G-9', 'G-10', 'G-11', 'I-8', 'I-9', 'I-10', 'Blue Area',
          ],
        },
      ];
    }

    // ── Original accounts (fallback by role) ──
    if (role == UserRole.localDealer) {
      return [
        {
          'name': 'Korangi',
          'type': 'LOCAL_AREA',
          'parent': 'Karachi, Sindh',
          'exclusive': true,
          'subAreas': <String>[],
        },
        {
          'name': 'SITE Area',
          'type': 'LOCAL_AREA',
          'parent': 'Karachi, Sindh',
          'exclusive': true,
          'subAreas': <String>[],
        },
        {
          'name': 'Lyari',
          'type': 'LOCAL_AREA',
          'parent': 'Karachi, Sindh',
          'exclusive': true,
          'subAreas': <String>[],
        },
      ];
    } else if (role == UserRole.cityFranchise) {
      return [
        {
          'name': 'Karachi',
          'type': 'CITY',
          'parent': 'Sindh',
          'exclusive': true,
          'subAreas': [
            'Korangi', 'SITE', 'Lyari', 'Saddar', 'Orangi Town',
            'Landhi', 'North Karachi', 'Gulshan-e-Iqbal', 'Malir',
            'Baldia Town', 'Clifton', 'DHA Karachi',
          ],
        },
      ];
    } else if (role == UserRole.wholesale) {
      return [
        {
          'name': 'Punjab',
          'type': 'PROVINCE',
          'parent': 'Pakistan',
          'exclusive': false,
          'subAreas': ['Lahore', 'Faisalabad', 'Rawalpindi', 'Multan', 'Gujranwala', 'Sialkot'],
        },
      ];
    }
    return [];
  }

  List<Map<String, dynamic>> _getEscalationRules() {
    return [
      {'from': 'LOCAL', 'to': 'NEIGHBOR', 'hours': 24},
      {'from': 'NEIGHBOR', 'to': 'CITY', 'hours': 48},
      {'from': 'CITY', 'to': 'PROVINCE', 'hours': 72},
      {'from': 'PROVINCE', 'to': 'NATIONAL', 'hours': 120},
      {'from': 'NATIONAL', 'to': 'PUBLIC', 'hours': 168},
    ];
  }

  Map<String, dynamic> _getRoleConfig(dynamic role) {
    if (role == UserRole.localDealer) {
      return {'label': 'Local Area Dealer', 'icon': '🏪', 'color': Colors.blue};
    } else if (role == UserRole.cityFranchise) {
      return {'label': 'City Franchise Owner', 'icon': '🏢', 'color': Colors.purple};
    } else if (role == UserRole.wholesale) {
      return {'label': 'Wholesale Buyer', 'icon': '🏭', 'color': Colors.green};
    }
    return {'label': 'Customer', 'icon': '👤', 'color': Colors.grey};
  }

  Map<String, dynamic> _getZoneTypeConfig(String type) {
    switch (type) {
      case 'LOCAL_AREA':
        return {'icon': '📍', 'color': Colors.green};
      case 'CITY':
        return {'icon': '🏙️', 'color': Colors.blue};
      case 'PROVINCE':
        return {'icon': '🗺️', 'color': Colors.orange};
      case 'COUNTRY':
        return {'icon': '🌍', 'color': Colors.red};
      default:
        return {'icon': '📍', 'color': Colors.grey};
    }
  }
}
