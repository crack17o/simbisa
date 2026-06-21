import 'package:flutter_test/flutter_test.dart';
import 'package:simbisa/core/utils/mobile_money_operator.dart';

void main() {
  group('MobileMoneyOperator.fromPhone', () {
    test('Vodacom — 081 local et +243 81 international', () {
      expect(MobileMoneyOperator.fromPhone('0811234567')?.code, 'vodacom');
      expect(MobileMoneyOperator.fromPhone('+243810000001')?.code, 'vodacom');
    });

    test('Orange — 084 et +243 84', () {
      expect(MobileMoneyOperator.fromPhone('0841234567')?.code, 'orange');
      expect(MobileMoneyOperator.fromPhone('+243840000001')?.code, 'orange');
    });

    test('Airtel — 099 et +243 99', () {
      expect(MobileMoneyOperator.fromPhone('0991234567')?.code, 'airtel');
      expect(MobileMoneyOperator.fromPhone('+243990000001')?.code, 'airtel');
    });

    test('Africell — 090 et +243 90', () {
      expect(MobileMoneyOperator.fromPhone('0901234567')?.code, 'africell');
      expect(MobileMoneyOperator.fromPhone('+243900000010')?.code, 'africell');
    });
  });
}
