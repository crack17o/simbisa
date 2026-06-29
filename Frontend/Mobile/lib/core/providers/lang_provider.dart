import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

const _kLangKey = 'simbisa_lang';
const _kSupportedLangs = ['fr', 'en', 'ln'];

class LangNotifier extends StateNotifier<String> {
  LangNotifier() : super('fr') {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString(_kLangKey);
    if (stored != null && _kSupportedLangs.contains(stored)) {
      state = stored;
    }
  }

  Future<void> setLang(String lang) async {
    if (!_kSupportedLangs.contains(lang)) return;
    state = lang;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kLangKey, lang);
  }

  String get current => state;
}

final langProvider = StateNotifierProvider<LangNotifier, String>(
  (_) => LangNotifier(),
);
