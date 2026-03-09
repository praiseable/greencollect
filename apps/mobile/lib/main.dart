import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:easy_localization/easy_localization.dart';
import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'core/config/app_variant.dart';
import 'core/providers/chat.provider.dart';
import 'services/chat_db_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await EasyLocalization.ensureInitialized();

  // Initialize chat database early to prevent initialization errors
  try {
    await ChatDbService().database;
    debugPrint('[App] Chat database initialized');
  } catch (e) {
    debugPrint('[App] Chat database initialization failed: $e');
  }

  runApp(
    EasyLocalization(
      supportedLocales: [Locale('en'), Locale('ur')],
      path: 'assets/translations',
      fallbackLocale: Locale('en'),
      startLocale: Locale('en'),
      child: ProviderScope(
        child: MarketplaceApp(),
      ),
    ),
  );
}

class MarketplaceApp extends ConsumerStatefulWidget {
  @override
  ConsumerState<MarketplaceApp> createState() => _MarketplaceAppState();
}

class _MarketplaceAppState extends ConsumerState<MarketplaceApp> {
  bool _syncStarted = false;

  @override
  Widget build(BuildContext context) {
    final router = ref.watch(appRouterProvider);
    final locale = context.locale;

    // Start background chat sync service (only once)
    if (!_syncStarted) {
      _syncStarted = true;
      try {
        ref.read(chatSyncServiceProvider).startListening();
      } catch (e) {
        debugPrint('[App] Failed to start chat sync service: $e');
      }
    }

    return MaterialApp.router(
      title: AppVariant.appName,
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      locale: locale,
      supportedLocales: context.supportedLocales,
      localizationsDelegates: context.localizationDelegates,
      routerConfig: router,
      builder: (context, child) {
        return Directionality(
          textDirection: locale.languageCode == 'ur'
              ? ui.TextDirection.rtl
              : ui.TextDirection.ltr,
          child: child!,
        );
      },
    );
  }
}
