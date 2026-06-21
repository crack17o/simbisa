import '../models/wallet_models.dart';
import 'api_client.dart';

class WalletService {
  WalletService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<List<MobileMoneyAccount>> fetchMobileMoneyAccounts({String? devise}) async {
    final path = devise != null ? 'wallets/mobile-money/?devise=$devise' : 'wallets/mobile-money/';
    final res = await _api.get(path);
    final data = res['data'] as List<dynamic>? ?? [];
    return data
        .map((e) => MobileMoneyAccount.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
