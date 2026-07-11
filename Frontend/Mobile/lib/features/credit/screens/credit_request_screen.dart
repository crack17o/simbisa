import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/client_service.dart';
import 'package:simbisa/core/services/credit_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';


const _levelMax = {
  'standard': 300.0,
  'pro':      700.0,
  'pro_plus': 1200.0,
  'premium':  2500.0,
};

const _levelMaxMonths = {
  'standard': 6,
  'pro':      12,
  'pro_plus': 12,
  'premium':  12,
};

class CreditRequestScreen extends StatefulWidget {
  const CreditRequestScreen({super.key});

  @override
  State<CreditRequestScreen> createState() => _CreditRequestScreenState();
}

class _CreditRequestScreenState extends State<CreditRequestScreen> {
  final _amountCtrl = TextEditingController();
  final _service = CreditService();
  final _clientService = ClientService();
  int _duree = 3;
  String? _motif;
  bool _loading = false;
  String? _error;
  double _maxAmount = 1500;
  int _maxMonths = 12;
  String? _niveauCompte;

  @override
  void initState() {
    super.initState();
    _loadAccountLevel();
  }

  Future<void> _loadAccountLevel() async {
    try {
      final profile = await _clientService.fetchProfile();
      final level = profile.niveauCompte;
      if (!mounted) return;
      setState(() {
        _niveauCompte = level;
        _maxAmount = _levelMax[level] ?? 1500;
        _maxMonths = _levelMaxMonths[level] ?? 12;
        if (_duree > _maxMonths) _duree = _maxMonths;
      });
    } catch (_) {}
  }

  final _motifs = [
    'Achat de stock commercial',
    'Équipement professionnel',
    'Frais de scolarité',
    'Fonds de roulement',
    'Autre',
  ];

  double get _mensualite {
    final amount = double.tryParse(_amountCtrl.text) ?? 0;
    if (amount == 0 || _duree == 0) return 0;
    return (amount * 1.03) / _duree;
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountCtrl.text) ?? 0;
    if (amount < 50 || amount > _maxAmount || _motif == null) {
      setState(() => _error = 'Montant (50–${_maxAmount.toStringAsFixed(0)} USD) et motif requis.');
      return;
    }

    setState(() { _loading = true; _error = null; });

