import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:app_movil/main.dart';

void main() {
  testWidgets('La app arranca en el login', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: AdOrbitApp()));
    await tester.pumpAndSettle();

    expect(find.text('AdOrbit'), findsWidgets);
    expect(find.text('Iniciar sesión con Keycloak'), findsOneWidget);
  });
}
