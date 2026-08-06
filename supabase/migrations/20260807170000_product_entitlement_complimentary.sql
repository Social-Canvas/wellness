-- Complimentary / admin product grants (no Stripe order).
-- Distinguishes tester/manual access from paid purchases and free claims.

alter type public.product_entitlement_source add value if not exists 'complimentary';
