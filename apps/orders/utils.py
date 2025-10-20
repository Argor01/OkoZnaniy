import os
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible


@deconstructible
class FileValidator:
    def __init__(self, max_size=None, allowed_extensions=None):
        self.max_size = max_size or settings.MAX_UPLOAD_SIZE
        self.allowed_extensions = allowed_extensions or settings.ALLOWED_EXTENSIONS

    def __call__(self, value):
        # Проверка размера файла
        if value.size > self.max_size:
            raise ValidationError(
                f'Размер файла не должен превышать {self.max_size / (1024*1024):.1f}MB'
            )

        # Проверка расширения файла
        ext = os.path.splitext(value.name)[1][1:].lower()
        if ext not in self.allowed_extensions:
            raise ValidationError(
                f'Недопустимый тип файла. Разрешены следующие типы: {", ".join(self.allowed_extensions)}'
            )

    def __eq__(self, other):
        return (
            isinstance(other, FileValidator) and
            self.max_size == other.max_size and
            self.allowed_extensions == other.allowed_extensions
        )


def get_file_path(instance, filename):
    """
    Генерирует путь для сохранения файла.
    Файлы группируются по заказам: orders/[order_id]/[filename]
    """
    return f'orders/{instance.order.id}/{filename}' 