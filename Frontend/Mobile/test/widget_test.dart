import 'package:flutter_test/flutter_test.dart';

import 'package:simbisa/main.dart';

void main() {
  testWidgets('Simbisa app shows login screen', (WidgetTester tester) async {
    await tester.pumpWidget(const SimbisaApp());
    await tester.pumpAndSettle();

    expect(find.text('Simbisa'), findsOneWidget);
    expect(find.text('Connexion'), findsOneWidget);
    expect(find.text('Se connecter'), findsOneWidget);
  });
}
