import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'Customer full flow: list free -> buyer deposit -> chat -> offer -> amendment -> handshake -> bond',
    (tester) async {},
    skip: true,
  );
}
