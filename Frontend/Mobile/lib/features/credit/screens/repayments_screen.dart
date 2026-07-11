import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/models/credit_models.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/credit_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/formatters.dart';
import 'package:simbisa/core/utils/toast.dart';

class RepaymentsScreen extends StatefulWidget {
  const RepaymentsScreen({super.key});

  @override
  State<RepaymentsScreen> createState() => _RepaymentsScreenState();
}

class _RepaymentsScreenState extends State<RepaymentsScreen> {
  final _service = CreditService();
  bool _loading = true;
  bool _hasError = false;
  List<CreditDemandeItem> _credits = [];
  CreditDemandeItem? _selected;
  final _montantCtrl = TextEditingController();
  String _mode = 'illicocash';
  bool _paying = false;

  static const _modes = ['illicocash', 'mpesa', 'airtel_money', 'orange_money'];
  static const _modeLabels = {
    'illicocash': 'illicocash',
    'mpesa': 'M-Pesa',
    'airtel_money': 'Airtel Money',
    'orange_money': 'Orange Money',
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _montantCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _hasError = false;
    });
    try {
      final credits = await _service.fetchMyCredits();
      final actifs = credits.where((c) => c.credit != null && c.credit!.statut == 'en_cours').toList();
      if (!mounted) return;
      setState(() {
        _credits = actifs;
        _selected = actifs.isNotEmpty ? actifs.first : null;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      showToastError(context, e.message);
      setState(() {
        _hasError = true;
        _loading = false;
      });
    }
  }

  Future<void> _payer() async {
    if (_selected == null) {
      showToastError(context, 'Sélectionnez un crédit.');
      return;
    }
    final montant = double.tryParse(_montantCtrl.text.replaceAll(',', '.'));
    if (montant == null || montant <= 0) {
      showToastError(context, 'Saisissez un montant valide.');
      return;
    }
    final symbole = _selected!.symbole;
    final modeLabel = _modeLabels[_mode] ?? _mode;
    setState(() => _paying = true);
    try {
      await _service.rembourser(
        creditId: _selected!.credit!.id,
        montant: montant,
        modePaiement: _mode,
      );
      if (!mounted) return;
      _montantCtrl.clear();
      await _load();
      if (!mounted) return;
      final isDark = Theme.of(context).brightness == Brightness.dark;
      await showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => AlertDialog(
          backgroundColor: isDark ? const Color(0xFF1E1E2E) : const Color(0xFFF4F4F8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64, height: 64,
                decoration: BoxDecoration(color: SimbisaColors.success.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: const Icon(Icons.check_circle_rounded, color: SimbisaColors.success, size: 38),
              ),
              const SizedBox(height: 16),
              const Text('Opération réussie', style: TextStyle(fontFamily: 'Sora', fontSize: 17, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(formatMoney(symbole, montant), style: SimbisaText.body(14, color: SimbisaColors.orLight, weight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text('via $modeLabel', style: SimbisaText.body(12, color: SimbisaColors.muted)),
            ],
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Nouveau remboursement'),
            ),
            TextButton(
              onPressed: () { Navigator.pop(ctx); context.go(AppRoutes.dashboard); },
              style: TextButton.styleFrom(foregroundColor: SimbisaColors.or),
              child: const Text('Tableau de bord'),
            ),
          ],
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      final isDark = Theme.of(context).brightness == Brightness.dark;
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: isDark ? const Color(0xFF1E1E2E) : const Color(0xFFF4F4F8),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 64, height: 64,
                decoration: BoxDecoration(color: SimbisaColors.danger.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: const Icon(Icons.cancel_rounded, color: SimbisaColors.danger, size: 38),
              ),
              const SizedBox(height: 16),
              const Text('Échec du remboursement', style: TextStyle(fontFamily: 'Sora', fontSize: 17, fontWeight: FontWeight.w700)),
              const SizedBox(height: 8),
              Text(e.message, textAlign: TextAlign.center, style: SimbisaText.body(13, color: SimbisaColors.muted)),
            ],
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              style: TextButton.styleFrom(foregroundColor: SimbisaColors.or),
              child: const Text('Fermer'),
            ),
          ],
        ),
      );
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Remboursements'),
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
                  if (_credits.isEmpty && !_hasError)
                    NeuCard(
                      padding: const EdgeInsets.all(20),
                      child: Column(
                        children: [
                          const Icon(Icons.check_circle_rounded, color: SimbisaColors.success, size: 40),
                          const SizedBox(height: 12),
                          Text('Aucun crédit actif à rembourser.', style: SimbisaText.body(14, color: SimbisaColors.muted), textAlign: TextAlign.center),
                        ],
                      ),
                    )
                  else ...[
                    _buildCreditSelector(),
                    const SizedBox(height: 20),
                    if (_selected != null) _buildPaymentForm(),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _buildCreditSelector() {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Crédit à rembourser', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          for (final c in _credits)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: GestureDetector(
                onTap: () => setState(() => _selected = c),
                child: NeuInset(
                  padding: const EdgeInsets.all(14),
                  child: Row(
                    children: [
                      Container(
                        width: 20, height: 20,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: _selected?.demandeId == c.demandeId ? SimbisaColors.or : SimbisaColors.muted, width: 2),
                          color: _selected?.demandeId == c.demandeId ? SimbisaColors.or : Colors.transparent,
                        ),
                        child: _selected?.demandeId == c.demandeId ? const Icon(Icons.check, size: 12, color: SimbisaColors.noir) : null,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(c.displayId, style: SimbisaText.body(13, weight: FontWeight.w600)),
                            Text('${formatMoney(c.symbole, c.montantAffiche)} · ${c.dureeMois} mois', style: SimbisaText.body(11, color: SimbisaColors.muted)),
                          ],
                        ),
                      ),
                      if (c.mensualite != null)
                        Text('Mens. ${formatMoney(c.symbole, c.mensualite!)}', style: SimbisaText.body(11, color: SimbisaColors.orLight)),
                    ],
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPaymentForm() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final c = _selected!;
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: SimbisaColors.or.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.payments_rounded, color: SimbisaColors.or, size: 18),
              ),
              const SizedBox(width: 12),
              const Text('Effectuer un remboursement', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700)),
            ],
          ),
          const SizedBox(height: 16),
          if (c.mensualite != null)
            NeuInset(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Mensualité', style: SimbisaText.body(12, color: SimbisaColors.muted)),
                  Text(formatMoney(c.symbole, c.mensualite!, decimals: 2), style: SimbisaText.body(13, weight: FontWeight.w700, color: SimbisaColors.orLight)),
                ],
              ),
            ),
          const SizedBox(height: 16),
          NeuTextField(
            label: 'Montant (${c.devise})',
            hint: '0.00',
            prefixIcon: const Icon(Icons.attach_money_rounded),
            controller: _montantCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
          ),
          const SizedBox(height: 16),
          Text('Mode de paiement', style: SimbisaText.body(12, color: SimbisaColors.muted)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            decoration: BoxDecoration(
              color: isDark ? SimbisaColors.panel : SimbisaLightColors.panel,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: (isDark ? Colors.white : Colors.black).withValues(alpha: 0.08)),
            ),
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                value: _mode,
                dropdownColor: isDark ? SimbisaColors.panel : SimbisaLightColors.panel,
                items: _modes.map((m) => DropdownMenuItem(value: m, child: Text(_modeLabels[m]!, style: SimbisaText.body(14)))).toList(),
                onChanged: (v) => setState(() => _mode = v ?? _mode),
              ),
            ),
          ),
          const SizedBox(height: 20),
          NeuButton(
            width: double.infinity,
            loading: _paying,
            onTap: _payer,
            child: const Text('Confirmer le remboursement'),
          ),
        ],
      ),
    );
  }
}
