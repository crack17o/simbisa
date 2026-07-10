import '../models/scoring_models.dart';
import 'api_client.dart';

class ScoringService {
  ScoringService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<ClientScoreData> fetchMyScore() async {
    final data = await fetchMyScoreRaw();
    return ClientScoreData.fromJson(data);
  }

  Future<Map<String, dynamic>> fetchMyScoreRaw() async {
    final res = await _api.get('scoring/me/');
    return res['data'] as Map<String, dynamic>;
  }
}
