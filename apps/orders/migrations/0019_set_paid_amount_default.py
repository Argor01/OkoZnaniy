from django.db import migrations


class Migration(migrations.Migration):
    """Stray ``paid_amount`` column (NOT NULL, no DEFAULT) exists in DB but is
    not declared on the ``Order`` model. New rows inserted through the ORM omit
    the column and PostgreSQL rejects the INSERT with a NotNull violation,
    surfacing as a 500 on POST /api/orders/orders/ and a 400 on
    /api/chat/chats/{id}/accept_offer/ (caught and re-raised as ValidationError).

    Until we either re-introduce the field in the model or drop the column with
    a proper schema migration, set a DB-level DEFAULT of 0 so ORM-generated
    INSERTs that don't mention the column succeed.
    """

    dependencies = [
        ('orders', '0018_orderfile_expert_viewed_at'),
    ]

    operations = [
        migrations.RunSQL(
            sql=(
                "DO $$\n"
                "BEGIN\n"
                "    IF EXISTS (\n"
                "        SELECT 1 FROM information_schema.columns\n"
                "        WHERE table_name = 'orders_order' AND column_name = 'paid_amount'\n"
                "    ) THEN\n"
                "        EXECUTE 'ALTER TABLE orders_order ALTER COLUMN paid_amount SET DEFAULT 0';\n"
                "        EXECUTE 'UPDATE orders_order SET paid_amount = 0 WHERE paid_amount IS NULL';\n"
                "    END IF;\n"
                "END$$;"
            ),
            reverse_sql=(
                "DO $$\n"
                "BEGIN\n"
                "    IF EXISTS (\n"
                "        SELECT 1 FROM information_schema.columns\n"
                "        WHERE table_name = 'orders_order' AND column_name = 'paid_amount'\n"
                "    ) THEN\n"
                "        EXECUTE 'ALTER TABLE orders_order ALTER COLUMN paid_amount DROP DEFAULT';\n"
                "    END IF;\n"
                "END$$;"
            ),
        ),
    ]
