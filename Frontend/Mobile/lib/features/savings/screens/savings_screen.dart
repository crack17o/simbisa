import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:simbisa/core/i18n/translations.dart';
import 'package:simbisa/core/models/savings_models.dart';
import 'package:simbisa/core/providers/lang_provider.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/savings_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/formatters.dart';

// Formule commune : progression + ambition + périodicité → 0-20 pts estimés
double _savingsScoreEstimate(double montant, String periodicite, double solde) {
  if (montant <= 0) return 0;
  final ambition = (montant / 300 * 12).clamp(0.0, 12.0);
  final peri = periodicite == 'mensuel' ? 5.0 : 2.0;
  final progress = (solde / montant).clamp(0.0, 1.0) * 3;
  return ambition + peri + progress;
}

class SavingsScreen extends ConsumerStatefulWidget {
  const SavingsScreen({super.key});

  @override
  ConsumerState<SavingsScreen> createState() => _SavingsScreenState();
}

class _SavingsScreenState extends ConsumerState<SavingsScreen> {
  final _amountCtrl = TextEditingController();
  final _service = SavingsService();

  bool _loading = true;
  String? _error;
  SavingsAccount? _account;
  List<SavingsOperation> _operations = [];
  bool _actionLoading = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _amountCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final account = await _service.getOrCreateUsdAccount();
      final ops = await _service.fetchOperations(account.id, limit: 12);
      if (!mounted) return;
      setState(() {
        _account = account;
        _operations = ops.reversed.toList();
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

  Future<void> _deposit() async {
    final account = _account;
    final amt = double.tryParse(_amountCtrl.text) ?? 0;
    if (account == null || amt <= 0) return;

    setState(() => _actionLoading = true);
    try {
      await _service.depot(account.id, amt);
      _amountCtrl.clear();
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: SimbisaColors.danger),
      );
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _withdraw() async {
    final account = _account;
    final amt = double.tryParse(_amountCtrl.text) ?? 0;
    if (account == null || amt <= 0) return;

    setState(() => _actionLoading = true);
    try {
      await _service.retrait(account.id, amt);
      _amountCtrl.clear();
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: SimbisaColors.danger),
      );
    } finally {
      if (mounted) setState(() => _actionLoading = false);
    }
  }

