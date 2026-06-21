import '../models/scoring_models.dart';
import 'api_client.dart';

class ScoringService {
  ScoringService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<ClientScoreData> fetchMyScore() async {
    final res = await _api.get('scoring/me/');
    final data = res['data'] as Map<String, dynamic>;
    return ClientScoreData.fromJson(data);
  }
}
