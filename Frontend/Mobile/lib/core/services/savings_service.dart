import '../models/savings_models.dart';
import 'api_client.dart';

class SavingsService {
  SavingsService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<SavingsAccount> getOrCreateUsdAccount({
    double objectifMontant = 300,
    String objectifDescription = 'Objectif épargne',
  }) async {
    final accounts = await fetchAccounts(devise: 'USD');
    if (accounts.isNotEmpty) return accounts.first;

    final res = await _api.post('savings/', body: {
      'devise': 'USD',
      'objectif_montant': objectifMontant,
      'objectif_description': objectifDescription,
    });
    final data = res['data'] as Map<String, dynamic>;
    return SavingsAccount.fromJson(data);
  }

  Future<List<SavingsAccount>> fetchAccounts({String? devise}) async {
    final path = devise != null ? 'savings/?devise=$devise' : 'savings/';
    final res = await _api.get(path);
    final data = res['data'] as List<dynamic>? ?? [];
    return data
        .map((e) => SavingsAccount.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<SavingsOperation>> fetchOperations(int accountId, {int limit = 50}) async {
    final res = await _api.get('savings/$accountId/operations/?limit=$limit');
    final data = res['data'] as List<dynamic>? ?? [];
    return data
        .map((e) => SavingsOperation.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<double> depot(
    int accountId,
    double montant, {
    String modePaiement = '',
    String numeroPaiement = '',
    String? description,
  }) async {
    final res = await _api.post('savings/$accountId/depot/', body: {
      'montant': montant,
      if (modePaiement.isNotEmpty) 'mode_paiement': modePaiement,
      if (numeroPaiement.isNotEmpty) 'numero_paiement': numeroPaiement,
      if (description != null) 'description': description,
    });
    final data = res['data'] as Map<String, dynamic>;
    return double.tryParse(data['nouveau_solde']?.toString() ?? '') ?? 0;
  }

  Future<double> retrait(
    int accountId,
    double montant, {
    String modePaiement = '',
    String numeroPaiement = '',
    String? description,
  }) async {
    final res = await _api.post('savings/$accountId/retrait/', body: {
      'montant': montant,
      if (modePaiement.isNotEmpty) 'mode_paiement': modePaiement,
      if (numeroPaiement.isNotEmpty) 'numero_paiement': numeroPaiement,
      if (description != null) 'description': description,
    });
    final data = res['data'] as Map<String, dynamic>;
    return double.tryParse(data['nouveau_solde']?.toString() ?? '') ?? 0;
  }
}
