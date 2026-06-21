import 'package:flutter/material.dart';
import 'package:simbisa/core/models/credit_models.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/credit_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/formatters.dart';

class MyCreditsScreen extends StatefulWidget {
  const MyCreditsScreen({super.key});

  @override
  State<MyCreditsScreen> createState() => _MyCreditsScreenState();
}

class _MyCreditsScreenState extends State<MyCreditsScreen> {
  final _service = CreditService();
  bool _loading = true;
  String? _error;
  List<CreditDemandeItem> _credits = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final credits = await _service.fetchMyCredits();
      if (!mounted) return;
      setState(() {
        _credits = credits;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: SimbisaColors.surface,
      appBar: AppBar(
        title: const Text('Mes crédits'),
        backgroundColor: SimbisaColors.panel,
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: SimbisaColors.or))
          : _error != null
              ? Center(child: Text(_error!, style: SimbisaText.body(14, color: SimbisaColors.danger)))
              : RefreshIndicator(
                  onRefresh: _load,
                  color: SimbisaColors.or,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      _buildSummaryRow(),
                      const SizedBox(height: 24),
                      const SectionHeader(title: 'Historique complet'),
                      const SizedBox(height: 12),
                      if (_credits.isEmpty)
                        NeuCard(
                          padding: const EdgeInsets.all(16),
                          child: Text('Aucune demande de crédit.', style: SimbisaText.body(13, color: SimbisaColors.muted)),
                        )
                      else
                        ..._credits.map((c) => Padding(
                              padding: const EdgeInsets.only(bottom: 12),
                              child: _CreditCard(item: c),
                            )),
                    ],
                  ),
                ),
    );
  }

  Widget _buildSummaryRow() {
    final rembourses = _credits.where((c) => c.credit?.statut == 'rembourse').length;
    final total = _credits.length;
    final totalEmprunte = _credits.fold<double>(0, (sum, c) => sum + c.montantAffiche);
    final taux = total > 0 ? ((rembourses / total) * 100).round() : 0;

    return Row(
      children: [
        Expanded(child: NeuCard(
          padding: const EdgeInsets.all(14),
          child: Column(
            children: [
              Text('$rembourses/$total', style: const TextStyle(fontFamily: 'Sora', fontSize: 24, fontWeight: FontWeight.w800, color: SimbisaColors.success)),
              const SizedBox(height: 4),
              Text('Crédits remboursés', style: SimbisaText.body(11, color: SimbisaColors.muted), textAlign: TextAlign.center),
            ],
          ),
        )),
        const SizedBox(width: 12),
        Expanded(child: NeuCard(
          padding: const EdgeInsets.all(14),
          child: Column(
            children: [
              GradientText(formatMoney('\$', totalEmprunte), style: const TextStyle(fontFamily: 'Sora', fontSize: 24, fontWeight: FontWeight.w800)),
              const SizedBox(height: 4),
              Text('Total emprunté', style: SimbisaText.body(11, color: SimbisaColors.muted), textAlign: TextAlign.center),
            ],
          ),
        )),
        const SizedBox(width: 12),
        Expanded(child: NeuCard(
          padding: const EdgeInsets.all(14),
          child: Column(
            children: [
              Text('$taux%', style: const TextStyle(fontFamily: 'Sora', fontSize: 24, fontWeight: FontWeight.w800, color: SimbisaColors.orLight)),
              const SizedBox(height: 4),
              Text('Taux remboursement', style: SimbisaText.body(11, color: SimbisaColors.muted), textAlign: TextAlign.center),
            ],
          ),
        )),
      ],
    );
  }
}

class _CreditCard extends StatelessWidget {
  const _CreditCard({required this.item});
  final CreditDemandeItem item;

  @override
  Widget build(BuildContext context) {
    final statut = item.credit?.statut ?? item.statut;
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40, height: 40,
                decoration: BoxDecoration(color: SimbisaColors.or.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.credit_card_rounded, color: SimbisaColors.or, size: 18),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.displayId, style: SimbisaText.body(14, weight: FontWeight.w700)),
                    Text(item.formattedDate, style: SimbisaText.body(11, color: SimbisaColors.muted)),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    formatMoney(item.symbole, item.montantAffiche),
                    style: const TextStyle(fontFamily: 'Sora', fontSize: 18, fontWeight: FontWeight.w800, color: SimbisaColors.blanc),
                  ),
                  const SizedBox(height: 4),
                  StatusBadge.fromStatus(statut),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          NeuInset(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                _Info(label: 'Durée', value: '${item.dureeMois} mois'),
                const _Divider(),
                _Info(
                  label: 'Mensualité',
                  value: item.mensualite != null
                      ? formatMoney(item.symbole, item.mensualite!, decimals: 2)
                      : '—',
                ),
                const _Divider(),
                Expanded(child: _Info(label: 'Motif', value: item.motif.isNotEmpty ? item.motif : '—')),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _Info extends StatelessWidget {
  final String label, value;
  const _Info({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: SimbisaText.label()),
        const SizedBox(height: 2),
        Text(value, style: SimbisaText.body(12, weight: FontWeight.w600), overflow: TextOverflow.ellipsis),
      ],
    );
  }
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 30, color: Colors.white.withOpacity(0.07), margin: const EdgeInsets.symmetric(horizontal: 12));
  }
}
