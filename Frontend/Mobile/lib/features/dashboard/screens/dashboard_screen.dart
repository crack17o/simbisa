import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:simbisa/core/constants/routes.dart';
import 'package:simbisa/core/models/credit_models.dart';
import 'package:simbisa/core/models/savings_models.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/client_service.dart';
import 'package:simbisa/core/services/credit_service.dart';
import 'package:simbisa/core/services/savings_service.dart';
import 'package:simbisa/core/services/scoring_service.dart';
import 'package:simbisa/core/services/session.dart';
import 'package:simbisa/core/utils/mobile_money_operator.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/formatters.dart';
import 'package:simbisa/features/credit/screens/my_credits_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _clientService = ClientService();
  final _creditService = CreditService();
  final _savingsService = SavingsService();
  final _scoringService = ScoringService();

  bool _loading = true;
  String? _error;
  String _displayName = '';
  bool _kycValid = false;
  int _score = 0;
  String _riskLevel = '—';
  SavingsAccount? _savings;
  List<CreditDemandeItem> _credits = [];
  CreditDemandeItem? _activeCredit;

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
      final scoreData = await _scoringService.fetchMyScore();
      final profile = await _clientService.fetchProfile(scoreClient: scoreData.scoreClient);
      final credits = await _creditService.fetchMyCredits();
      SavingsAccount? savings;
      try {
        savings = await _savingsService.getOrCreateUsdAccount();
      } catch (_) {
        final accounts = await _savingsService.fetchAccounts(devise: 'USD');
        savings = accounts.isNotEmpty ? accounts.first : null;
      }

      CreditDemandeItem? active;
      for (final c in credits) {
        if (c.credit?.statut == 'en_cours') {
          active = c;
          break;
        }
      }

      if (!mounted) return;
      setState(() {
        _displayName = profile.fullName.isNotEmpty
            ? profile.fullName
            : (Session.current?.fullName ?? 'Client');
        _kycValid = profile.kycValid;
        _score = scoreData.scoreClient.round();
        _riskLevel = riskLabel(scoreData.niveauRisque ?? profile.niveauRisque);
        _savings = savings;
        _credits = credits;
        _activeCredit = active;
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
        _error = 'Impossible de charger le tableau de bord.';
        _loading = false;
      });
    }
  }

  Future<void> _payNextInstallment() async {
    final active = _activeCredit;
    if (active?.credit == null) return;

    final credit = active!.credit!;
    final sym = active.symbole;
    final montant = credit.mensualite;

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: SimbisaColors.panel,
        title: const Text('Confirmer le paiement'),
        content: Text('Rembourser ${formatMoney(sym, montant, decimals: 2)} ?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Annuler')),
          TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Payer')),
        ],
      ),
    );
    if (confirm != true) return;

    try {
      await _creditService.rembourser(creditId: credit.id, montant: montant);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Remboursement enregistré.')),
      );
      _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: SimbisaColors.danger),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: SimbisaColors.surface,
        body: Center(child: CircularProgressIndicator(color: SimbisaColors.or)),
      );
    }

    if (_error != null) {
      return Scaffold(
        backgroundColor: SimbisaColors.surface,
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(_error!, textAlign: TextAlign.center, style: SimbisaText.body(14, color: SimbisaColors.danger)),
                const SizedBox(height: 16),
                NeuButton(onTap: _load, child: const Text('Réessayer')),
              ],
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: SimbisaColors.surface,
      body: SafeArea(
        child: RefreshIndicator(
          color: SimbisaColors.or,
          onRefresh: _load,
          child: CustomScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            slivers: [
              SliverToBoxAdapter(child: _buildHeader(_displayName)),
              SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    _buildWelcomeBanner(),
                    const SizedBox(height: 20),
                    _buildStatsGrid(),
                    const SizedBox(height: 20),
                    if (_activeCredit != null) _buildNextRepayment(context),
                    if (_activeCredit != null) const SizedBox(height: 20),
                    SectionHeader(
                      title: 'Historique des crédits',
                      action: 'Voir tout →',
                      onAction: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const MyCreditsScreen()),
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildCreditList(context),
                    const SizedBox(height: 20),
                    _buildQuickActions(context),
                    const SizedBox(height: 32),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(String name) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 32, height: 32,
                decoration: BoxDecoration(
                  color: SimbisaColors.panel,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: NeuShadow.goldGlow(),
                ),
                child: const Center(child: Text('S', style: TextStyle(fontFamily: 'Sora', fontSize: 14, fontWeight: FontWeight.w800, color: SimbisaColors.or))),
              ),
              const SizedBox(width: 8),
              GradientText('Simbisa', style: const TextStyle(fontFamily: 'Sora', fontSize: 18, fontWeight: FontWeight.w800)),
            ],
          ),
          Row(
            children: [
              _IconButton(icon: Icons.refresh_rounded, onTap: _load),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildWelcomeBanner() {
    return NeuCard(
      gradient: SimbisaColors.cardGradient,
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Bienvenue,', style: SimbisaText.body(13, color: SimbisaColors.muted)),
                const SizedBox(height: 4),
                Text(_displayName, style: const TextStyle(fontFamily: 'Sora', fontSize: 22, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Icon(
                      _kycValid ? Icons.verified_rounded : Icons.pending_outlined,
                      size: 14,
                      color: _kycValid ? SimbisaColors.success : SimbisaColors.warning,
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        _kycValid
                            ? 'KYC validé · ${_mmLabel()}'
                            : 'KYC en attente · ${_mmLabel()}',
                        style: SimbisaText.body(11, color: _kycValid ? SimbisaColors.success : SimbisaColors.warning),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          ScoreRing(score: _score, size: 90, label: 'Mon score'),
        ],
      ),
    );
  }

  String _mmLabel() {
    final session = Session.current;
    final op = session?.mobileMoneyOperator;
    if (op != null) {
      return '${op.serviceName} (${op.label})';
    }
    return MobileMoneyOperator.describeForPhone(session?.telephone);
  }

  Widget _buildStatsGrid() {
    final savings = _savings;
    final sym = savings?.symbole ?? '\$';
    final rembourses = _credits.where((c) => c.credit?.statut == 'rembourse' || c.statut == 'cloture').length;
    final total = _credits.length;
    final active = _activeCredit;

    final stats = [
      _StatItem(
        label: 'Solde épargne',
        value: formatMoney(sym, savings?.solde ?? 0),
        sub: savings?.goal != null && savings!.goal > 0
            ? 'Objectif: ${formatMoney(sym, savings.goal)}'
            : 'Compte USD',
        icon: Icons.savings_outlined,
        color: SimbisaColors.or,
      ),
      _StatItem(
        label: 'Crédit en cours',
        value: active != null ? formatMoney(active.symbole, active.montantAffiche) : '—',
        sub: active != null ? '${active.dureeMois} mois' : 'Aucun crédit actif',
        icon: Icons.credit_card_outlined,
        color: SimbisaColors.blue,
      ),
      _StatItem(
        label: 'Score global',
        value: '$_score/100',
        sub: 'Risque ${_riskLevel.toLowerCase()}',
        icon: Icons.trending_up_rounded,
        color: SimbisaColors.teal,
      ),
      _StatItem(
        label: 'Taux remb.',
        value: total > 0 ? '${((rembourses / total) * 100).round()}%' : '—',
        sub: '$rembourses/$total crédits soldés',
        icon: Icons.check_circle_outline,
        color: SimbisaColors.purple,
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 12,
        crossAxisSpacing: 12,
        childAspectRatio: 1.4,
      ),
      itemCount: stats.length,
      itemBuilder: (_, i) => _StatCard(item: stats[i]),
    );
  }

  Widget _buildNextRepayment(BuildContext context) {
    final active = _activeCredit!;
    final credit = active.credit!;
    return NeuCard(
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: SimbisaColors.warning.withOpacity(0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.warning_amber_rounded, color: SimbisaColors.warning, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Prochain remboursement', style: SimbisaText.body(12, color: SimbisaColors.muted)),
                const SizedBox(height: 4),
                Text(
                  formatMoney(active.symbole, credit.mensualite, decimals: 2),
                  style: const TextStyle(fontFamily: 'Sora', fontSize: 22, fontWeight: FontWeight.w800, color: SimbisaColors.orLight),
                ),
                Text(
                  'Échéance ${formatDate(credit.dateFin)} · ${active.displayId}',
                  style: SimbisaText.body(11, color: SimbisaColors.muted),
                ),
              ],
            ),
          ),
          NeuButton(
            onTap: _payNextInstallment,
            child: const Text('Payer', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }

  Widget _buildCreditList(BuildContext context) {
    if (_credits.isEmpty) {
      return NeuCard(
        padding: const EdgeInsets.all(16),
        child: Text('Aucun crédit pour le moment.', style: SimbisaText.body(13, color: SimbisaColors.muted)),
      );
    }

    return Column(
      children: _credits.take(3).map((credit) {
        final statut = credit.credit?.statut ?? credit.statut;
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: NeuCard(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: SimbisaColors.or.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.credit_card_rounded, color: SimbisaColors.or, size: 16),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(credit.displayId, style: SimbisaText.body(13, weight: FontWeight.w600)),
                      Text('${credit.formattedDate} · ${credit.dureeMois} mois', style: SimbisaText.body(11, color: SimbisaColors.muted)),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      formatMoney(credit.symbole, credit.montantAffiche),
                      style: const TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc),
                    ),
                    const SizedBox(height: 4),
                    StatusBadge.fromStatus(statut),
                  ],
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    final actions = [
      (AppRoutes.creditRequest, 'Demander un crédit', Icons.credit_card_rounded, SimbisaColors.or),
      (AppRoutes.savings, 'Épargner maintenant', Icons.savings_rounded, SimbisaColors.teal),
      (AppRoutes.scoring, 'Voir mon scoring', Icons.bar_chart_rounded, SimbisaColors.purple),
      (AppRoutes.profile, 'Mon profil KYC', Icons.person_rounded, SimbisaColors.blue),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionHeader(title: 'Actions rapides'),
        const SizedBox(height: 12),
        ...actions.map((a) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: NeuCard(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            onTap: () => context.go(a.$1),
            child: Row(
              children: [
                Container(
                  width: 36, height: 36,
                  decoration: BoxDecoration(
                    color: a.$4.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(a.$3, color: a.$4, size: 18),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Text(a.$2, style: SimbisaText.body(13, weight: FontWeight.w500), maxLines: 1, overflow: TextOverflow.ellipsis),
                ),
                const Icon(Icons.chevron_right_rounded, color: SimbisaColors.muted, size: 18),
              ],
            ),
          ),
        )),
      ],
    );
  }
}

class _StatItem {
  final String label, value, sub;
  final IconData icon;
  final Color color;
  const _StatItem({required this.label, required this.value, required this.sub, required this.icon, required this.color});
}

class _StatCard extends StatelessWidget {
  final _StatItem item;
  const _StatCard({required this.item});

  @override
  Widget build(BuildContext context) {
    return NeuCard(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Flexible(child: Text(item.label, style: SimbisaText.label(), overflow: TextOverflow.ellipsis)),
              Container(
                width: 28, height: 28,
                decoration: BoxDecoration(color: item.color.withOpacity(0.12), borderRadius: BorderRadius.circular(8)),
                child: Icon(item.icon, color: item.color, size: 14),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.value, style: const TextStyle(fontFamily: 'Sora', fontSize: 18, fontWeight: FontWeight.w800, color: SimbisaColors.blanc)),
              const SizedBox(height: 2),
              Text(item.sub, style: SimbisaText.body(10, color: SimbisaColors.muted), overflow: TextOverflow.ellipsis),
            ],
          ),
        ],
      ),
    );
  }
}

class _IconButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onTap;
  const _IconButton({required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 38, height: 38,
        decoration: BoxDecoration(color: SimbisaColors.panel, borderRadius: BorderRadius.circular(12), boxShadow: NeuShadow.sm()),
        child: Icon(icon, color: SimbisaColors.muted, size: 18),
      ),
    );
  }
}
