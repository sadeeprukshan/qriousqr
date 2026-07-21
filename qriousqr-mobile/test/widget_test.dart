import 'package:flutter_test/flutter_test.dart';
import 'package:qriousqr_mobile/app.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const QriousQrApp());
    expect(find.byType(QriousQrApp), findsOneWidget);
  });
}
