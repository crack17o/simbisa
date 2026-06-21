import 'package:flutter/material.dart';
import 'package:simbisa/core/models/credit_models.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/credit_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';

class CreditRequestScreen extends StatefulWidget {
  const CreditRequestScreen({super.key});

  @override
  State<CreditRequestScreen> createState() => _CreditRequestScreenState();
}

class _CreditRequestScreenState extends State<CreditRequestScreen> {
  final _amountCtrl = TextEditingController();
  final _service = CreditService();
  int _duree = 3;
  String? _motif;
  bool _loading = false;
  String? _error;
  CreditSubmitResult? _decision;

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
    if (amount < 50 || amount > 1500 || _motif == null) {
      setState(() => _error = 'Montant (50–1500 USD) et motif requis.');
      return;
    }

    setState(() {
      _loading = true;
      _decision = null;
      _error = null;
    });

    try {
      final result = await _service.submitRequest(
        montant: amount,
        dureeMois: _duree,
        motif: _motif!,
      );
      if (!mounted) return;
      setState(() {
        _decision = result;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _error = 'Soumission impossible. Réessayez.';
        _loading = false;
      });
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
      backgroundColor: SimbisaColors.surface,
      appBar: AppBar(
        title: const Text('Demande de crédit'),
        backgroundColor: SimbisaColors.panel,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            _buildForm(),
            if (_decision != null) ...[
              const SizedBox(height: 20),
              _buildDecisionBanner(),
            ],
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildForm() {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Nouvelle demande de micro-crédit', style: TextStyle(fontFamily: 'Sora', fontSize: 18, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 6),
          RichText(text: TextSpan(
            style: SimbisaText.body(13, color: SimbisaColors.muted),
            children: [
              const TextSpan(text: 'Montants entre '),
              TextSpan(text: '\$50', style: SimbisaText.body(13, color: SimbisaColors.or, weight: FontWeight.w600)),
              const TextSpan(text: ' et '),
              TextSpan(text: '\$1 500', style: SimbisaText.body(13, color: SimbisaColors.or, weight: FontWeight.w600)),
              const TextSpan(text: '. Décision automatique après analyse.'),
            ],
          )),
          const SizedBox(height: 24),

          if (_error != null) ...[
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: SimbisaColors.danger.withOpacity(0.1),
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
                    Text('12 mois', style: SimbisaText.body(12, color: SimbisaColors.muted)),
                  ],
                ),
                const SizedBox(height: 10),
                SliderTheme(
                  data: SliderTheme.of(context).copyWith(
                    activeTrackColor: SimbisaColors.or,
                    inactiveTrackColor: const Color(0xFF232323),
                    thumbColor: SimbisaColors.orLight,
                    overlayColor: SimbisaColors.or.withOpacity(0.1),
                    trackHeight: 4,
                  ),
                  child: Slider(
                    value: _duree.toDouble(),
                    min: 1, max: 12, divisions: 11,
                    onChanged: (v) => setState(() => _duree = v.round()),
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [1, 3, 6, 12].map((v) => Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 3),
                      child: GestureDetector(
                        onTap: () => setState(() => _duree = v),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          decoration: BoxDecoration(
                            gradient: _duree == v ? SimbisaColors.goldGradient : null,
                            color: _duree != v ? SimbisaColors.panel : null,
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
                    border: Border.all(color: sel ? SimbisaColors.or.withOpacity(0.5) : Colors.transparent),
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

  Widget _buildDecisionBanner() {
    final d = _decision!;
    final amount = double.tryParse(_amountCtrl.text) ?? 0;

    if (d.timedOut) {
      return NeuCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Demande enregistrée', style: TextStyle(fontFamily: 'Sora', fontSize: 18, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
            const SizedBox(height: 8),
            Text(
              'L\'analyse prend plus de temps que prévu. Consultez « Mes crédits » dans quelques instants.',
              style: SimbisaText.body(13, color: SimbisaColors.muted),
            ),
          ],
        ),
      );
    }

    final isApproved = d.isApproved;
    final isRejected = d.isRejected;
    final isPending = d.isPending;
    final color = isApproved
        ? SimbisaColors.success
        : isRejected
            ? SimbisaColors.danger
            : SimbisaColors.warning;
    final title = isApproved
        ? 'Crédit approuvé'
        : isRejected
            ? 'Demande rejetée'
            : 'En attente de validation';

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                isApproved
                    ? Icons.check_circle_rounded
                    : isRejected
                        ? Icons.cancel_rounded
                        : Icons.hourglass_top_rounded,
                color: color,
                size: 28,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontFamily: 'Sora', fontSize: 18, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
                    Text('\$${amount.toStringAsFixed(0)} · $_duree mois', style: SimbisaText.body(12, color: SimbisaColors.muted)),
                  ],
                ),
              ),
              StatusBadge.fromStatus(d.decision ?? d.statut),
            ],
          ),
          if (d.motif != null && d.motif!.isNotEmpty) ...[
            const SizedBox(height: 16),
            NeuInset(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('MOTIF', style: SimbisaText.label()),
                  const SizedBox(height: 6),
                  Text(d.motif!, style: SimbisaText.body(13)),
                ],
              ),
            ),
          ],
          if (d.explicationIa != null && d.explicationIa!.isNotEmpty) ...[
            const SizedBox(height: 12),
            NeuInset(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.auto_awesome_rounded, color: SimbisaColors.orLight, size: 14),
                      const SizedBox(width: 6),
                      Text('ANALYSE IA (RAG)', style: SimbisaText.label(color: SimbisaColors.orLight)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(d.explicationIa!, style: SimbisaText.body(12, color: SimbisaColors.blanc.withOpacity(0.8)).copyWith(height: 1.6)),
                ],
              ),
            ),
          ],
          if (isPending) ...[
            const SizedBox(height: 12),
            Text('Un agent Rawbank validera votre dossier sous peu.', style: SimbisaText.body(12, color: SimbisaColors.muted)),
          ],
        ],
      ),
    );
  }
}
