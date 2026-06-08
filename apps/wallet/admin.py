from django.contrib import admin

# Wallet "ledger" lives on orders.Transaction (already registered there if
# admin entry exists). We don't register anything new here to avoid
# duplicating the admin surface, but the import has to exist for Django's
# app config to import cleanly.
