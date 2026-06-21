import logging

from django.conf import settings

from .llm.factory import get_llm_provider, llm_is_available

logger = logging.getLogger('apps.rag')


class RAGGenerator:
    def __init__(self, llm_provider=None):
        self._llm_provider = llm_provider

    @property
    def llm(self):
        if self._llm_provider is None:
            self._llm_provider = get_llm_provider()
        return self._llm_provider

    def generate_credit_memo(
        self,
        demande,
        decision: str,
        score_global: float,
        shap_values: dict,
        motif: str,
    ) -> str:
        context = self._retrieve_context(decision, score_global)
        top_shap = self._format_shap_top5(shap_values)
        client = demande.id_client

        if llm_is_available():
            return self._generate_with_llm(
                demande=demande,
                client=client,
                decision=decision,
                score_global=score_global,
                motif=motif,
                context=context,
                top_shap=top_shap,
            )
        return self._generate_template(
            demande=demande,
            client=client,
            decision=decision,
            score_global=score_global,
            motif=motif,
            top_shap=top_shap,
        )

    def _retrieve_context(self, decision: str, score: float) -> str:
        try:
            from .retriever import VectorRetriever
            query = f"Politique octroi micro-crédit décision {decision} score {score}"
            docs = VectorRetriever().retrieve(query, k=settings.RAG_RETRIEVAL_K)
            return "\n\n".join(docs) if docs else self._fallback_context()
        except Exception as e:
            logger.warning(f"Retrieval échoué: {e}")
            return self._fallback_context()

    def _fallback_context(self) -> str:
        return """
        POLITIQUE RAWBANK — MICRO-CRÉDIT (v4.2, 2025)
        - Plage de montant : 50 à 1 500 USD
        - Durée : 1 à 12 mois
        - Taux nominal mensuel : 2.5% (score ≥ 75) / 3.0% (score 60-74) / 3.5% (score < 60)
        - Seuil d'approbation automatique : score global ≥ 60/100
        - Zone grise (validation agent) : score entre 40 et 60
        - Score < 40 : validation agent requise — risque élevé
        - KYC obligatoire avant tout décaissement
        - Critères d'exclusion : défaut actif, crédit en cours, KYC invalide, âge hors plage
        - Conformité BCC : directives circulaire N°04/2023
        """

    def _build_system_prompt(self, context: str) -> str:
        return f"""Tu es un analyste de crédit expert de la Rawbank (RDC).
Tu dois rédiger un mémo de décision de crédit EXCLUSIVEMENT à partir des données fournies.
Ne pas inventer de chiffres, de noms ou de politiques non mentionnés dans le contexte.
Langue : Français. Ton : professionnel, clair et factuel.

CONTEXTE RÉGLEMENTAIRE RAWBANK :
{context}"""

    def _build_user_prompt(self, **kwargs) -> str:
        return f"""Rédigez le mémo de crédit pour la demande suivante :

CLIENT : {kwargs['client'].id_utilisateur.full_name}
DEMANDE : #{kwargs['demande'].pk}
MONTANT DEMANDÉ : {kwargs['demande'].montant_demande} {kwargs['demande'].devise}
DURÉE : {kwargs['demande'].duree_mois} mois
MOTIF : {kwargs['demande'].motif or 'Non précisé'}
DATE : {kwargs['demande'].date_demande.strftime('%d/%m/%Y')}

RÉSULTAT DU SCORING :
• Score global : {kwargs['score_global']}/100
• Décision : {kwargs['decision'].upper()}
• Motif : {kwargs['motif']}

FACTEURS SHAP LES PLUS INFLUENTS :
{kwargs['top_shap']}

Rédigez un mémo structuré. Maximum 250 mots."""

    def _generate_with_llm(self, **kwargs) -> str:
        try:
            system_prompt = self._build_system_prompt(kwargs['context'])
            user_prompt = self._build_user_prompt(**kwargs)
            memo = self.llm.generate(system_prompt, user_prompt, max_tokens=400, temperature=0.1)
            logger.info(f"Mémo généré via {self.llm.name}")
            return memo
        except Exception as e:
            logger.error(f"LLM ({self.llm.name}) error: {e}", exc_info=True)
            return self._generate_template(**kwargs)

    def _generate_template(self, **kwargs) -> str:
        demande = kwargs['demande']
        client = kwargs['client']
        decision = kwargs['decision']
        score = kwargs['score_global']
        motif = kwargs['motif']
        top_shap = kwargs['top_shap']

        decision_label = {
            'approuve': 'APPROUVÉ',
            'rejete': 'REJETÉ',
            'mise_en_attente': 'EN ATTENTE DE REVUE',
        }.get(decision, decision.upper())

        return f"""MÉMO DE CRÉDIT — Rawbank / Simbisa FinTech
Date : {demande.date_demande.strftime('%d/%m/%Y')} | Réf. : #{demande.pk}

CLIENT : {client.id_utilisateur.full_name} | Tél. : {client.id_utilisateur.telephone}
DEMANDE : {demande.montant_demande} {demande.devise} sur {demande.duree_mois} mois
OBJET : {demande.motif or 'Non précisé'}

DÉCISION : {decision_label}
SCORE GLOBAL : {score}/100
MOTIF : {motif}

FACTEURS DÉTERMINANTS (Attributions SHAP) :
{top_shap}

Conforme aux politiques d'octroi Rawbank v4.2 et aux directives BCC circulaire N°04/2023.
Décision générée automatiquement par le système Simbisa — Moteur IA XGBoost v2 + RAG ({settings.LLM_PROVIDER})."""

    def _format_shap_top5(self, shap_values: dict) -> str:
        if not shap_values:
            return "  Analyse SHAP indisponible."
        sorted_shap = sorted(shap_values.items(), key=lambda x: abs(x[1]), reverse=True)[:5]
        lines = []
        for feat, val in sorted_shap:
            direction = "Favorable" if val > 0 else "Défavorable"
            lines.append(f"  • {feat.replace('_', ' ').title()} : {val:+.3f} ({direction})")
        return "\n".join(lines)
