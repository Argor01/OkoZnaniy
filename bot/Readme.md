Для запуска системы уведомлений нужно:
Установить Redis (для работы Celery)
Запустить Celery worker: celery -A config worker -l info
Запустить Celery beat для периодических задач: celery -A config beat -l info