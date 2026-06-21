import '../models/client_profile.dart';
import 'api_client.dart';

class ClientService {
  ClientService({ApiClient? api}) : _api = api ?? ApiClient();

  final ApiClient _api;

  Future<ClientProfile> fetchProfile({double? scoreClient}) async {
    final res = await _api.get('clients/me/');
    final data = (res['data'] as Map<String, dynamic>?) ?? res;
    return ClientProfile.fromJson(data, scoreClient: scoreClient);
  }

  Future<ClientProfile> updateProfile({
    String? profession,
    String? adresse,
    String? dateNaissance,
  }) async {
    final body = <String, dynamic>{};
    if (profession != null) body['profession'] = profession;
    if (adresse != null) body['adresse'] = adresse;
    if (dateNaissance != null) body['date_naissance'] = dateNaissance;

    final res = await _api.patch('clients/me/', body: body);
    final data = (res['data'] as Map<String, dynamic>?) ?? res;
    return ClientProfile.fromJson(data);
  }
}
