#!/bin/bash

# Безопасный скрипт автоматического развертывания
# Автор: OkoZnaniy Team
# Описание: Подтягивает изменения из git, пересобирает контейнеры с проверками

set -e  # Остановка при любой ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Конфигурация
PROJECT_DIR="/root/OkoZnaniy"
BACKUP_DIR="/root/backups"
LOG_FILE="/var/log/okoznaniy-deploy.log"
MAX_BACKUPS=5
HEALTH_CHECK_TIMEOUT=60
ROLLBACK_ON_ERROR=true

# Функция логирования
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠${NC} $1" | tee -a "$LOG_FILE"
}

# Функция проверки существования директории
check_directory() {
    if [ ! -d "$1" ]; then
        log_error "Директория $1 не существует"
        exit 1
    fi
}

# Функция создания бэкапа
create_backup() {
    log "Создание бэкапа..."
    
    # Создаем директорию для бэкапов если её нет
    mkdir -p "$BACKUP_DIR"
    
    # Имя бэкапа с датой и временем
    BACKUP_NAME="okoznaniy_backup_$(date +'%Y%m%d_%H%M%S')"
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"
    
    # Сохраняем текущий коммит
    cd "$PROJECT_DIR"
    CURRENT_COMMIT=$(git rev-parse HEAD)
    echo "$CURRENT_COMMIT" > "$BACKUP_PATH.commit"
    
    # Экспортируем состояние контейнеров
    docker-compose ps > "$BACKUP_PATH.containers"
    
    log_success "Бэкап создан: $BACKUP_NAME (commit: ${CURRENT_COMMIT:0:7})"
    
    # Удаляем старые бэкапы (оставляем только последние MAX_BACKUPS)
    cd "$BACKUP_DIR"
    ls -t okoznaniy_backup_*.commit 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | while read file; do
        base="${file%.commit}"
        rm -f "$base.commit" "$base.containers"
        log "Удален старый бэкап: $base"
    done
}

# Функция отката к предыдущему состоянию
rollback() {
    log_error "Начинаем откат к предыдущему состоянию..."
    
    cd "$PROJECT_DIR"
    
    # Находим последний бэкап
    LAST_BACKUP=$(ls -t "$BACKUP_DIR"/okoznaniy_backup_*.commit 2>/dev/null | head -n 1)
    
    if [ -z "$LAST_BACKUP" ]; then
        log_error "Бэкап не найден! Откат невозможен"
        return 1
    fi
    
    BACKUP_COMMIT=$(cat "$LAST_BACKUP")
    log "Откат к коммиту: ${BACKUP_COMMIT:0:7}"
    
    # Откатываем git
    git reset --hard "$BACKUP_COMMIT"
    
    # Пересобираем контейнеры
    docker-compose build --no-cache
    docker-compose up -d
    
    log_success "Откат выполнен успешно"
}

# Функция проверки здоровья сервисов
check_health() {
    log "Проверка здоровья сервисов..."
    
    local timeout=$HEALTH_CHECK_TIMEOUT
    local elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        # Проверяем статус контейнеров
        if docker-compose ps | grep -q "Up"; then
            # Проверяем доступность backend
            if docker-compose exec -T backend python manage.py check --deploy > /dev/null 2>&1; then
                log_success "Backend работает корректно"
                
                # Проверяем frontend
                if docker-compose exec -T frontend nginx -t > /dev/null 2>&1; then
                    log_success "Frontend работает корректно"
                    return 0
                fi
            fi
        fi
        
        sleep 5
        elapsed=$((elapsed + 5))
        log "Ожидание запуска сервисов... ($elapsed/$timeout сек)"
    done
    
    log_error "Сервисы не запустились за $timeout секунд"
    return 1
}

# Функция проверки наличия изменений
check_for_updates() {
    log "Проверка наличия обновлений..."
    
    cd "$PROJECT_DIR"
    
    # Получаем информацию о удаленном репозитории
    git fetch origin main
    
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse origin/main)
    
    if [ "$LOCAL" = "$REMOTE" ]; then
        log_success "Обновлений нет. Текущая версия актуальна"
        return 1
    fi
    
    log_success "Найдены новые изменения"
    log "Локальный коммит: ${LOCAL:0:7}"
    log "Удаленный коммит: ${REMOTE:0:7}"
    
    # Показываем список изменений
    log "Список изменений:"
    git log --oneline "$LOCAL".."$REMOTE" | head -n 10 | while read line; do
        log "  - $line"
    done
    
    return 0
}

