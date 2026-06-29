import '../models/wallet_models.dart';
import 'api_client.dart';

class WalletService {
  WalletService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<List<WalletData>> fetchWallets() async {
    final res = await _api.get('wallets/me/');
    final data = res['data'] as List<dynamic>? ?? [];
    return data.map((e) => WalletData.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Map<String, dynamic>> depot(
    int walletId,
    double montant, {
    required String modePaiement,
    String numeroPaiement = '',
    String description = '',
  }) async {
    return _api.post('wallets/$walletId/depot/', body: {
      'montant': montant,
      'mode_paiement': modePaiement,
      if (numeroPaiement.isNotEmpty) 'numero_paiement': numeroPaiement,
      if (description.isNotEmpty) 'description': description,
    });
  }

  Future<Map<String, dynamic>> retrait(
    int walletId,
    double montant, {
    required String modePaiement,
    String numeroPaiement = '',
    String description = '',
  }) async {
    return _api.post('wallets/$walletId/retrait/', body: {
      'montant': montant,
      'mode_paiement': modePaiement,
      if (numeroPaiement.isNotEmpty) 'numero_paiement': numeroPaiement,
      if (description.isNotEmpty) 'description': description,
    });
  }

  Future<List<WalletTransaction>> fetchTransactions(int walletId, {int limit = 30}) async {
    final res = await _api.get('wallets/$walletId/transactions/?limit=$limit');
    final data = res['data'] as List<dynamic>? ?? [];
    return data.map((e) => WalletTransaction.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<MobileMoneyAccount>> fetchMobileMoneyAccounts({String? devise}) async {
    final path = devise != null ? 'wallets/mobile-money/?devise=$devise' : 'wallets/mobile-money/';
    final res = await _api.get(path);
    final data = res['data'] as List<dynamic>? ?? [];
    return data.map((e) => MobileMoneyAccount.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<MobileMoneyAccount> addMobileMoneyAccount({
    required String operateur,
    required String numeroTelephone,
    required String devise,
  }) async {
    final res = await _api.post('wallets/mobile-money/', body: {
      'operateur': operateur,
      'numero_telephone': numeroTelephone,
      'devise': devise,
    });
    return MobileMoneyAccount.fromJson(res['data'] as Map<String, dynamic>);
  }
}
