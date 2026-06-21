import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'core/theme/app_theme.dart';
import 'package:simbisa/core/constants/router.dart';
import 'package:simbisa/core/services/auth_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await AuthService().restoreSession();

  // Force portrait orientation
  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  // Status bar styling
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: SimbisaColors.panel,
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  runApp(const SimbisaApp());
}

class SimbisaApp extends StatelessWidget {
  const SimbisaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp.router(
      title: 'Simbisa · Rawbank FinTech',
      debugShowCheckedModeBanner: false,
      theme: simbisaTheme(),
      routerConfig: appRouter,
    );
  }
}
