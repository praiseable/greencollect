import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/providers/auth.provider.dart';

class AnalyticsScreen extends ConsumerWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Analytics / تجزیات')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Summary cards
            Row(
              children: [
                _SummaryCard(icon: Icons.inventory_2, label: 'Total Listings', value: '12', color: Colors.green),
                const SizedBox(width: 12),
                _SummaryCard(icon: Icons.handshake, label: 'Total Deals', value: '8', color: Colors.blue),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                _SummaryCard(icon: Icons.monetization_on, label: 'Revenue', value: '₨ 345K', color: Colors.orange),
                const SizedBox(width: 12),
                _SummaryCard(icon: Icons.emoji_events, label: 'Zone Rank', value: '#3', color: Colors.purple),
              ],
            ),
            const SizedBox(height: 24),

            // Bar chart - Monthly listings by category
            const Text('Monthly Listings by Category',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            SizedBox(
              height: 220,
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: BarChart(
                    BarChartData(
                      alignment: BarChartAlignment.spaceAround,
                      maxY: 20,
                      barTouchData: BarTouchData(enabled: true),
                      titlesData: FlTitlesData(
                        show: true,
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (value, meta) {
                              const titles = ['Metals', 'Plastic', 'Paper', 'E-waste', 'Glass'];
                              if (value.toInt() < titles.length) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(titles[value.toInt()],
                                      style: const TextStyle(fontSize: 10)),
                                );
                              }
                              return const SizedBox.shrink();
                            },
                          ),
                        ),
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 28,
                            getTitlesWidget: (value, meta) {
                              return Text(value.toInt().toString(),
                                  style: TextStyle(fontSize: 10, color: Colors.grey[500]));
                            },
                          ),
                        ),
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      ),
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        horizontalInterval: 5,
                        getDrawingHorizontalLine: (value) => FlLine(
                          color: Colors.grey[200]!,
                          strokeWidth: 1,
                        ),
                      ),
                      borderData: FlBorderData(show: false),
                      barGroups: [
                        _makeBarGroup(0, 15, const Color(0xFFF59E0B)),
                        _makeBarGroup(1, 8, const Color(0xFF3B82F6)),
                        _makeBarGroup(2, 12, const Color(0xFF10B981)),
                        _makeBarGroup(3, 5, const Color(0xFF8B5CF6)),
                        _makeBarGroup(4, 3, const Color(0xFF64748B)),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Line chart - Deal value trend
            const Text('Deal Value Trend (Last 6 Months)',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            SizedBox(
              height: 220,
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: LineChart(
                    LineChartData(
                      lineTouchData: LineTouchData(
                        touchTooltipData: LineTouchTooltipData(
                          getTooltipItems: (spots) => spots
                              .map((s) => LineTooltipItem(
                                    '₨ ${(s.y * 1000).toInt()}',
                                    const TextStyle(color: Colors.white, fontSize: 12),
                                  ))
                              .toList(),
                        ),
                      ),
                      gridData: FlGridData(
                        show: true,
                        drawVerticalLine: false,
                        getDrawingHorizontalLine: (value) => FlLine(
                          color: Colors.grey[200]!,
                          strokeWidth: 1,
                        ),
                      ),
                      titlesData: FlTitlesData(
                        bottomTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            getTitlesWidget: (value, meta) {
                              const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
                              if (value.toInt() < months.length) {
                                return Padding(
                                  padding: const EdgeInsets.only(top: 8),
                                  child: Text(months[value.toInt()],
                                      style: const TextStyle(fontSize: 10)),
                                );
                              }
                              return const SizedBox.shrink();
                            },
                          ),
                        ),
                        leftTitles: AxisTitles(
                          sideTitles: SideTitles(
                            showTitles: true,
                            reservedSize: 36,
                            getTitlesWidget: (value, meta) {
                              return Text('${value.toInt()}K',
                                  style: TextStyle(fontSize: 10, color: Colors.grey[500]));
                            },
                          ),
                        ),
                        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                      ),
                      borderData: FlBorderData(show: false),
                      lineBarsData: [
                        LineChartBarData(
                          spots: const [
                            FlSpot(0, 45),
                            FlSpot(1, 62),
                            FlSpot(2, 55),
                            FlSpot(3, 78),
                            FlSpot(4, 92),
                            FlSpot(5, 105),
                          ],
                          isCurved: true,
                          color: const Color(0xFF16A34A),
                          barWidth: 3,
                          belowBarData: BarAreaData(
                            show: true,
                            color: const Color(0xFF16A34A).withOpacity(0.1),
                          ),
                          dotData: FlDotData(
                            show: true,
                            getDotPainter: (spot, percent, bar, index) =>
                                FlDotCirclePainter(
                                  radius: 4,
                                  color: const Color(0xFF16A34A),
                                  strokeWidth: 2,
                                  strokeColor: Colors.white,
                                ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Pie chart - Category breakdown
            const Text('Category Breakdown',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            SizedBox(
              height: 220,
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Expanded(
                        child: PieChart(
                          PieChartData(
                            sectionsSpace: 2,
                            centerSpaceRadius: 30,
                            sections: [
                              PieChartSectionData(
                                value: 40,
                                title: '40%',
                                color: const Color(0xFFF59E0B),
                                titleStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                radius: 50,
                              ),
                              PieChartSectionData(
                                value: 25,
                                title: '25%',
                                color: const Color(0xFF3B82F6),
                                titleStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                radius: 50,
                              ),
                              PieChartSectionData(
                                value: 20,
                                title: '20%',
                                color: const Color(0xFF10B981),
                                titleStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                radius: 50,
                              ),
                              PieChartSectionData(
                                value: 10,
                                title: '10%',
                                color: const Color(0xFF8B5CF6),
                                titleStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                radius: 50,
                              ),
                              PieChartSectionData(
                                value: 5,
                                title: '5%',
                                color: const Color(0xFF64748B),
                                titleStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white),
                                radius: 50,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          _legendItem('Metals', const Color(0xFFF59E0B)),
                          _legendItem('Plastics', const Color(0xFF3B82F6)),
                          _legendItem('Paper', const Color(0xFF10B981)),
                          _legendItem('Electronics', const Color(0xFF8B5CF6)),
                          _legendItem('Glass', const Color(0xFF64748B)),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Recent deals table
            const Text('Recent Deals',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Card(
              child: Column(
                children: [
                  _dealRow('Copper Wire', 'Bilal Traders', '₨ 168K', Colors.green),
                  const Divider(height: 1),
                  _dealRow('Iron Scrap', 'City Franchise', '₨ 95K', Colors.green),
                  const Divider(height: 1),
                  _dealRow('E-Waste Mix', 'Quick Recycle', '₨ 42K', Colors.orange),
                  const Divider(height: 1),
                  _dealRow('PET Bottles', 'Eco Solutions', '₨ 22K', Colors.green),
                ],
              ),
            ),

            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  BarChartGroupData _makeBarGroup(int x, double y, Color color) {
    return BarChartGroupData(
      x: x,
      barRods: [
        BarChartRodData(
          toY: y,
          color: color,
          width: 20,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
        ),
      ],
    );
  }

  static Widget _legendItem(String label, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Container(width: 12, height: 12, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
          const SizedBox(width: 6),
          Text(label, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }

  static Widget _dealRow(String item, String buyer, String amount, Color statusColor) {
    return ListTile(
      dense: true,
      leading: CircleAvatar(
        radius: 16,
        backgroundColor: Colors.grey[100],
        child: const Icon(Icons.receipt, size: 16, color: Colors.grey),
      ),
      title: Text(item, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
      subtitle: Text(buyer, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
      trailing: Text(amount, style: TextStyle(fontWeight: FontWeight.bold, color: statusColor)),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _SummaryCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, color: color, size: 28),
              const SizedBox(height: 8),
              Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
              const SizedBox(height: 2),
              Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
            ],
          ),
        ),
      ),
    );
  }
}
