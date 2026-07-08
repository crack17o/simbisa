import 'dart:typed_data';

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

  Future<Uint8List> fetchKycDocument(String absoluteUrl) {
    return _api.fetchAuthBytes(absoluteUrl);
  }

  Future<void> submitKyc({
    required String typePiece,
    required String numeroPiece,
    required String dateExpiration,
    List<int>? fileBytes,
    String? fileName,
  }) async {
    await _api.postMultipart(
      'clients/me/identite/',
      fields: {
        'type_piece': typePiece,
        'numero_piece': numeroPiece,
        'date_expiration': dateExpiration,
      },
      fileBytes: fileBytes,
      fileFieldName: fileBytes != null ? 'document_scan' : null,
      fileName: fileName,
    );
  }
}
