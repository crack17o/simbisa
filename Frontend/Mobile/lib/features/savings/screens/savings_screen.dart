import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:simbisa/core/models/savings_models.dart';
import 'package:simbisa/core/services/api_client.dart';
import 'package:simbisa/core/services/savings_service.dart';
import 'package:simbisa/core/theme/app_theme.dart';
import 'package:simbisa/core/theme/widgets.dart';
import 'package:simbisa/core/utils/formatters.dart';

class SavingsScreen extends StatefulWidget {
  const SavingsScreen({super.key});

  @override
  State<SavingsScreen> createState() => _SavingsScreenState();
}

class _SavingsScreenState extends State<SavingsScreen> {
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

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(
        backgroundColor: SimbisaColors.surface,
        body: Center(child: CircularProgressIndicator(color: SimbisaColors.or)),
      );
    }

    if (_error != null || _account == null) {
      return Scaffold(
        backgroundColor: SimbisaColors.surface,
        appBar: AppBar(title: const Text('Épargne virtuelle'), backgroundColor: SimbisaColors.panel),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error ?? 'Compte indisponible', style: SimbisaText.body(14, color: SimbisaColors.danger)),
              const SizedBox(height: 16),
              NeuButton(onTap: _load, child: const Text('Réessayer')),
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
        title: const Text('Épargne virtuelle'),
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
              _buildStats(account),
              const SizedBox(height: 20),
              _buildBalanceCard(account, pct, sym),
              const SizedBox(height: 20),
              _buildChart(sym),
              const SizedBox(height: 20),
              _buildActions(),
              const SizedBox(height: 20),
              _buildScoringImpact(account),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStats(SavingsAccount account) {
    final sym = account.symbole;
    final items = [
      (formatMoney(sym, account.solde), 'Solde actuel', SimbisaColors.or),
      (account.goal > 0 ? formatMoney(sym, account.goal) : '—', 'Objectif', SimbisaColors.teal),
      ('${account.progressionPct.toStringAsFixed(0)}%', 'Progression', SimbisaColors.purple),
      (account.devise, 'Devise', SimbisaColors.blue),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 2.0),
      itemCount: items.length,
      itemBuilder: (_, i) {
        final (val, lbl, color) = items[i];
        return NeuCard(
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
      },
    );
  }

  Widget _buildBalanceCard(SavingsAccount account, double pct, String sym) {
    return NeuCard(
      child: Column(
        children: [
          NeuInset(
            child: Column(
              children: [
                Text('SOLDE ACTUEL', style: SimbisaText.label()),
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
                      account.objectifDescription.isNotEmpty ? account.objectifDescription : 'Objectif épargne',
                      style: SimbisaText.body(12, color: SimbisaColors.muted),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
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
                account.goal > 0 ? 'Objectif: ${formatMoney(sym, account.goal)}' : 'Pas d\'objectif défini',
                style: SimbisaText.body(11, color: SimbisaColors.muted),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildChart(String sym) {
    if (_operations.isEmpty) {
      return NeuCard(
        padding: const EdgeInsets.all(16),
        child: Text('Aucune opération pour le graphique.', style: SimbisaText.body(13, color: SimbisaColors.muted)),
      );
    }

    final spots = _operations.asMap().entries.map((e) => FlSpot(e.key.toDouble(), e.value.soldeApres)).toList();

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Évolution du solde', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
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

  Widget _buildActions() {
    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Déposer / Retirer', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 14),
          NeuTextField(
            hint: 'Montant (USD)',
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
                child: const Row(mainAxisAlignment: MainAxisAlignment.center, mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.add_rounded, size: 16, color: SimbisaColors.noir),
                  SizedBox(width: 6),
                  Flexible(child: Text('Déposer', overflow: TextOverflow.ellipsis)),
                ]),
              )),
              const SizedBox(width: 12),
              Expanded(child: NeuButton(
                gold: false,
                secondary: true,
                loading: _actionLoading,
                onTap: _withdraw,
                child: const Row(mainAxisAlignment: MainAxisAlignment.center, mainAxisSize: MainAxisSize.min, children: [
                  Icon(Icons.remove_rounded, size: 16, color: SimbisaColors.blanc),
                  SizedBox(width: 6),
                  Flexible(child: Text('Retirer', overflow: TextOverflow.ellipsis)),
                ]),
              )),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildScoringImpact(SavingsAccount account) {
    final contribution = (account.progressionPct / 100 * 20).round();

    return NeuCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Impact sur le scoring', style: TextStyle(fontFamily: 'Sora', fontSize: 15, fontWeight: FontWeight.w700, color: SimbisaColors.blanc)),
          const SizedBox(height: 14),
          NeuInset(
            padding: const EdgeInsets.all(14),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('CONTRIBUTION ESTIMÉE', style: SimbisaText.label()),
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
            'Objectif atteint à ${account.progressionPct.toStringAsFixed(0)}%',
            style: SimbisaText.body(12, color: SimbisaColors.muted),
          ),
        ],
      ),
    );
  }
}
