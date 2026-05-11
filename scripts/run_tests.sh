#!/bin/bash
# OkoZnaniy — автозапуск тестов
# ./scripts/run_tests.sh          — регрессионные тесты (85)
# ./scripts/run_tests.sh quick    — быстрые (только bug fixes)
# ./scripts/run_tests.sh full     — все приложения

set -e
cd "$(dirname "$0")/.."

MODE="${1:-all}"

echo "=== OkoZnaniy Test Runner ==="

run_in_docker() {
    docker compose exec -T backend python manage.py test "$@" --no-input -v 1
}

case "$MODE" in
    quick)
        echo ">>> Быстрые тесты (bug fixes)..."
        run_in_docker apps.regression_tests.test_bug_fixes
        ;;
    full)
        echo ">>> Полный набор тестов..."
        run_in_docker apps.regression_tests apps.orders apps.chat apps.experts apps.shop apps.users
        ;;
    *)
        echo ">>> Регрессионные тесты (85)..."
        run_in_docker apps.regression_tests
        ;;
esac

echo ""
if [ $? -eq 0 ]; then
    echo "ALL TESTS PASSED"
else
    echo "TESTS FAILED"
    exit 1
fi
