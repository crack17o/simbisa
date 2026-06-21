"""24 communes de la ville-province de Kinshasa (RDC)."""

KINSHASA_COMMUNES = [
    ('bandalungwa', 'Bandalungwa'),
    ('barumbu', 'Barumbu'),
    ('bumbu', 'Bumbu'),
    ('gombe', 'Gombe'),
    ('kalamu', 'Kalamu'),
    ('kasa_vubu', 'Kasa-Vubu'),
    ('kimbanseke', 'Kimbanseke'),
    ('kinshasa', 'Kinshasa'),
    ('kintambo', 'Kintambo'),
    ('kisenso', 'Kisenso'),
    ('lemba', 'Lemba'),
    ('limete', 'Limete'),
    ('lingwala', 'Lingwala'),
    ('makala', 'Makala'),
    ('maluku', 'Maluku'),
    ('masina', 'Masina'),
    ('matete', 'Matete'),
    ('mont_ngafula', 'Mont-Ngafula'),
    ('ndjili', "N'djili"),
    ('ngaba', 'Ngaba'),
    ('ngaliema', 'Ngaliema'),
    ('ngiri_ngiri', 'Ngiri-Ngiri'),
    ('nsele', 'Nsele'),
    ('selembao', 'Selembao'),
]

COMMUNE_CODES = {code for code, _ in KINSHASA_COMMUNES}
COMMUNE_LABELS = dict(KINSHASA_COMMUNES)


def commune_label(code: str) -> str:
    return COMMUNE_LABELS.get(code, code or '')
