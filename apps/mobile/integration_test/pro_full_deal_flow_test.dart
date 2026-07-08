import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets(
    'Pro full flow: sourcing -> deposit -> deal desk -> weighing -> seller OTP -> buyer verify -> bond',
    (tester) async {},
    skip: true,
  );
}
