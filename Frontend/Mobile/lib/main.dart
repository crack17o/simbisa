import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:simbisa/core/constants/router.dart';
import 'package:simbisa/core/providers/lang_provider.dart';
import 'package:simbisa/core/providers/theme_provider.dart';
import 'package:simbisa/core/services/auth_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await AuthService().restoreSession();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
    DeviceOrientation.portraitDown,
  ]);

  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
    systemNavigationBarColor: SimbisaColors.panel,
    systemNavigationBarIconBrightness: Brightness.light,
  ));

  runApp(const ProviderScope(child: SimbisaApp()));
}

class SimbisaApp extends ConsumerWidget {
  const SimbisaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeProvider);
    final langCode = ref.watch(langProvider);

    // Material/Cupertino delegates support fr and en but not ln (Lingala) nor fr_CD specifically.
    // fr_CD resolves to fr automatically; ln falls back to fr_CD for UI chrome.
    final locale = switch (langCode) {
      'en' => const Locale('en', 'US'),
      _ => const Locale('fr', 'CD'),
    };

    return MaterialApp.router(
      title: 'Simbisa · Rawbank FinTech',
      debugShowCheckedModeBanner: false,
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      locale: locale,
      supportedLocales: const [
        Locale('fr', 'CD'),
        Locale('en', 'US'),
        Locale('ln'),
      ],
      theme: simbisaLightTheme(),
      darkTheme: simbisaTheme(),
      themeMode: themeMode,
      routerConfig: appRouter,
    );
  }
}
