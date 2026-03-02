import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'config/theme.dart';
import 'config/router.dart';
import 'providers/auth_provider.dart';
import 'providers/listing_provider.dart';
import 'providers/notification_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const GreenCollectApp());
}

class GreenCollectApp extends StatelessWidget {
  const GreenCollectApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => ListingProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: MaterialApp.router(
        title: 'GreenCollect',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        routerConfig: appRouter,
        locale: const Locale('en', 'PK'),
        supportedLocales: const [
          Locale('en', 'PK'),
          Locale('ur', 'PK'),
        ],
      ),
    );
  }
}
