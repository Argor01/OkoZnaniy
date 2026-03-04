"""
Сервисы для обработки чатов и обнаружения контактных данных
"""
import re
from typing import List, Dict, Any
from django.conf import settings


class ContactDetectionService:
    """Сервис для обнаружения контактных данных в сообщениях"""
    
    # Регулярные выражения для обнаружения контактов
    PHONE_PATTERNS = [
        r'\+7\s*\(?(\d{3})\)?\s*(\d{3})\s*-?\s*(\d{2})\s*-?\s*(\d{2})',  # +7 (999) 999-99-99
        r'8\s*\(?(\d{3})\)?\s*(\d{3})\s*-?\s*(\d{2})\s*-?\s*(\d{2})',    # 8 (999) 999-99-99
        r'\b(\d{3})\s*-?\s*(\d{3})\s*-?\s*(\d{2})\s*-?\s*(\d{2})\b',     # 999-999-99-99
        r'\b(\d{11})\b',  # 11 цифр подряд
    ]
    
    EMAIL_PATTERN = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    
    TELEGRAM_PATTERNS = [
        r'@[A-Za-z0-9_]{5,32}',  # @username
        r't\.me/[A-Za-z0-9_]{5,32}',  # t.me/username
        r'telegram\.me/[A-Za-z0-9_]{5,32}',  # telegram.me/username
        r'tg://resolve\?domain=[A-Za-z0-9_]{5,32}',  # tg://resolve?domain=username
    ]
    
    WHATSAPP_PATTERNS = [
        r'wa\.me/\d+',  # wa.me/79999999999
        r'whatsapp\.com/send\?phone=\d+',  # whatsapp.com/send?phone=79999999999
    ]
    
    SOCIAL_PATTERNS = [
        r'vk\.com/[A-Za-z0-9_.]{1,50}',  # vk.com/username
        r'instagram\.com/[A-Za-z0-9_.]{1,30}',  # instagram.com/username
        r'facebook\.com/[A-Za-z0-9_.]{1,50}',  # facebook.com/username
    ]
    
    # Ключевые слова, которые могут указывать на обмен контактами
    CONTACT_KEYWORDS = [
        'мой номер', 'мой телефон', 'моя почта', 'мой email', 'мой тг', 'мой телеграм',
        'свяжись со мной', 'напиши мне', 'позвони мне', 'мои контакты',
        'личные сообщения', 'в лс', 'в личку', 'скинь номер', 'дай номер',
        'whatsapp', 'viber', 'skype', 'discord'
    ]
    
    @classmethod
    def detect_contacts(cls, text: str) -> Dict[str, Any]:
        """
        Обнаруживает контактные данные в тексте
        
        Returns:
            dict: {
                'has_contacts': bool,
                'contact_types': list,
                'detected_data': dict,
                'risk_level': str  # 'low', 'medium', 'high'
            }
        """
        text_lower = text.lower()
        detected_data = {}
        contact_types = []
        
        # Проверяем телефоны
        phones = cls._detect_phones(text)
        if phones:
            detected_data['phones'] = phones
            contact_types.append('phone')
        
        # Проверяем email
        emails = cls._detect_emails(text)
        if emails:
            detected_data['emails'] = emails
            contact_types.append('email')
        
        # Проверяем Telegram
        telegram_contacts = cls._detect_telegram(text)
        if telegram_contacts:
            detected_data['telegram'] = telegram_contacts
            contact_types.append('telegram')
        
        # Проверяем WhatsApp
        whatsapp_contacts = cls._detect_whatsapp(text)
        if whatsapp_contacts:
            detected_data['whatsapp'] = whatsapp_contacts
            contact_types.append('whatsapp')
        
        # Проверяем социальные сети
        social_contacts = cls._detect_social(text)
        if social_contacts:
            detected_data['social'] = social_contacts
            contact_types.append('social')
        
        # Проверяем ключевые слова
        keywords_found = cls._detect_keywords(text_lower)
        if keywords_found:
            detected_data['keywords'] = keywords_found
            contact_types.append('keywords')
        
        # Определяем уровень риска
        risk_level = cls._calculate_risk_level(contact_types, detected_data)
        
        return {
            'has_contacts': len(contact_types) > 0,
            'contact_types': contact_types,
            'detected_data': detected_data,
            'risk_level': risk_level
        }
    
    @classmethod
    def _detect_phones(cls, text: str) -> List[str]:
        """Обнаруживает номера телефонов"""
        phones = []
        for pattern in cls.PHONE_PATTERNS:
            matches = re.findall(pattern, text)
            for match in matches:
                if isinstance(match, tuple):
                    phone = ''.join(match)
                else:
                    phone = match
                # Проверяем, что это похоже на российский номер
                if len(phone) >= 10:
                    phones.append(phone)
        return list(set(phones))  # Убираем дубликаты
    
    @classmethod
    def _detect_emails(cls, text: str) -> List[str]:
        """Обнаруживает email адреса"""
        return re.findall(cls.EMAIL_PATTERN, text)
    
    @classmethod
    def _detect_telegram(cls, text: str) -> List[str]:
        """Обнаруживает Telegram контакты"""
        telegram_contacts = []
        for pattern in cls.TELEGRAM_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            telegram_contacts.extend(matches)
        return list(set(telegram_contacts))
    
    @classmethod
    def _detect_whatsapp(cls, text: str) -> List[str]:
        """Обнаруживает WhatsApp контакты"""
        whatsapp_contacts = []
        for pattern in cls.WHATSAPP_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            whatsapp_contacts.extend(matches)
        return list(set(whatsapp_contacts))
    
    @classmethod
    def _detect_social(cls, text: str) -> List[str]:
        """Обнаруживает ссылки на социальные сети"""
        social_contacts = []
        for pattern in cls.SOCIAL_PATTERNS:
            matches = re.findall(pattern, text, re.IGNORECASE)
            social_contacts.extend(matches)
        return list(set(social_contacts))
    
    @classmethod
    def _detect_keywords(cls, text: str) -> List[str]:
        """Обнаруживает ключевые слова, связанные с обменом контактами"""
        found_keywords = []
        for keyword in cls.CONTACT_KEYWORDS:
            if keyword in text:
                found_keywords.append(keyword)
        return found_keywords
    
    @classmethod
    def _calculate_risk_level(cls, contact_types: List[str], detected_data: Dict) -> str:
        """Вычисляет уровень риска на основе обнаруженных данных"""
        if not contact_types:
            return 'low'
        
        # Высокий риск: прямые контакты (телефон, email, telegram)
        high_risk_types = {'phone', 'email', 'telegram', 'whatsapp'}
        if any(ct in high_risk_types for ct in contact_types):
            return 'high'
        
        # Средний риск: социальные сети или подозрительные ключевые слова
        medium_risk_types = {'social', 'keywords'}
        if any(ct in medium_risk_types for ct in contact_types):
            return 'medium'
        
        return 'low'


