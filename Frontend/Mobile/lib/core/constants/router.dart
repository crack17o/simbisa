import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/services/session.dart';
import 'package:simbisa/features/auth/screens/login_screen.dart';
import 'package:simbisa/features/auth/screens/register_screen.dart';
import 'package:simbisa/features/dashboard/screens/client_shell.dart';

final appRouter = GoRouter(
  initialLocation: AppRoutes.login,
  redirect: (context, state) {
    final loggedIn = Session.current != null;
    final location = state.matchedLocation;
    final isAuthRoute = location == AppRoutes.login || location == AppRoutes.register;

    if (!loggedIn && !isAuthRoute) return AppRoutes.login;
    if (loggedIn && isAuthRoute) return AppRoutes.dashboard;
    return null;
  },
  routes: [
    GoRoute(
      path: AppRoutes.login,
      builder: (_, __) => const LoginScreen(),
    ),
    GoRoute(
      path: AppRoutes.register,
      builder: (_, __) => const RegisterScreen(),
    ),
    GoRoute(
      path: AppRoutes.dashboard,
      builder: (_, __) => const ClientShell(initialIndex: 0),
    ),
    GoRoute(
      path: AppRoutes.creditRequest,
      builder: (_, __) => const ClientShell(initialIndex: 1),
    ),
    GoRoute(
      path: AppRoutes.savings,
      builder: (_, __) => const ClientShell(initialIndex: 2),
    ),
    GoRoute(
      path: AppRoutes.scoring,
      builder: (_, __) => const ClientShell(initialIndex: 3),
    ),
    GoRoute(
      path: AppRoutes.profile,
      builder: (_, __) => const ClientShell(initialIndex: 4),
    ),
  ],
);
