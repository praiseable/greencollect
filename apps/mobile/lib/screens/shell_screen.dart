import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../providers/notification_provider.dart';

class ShellScreen extends StatefulWidget {
  final Widget child;
  const ShellScreen({super.key, required this.child});

  @override
  State<ShellScreen> createState() => _ShellScreenState();
}

class _ShellScreenState extends State<ShellScreen> {
  int _currentIndex = 0;

  static const _routes = ['/', '/listings', '/create-listing', '/notifications', '/profile'];

  @override
  void initState() {
    super.initState();
    // Fetch notifications count
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<NotificationProvider>().fetchNotifications();
    });
  }

  void _onItemTapped(int index) {
    if (index == _currentIndex) return;
    setState(() => _currentIndex = index);
    context.go(_routes[index]);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: widget.child,
      bottomNavigationBar: Consumer<NotificationProvider>(
        builder: (context, notifProvider, _) {
          return BottomNavigationBar(
            currentIndex: _currentIndex,
            onTap: _onItemTapped,
            items: [
              const BottomNavigationBarItem(
                icon: Icon(Icons.home_outlined),
                activeIcon: Icon(Icons.home),
                label: 'Home',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.search_outlined),
                activeIcon: Icon(Icons.search),
                label: 'Browse',
              ),
              BottomNavigationBarItem(
                icon: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Theme.of(context).primaryColor,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.add, color: Colors.white, size: 24),
                ),
                label: 'Post',
              ),
              BottomNavigationBarItem(
                icon: Badge(
                  isLabelVisible: notifProvider.unreadCount > 0,
                  label: Text('${notifProvider.unreadCount}'),
                  child: const Icon(Icons.notifications_outlined),
                ),
                activeIcon: Badge(
                  isLabelVisible: notifProvider.unreadCount > 0,
                  label: Text('${notifProvider.unreadCount}'),
                  child: const Icon(Icons.notifications),
                ),
                label: 'Alerts',
              ),
              const BottomNavigationBarItem(
                icon: Icon(Icons.person_outline),
                activeIcon: Icon(Icons.person),
                label: 'Profile',
              ),
            ],
          );
        },
      ),
    );
  }
}