class ChatModerationService:
    """Сервис для модерации чатов"""
    
    @staticmethod
    def freeze_chat(chat, violation_type: str, detected_data: Dict, message=None):
        """
        Замораживает чат и создает запись о нарушении
        """
        from .models import Chat, ContactViolationLog
        
        # Замораживаем чат
        chat.is_frozen = True
        chat.frozen_reason = f"Обнаружен обмен контактами: {violation_type}"
        chat.save(update_fields=['is_frozen', 'frozen_reason'])
        
        # Создаем запись о нарушении
        violation = ContactViolationLog.objects.create(
            chat=chat,
            user=message.sender if message else None,
            message=message,
            violation_type=violation_type,
            detected_data=detected_data,
            status='pending'
        )
        
        # Уведомляем администраторов
        ChatModerationService._notify_admins_about_violation(violation)
        
        return violation
    
    @staticmethod
    def _notify_admins_about_violation(violation):
        """Уведомляет администраторов о нарушении"""
        from apps.notifications.services import NotificationService
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        admins = User.objects.filter(role='admin')
        
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                type='chat_violation',
                title='Обнаружен обмен контактами в чате',
                message=f'Чат #{violation.chat.id} заморожен. Тип нарушения: {violation.violation_type}',
                related_object_id=violation.id,
                related_object_type='contact_violation'
            )
    
    @staticmethod
    def unfreeze_chat(chat, admin_user, decision: str):
        """
        Размораживает чат после проверки администратором
        """
        chat.is_frozen = False
        chat.frozen_reason = None
        chat.save(update_fields=['is_frozen', 'frozen_reason'])
        
        # Обновляем статус нарушения
        violation = chat.contact_violations.filter(status='pending').first()
        if violation:
            violation.status = 'resolved'
            violation.admin_decision = decision
            violation.reviewed_by = admin_user
            violation.reviewed_at = timezone.now()
            violation.save()
        
        return violation