# Функция применения миграций
apply_migrations() {
    log "Проверка и применение миграций..."
    
    cd "$PROJECT_DIR"
    
    # Проверяем наличие неприменённых миграций
    PENDING_MIGRATIONS=$(docker-compose exec -T backend python manage.py showmigrations | grep "\[ \]" | wc -l)
    
    if [ "$PENDING_MIGRATIONS" -gt 0 ]; then
        log "Найдено неприменённых миграций: $PENDING_MIGRATIONS"
        
        # Создаем бэкап базы данных перед миграциями
        log "Создание бэкапа базы данных..."
        docker-compose exec -T postgres pg_dump -U postgres okoznaniy > "$BACKUP_DIR/db_backup_$(date +'%Y%m%d_%H%M%S').sql"
        
        # Применяем миграции
        if docker-compose exec -T backend python manage.py migrate; then
            log_success "Миграции применены успешно"
        else
            log_error "Ошибка при применении миграций"
            return 1
        fi
    else
        log_success "Все миграции уже применены"
    fi
    
    return 0
}

# Функция сборки frontend
build_frontend() {
    log "Сборка frontend..."
    
    cd "$PROJECT_DIR"
    
    if docker-compose build frontend; then
        log_success "Frontend собран успешно"
        return 0
    else
        log_error "Ошибка при сборке frontend"
        return 1
    fi
}

# Функция перезапуска сервисов
restart_services() {
    log "Перезапуск сервисов..."
    
    cd "$PROJECT_DIR"
    
    # Останавливаем frontend
    docker-compose stop frontend
    docker-compose rm -f frontend
    
    # Запускаем все сервисы
    if docker-compose up -d; then
        log_success "Сервисы перезапущены"
        return 0
    else
        log_error "Ошибка при перезапуске сервисов"
        return 1
    fi
}

# Функция очистки
cleanup() {
    log "Очистка неиспользуемых Docker образов..."
    docker image prune -f > /dev/null 2>&1
    log_success "Очистка завершена"
}

# Главная функция развертывания
main() {
    log "========================================="
    log "Начало процесса развертывания"
    log "========================================="
    
    # Проверка директории проекта
    check_directory "$PROJECT_DIR"
    
    # Проверка наличия обновлений
    if ! check_for_updates; then
        log "Развертывание не требуется"
        exit 0
    fi
    
    # Создание бэкапа
    create_backup
    
    # Подтягивание изменений
    log "Подтягивание изменений из репозитория..."
    cd "$PROJECT_DIR"
    
    if git pull origin main; then
        log_success "Изменения подтянуты успешно"
    else
        log_error "Ошибка при подтягивании изменений"
        exit 1
    fi
    
    # Применение миграций
    if ! apply_migrations; then
        if [ "$ROLLBACK_ON_ERROR" = true ]; then
            rollback
        fi
        exit 1
    fi
    
    # Сборка frontend
    if ! build_frontend; then
        if [ "$ROLLBACK_ON_ERROR" = true ]; then
            rollback
        fi
        exit 1
    fi
    
    # Перезапуск сервисов
    if ! restart_services; then
        if [ "$ROLLBACK_ON_ERROR" = true ]; then
            rollback
        fi
        exit 1
    fi
    
    # Проверка здоровья
    if ! check_health; then
        log_error "Проверка здоровья не пройдена"
        if [ "$ROLLBACK_ON_ERROR" = true ]; then
            rollback
        fi
        exit 1
    fi
    
    # Очистка
    cleanup
    
    log "========================================="
    log_success "Развертывание завершено успешно!"
    log "========================================="
    
    # Показываем текущую версию
    CURRENT_VERSION=$(git rev-parse --short HEAD)
    log "Текущая версия: $CURRENT_VERSION"
    log "Последний коммит: $(git log -1 --pretty=%B)"
}

# Обработка ошибок
trap 'log_error "Скрипт прерван"; exit 1' INT TERM

# Запуск
main "$@"
