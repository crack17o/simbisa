"""Stockage Cloudinary pour documents KYC (ressources authentifiées)."""
from cloudinary_storage.storage import MediaCloudinaryStorage


class KYCCloudinaryStorage(MediaCloudinaryStorage):
    """
    Upload des scans KYC sur Cloudinary en mode authenticated.
    Les URLs sont signées — accès restreint aux utilisateurs autorisés via l'API.
    """

    def get_cloudinary_option(self, name):
        options = super().get_cloudinary_option(name)
        options['type'] = 'authenticated'
        options['resource_type'] = 'auto'
        options['folder'] = 'simbisa/kyc'
        return options
