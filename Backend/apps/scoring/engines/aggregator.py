import logging
from django.conf import settings

logger = logging.getLogger('scoring')


class ScoreAggregator:
    # Barème décisionnel (score sur 100)
    # - [60..100] : approuvé automatiquement
    # - [40..60[  : revue/validation agent requise
    # - <40       : revue agent requise + alerte "dangereux"
    SEUIL_AUTO_APPROBATION = 60.0
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

        # Décision selon les seuils demandés
        if score_global >= self.SEUIL_AUTO_APPROBATION:
            decision = 'approuve'
            motif = (
                f"Score global {score_global}/100 — validation automatique "
                f"(seuil : {self.SEUIL_AUTO_APPROBATION})."
            )
        else:
            decision = 'mise_en_attente'
            if score_global >= self.SEUIL_REVUE_AGENT:
                motif = f"Score global {score_global}/100 — validation de l'agent requise (zone grise)."
            else:
                risk_hint = []
                if probabilite_defaut is not None:
                    risk_hint.append(f"probabilité de défaut estimée : {round(probabilite_defaut * 100, 1)}%")
                if niveau_risque:
                    risk_hint.append(f"niveau de risque IA : {niveau_risque}")
                suffix = f" ({', '.join(risk_hint)})" if risk_hint else ""
                motif = (
                    f"Score global {score_global}/100 — validation agent requise : ACCORDER CE PRÊT EST DANGEREUX."
                    f"{suffix}"
                )

        logger.info(f"Agrégation — score_global={score_global}, decision={decision}")

        return {
            'score_global': score_global,
            'decision': decision,
            'motif_decision': motif,
            'confidence': 'high' if score_global > 80 or score_global < 40 else 'medium',
            'requires_agent_validation': score_global < self.SEUIL_AUTO_APPROBATION,
            'dangerous_if_approved': score_global < self.SEUIL_REVUE_AGENT,
            'scores_detail': {
                'regles': score_regles,
                'mobile_money': score_mm,
                'comportemental': score_comportemental,
                'ia': score_ia,
            },
        }
