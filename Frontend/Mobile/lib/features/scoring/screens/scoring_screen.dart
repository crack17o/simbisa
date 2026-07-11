import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:simbisa/core/models/scoring_models.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/scoring_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/formatters.dart';

class ScoringScreen extends StatefulWidget {
  const ScoringScreen({super.key});

  @override
  State<ScoringScreen> createState() => _ScoringScreenState();
}

class _ScoringScreenState extends State<ScoringScreen> {
  final _service = ScoringService();
  bool _loading = true;
  bool _refreshing = false;
  String? _error;
  ClientScoreData? _score;

  static const _motorColors = [SimbisaColors.or, SimbisaColors.blue, SimbisaColors.purple, SimbisaColors.teal];
  static const _kCache = 'simbisa_cache_score_v1';

  @override
  void initState() {
    super.initState();
    _loadCached().then((_) => _load());
  }

  Future<void> _loadCached() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString(_kCache);
      if (cached != null && mounted) {
        final data = jsonDecode(cached) as Map<String, dynamic>;
        setState(() {
          _score = ClientScoreData.fromJson(data);
          _loading = false;
        });
      }
    } catch (_) {}
  }

  Future<void> _load() async {
    if (_score == null) {
      setState(() { _loading = true; _error = null; });
    } else {
      setState(() { _refreshing = true; _error = null; });
    }
    try {
      final rawData = await _service.fetchMyScoreRaw();
      if (!mounted) return;
      setState(() {
        _score = ClientScoreData.fromJson(rawData);
        _loading = false;
        _refreshing = false;
      });
      final prefs = await SharedPreferences.getInstance();
      prefs.setString(_kCache, jsonEncode(rawData));
    } on ApiException catch (e) {
      if (!mounted) return;
      if (_score == null) {
        setState(() { _error = e.message; _loading = false; _refreshing = false; });
      } else {
        setState(() => _refreshing = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator(color: SimbisaColors.or)),
      );
    }

    if (_error != null || _score == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Scoring & Explications IA')),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error ?? 'Données indisponibles', style: SimbisaText.body(14, color: SimbisaColors.danger)),
              const SizedBox(height: 16),
              NeuButton(onTap: _load, child: const Text('Réessayer')),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Scoring & Explications IA'),
        actions: [IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load)],
        bottom: _refreshing
            ? const PreferredSize(
                preferredSize: Size.fromHeight(2),
                child: LinearProgressIndicator(
                  color: SimbisaColors.or,
                  backgroundColor: Colors.transparent,
                  minHeight: 2,
                ),
              )
            : null,
      ),
      body: RefreshIndicator(
        color: SimbisaColors.or,
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            children: [
              _buildGlobalScore(_score!),
              const SizedBox(height: 20),
              if (_score!.motors.isNotEmpty) _buildMotors(_score!.motors),
              if (_score!.motors.isNotEmpty) const SizedBox(height: 20),
              if (_score!.shapFeatures.isNotEmpty) _buildShap(_score!.shapFeatures),
              if (_score!.shapFeatures.isNotEmpty) const SizedBox(height: 20),
              if (_score!.detailDerniereDemande != null) _buildXaiConsistency(_score!),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGlobalScore(ClientScoreData score) {
    final risk = riskLabel(score.niveauRisque);
    final scoreInt = score.scoreProfil.round();

    return NeuCard(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Scoring Multi-Moteur', style: TextStyle(fontFamily: 'Sora', fontSize: 16, fontWeight: FontWeight.w700)),
                  const SizedBox(height: 4),
                  Text(
                    score.analyseDate != null ? 'Analyse du ${formatDate(score.analyseDate)}' : 'Profil client',
                    style: SimbisaText.body(12, color: SimbisaColors.muted),
                  ),
                ],
              ),
              StatusBadge.success(risk),
            ],
          ),
          const SizedBox(height: 24),
          ScoreRing(score: scoreInt, size: 140, label: 'Score global'),
          const SizedBox(height: 20),
          NeuInset(
            padding: const EdgeInsets.all(14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _ScoreInfo(
                  label: 'Proba. défaut',
                  value: score.probabiliteDefaut != null
                      ? '${score.probabiliteDefaut!.toStringAsFixed(1)}%'
                      : '—',
                  color: SimbisaColors.success,
                ),
                Builder(builder: (ctx) => Container(width: 1, height: 32, color: (Theme.of(ctx).brightness == Brightness.dark ? Colors.white : Colors.black).withValues(alpha: 0.07))),
                _ScoreInfo(label: 'Niveau risque', value: risk, color: SimbisaColors.success),
                Builder(builder: (ctx) => Container(width: 1, height: 32, color: (Theme.of(ctx).brightness == Brightness.dark ? Colors.white : Colors.black).withValues(alpha: 0.07))),
                _ScoreInfo(label: 'Modèle', value: score.modeleUtilise ?? '—', color: SimbisaColors.muted),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMotors(List<ScoreMotorData> motors) {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Moteurs de scoring', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          ...motors.map((m) {
            final color = _motorColors[m.colorIndex % _motorColors.length];
            return Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: NeuCard(
                padding: const EdgeInsets.all(14),
                shadows: NeuShadow.sm(),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle, boxShadow: NeuShadow.colorGlow(color))),
                        const SizedBox(width: 10),
                        Expanded(child: Text(m.name, style: SimbisaText.body(13, weight: FontWeight.w600))),
                        Text('Poids: ${m.weight}%', style: SimbisaText.body(11, color: SimbisaColors.muted)),
                        const SizedBox(width: 8),
                        Text('${m.score}/100', style: TextStyle(fontFamily: 'Sora', fontSize: 14, fontWeight: FontWeight.w700, color: color)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    NeuProgressBar(value: m.score / 100, color: color),
                    if (m.details.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      ...m.details.map((d) => Padding(
                            padding: const EdgeInsets.only(bottom: 4),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(d.label, style: SimbisaText.body(11, color: SimbisaColors.muted)),
                                Text(d.value, style: SimbisaText.body(11, weight: FontWeight.w600)),
                              ],
                            ),
                          )),
                    ],
                  ],
                ),
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildShap(List<ShapFeatureData> features) {
    final maxAbs = features.map((f) => f.shap.abs()).reduce((a, b) => a > b ? a : b);

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.insights_rounded, color: SimbisaColors.or, size: 18),
              SizedBox(width: 8),
              Text('Attributions SHAP locales', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 16),
          ...features.map((f) {
            final isPos = f.shap >= 0;
            final color = isPos ? SimbisaColors.teal : SimbisaColors.danger;
            final pct = maxAbs > 0 ? f.shap.abs() / maxAbs : 0.0;
            return Padding(
              padding: const EdgeInsets.only(bottom: 14),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(f.name, style: SimbisaText.body(12, color: SimbisaColors.muted))),
                      Text(
                        '${isPos ? "+" : ""}${f.shap.toStringAsFixed(2)}',
                        style: SimbisaText.body(12, color: color, weight: FontWeight.w700),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  NeuProgressBar(value: pct, color: color, height: 6),
                ],
              ),
            );
          }),
        ],
      ),
    );
  }

  Widget _buildXaiConsistency(ClientScoreData score) {
    final explication = score.detailDerniereDemande?.explicationIa ?? '';
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.auto_awesome_rounded, color: SimbisaColors.orLight, size: 18),
              SizedBox(width: 8),
              Text('Explication IA (RAG)', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 12),
          if (explication.isNotEmpty)
            Text(explication, style: SimbisaText.body(12).copyWith(height: 1.6))
          else
            Text(
              'Mémo IA non disponible pour cette demande. Un mémo est généré automatiquement après analyse complète de votre dossier.',
              style: SimbisaText.body(12, color: SimbisaColors.muted).copyWith(height: 1.6),
            ),
        ],
      ),
    );
  }
}

class _ScoreInfo extends StatelessWidget {
  final String label, value;
  final Color color;
  const _ScoreInfo({required this.label, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: TextStyle(fontFamily: 'Sora', fontSize: 16, fontWeight: FontWeight.w700, color: color)),
        const SizedBox(height: 4),
        Text(label, style: SimbisaText.body(10, color: SimbisaColors.muted)),
      ],
    );
  }
}
