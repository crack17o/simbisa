"""Sérialisation commune des demandes de crédit (agent / manager)."""
from apps.core.currency import symbole
from apps.credits.services import is_demande_sensible


def _client_name(client) -> str:
    u = client.id_utilisateur
    return u.full_name if u else f'Client #{client.pk}'


def _demande_score(demande) -> float | None:
    if hasattr(demande, 'decision') and demande.decision:
        return float(demande.decision.score_global)
    if hasattr(demande, 'score_ia') and demande.score_ia:
        return float(demande.score_ia.score_normalise)
    return None


def _demande_risque(demande) -> str:
    if hasattr(demande, 'score_ia') and demande.score_ia:
        return demande.score_ia.niveau_risque
    return 'non_evalue'


def _motif_sensible(demande) -> str:
    from apps.core.currency import USD
    from apps.core.exchange_rate import get_cdf_per_usd

    montant_usd = float(demande.montant_demande)
    if demande.devise != USD:
        montant_usd = montant_usd / get_cdf_per_usd()

    motifs = []
    if montant_usd >= 800:
        motifs.append('Montant élevé')
    if hasattr(demande, 'score_ia') and demande.score_ia.niveau_risque == 'eleve':
        motifs.append('Risque IA élevé')
    if hasattr(demande, 'decision') and demande.decision:
        score = float(demande.decision.score_global)
        if score < 40:
            motifs.append('Score très faible (dangereux)')
        elif score < 60:
            motifs.append('Score en zone grise (validation requise)')
    return ' + '.join(motifs) if motifs else 'Dossier sensible'


def _demande_ia_fields(demande) -> dict:
    if hasattr(demande, 'decision') and demande.decision:
        d = demande.decision
        return {
            'recommandation_ia': getattr(d, 'recommandation_ia', None),
            'explication_ia': getattr(d, 'explication_ia', '') or '',
        }
    return {'recommandation_ia': None, 'explication_ia': ''}


def serialize_demande(demande, include_sensible_motif: bool = False) -> dict:
    client = demande.id_client
    ia = _demande_ia_fields(demande)
    item = {
        'demande_id': demande.pk,
        'ref': f'#CR-{demande.pk:03d}',
        'client_id': client.pk,
        'client': _client_name(client),
        'devise': demande.devise,
        'symbole': symbole(demande.devise),
        'montant_demande': str(demande.montant_demande),
        'duree_mois': demande.duree_mois,
        'motif': demande.motif,
        'statut': demande.statut,
        'date_demande': demande.date_demande,
        'score': _demande_score(demande),
        'risque': _demande_risque(demande),
        'sensible': is_demande_sensible(demande),
        'recommandation_ia': ia['recommandation_ia'],
        'explication_ia': ia['explication_ia'],
    }
    if include_sensible_motif and item['sensible']:
        item['motif_sensible'] = _motif_sensible(demande)
    return item
