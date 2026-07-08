import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'Pro collections: assigned job -> accepted -> en route -> GPS -> proof -> weight -> delivered -> rating',
    (tester) async {},
    skip: true,
  );
}