    try {
      final result = await _service.submitRequest(
        montant: amount,
        dureeMois: _duree,
        motif: _motif!,
      );
      if (!mounted) return;

      final String toastMsg;
      if (result.timedOut) {
        toastMsg = 'Demande enregistrée. Consultez « Mes crédits » sous peu.';
      } else if (result.isApproved) {
        toastMsg = 'Crédit approuvé ! Consultez « Mes crédits ».';
      } else if (result.isRejected) {
        toastMsg = 'Demande rejetée. Consultez « Mon score & IA » pour plus de détails.';
      } else {
        toastMsg = 'Demande soumise. Un agent va analyser votre dossier.';
      }

      final bool isSuccess = result.isApproved || result.isPending || result.timedOut;

      _amountCtrl.clear();
      setState(() { _duree = 3; _motif = null; _error = null; _loading = false; });

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
                decoration: BoxDecoration(
                  color: (isSuccess ? SimbisaColors.success : SimbisaColors.warning).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  isSuccess ? Icons.check_circle_rounded : Icons.warning_amber_rounded,
                  color: isSuccess ? SimbisaColors.success : SimbisaColors.warning,
                  size: 38,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                isSuccess ? 'Demande soumise' : 'Demande rejetée',
                style: const TextStyle(fontFamily: 'Sora', fontSize: 17, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(toastMsg, textAlign: TextAlign.center, style: SimbisaText.body(13, color: SimbisaColors.muted).copyWith(height: 1.5)),
            ],
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: [
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
      setState(() { _error = e.message; _loading = false; });
    } catch (_) {
      if (!mounted) return;
      setState(() { _error = 'Soumission impossible. Réessayez.'; _loading = false; });
    }
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Demande de crédit'),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildForm(),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildForm() {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Nouvelle demande de micro-crédit', style: TextStyle(fontFamily: 'Sora', fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          RichText(text: TextSpan(
            style: SimbisaText.body(13, color: SimbisaColors.muted),
            children: [
              const TextSpan(text: 'Montants entre '),
              TextSpan(text: '\$50', style: SimbisaText.body(13, color: SimbisaColors.or, weight: FontWeight.w600)),
              const TextSpan(text: ' et '),
              TextSpan(text: '\$${_maxAmount.toStringAsFixed(0)}', style: SimbisaText.body(13, color: SimbisaColors.or, weight: FontWeight.w600)),
              if (_niveauCompte != null)
                TextSpan(text: ' (niveau ${_niveauCompte!})', style: SimbisaText.body(11, color: SimbisaColors.muted)),
              const TextSpan(text: '.'),
            ],
          )),
          const SizedBox(height: 24),

          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SimbisaColors.danger.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(_error!, style: SimbisaText.body(13, color: SimbisaColors.danger)),
            ),
            const SizedBox(height: 16),
          ],

          NeuTextField(
            label: 'Montant souhaité (USD)',
            hint: 'Ex: 250',
            prefixIcon: const Icon(Icons.attach_money_rounded),
            controller: _amountCtrl,
            keyboardType: TextInputType.number,
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 20),

          Text('DURÉE DE REMBOURSEMENT', style: SimbisaText.label()),
          const SizedBox(height: 10),
          NeuInset(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('1 mois', style: SimbisaText.body(12, color: SimbisaColors.muted)),
                    Text('$_duree mois', style: const TextStyle(fontFamily: 'Sora', fontSize: 16, fontWeight: FontWeight.w700, color: SimbisaColors.orLight)),
                    Text('$_maxMonths mois', style: SimbisaText.body(12, color: SimbisaColors.muted)),
                  ],
                ),
                const SizedBox(height: 10),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: SimbisaColors.or,
                    inactiveTrackColor: isDark ? const Color(0xFF232323) : Colors.black.withValues(alpha: 0.1),
                    thumbColor: SimbisaColors.orLight,
                    overlayColor: SimbisaColors.or.withValues(alpha: 0.1),
                    trackHeight: 4,
                  ),
                  child: Slider(
                    value: _duree.clamp(1, _maxMonths).toDouble(),
                    min: 1, max: _maxMonths.toDouble(), divisions: _maxMonths - 1,
                    onChanged: (v) => setState(() => _duree = v.round()),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: ({1, 3, 6, _maxMonths}.toList()..sort()).map((v) => Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: GestureDetector(
                        onTap: () => setState(() => _duree = v),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            gradient: _duree == v ? SimbisaColors.goldGradient : null,
                            color: _duree != v ? (isDark ? SimbisaColors.panel : SimbisaLightColors.panel) : null,
                            borderRadius: BorderRadius.circular(10),
                            boxShadow: _duree == v ? NeuShadow.goldGlow() : NeuShadow.sm(),
                          ),
                          child: Center(
                            child: Text('$v m', style: SimbisaText.body(11, color: _duree == v ? SimbisaColors.noir : SimbisaColors.muted, weight: _duree == v ? FontWeight.w700 : FontWeight.w400)),
                          ),
                        ),
                      ),
                    ),
                  )).toList(),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          Text('OBJET DU CRÉDIT', style: SimbisaText.label()),
          const SizedBox(height: 10),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 8, crossAxisSpacing: 8, childAspectRatio: 2.8),
            itemCount: _motifs.length,
            itemBuilder: (_, i) {
              final m = _motifs[i];
              final sel = _motif == m;
              return GestureDetector(
                onTap: () => setState(() => _motif = m),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  decoration: BoxDecoration(
                    color: sel ? null : SimbisaColors.panel,
                    border: Border.all(color: sel ? SimbisaColors.or.withValues(alpha: 0.5) : Colors.transparent),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: sel ? NeuShadow.goldGlow() : NeuShadow.sm(),
                  ),
                  child: Text(m, style: SimbisaText.body(11, color: sel ? SimbisaColors.orLight : SimbisaColors.muted, weight: sel ? FontWeight.w600 : FontWeight.w400), overflow: TextOverflow.ellipsis),
                ),
              );
            },
          ),
          const SizedBox(height: 20),

          NeuInset(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Mensualité estimée', style: SimbisaText.body(12, color: SimbisaColors.muted)),
                const SizedBox(height: 6),
                Text(
                  _mensualite > 0 ? '≈ \$${_mensualite.toStringAsFixed(2)} / mois' : '—',
                  style: const TextStyle(fontFamily: 'Sora', fontSize: 22, fontWeight: FontWeight.w700, color: SimbisaColors.orLight),
                ),
                const SizedBox(height: 2),
                Text('Taux indicatif: 3% / mois', style: SimbisaText.body(11, color: SimbisaColors.muted)),
              ],
            ),
          ),
          const SizedBox(height: 24),

          NeuButton(
            width: double.infinity,
            loading: _loading,
            onTap: _submit,
            child: Text(_loading ? 'Analyse en cours…' : 'Soumettre la demande'),
          ),
        ],
      ),
    );
  }

}
