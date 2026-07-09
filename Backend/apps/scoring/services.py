import logging
from django.db import transaction
from datetime import date, timedelta
from decimal import Decimal

from .models import ScoreRegle, ScoreMobileMoney, ScoreComportemental, ScoreIA, DecisionCredit
from .engines.rules_engine import RulesEngine
from .engines.mobile_money_engine import MobileMoneyEngine
from .engines.behavioral_engine import BehavioralEngine
from .engines.ai_engine import AIEngine
from .engines.aggregator import ScoreAggregator
from apps.credits.models import DemandeCredit, Credit, Echeance

logger = logging.getLogger('scoring')


class ScoringOrchestrator:
    def __init__(self, demande: DemandeCredit):
        self.demande = demande

    def run(self) -> dict:
        logger.info(f"Démarrage scoring — demande #{self.demande.pk}")

        with transaction.atomic():
            rules_result = RulesEngine(self.demande).run()
            ScoreRegle.objects.update_or_create(
                id_demande=self.demande,
                defaults={
                    'score': Decimal(str(rules_result['score'])),
                    'resultat': rules_result['resultat'],
                    'details': rules_result.get('details', {}),
                }
            )

            if not rules_result['resultat']:
                return self._finalize_decision(
                    score_global=0.0,
                    decision='rejete',
                    recommandation_ia='rejeter',
                    motif=rules_result['motif'],
                    explication_ia='',
                    scores_detail={},
                    score_ia_obj=None,
                )

            mm_result = MobileMoneyEngine(self.demande).run()
            ScoreMobileMoney.objects.update_or_create(
                id_demande=self.demande,
                defaults={
                    'score': Decimal(str(mm_result['score'])),
                    'features_used': mm_result.get('features', {}),
                }
            )

            behav_result = BehavioralEngine(self.demande).run()
            ScoreComportemental.objects.update_or_create(
                id_demande=self.demande,
                defaults={
                    'score': Decimal(str(behav_result['score'])),
                    'features_used': behav_result.get('features', {}),
                }
            )

            ai_result = AIEngine(self.demande).run(
                mm_features=mm_result.get('features', {}),
                behavioral_features=behav_result.get('features', {}),
            )
            score_ia_obj, _ = ScoreIA.objects.update_or_create(
                id_demande=self.demande,
                defaults={
                    'probabilite_defaut': Decimal(str(ai_result['probabilite_defaut'])),
                    'niveau_risque': ai_result['niveau_risque'],
                    'score_normalise': Decimal(str(ai_result['score_normalise'])),
                    'shap_values': ai_result.get('shap_values', {}),
                    'lime_values': ai_result.get('lime_values', {}),
                    'feature_vector': ai_result.get('feature_vector', {}),
                }
            )

            aggregator = ScoreAggregator()
            aggregation = aggregator.aggregate(
                score_regles=rules_result['score'],
                score_mm=mm_result['score'],
                score_comportemental=behav_result['score'],
                score_ia=ai_result['score_normalise'],
                regles_ok=rules_result['resultat'],
                probabilite_defaut=ai_result.get('probabilite_defaut'),
                niveau_risque=ai_result.get('niveau_risque'),
            )

            explication = ''
            try:
                from apps.rag.services.generator import RAGGenerator
                explication = RAGGenerator().generate_credit_memo(
                    demande=self.demande,
                    decision=aggregation['decision'],
                    score_global=aggregation['score_global'],
                    shap_values=ai_result.get('shap_values', {}),
                    motif=aggregation['motif_decision'],
                )
            except Exception as e:
                logger.warning(f"RAG génération échouée: {e}")

            result = self._finalize_decision(
                score_global=aggregation['score_global'],
                decision=aggregation['decision'],
                recommandation_ia=aggregation.get('recommandation_ia', 'prudence'),
                motif=aggregation['motif_decision'],
                explication_ia=explication,
                scores_detail=aggregation['scores_detail'],
                score_ia_obj=score_ia_obj,
            )

            # La décision IA est toujours mise_en_attente — jamais d'approbation automatique
            self.demande.statut = 'en_analyse'
            self.demande.save(update_fields=['statut'])

            return result

    def _finalize_decision(self, score_global, decision, recommandation_ia, motif, explication_ia, scores_detail, score_ia_obj) -> dict:
        DecisionCredit.objects.update_or_create(
            id_demande=self.demande,
            defaults={
                'decision': decision,
                'recommandation_ia': recommandation_ia,
                'score_global': Decimal(str(score_global)),
                'motif': motif,
                'explication_ia': explication_ia,
                'is_automatic': True,
            }
        )

        niveau_map = {'eleve': 'eleve', 'moyen': 'moyen', 'faible': 'faible'}
        if score_ia_obj:
            from apps.scoring.client_score import score_client_agrege
            client = self.demande.id_client
            agrege = score_client_agrege(client)
            score_moyen = agrege['score_client']
            if score_moyen >= 70:
                client.niveau_risque = 'faible'
            elif score_moyen >= 50:
                client.niveau_risque = 'moyen'
            else:
                client.niveau_risque = niveau_map.get(score_ia_obj.niveau_risque, 'eleve')
            client.save(update_fields=['niveau_risque'])

        return {
            'demande_id': self.demande.pk,
            'score_global': score_global,
            'decision': decision,
            'recommandation_ia': recommandation_ia,
            'motif': motif,
            'explication_ia': explication_ia,
            'scores_detail': scores_detail,
        }

    def _create_credit(self, score_global: float):
        today = date.today()
        duree = self.demande.duree_mois

        # Taux de base selon le score
        if score_global >= 75:
            taux = Decimal('2.5')
        elif score_global >= 60:
            taux = Decimal('3.0')
        else:
            taux = Decimal('3.5')

        # Remise de fidélité selon le niveau de compte
        _remises = {'pro': Decimal('0.25'), 'pro_plus': Decimal('0.5'), 'premium': Decimal('0.75')}
        niveau = self.demande.id_client.niveau_compte
        taux = max(Decimal('1.5'), taux - _remises.get(niveau, Decimal('0')))

        credit = Credit.objects.create(
            id_demande=self.demande,
            montant_accorde=self.demande.montant_demande,
            taux_interet=taux,
            date_debut=today,
            date_fin=today + timedelta(days=30 * duree),
        )

        mensualite = credit.mensualite
        for i in range(1, duree + 1):
            Echeance.objects.create(
                id_credit=credit,
                montant=mensualite,
                date_echeance=today + timedelta(days=30 * i),
            )

        from apps.core.currency import symbole
        sym = symbole(self.demande.devise)
        logger.info(
            f"Crédit #{credit.pk} créé — {sym}{credit.montant_accorde} {self.demande.devise} @ {taux}%/mois"
        )
        return credit
