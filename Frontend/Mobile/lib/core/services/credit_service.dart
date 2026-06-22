import '../models/credit_models.dart';
import 'api_client.dart';
import 'scoring_service.dart';

class CreditService {
  CreditService({ApiClient? api, ScoringService? scoring})
      : _api = api ?? ApiClient(),
        _scoring = scoring ?? ScoringService();

  final ApiClient _api;
  final ScoringService _scoring;

  Future<List<CreditDemandeItem>> fetchMyCredits({String? devise}) async {
    final path = devise != null ? 'credits/me/?devise=$devise' : 'credits/me/';
    final res = await _api.get(path);
    final data = res['data'] as List<dynamic>? ?? [];
    return data
        .map((e) => CreditDemandeItem.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<CreditSubmitResult> submitRequest({
    required double montant,
    required int dureeMois,
    required String motif,
    String devise = 'USD',
  }) async {
    final res = await _api.post('credits/', body: {
      'devise': devise,
      'montant_demande': montant,
      'duree_mois': dureeMois,
      'motif': motif,
    });

    final data = res['data'] as Map<String, dynamic>;
    final demandeId = data['demande_id'] as int;
    return _waitForDecision(demandeId, devise);
  }

  Future<CreditSubmitResult> _waitForDecision(int demandeId, String devise) async {
    for (var attempt = 0; attempt < 15; attempt++) {
      await Future.delayed(const Duration(seconds: 2));

      final score = await _scoring.fetchMyScore();
      final detail = score.detailDerniereDemande;
      if (detail != null && detail.demandeId == demandeId) {
        if (detail.decision != null) {
          return CreditSubmitResult(
            demandeId: demandeId,
            statut: detail.decision!,
            devise: devise,
            decision: detail.decision,
            motif: detail.motif,
            explicationIa: detail.explicationIa,
            scoreGlobal: detail.scoreGlobal,
            timedOut: false,
          );
        }
      }

      final credits = await fetchMyCredits();
      CreditDemandeItem? item;
      for (final c in credits) {
        if (c.demandeId == demandeId) {
          item = c;
          break;
        }
      }
      if (item != null && item.statut != 'en_analyse') {
        return CreditSubmitResult(
          demandeId: demandeId,
          statut: item.statut,
          devise: devise,
          decision: detail?.decision,
          motif: detail?.motif ?? item.motif,
          explicationIa: detail?.explicationIa,
          scoreGlobal: detail?.scoreGlobal,
          timedOut: false,
        );
      }
    }

    return CreditSubmitResult(
      demandeId: demandeId,
      statut: 'en_analyse',
      devise: devise,
      timedOut: true,
    );
  }

  Future<void> rembourser({
    required int creditId,
    required double montant,
    String modePaiement = 'illicocash',
  }) async {
    await _api.post(
      'credits/$creditId/remboursement/',
      body: {
        'montant': montant,
        'mode_paiement': modePaiement,
      },
    );
  }

  Future<Map<String, dynamic>> fetchEcheances(int creditId) async {
    final res = await _api.get('credits/$creditId/echeances/');
    return res['data'] as Map<String, dynamic>;
  }
}
