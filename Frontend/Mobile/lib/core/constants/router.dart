import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/services/session.dart';
import 'package:simbisa/features/auth/screens/forgot_password_screen.dart';
import 'package:simbisa/features/auth/screens/login_screen.dart';
import 'package:simbisa/features/auth/screens/register_screen.dart';
import 'package:simbisa/features/credit/screens/echeancier_screen.dart';
import 'package:simbisa/features/credit/screens/my_credits_screen.dart';
import 'package:simbisa/features/credit/screens/repayments_screen.dart';
import 'package:simbisa/features/dashboard/screens/client_shell.dart';
import 'package:simbisa/features/scoring/screens/ai_explanations_screen.dart';
import 'package:simbisa/features/help/screens/help_screen.dart';
import 'package:simbisa/features/legal/screens/privacy_screen.dart';
import 'package:simbisa/features/legal/screens/terms_screen.dart';

final appRouter = GoRouter(
  initialLocation: AppRoutes.login,
  redirect: (context, state) {
    final loggedIn = Session.current != null;
    final location = state.matchedLocation;
    final isPublicRoute = location == AppRoutes.login
        || location == AppRoutes.register
        || location == AppRoutes.forgotPassword
        || location == AppRoutes.privacy
        || location == AppRoutes.terms;

    if (!loggedIn && !isPublicRoute) return AppRoutes.login;
    if (loggedIn && (location == AppRoutes.login || location == AppRoutes.register)) {
      return AppRoutes.dashboard;
    }
    return null;
  },
  routes: [
    GoRoute(path: AppRoutes.login, builder: (_, __) => const LoginScreen()),
    GoRoute(path: AppRoutes.register, builder: (_, __) => const RegisterScreen()),
    GoRoute(path: AppRoutes.forgotPassword, builder: (_, __) => const ForgotPasswordScreen()),
    GoRoute(path: AppRoutes.dashboard, builder: (_, __) => const ClientShell(initialIndex: 0)),
    GoRoute(path: AppRoutes.creditRequest, builder: (_, __) => const ClientShell(initialIndex: 1)),
    GoRoute(path: AppRoutes.savings, builder: (_, __) => const ClientShell(initialIndex: 2)),
    GoRoute(path: AppRoutes.scoring, builder: (_, __) => const ClientShell(initialIndex: 3)),
    GoRoute(path: AppRoutes.profile, builder: (_, __) => const ClientShell(initialIndex: 4)),
    GoRoute(path: AppRoutes.myCredits, builder: (_, __) => const MyCreditsScreen()),
    GoRoute(path: AppRoutes.repayments, builder: (_, __) => const RepaymentsScreen()),
    GoRoute(path: AppRoutes.aiExplain, builder: (_, __) => const AIExplanationsScreen()),
    GoRoute(path: AppRoutes.help, builder: (_, __) => const HelpScreen()),
    GoRoute(path: AppRoutes.privacy, builder: (_, __) => const PrivacyScreen()),
    GoRoute(path: AppRoutes.terms, builder: (_, __) => const TermsScreen()),
    GoRoute(
      path: AppRoutes.echeancier,
      builder: (_, state) {
        final params = state.uri.queryParameters;
        final creditId = int.tryParse(params['credit_id'] ?? '') ?? 0;
        final devise = params['devise'] ?? 'USD';
        final symbole = params['symbole'] ?? '\$';
        return EcheancierScreen(creditId: creditId, devise: devise, symbole: symbole);
      },
    ),
  ],
);