  Future<void> _showObjectifSheet() async {
    if (_account == null) return;
    final lang = ref.read(langProvider);
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: SimbisaColors.panel,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (_) => _ObjectifSheet(account: _account!, service: _service, lang: lang),
    );
    if (saved == true && mounted) await _load();
  }

  @override
  Widget build(BuildContext context) {
    final lang = ref.watch(langProvider);

    if (_loading) {
      return const Scaffold(
        backgroundColor: SimbisaColors.surface,
        body: Center(child: CircularProgressIndicator(color: SimbisaColors.or)),
      );
    }

    if (_error != null || _account == null) {
      return Scaffold(
        backgroundColor: SimbisaColors.surface,
        appBar: AppBar(title: Text(Tr.of(lang, 'sav.page_title')), backgroundColor: SimbisaColors.panel),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error ?? Tr.of(lang, 'sav.no_account'), style: SimbisaText.body(14, color: SimbisaColors.danger)),
              const SizedBox(height: 16),
              NeuButton(onTap: _load, child: Text(Tr.of(lang, 'action.retry'))),
            ],
          ),
        ),
      );
    }

    final account = _account!;
    final pct = account.percent;
    final sym = account.symbole;

    return Scaffold(
      backgroundColor: SimbisaColors.surface,
      appBar: AppBar(
        title: Text(Tr.of(lang, 'sav.page_title')),
        backgroundColor: SimbisaColors.panel,
        actions: [IconButton(icon: const Icon(Icons.refresh_rounded), onPressed: _load)],
      ),
      body: RefreshIndicator(
        color: SimbisaColors.or,
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
          child: Column(
            children: [
              _buildStats(account, lang),
              const SizedBox(height: 20),
              _buildBalanceCard(account, pct, sym, lang),
              const SizedBox(height: 20),
              _buildChart(sym, lang),
              const SizedBox(height: 20),
              _buildActions(lang),
              const SizedBox(height: 20),
              _buildScoringImpact(account, lang),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStats(SavingsAccount account, String lang) {
    final sym = account.symbole;
    final items = [
      (formatMoney(sym, account.solde), Tr.of(lang, 'sav.balance'), SimbisaColors.or),
      (account.goal > 0 ? formatMoney(sym, account.goal) : Tr.of(lang, 'sav.define_goal'), Tr.of(lang, 'sav.goal'), SimbisaColors.teal),
      ('${account.progressionPct.toStringAsFixed(0)}%', Tr.of(lang, 'sav.progress'), SimbisaColors.purple),
      (account.devise, Tr.of(lang, 'sav.currency'), SimbisaColors.blue),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 2.0,
      ),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final (val, lbl, color) = items[i];
        final card = NeuCard(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(lbl.toUpperCase(), style: SimbisaText.label(), maxLines: 1, overflow: TextOverflow.ellipsis),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(val, style: TextStyle(fontFamily: 'Sora', fontSize: 18, fontWeight: FontWeight.w800, color: color)),
              ),
            ],
          ),
        );
        // La tuile "Objectif" est éditable
        if (i == 1) {
          return GestureDetector(
            onTap: _showObjectifSheet,
            child: Stack(
              children: [
                card,
                const Positioned(
                  top: 8, right: 8,
                  child: Icon(Icons.edit_rounded, size: 12, color: SimbisaColors.muted),
                ),
              ],
            ),
          );
        }
        return card;
      },
    );
  }

  Widget _buildBalanceCard(SavingsAccount account, double pct, String sym, String lang) {
    return NeuCard(
      child: Column(
        children: [
          NeuInset(
            child: Column(
              children: [
                Text(Tr.of(lang, 'sav.current_balance_label'), style: SimbisaText.label()),
                const SizedBox(height: 8),
                GradientText(formatMoney(sym, account.solde), style: const TextStyle(fontFamily: 'Sora', fontSize: 40, fontWeight: FontWeight.w800)),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Row(children: [
                  const Icon(Icons.flag_outlined, size: 14, color: SimbisaColors.muted),
                  const SizedBox(width: 6),
                  Flexible(
                    child: Text(
                      account.objectifDescription.isNotEmpty ? account.objectifDescription : Tr.of(lang, 'sav.goal'),
                      style: SimbisaText.body(12, color: SimbisaColors.muted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 6),
                  GestureDetector(
                    onTap: _showObjectifSheet,
                    child: const Icon(Icons.edit_rounded, size: 13, color: SimbisaColors.muted),
                  ),
                ]),
              ),
              const SizedBox(width: 8),
              Text('${(pct * 100).round()}%', style: const TextStyle(fontFamily: 'Sora', fontSize: 14, fontWeight: FontWeight.w700, color: SimbisaColors.or)),
            ],
          ),
          const SizedBox(height: 10),
          NeuProgressBar(value: pct, color: SimbisaColors.or, height: 10),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(formatMoney(sym, 0), style: SimbisaText.body(11, color: SimbisaColors.muted)),
              Text(
                account.goal > 0 ? '${Tr.of(lang, 'sav.goal_prefix')} ${formatMoney(sym, account.goal)}' : Tr.of(lang, 'sav.no_goal'),
                style: SimbisaText.body(11, color: SimbisaColors.muted),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChart(String sym, String lang) {
    if (_operations.isEmpty) {
      return NeuCard(
        padding: const EdgeInsets.all(16),
        child: Text(Tr.of(lang, 'sav.no_ops'), style: SimbisaText.body(13, color: SimbisaColors.muted)),
      );
    }

    final spots = _operations.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.soldeApres)).toList();

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(Tr.of(lang, 'sav.chart_title'), style: const TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 20),
          SizedBox(
            height: 140,
            child: LineChart(LineChartData(
              gridData: const FlGridData(show: false),
              borderData: FlBorderData(show: false),
              titlesData: FlTitlesData(
                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    getTitlesWidget: (val, meta) {
                      final idx = val.round();
                      if (idx < 0 || idx >= _operations.length) return const SizedBox();
                      return Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: Text('${idx + 1}', style: SimbisaText.body(10, color: SimbisaColors.muted)),
                      );
                    },
                  ),
                ),
              ),
              lineBarsData: [
                LineChartBarData(
                  spots: spots,
                  isCurved: true,
                  color: SimbisaColors.or,
                  barWidth: 2.5,
                  dotData: const FlDotData(show: false),
                  belowBarData: BarAreaData(
                    show: true,
                    gradient: LinearGradient(
                      colors: [SimbisaColors.or.withOpacity(0.3), SimbisaColors.or.withOpacity(0)],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
              ],
            )),
          ),
        ],
      ),
    );
  }

  Widget _buildActions(String lang) {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(Tr.of(lang, 'sav.deposit_withdraw'), style: const TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 14),
          NeuTextField(
            hint: Tr.of(lang, 'sav.amount_hint'),
            prefixIcon: const Icon(Icons.attach_money_rounded),
            controller: _amountCtrl,
            keyboardType: TextInputType.number,
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(child: NeuButton(
                loading: _actionLoading,
                onTap: _deposit,
                child: Row(mainAxisAlignment: MainAxisAlignment.center, mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.add_rounded, size: 16, color: SimbisaColors.noir),
                  const SizedBox(width: 6),
                  Flexible(child: Text(Tr.of(lang, 'action.deposit'), overflow: TextOverflow.ellipsis)),
                ]),
              )),
              const SizedBox(width: 12),
              Expanded(child: NeuButton(
                gold: false,
                secondary: true,
                loading: _actionLoading,
                onTap: _withdraw,
                child: Row(mainAxisAlignment: MainAxisAlignment.center, mainAxisSize: MainAxisSize.min, children: [
                  const Icon(Icons.remove_rounded, size: 16, color: SimbisaColors.blanc),
                  const SizedBox(width: 6),
                  Flexible(child: Text(Tr.of(lang, 'action.withdraw'), overflow: TextOverflow.ellipsis)),
                ]),
              )),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScoringImpact(SavingsAccount account, String lang) {
    final contribution = _savingsScoreEstimate(account.goal, account.objectifPeriodicite, account.solde).round();
    final label = account.objectifPeriodicite == 'mensuel' ? Tr.of(lang, 'sav.monthly') : Tr.of(lang, 'sav.annual');

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(Tr.of(lang, 'sav.score_impact'), style: const TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
              ),
              GestureDetector(
                onTap: _showObjectifSheet,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: SimbisaColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: SimbisaColors.or.withOpacity(0.3)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.tune_rounded, size: 11, color: SimbisaColors.or),
                      const SizedBox(width: 4),
                      Text(label, style: const TextStyle(fontFamily: 'Sora', fontSize: 10, fontWeight: FontWeight.w600, color: SimbisaColors.or)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          NeuInset(
            padding: const EdgeInsets.all(14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(Tr.of(lang, 'sav.estimated_contrib'), style: SimbisaText.label()),
                    const SizedBox(height: 6),
                    GradientText('+$contribution pts', style: const TextStyle(fontFamily: 'Sora', fontSize: 28, fontWeight: FontWeight.w800)),
                  ],
                ),
                const Icon(Icons.trending_up_rounded, color: SimbisaColors.teal, size: 32),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Text(
            '${Tr.of(lang, 'sav.goal_progress')} ${account.progressionPct.toStringAsFixed(0)}%  ·  ${Tr.of(lang, 'sav.score_hint')}',
            style: SimbisaText.body(12, color: SimbisaColors.muted),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom sheet : éditeur d'objectif
// ─────────────────────────────────────────────────────────────────────────────

class _ObjectifSheet extends StatefulWidget {
  final SavingsAccount account;
  final SavingsService service;
  final String lang;

  const _ObjectifSheet({required this.account, required this.service, required this.lang});

  @override
  State<_ObjectifSheet> createState() => _ObjectifSheetState();
}

class _ObjectifSheetState extends State<_ObjectifSheet> {
  late final TextEditingController _montantCtrl;
  late final TextEditingController _descCtrl;
  late String _periodicite;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final account = widget.account;
    _montantCtrl = TextEditingController(
      text: account.goal > 0 ? account.goal.toStringAsFixed(0) : '',
    );
    _descCtrl = TextEditingController(text: account.objectifDescription);
    _periodicite = account.objectifPeriodicite.isEmpty ? 'mensuel' : account.objectifPeriodicite;
    _montantCtrl.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _montantCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final goal = double.tryParse(_montantCtrl.text);
    if (goal == null || goal <= 0) return;
    setState(() => _saving = true);
    try {
      await widget.service.updateObjectif(
        widget.account.id,
        objectifMontant: goal,
        objectifDescription: _descCtrl.text.trim(),
        objectifPeriodicite: _periodicite,
      );
      if (mounted) Navigator.pop(context, true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.message), backgroundColor: SimbisaColors.danger),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final account = widget.account;
    final newGoal = double.tryParse(_montantCtrl.text) ?? 0;
    final oldScore = _savingsScoreEstimate(account.goal, account.objectifPeriodicite, account.solde);
    final newScore = _savingsScoreEstimate(newGoal, _periodicite, account.solde);
    final delta = newScore - oldScore;

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
        left: 20, right: 20, top: 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // En-tête
          Row(
            children: [
              const Icon(Icons.flag_rounded, color: SimbisaColors.or, size: 20),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  Tr.of(widget.lang, 'sav.objectif_title'),
                  style: const TextStyle(fontFamily: 'Sora', fontSize: 16, fontWeight: FontWeight.w700, color: SimbisaColors.blanc),
                ),
              ),
              IconButton(
                icon: const Icon(Icons.close_rounded, color: SimbisaColors.muted),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Montant cible
          NeuTextField(
            hint: Tr.of(widget.lang, 'sav.target_amount'),
            controller: _montantCtrl,
            keyboardType: TextInputType.number,
            prefixIcon: const Icon(Icons.attach_money_rounded),
          ),
          const SizedBox(height: 12),

          NeuTextField(
            hint: Tr.of(widget.lang, 'sav.desc_hint'),
            controller: _descCtrl,
            prefixIcon: const Icon(Icons.label_outline_rounded),
          ),
          const SizedBox(height: 16),

          Text(Tr.of(widget.lang, 'sav.periodicity'), style: SimbisaText.label()),
          const SizedBox(height: 8),
          Row(
            children: [
              _PeriodiciteChip(
                label: Tr.of(widget.lang, 'sav.monthly'),
                selected: _periodicite == 'mensuel',
                onTap: () => setState(() => _periodicite = 'mensuel'),
              ),
              const SizedBox(width: 8),
              _PeriodiciteChip(
                label: Tr.of(widget.lang, 'sav.annual'),
                selected: _periodicite == 'annuel',
                onTap: () => setState(() => _periodicite = 'annuel'),
              ),
            ],
          ),
          const SizedBox(height: 16),

          NeuInset(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(Tr.of(widget.lang, 'sav.score_preview'), style: SimbisaText.label()),
                    const SizedBox(height: 6),
                    Text(
                      newGoal <= 0
                          ? '— pts'
                          : '${delta >= 0 ? '+' : ''}${delta.toStringAsFixed(1)} pts',
                      style: TextStyle(
                        fontFamily: 'Sora',
                        fontSize: 26,
                        fontWeight: FontWeight.w800,
                        color: newGoal <= 0
                            ? SimbisaColors.muted
                            : (delta >= 0 ? SimbisaColors.teal : SimbisaColors.danger),
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Icon(
                  newGoal <= 0
                      ? Icons.trending_flat_rounded
                      : (delta >= 0 ? Icons.trending_up_rounded : Icons.trending_down_rounded),
                  color: newGoal <= 0
                      ? SimbisaColors.muted
                      : (delta >= 0 ? SimbisaColors.teal : SimbisaColors.danger),
                  size: 32,
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            child: NeuButton(
              loading: _saving,
              onTap: _save,
              child: Text(Tr.of(widget.lang, 'action.save')),
            ),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────

class _PeriodiciteChip extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _PeriodiciteChip({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(vertical: 13),
          decoration: BoxDecoration(
            color: selected ? SimbisaColors.or : SimbisaColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: selected ? SimbisaColors.or : SimbisaColors.panel),
          ),
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontFamily: 'Sora',
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: selected ? SimbisaColors.noir : SimbisaColors.muted,
            ),
          ),
        ),
      ),
    );
  }
}
