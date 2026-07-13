"""Machine à états des menus USSD Simbisa."""
from apps.ussd.msisdn import normalize_msisdn
from apps.ussd.session import UssdSessionStore
from apps.ussd import services
from apps.ussd.models import UssdProfile
from apps.core.currency import symbole, get_credit_limits, valider_montant_credit, USD, CDF


class UssdOrchestrator:
    def __init__(self, session_id: str | None = None, channel: str = 'simulator'):
        self.store = UssdSessionStore(session_id)
        self.channel = channel
        self.data = self.store.load()

    @property
    def session_id(self) -> str:
        return self.store.session_id

    def process(self, msisdn: str, user_input: str) -> dict:
        msisdn = normalize_msisdn(msisdn)
        inp = (user_input or '').strip()
        self.data['msisdn'] = msisdn

        if inp == '00':
            if self.data.get('authenticated'):
                return self._finish(self._main_menu(), end=False)
            inp = ''

        try:
            client = services.get_client_by_msisdn(msisdn)
        except services.UssdBusinessError as e:
            return self._finish(str(e.message), end=True)

        if client is None:
            return self._finish(
                'Numero non enregistre Simbisa.\nInscrivez-vous via l\'app ou agence.',
                end=True,
            )

        self.data['client_id'] = client.pk
        self.data['client_name'] = client.id_utilisateur.prenom

        state = self.data.get('state', 'INIT')

        if state == 'INIT':
            result = self._handle_init(client, inp)
        elif state == 'AUTH_PIN':
            result = self._handle_auth_pin(client, inp)
        elif state == 'MAIN':
            result = self._handle_main(client, inp)
        elif state == 'BALANCE_DEVISE':
            result = self._handle_balance_devise(client, inp)
        elif state == 'SAVINGS_PICK':
            result = self._handle_savings_pick(client, inp)
        elif state == 'CREDIT_DEVISE':
            result = self._handle_credit_devise(client, inp)
        elif state == 'CREDIT_AMOUNT':
            result = self._handle_credit_amount(client, inp)
        elif state == 'CREDIT_DURATION':
            result = self._handle_credit_duration(client, inp)
        elif state == 'CREDIT_CONFIRM':
            result = self._handle_credit_confirm(client, inp)
        else:
            result = self._finish(self._main_menu(), end=False)

        if result.get('end_session'):
            self.store.delete()
        else:
            self.store.save(self.data)
        return result

    def _handle_init(self, client, inp: str) -> dict:
        if self.data.get('authenticated'):
            self.data['state'] = 'MAIN'
            return self._finish(self._main_menu(), end=False)

        profile, _ = UssdProfile.objects.get_or_create(client=client)
        if profile.is_locked():
            return self._finish('PIN bloque 15 min. Reessayez plus tard.', end=True)

        self.data['state'] = 'AUTH_PIN'
        name = self.data.get('client_name', 'Client')
        return self._finish(
            f'SIMBISA Rawbank\nBonjour {name}.\nEntrez PIN USSD (4 chiffres):',
            end=False,
        )

    def _handle_auth_pin(self, client, inp: str) -> dict:
        if not inp or len(inp) != 4 or not inp.isdigit():
            return self._finish('PIN invalide. 4 chiffres:', end=False)

        profile = UssdProfile.objects.get(client=client)
        if profile.is_locked():
            return self._finish('Compte USSD bloque.', end=True)

        if not profile.check_pin(inp):
            profile.record_failed_pin()
            tries_left = max(0, 3 - profile.failed_pin_attempts)
            if profile.is_locked():
                return self._finish('Trop d\'echecs. Bloque 15 min.', end=True)
            return self._finish(f'PIN incorrect. Reste {tries_left} essai(s):', end=False)

        profile.reset_pin_attempts()
        self.data['authenticated'] = True
        self.data['state'] = 'MAIN'
        return self._finish(f'Connexion OK.\n{self._main_menu()}', end=False)

    def _handle_main(self, client, inp: str) -> dict:
        if inp == '0':
            self.store.delete()
            return self._finish('Merci d\'utiliser Simbisa. A bientot!', end=True)

        if inp == '1':
            self.data['state'] = 'BALANCE_DEVISE'
            return self._finish(
                'Mon compte:\n1. Solde USD\n2. Solde CDF\n0. Retour',
                end=False,
            )
        if inp == '2':
            savings = services.list_savings_summary(client)
            if not savings:
                return self._finish('Aucun compte epargne.\n0. Menu', end=False)
            self.data['ctx']['savings'] = savings
            self.data['state'] = 'SAVINGS_PICK'
            lines = ['Epargne:']
            for i, s in enumerate(savings, 1):
                lines.append(f'{i}. {s["devise"]} {s["symbole"]}{s["solde"]}')
            lines.append('0. Retour')
            return self._finish('\n'.join(lines), end=False)
        if inp == '3':
            self.data['state'] = 'CREDIT_DEVISE'
            usd = get_credit_limits(USD)
            cdf = get_credit_limits(CDF)
            return self._finish(
                f'Credit:\n1. USD ({usd["min"]}-{usd["max"]}$)\n'
                f'2. CDF ({cdf["min"]}-{cdf["max"]} FC)\n0. Retour',
                end=False,
            )
        if inp == '4':
            try:
                msg = services.format_client_score(client)
            except Exception:
                msg = 'Score indisponible.'
            return self._finish(f'{msg}\n0. Menu', end=False)
        if inp == '5':
            return self._finish(f'{services.format_exchange_rate()}\n0. Menu', end=False)

        return self._finish(self._main_menu(), end=False)

    def _handle_balance_devise(self, client, inp: str) -> dict:
        if inp == '0':
            self.data['state'] = 'MAIN'
            return self._finish(self._main_menu(), end=False)
        devise = {'1': USD, '2': CDF}.get(inp)
        if not devise:
            return self._finish('Choix: 1=USD 2=CDF', end=False)
        try:
            bal = services.get_wallet_balance(client, devise)
        except Exception:
            bal = 'N/A'
        self.data['state'] = 'MAIN'
        return self._finish(f'Solde {devise}: {bal}\n\n{self._main_menu()}', end=False)

    def _handle_savings_pick(self, client, inp: str) -> dict:
        if inp == '0':
            self.data['state'] = 'MAIN'
            return self._finish(self._main_menu(), end=False)
        savings = self.data.get('ctx', {}).get('savings', [])
        try:
            idx = int(inp) - 1
            item = savings[idx]
        except (ValueError, IndexError):
            return self._finish('Choix invalide.', end=False)
        self.data['state'] = 'MAIN'
        return self._finish(
            f'Epargne {item["devise"]}:\n'
            f'Solde: {item["symbole"]}{item["solde"]}\n'
            f'Objectif: {item["progression"]}%\n\n{self._main_menu()}',
            end=False,
        )

    def _handle_credit_devise(self, client, inp: str) -> dict:
        if inp == '0':
            self.data['state'] = 'MAIN'
            return self._finish(self._main_menu(), end=False)
        devise = {'1': USD, '2': CDF}.get(inp)
        if not devise:
            return self._finish('1=USD 2=CDF', end=False)
        limits = get_credit_limits(devise)
        sym = symbole(devise)
        self.data['ctx']['credit_devise'] = devise
        self.data['state'] = 'CREDIT_AMOUNT'
        return self._finish(
            f'Montant {devise} ({sym}{limits["min"]}-{sym}{limits["max"]}):',
            end=False,
        )

    def _handle_credit_amount(self, client, inp: str) -> dict:
        if inp == '0':
            self.data['state'] = 'MAIN'
            return self._finish(self._main_menu(), end=False)
        devise = self.data['ctx'].get('credit_devise', USD)
        try:
            valider_montant_credit(inp.replace(',', '.'), devise)
        except ValueError as e:
            return self._finish(f'{e}\nReessayez:', end=False)
        self.data['ctx']['credit_montant'] = inp.replace(',', '.')
        self.data['state'] = 'CREDIT_DURATION'
        return self._finish('Duree (mois 1-12):', end=False)

    def _handle_credit_duration(self, client, inp: str) -> dict:
        if inp == '0':
            self.data['state'] = 'MAIN'
            return self._finish(self._main_menu(), end=False)
        try:
            duree = int(inp)
            if duree < 1 or duree > 12:
                raise ValueError()
        except ValueError:
            return self._finish('Entrez 1 a 12:', end=False)
        ctx = self.data['ctx']
        devise = ctx.get('credit_devise', USD)
        montant = ctx.get('credit_montant', '0')
        sym = symbole(devise)
        self.data['ctx']['credit_duree'] = duree
        self.data['state'] = 'CREDIT_CONFIRM'
        return self._finish(
            f'Confirmer?\n{sym}{montant} / {duree} mois\n1.Oui 2.Non',
            end=False,
        )

    def _handle_credit_confirm(self, client, inp: str) -> dict:
        if inp == '2' or inp == '0':
            self.data['state'] = 'MAIN'
            return self._finish('Demande annulee.\n' + self._main_menu(), end=False)
        if inp != '1':
            return self._finish('1=Confirmer 2=Annuler', end=False)
        ctx = self.data['ctx']
        try:
            result = services.submit_credit_request(
                client,
                ctx.get('credit_devise', USD),
                ctx.get('credit_montant', '0'),
                ctx.get('credit_duree', 6),
            )
            msg = result['message']
        except services.UssdBusinessError as e:
            msg = e.message
        self.data['state'] = 'MAIN'
        self.data['ctx'] = {}
        return self._finish(f'{msg}\n\n{self._main_menu()}', end=False)

    def _main_menu(self) -> str:
        return (
            'SIMBISA Menu:\n'
            '1. Mon compte\n'
            '2. Epargne\n'
            '3. Credit\n'
            '4. Mon score\n'
            '5. Taux USD/CDF\n'
            '0. Quitter'
        )

    def _finish(self, message: str, end: bool) -> dict:
        msg = message[:182]
        return {
            'session_id': self.session_id,
            'response_type': 'END' if end else 'CON',
            'message': msg,
            'end_session': end,
        }
