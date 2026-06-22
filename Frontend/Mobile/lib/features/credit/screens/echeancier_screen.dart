import 'package:flutter/material.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/credit_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/formatters.dart';

class EcheancierScreen extends StatefulWidget {
  final int creditId;
  final String devise;
  final String symbole;

  const EcheancierScreen({
    super.key,
    required this.creditId,
    required this.devise,
    required this.symbole,
  });

  @override
  State<EcheancierScreen> createState() => _EcheancierScreenState();
}

class _EcheancierScreenState extends State<EcheancierScreen> {
  final _service = CreditService();
  bool _loading = true;
  String? _error;
  Map<String, dynamic>? _data;

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
      final data = await _service.fetchEcheances(widget.creditId);
      if (!mounted) return;
      setState(() {
        _data = data;
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
    final sym = widget.symbole;
    final echeances = (_data?['echeances'] as List<dynamic>?) ?? [];
    final payees = echeances.where((e) => e['statut'] == 'paye').length;
    final total = echeances.length;
    final progression = total > 0 ? payees / total : 0.0;

    return Scaffold(
      backgroundColor: SimbisaColors.surface,
      appBar: AppBar(
        title: const Text('Échéancier'),
        backgroundColor: SimbisaColors.panel,
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: SimbisaColors.or))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(_error!, style: SimbisaText.body(14, color: SimbisaColors.danger), textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        NeuButton(onTap: _load, child: const Text('Réessayer')),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  color: SimbisaColors.or,
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.all(20),
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      // Résumé
                      NeuCard(
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                _Summary(
                                  label: 'Accordé',
                                  value: formatMoney(sym, double.tryParse(_data?['montant_accorde']?.toString() ?? '') ?? 0),
                                ),
                                _Summary(
                                  label: 'Mensualité',
                                  value: formatMoney(sym, double.tryParse(_data?['mensualite']?.toString() ?? '') ?? 0),
                                  color: SimbisaColors.orLight,
                                ),
                                _Summary(
                                  label: 'Restant',
                                  value: formatMoney(sym, double.tryParse(_data?['solde_restant']?.toString() ?? '') ?? 0),
                                  color: SimbisaColors.muted,
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Row(
                              children: [
                                Expanded(
                                  child: NeuProgressBar(value: progression, color: SimbisaColors.success),
                                ),
                                const SizedBox(width: 12),
                                Text(
                                  '$payees/$total',
                                  style: SimbisaText.body(12, color: SimbisaColors.success, weight: FontWeight.w700),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                      const SectionHeader(title: 'Calendrier des échéances'),
                      const SizedBox(height: 12),
                      if (echeances.isEmpty)
                        NeuCard(
                          padding: const EdgeInsets.all(16),
                          child: Text(
                            'Aucune échéance — le crédit vient d\'être accordé.',
                            style: SimbisaText.body(13, color: SimbisaColors.muted),
                          ),
                        ),
                      ...echeances.asMap().entries.map((entry) {
                        final i = entry.key;
                        final e = entry.value as Map<String, dynamic>;
                        final statut = e['statut'] as String? ?? 'non_paye';
                        final montant = double.tryParse(e['montant']?.toString() ?? '') ?? 0;
                        final montantPaye = double.tryParse(e['montant_paye']?.toString() ?? '') ?? 0;
                        final restant = double.tryParse(e['restant']?.toString() ?? '') ?? 0;
                        final dateStr = e['date_echeance'] as String?;

                        Color statusColor;
                        IconData statusIcon;
                        switch (statut) {
                          case 'paye':
                            statusColor = SimbisaColors.success;
                            statusIcon = Icons.check_circle_rounded;
                            break;
                          case 'en_retard':
                            statusColor = SimbisaColors.danger;
                            statusIcon = Icons.error_rounded;
                            break;
                          case 'partiellement_paye':
                            statusColor = SimbisaColors.warning;
                            statusIcon = Icons.timelapse_rounded;
                            break;
                          default:
                            statusColor = SimbisaColors.muted;
                            statusIcon = Icons.radio_button_unchecked_rounded;
                        }

                        return Padding(
                          padding: const EdgeInsets.only(bottom: 10),
                          child: NeuCard(
                            padding: const EdgeInsets.all(14),
                            shadows: statut == 'en_retard' ? NeuShadow.colorGlow(SimbisaColors.danger) : NeuShadow.sm(),
                            child: Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: statusColor.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(statusIcon, color: statusColor, size: 16),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Échéance ${i + 1} · ${formatDate(dateStr)}',
                                        style: SimbisaText.body(13, weight: FontWeight.w600),
                                      ),
                                      if (statut == 'partiellement_paye')
                                        Text(
                                          'Payé ${formatMoney(sym, montantPaye)} · Reste ${formatMoney(sym, restant)}',
                                          style: SimbisaText.body(11, color: SimbisaColors.warning),
                                        ),
                                    ],
                                  ),
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(
                                      formatMoney(sym, montant),
                                      style: TextStyle(
                                        fontFamily: 'Sora',
                                        fontSize: 15,
                                        fontWeight: FontWeight.w700,
                                        color: statut == 'paye' ? SimbisaColors.success : SimbisaColors.blanc,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    StatusBadge.fromStatus(statut),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }),
                      const SizedBox(height: 32),
                    ],
                  ),
                ),
    );
  }
}

class _Summary extends StatelessWidget {
  final String label, value;
  final Color? color;
  const _Summary({required this.label, required this.value, this.color});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: SimbisaText.label()),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontFamily: 'Sora',
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: color ?? SimbisaColors.blanc,
          ),
        ),
      ],
    );
  }
}
