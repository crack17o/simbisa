import logging
from django.conf import settings

logger = logging.getLogger('scoring')


class ScoreAggregator:
    # Barème de recommandation (score sur 100) — la décision finale appartient TOUJOURS à l'agent
    # - [60..100] : recommandation IA "approuver"
    # - [40..60[  : zone grise, validation agent requise
    # - <40       : recommandation IA "rejeter" (risque élevé)
    SEUIL_RECOMMANDATION_APPROBATION = 60.0
    SEUIL_REVUE_AGENT = 40.0

    def __init__(self):
        self.weights = settings.SCORING_WEIGHTS

    def aggregate(
        self,
        score_regles: float,
        score_mm: float,
        score_comportemental: float,
        score_ia: float,
        regles_ok: bool,
        *,
        probabilite_defaut: float | None = None,
        niveau_risque: str | None = None,
    ) -> dict:
        if not regles_ok:
            return {
                'score_global': 0.0,
                'decision': 'rejete',
                'motif_decision': "Critères d'éligibilité non remplis (règles bancaires).",
                'confidence': 'high',
            }

        score_global = (
            score_regles * self.weights['regles'] +
            score_mm * self.weights['mobile_money'] +
            score_comportemental * self.weights['comportemental'] +
            score_ia * self.weights['ia']
        )
        score_global = round(score_global, 2)

        # La décision IA est toujours mise_en_attente — seul l'agent peut approuver
        decision = 'mise_en_attente'

        if score_global >= self.SEUIL_RECOMMANDATION_APPROBATION:
            recommandation_ia = 'approuver'
            motif = (
                f"Score global {score_global}/100 — le modèle recommande d'approuver "
                f"(seuil : {self.SEUIL_RECOMMANDATION_APPROBATION}). "
                f"La décision finale appartient à l'agent."
            )
        elif score_global >= self.SEUIL_REVUE_AGENT:
            recommandation_ia = 'prudence'
            motif = f"Score global {score_global}/100 — zone grise, analyse approfondie recommandée avant toute décision."
        else:
            recommandation_ia = 'rejeter'
            risk_hint = []
            if probabilite_defaut is not None:
                risk_hint.append(f"probabilité de défaut estimée : {round(probabilite_defaut * 100, 1)}%")
            if niveau_risque:
                risk_hint.append(f"niveau de risque IA : {niveau_risque}")
            suffix = f" ({', '.join(risk_hint)})" if risk_hint else ""
            motif = (
                f"Score global {score_global}/100 — le modèle déconseille fortement ce prêt.{suffix} "
                f"La décision finale appartient à l'agent."
            )

        logger.info(f"Agrégation — score_global={score_global}, recommandation_ia={recommandation_ia}")

        return {
            'score_global': score_global,
            'decision': decision,
            'recommandation_ia': recommandation_ia,
            'motif_decision': motif,
            'confidence': 'high' if score_global > 80 or score_global < 40 else 'medium',
            'requires_agent_validation': True,
            'dangerous_if_approved': score_global < self.SEUIL_REVUE_AGENT,
            'scores_detail': {
                'regles': score_regles,
                'mobile_money': score_mm,
                'comportemental': score_comportemental,
                'ia': score_ia,
            },
        }
