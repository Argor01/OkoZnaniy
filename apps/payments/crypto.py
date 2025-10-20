from cryptography.fernet import Fernet
from django.conf import settings
from base64 import b64encode, b64decode
import json


class PaymentCrypto:
    def __init__(self):
        # Получаем ключ шифрования из настроек или генерируем новый
        key = getattr(settings, 'PAYMENT_ENCRYPTION_KEY', None)
        if not key:
            key = Fernet.generate_key()
        self.fernet = Fernet(key)

    def encrypt_data(self, data: dict) -> str:
        """
        Шифрует чувствительные данные платежа
        """
        # Конвертируем данные в JSON и шифруем
        json_data = json.dumps(data)
        encrypted_data = self.fernet.encrypt(json_data.encode())
        return b64encode(encrypted_data).decode()

    def decrypt_data(self, encrypted_data: str) -> dict:
        """
        Расшифровывает данные платежа
        """
        try:
            # Декодируем base64 и расшифровываем
            decoded_data = b64decode(encrypted_data.encode())
            decrypted_data = self.fernet.decrypt(decoded_data)
            return json.loads(decrypted_data.decode())
        except Exception as e:
            raise ValueError(f"Ошибка расшифровки данных: {str(e)}")

    @staticmethod
    def mask_card_number(card_number: str) -> str:
        """
        Маскирует номер карты, оставляя только первые 6 и последние 4 цифры
        """
        if not card_number or len(card_number) < 13:
            return card_number
        return f"{card_number[:6]}{'*' * (len(card_number)-10)}{card_number[-4:]}"

    @staticmethod
    def mask_sensitive_data(data: dict) -> dict:
        """
        Маскирует чувствительные данные в словаре
        """
        masked_data = data.copy()
        if 'card_number' in masked_data:
            masked_data['card_number'] = PaymentCrypto.mask_card_number(
                masked_data['card_number']
            )
        if 'cvv' in masked_data:
            masked_data['cvv'] = '***'
        return masked_data 