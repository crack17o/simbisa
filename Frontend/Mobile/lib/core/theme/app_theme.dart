import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ─── Palette Simbisa ────────────────────────────────────────────────────────
class SimbisaColors {
  static const noir     = Color(0xFF0A0A0A);
  static const surface  = Color(0xFF141414);
  static const panel    = Color(0xFF1A1A1A);
  static const panelAlt = Color(0xFF1E1E1E);

  static const or       = Color(0xFFD4AF37);
  static const orLight  = Color(0xFFF0C040);
  static const orDark   = Color(0xFFA8861F);

  static const blanc    = Color(0xFFF5F5F5);
  static const muted    = Color(0xFF9CA3AF);

  static const success  = Color(0xFF22C55E);
  static const warning  = Color(0xFFF59E0B);
  static const danger   = Color(0xFFEF4444);

  static const blue     = Color(0xFF60A5FA);
  static const purple   = Color(0xFFA78BFA);
  static const teal     = Color(0xFF34D399);

  // Gradient or
  static const LinearGradient goldGradient = LinearGradient(
    colors: [orLight, or, orDark],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient goldHorizontal = LinearGradient(
    colors: [orDark, orLight],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const LinearGradient cardGradient = LinearGradient(
    colors: [panelAlt, panel],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}

// ─── Neumorphism helpers ─────────────────────────────────────────────────────
class NeuShadow {
  static const dark  = Color(0xFF050505);
  static const light = Color(0xFF232323);
  static const _lightDark  = Color(0xFFC8C8C4);
  static const _lightLight = Color(0xFFFFFFFF);

  static List<BoxShadow> flat({double blur = 14, double offset = 6}) => [
    BoxShadow(color: dark,  blurRadius: blur, offset: Offset(offset, offset)),
    BoxShadow(color: light, blurRadius: blur, offset: Offset(-offset, -offset)),
  ];

  static List<BoxShadow> inset({double blur = 10, double offset = 4}) => [
    BoxShadow(color: dark,  blurRadius: blur, offset: Offset(offset, offset)),
    BoxShadow(color: light, blurRadius: blur, offset: Offset(-offset, -offset)),
  ];

  static List<BoxShadow> sm() => flat(blur: 8, offset: 3);

  static List<BoxShadow> flatAdaptive(BuildContext context, {double blur = 14, double offset = 6}) {
    if (Theme.of(context).brightness == Brightness.dark) return flat(blur: blur, offset: offset);
    return [
      BoxShadow(color: _lightDark,  blurRadius: blur, offset: Offset(offset, offset)),
      BoxShadow(color: _lightLight, blurRadius: blur, offset: Offset(-offset, -offset)),
    ];
  }

  static List<BoxShadow> insetAdaptive(BuildContext context, {double blur = 10, double offset = 4}) {
    if (Theme.of(context).brightness == Brightness.dark) return inset(blur: blur, offset: offset);
    return [
      BoxShadow(color: _lightDark,  blurRadius: blur, offset: Offset(offset, offset)),
      BoxShadow(color: _lightLight, blurRadius: blur, offset: Offset(-offset, -offset)),
    ];
  }

  static List<BoxShadow> smAdaptive(BuildContext context) => flatAdaptive(context, blur: 8, offset: 3);

  static List<BoxShadow> goldGlow() => [
    ...flat(),
    BoxShadow(color: SimbisaColors.or.withOpacity(0.3), blurRadius: 16, spreadRadius: 0),
  ];

  static List<BoxShadow> colorGlow(Color color) => [
    BoxShadow(color: color.withOpacity(0.35), blurRadius: 12, spreadRadius: 0),
  ];
}

// ─── Typography ─────────────────────────────────────────────────────────────
class SimbisaText {
  static TextStyle display(double size, {Color color = SimbisaColors.blanc, FontWeight weight = FontWeight.w700}) {
    return TextStyle(
      fontFamily: 'Sora',
      fontSize: size,
      fontWeight: weight,
      color: color,
      letterSpacing: -0.5,
    );
  }

  static TextStyle body(double size, {Color color = SimbisaColors.blanc, FontWeight weight = FontWeight.w400}) {
    return GoogleFonts.inter(fontSize: size, fontWeight: weight, color: color);
  }

  static TextStyle label({Color color = SimbisaColors.muted}) {
    return GoogleFonts.inter(
      fontSize: 10,
      fontWeight: FontWeight.w500,
      color: color,
      letterSpacing: 1.2,
    );
  }
}

// ─── Light palette ───────────────────────────────────────────────────────────
class SimbisaLightColors {
  static const surface  = Color(0xFFEDEDE8);
  static const panel    = Color(0xFFE4E4DF);
  static const panelAlt = Color(0xFFDCDCD7);
  static const blanc    = Color(0xFF1A1A1A);
  static const muted    = Color(0xFF6B7280);
  static const or       = Color(0xFFB8960C);
  static const orLight  = Color(0xFFD4AF37);
  static const orDark   = Color(0xFF8B6E09);
}

// ─── Theme sombre ────────────────────────────────────────────────────────────
ThemeData simbisaTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: SimbisaColors.surface,
    colorScheme: const ColorScheme.dark(
      background: SimbisaColors.surface,
      surface: SimbisaColors.panel,
      primary: SimbisaColors.or,
      secondary: SimbisaColors.orLight,
      error: SimbisaColors.danger,
      onBackground: SimbisaColors.blanc,
      onSurface: SimbisaColors.blanc,
      onPrimary: SimbisaColors.noir,
    ),
    fontFamily: GoogleFonts.inter().fontFamily,
    appBarTheme: const AppBarTheme(
      backgroundColor: SimbisaColors.panel,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      iconTheme: IconThemeData(color: SimbisaColors.blanc),
      titleTextStyle: TextStyle(
        fontFamily: 'Sora',
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: SimbisaColors.blanc,
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: SimbisaColors.panel,
      selectedItemColor: SimbisaColors.or,
      unselectedItemColor: SimbisaColors.muted,
    ),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: CupertinoPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
  );
}

// ─── Thème clair ─────────────────────────────────────────────────────────────
ThemeData simbisaLightTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: SimbisaLightColors.surface,
    colorScheme: const ColorScheme.light(
      surface: SimbisaLightColors.panel,
      primary: SimbisaLightColors.or,
      secondary: SimbisaLightColors.orLight,
      error: SimbisaColors.danger,
      onSurface: SimbisaLightColors.blanc,
      onPrimary: Colors.white,
    ),
    fontFamily: GoogleFonts.inter().fontFamily,
    appBarTheme: const AppBarTheme(
      backgroundColor: SimbisaLightColors.panel,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      iconTheme: IconThemeData(color: SimbisaLightColors.blanc),
      titleTextStyle: TextStyle(
        fontFamily: 'Sora',
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: SimbisaLightColors.blanc,
      ),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: SimbisaLightColors.panel,
      selectedItemColor: SimbisaLightColors.or,
      unselectedItemColor: SimbisaLightColors.muted,
    ),
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: CupertinoPageTransitionsBuilder(),
        TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
      },
    ),
  );
}
