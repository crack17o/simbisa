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

  void _showRemboursementSheet() {
    final echeances = (_data?['echeances'] as List<dynamic>?) ?? [];
    final solde = double.tryParse(_data?['solde_restant']?.toString() ?? '0') ?? 0;
    if (solde <= 0) return;

    double minMontant = solde;
    for (final e in echeances) {
      final statut = e['statut'] as String? ?? 'non_paye';
      if (statut != 'paye') {
        final restant = double.tryParse(e['restant']?.toString() ?? '0') ?? 0;
        final montant = double.tryParse(e['montant']?.toString() ?? '0') ?? 0;
        minMontant = restant > 0 ? restant : montant;
        break;
      }
    }
    minMontant = minMontant.clamp(0.01, solde);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (_) => _RemboursementSheet(
        sym: widget.symbole,
        creditId: widget.creditId,
        minMontant: minMontant,
        maxMontant: solde,
        service: _service,
        onSuccess: _load,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final sym = widget.symbole;
    final echeances = (_data?['echeances'] as List<dynamic>?) ?? [];
    final payees = echeances.where((e) => e['statut'] == 'paye').length;
    final total = echeances.length;
    final progression = total > 0 ? payees / total : 0.0;
    final soldeRestant = double.tryParse(_data?['solde_restant']?.toString() ?? '0') ?? 0;
    final creditStatut = _data?['statut'] as String? ?? 'en_cours';
    final peutRembourser = !_loading && _error == null && soldeRestant > 0 && creditStatut == 'en_cours';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Échéancier'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load),
        ],
      ),
      floatingActionButton: peutRembourser
          ? FloatingActionButton.extended(
              onPressed: _showRemboursementSheet,
              backgroundColor: SimbisaColors.or,
              foregroundColor: SimbisaColors.noir,
              icon: const Icon(Icons.payments_rounded),
              label: const Text('Rembourser', style: TextStyle(fontWeight: FontWeight.w700)),
            )
          : null,
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
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 96),
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
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
                                  value: formatMoney(sym, soldeRestant),
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
                            "Aucune échéance — le crédit vient d'être accordé.",
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
                            shadows: statut == 'en_retard'
                                ? NeuShadow.colorGlow(SimbisaColors.danger)
                                : NeuShadow.sm(),
                            child: Row(
                              children: [
                                Container(
                                  width: 32,
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: statusColor.withValues(alpha: 0.12),
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
                                        color: statut == 'paye' ? SimbisaColors.success : null,
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
                    ],
                  ),
                ),
    );
  }
}

// ─── Feuille de remboursement ──────────────────────────────────────────────

class _RemboursementSheet extends StatefulWidget {
  final String sym;
  final int creditId;
  final double minMontant;
  final double maxMontant;
  final CreditService service;
  final VoidCallback onSuccess;

  const _RemboursementSheet({
    required this.sym,
    required this.creditId,
    required this.minMontant,
    required this.maxMontant,
    required this.service,
    required this.onSuccess,
  });

  @override
  State<_RemboursementSheet> createState() => _RemboursementSheetState();
}

class _RemboursementSheetState extends State<_RemboursementSheet> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _ctrl;
  String _mode = 'illicocash';
  bool _loading = false;

  static const _modes = [
    ('illicocash', 'Illico Cash'),
    ('virement', 'Virement bancaire'),
    ('agence', 'Agence Rawbank'),
    ('mobile_money', 'Mobile Money'),
  ];

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.minMontant.toStringAsFixed(2));
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final montant = double.tryParse(_ctrl.text.replaceAll(',', '.')) ?? 0;
    setState(() => _loading = true);
    try {
      await widget.service.rembourser(
        creditId: widget.creditId,
        montant: montant,
        modePaiement: _mode,
      );
      if (!mounted) return;
      Navigator.of(context).pop();
      widget.onSuccess();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: SimbisaColors.danger),
      );
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Erreur réseau'), backgroundColor: SimbisaColors.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final sym = widget.sym;

    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 20, 20, 32),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Poignée
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: BoxDecoration(
                    color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),

              Text('Rembourser', style: SimbisaText.display(16)),
              const SizedBox(height: 4),
              Text(
                'Min: ${formatMoney(sym, widget.minMontant)}   Max: ${formatMoney(sym, widget.maxMontant)}',
                style: SimbisaText.body(12, color: SimbisaColors.muted),
              ),
              const SizedBox(height: 20),

              // Montant
              TextFormField(
                controller: _ctrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: const TextStyle(fontFamily: 'Sora', fontWeight: FontWeight.w700, fontSize: 18),
                decoration: InputDecoration(
                  labelText: 'Montant ($sym)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                validator: (v) {
                  final val = double.tryParse((v ?? '').replaceAll(',', '.'));
                  if (val == null || val <= 0) return 'Montant invalide';
                  if (val < widget.minMontant - 0.005) {
                    return 'Minimum: ${formatMoney(sym, widget.minMontant)}';
                  }
                  if (val > widget.maxMontant + 0.005) {
                    return 'Maximum: ${formatMoney(sym, widget.maxMontant)}';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Mode de paiement
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: isDark ? SimbisaColors.panel : SimbisaLightColors.panel,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.12),
                  ),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _mode,
                    isExpanded: true,
                    dropdownColor: isDark ? SimbisaColors.panel : SimbisaLightColors.panel,
                    items: _modes
                        .map((m) => DropdownMenuItem(value: m.$1, child: Text(m.$2)))
                        .toList(),
                    onChanged: (v) => setState(() => _mode = v ?? _mode),
                  ),
                ),
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                child: NeuButton(
                  onTap: _loading ? null : _submit,
                  child: _loading
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: SimbisaColors.noir,
                          ),
                        )
                      : const Text('Confirmer le remboursement', style: TextStyle(fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─── Widgets utilitaires ───────────────────────────────────────────────────

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
            color: color,
          ),
        ),
      ],
    );
  }
}
