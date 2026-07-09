import 'package:flutter/material.dart';
import 'package:simbisa/core/models/scoring_models.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/scoring_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/toast.dart';

class AIExplanationsScreen extends StatefulWidget {
  const AIExplanationsScreen({super.key});

  @override
  State<AIExplanationsScreen> createState() => _AIExplanationsScreenState();
}

class _AIExplanationsScreenState extends State<AIExplanationsScreen> {
  final _service = ScoringService();
  bool _loading = true;
  ClientScoreData? _data;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final data = await _service.fetchMyScore();
      if (!mounted) return;
      setState(() {
        _data = data;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      showToastError(context, e.message);
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Explications IA (XAI)'),
        actions: [IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load)],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: SimbisaColors.or))
          : RefreshIndicator(
              color: SimbisaColors.or,
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(20),
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  _buildSummaryCard(),
                  const SizedBox(height: 20),
                  _buildShapCard(),
                  const SizedBox(height: 20),
                  if (_data?.detailDerniereDemande?.explicationIa != null)
                    _buildExplicationCard(_data!.detailDerniereDemande!.explicationIa!),
                  const SizedBox(height: 32),
                ],
              ),
            ),
    );
  }

  Widget _buildSummaryCard() {
    final d = _data;
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: SimbisaColors.or.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.auto_graph_rounded, color: SimbisaColors.or, size: 18),
              ),
              const SizedBox(width: 12),
              const Text('Analyse XGBoost + SHAP', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 16),
          if (d == null || d.motors.isEmpty)
            Text('Soumettez une demande de crédit pour obtenir une analyse IA.', style: SimbisaText.body(13, color: SimbisaColors.muted))
          else
            NeuInset(
              padding: const EdgeInsets.all(14),
              child: Column(
                children: [
                  _Row('Score global', '${d.scoreClient.round()}'),
                  const SizedBox(height: 8),
                  _Row('Niveau de risque', d.niveauRisque ?? '—'),
                  if (d.probabiliteDefaut != null) ...[
                    const SizedBox(height: 8),
                    _Row('Prob. défaut', '${d.probabiliteDefaut!.toStringAsFixed(1)}%'),
                  ],
                  if (d.modeleUtilise != null) ...[
                    const SizedBox(height: 8),
                    _Row('Modèle', d.modeleUtilise!),
                  ],
                ],
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildShapCard() {
    final shap = _data?.shapFeatures ?? [];
    final max = shap.isNotEmpty ? shap.map((f) => f.shap.abs()).reduce((a, b) => a > b ? a : b) : 1.0;

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Attributions SHAP', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text('Contribution de chaque variable au score final.', style: SimbisaText.body(11, color: SimbisaColors.muted)),
          const SizedBox(height: 16),
          if (shap.isEmpty)
            Text('Aucune donnée SHAP disponible.', style: SimbisaText.body(13, color: SimbisaColors.muted))
          else
            for (final f in shap)
              Padding(
                padding: const EdgeInsets.only(bottom: 14),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(child: Text(f.name, style: SimbisaText.body(12, color: SimbisaColors.muted), overflow: TextOverflow.ellipsis)),
                        Text(
                          '${f.shap >= 0 ? '+' : ''}${f.shap.toStringAsFixed(3)}',
                          style: SimbisaText.body(12, weight: FontWeight.w700, color: f.shap >= 0 ? SimbisaColors.success : SimbisaColors.danger),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    NeuInset(
                      padding: EdgeInsets.zero,
                      radius: 8,
                      child: SizedBox(
                        height: 8,
                        child: FractionallySizedBox(
                          alignment: Alignment.centerLeft,
                          widthFactor: (f.shap.abs() / max).clamp(0.0, 1.0),
                          child: Container(
                            decoration: BoxDecoration(
                              color: f.shap >= 0 ? SimbisaColors.success : SimbisaColors.danger,
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
        ],
      ),
    );
  }

  Widget _buildExplicationCard(String text) {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: SimbisaColors.teal.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.psychology_rounded, color: SimbisaColors.teal, size: 18),
              ),
              const SizedBox(width: 12),
              const Text('Explication IA', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 14),
          NeuInset(
            padding: const EdgeInsets.all(14),
            child: Text(text, style: SimbisaText.body(13, color: SimbisaColors.muted)),
          ),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final String label, value;
  const _Row(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: SimbisaText.body(12, color: SimbisaColors.muted)),
        Text(value, style: SimbisaText.body(12, weight: FontWeight.w600)),
      ],
    );
  }
}
