-- Hide Health Professional Session from public catalog before Stripe live activation.
-- Preserves rows, Stripe test price placeholders, media, and historical orders.
-- Prior purchasers retain entitlement via order_items (product status is not checked).

update public.products
set status = 'draft'::public.publish_status
where slug = 'health-professional-session'
  and status = 'published'::public.publish_status;

-- Course remains published so any entitled purchaser can still open the library
-- outline. Public marketing no longer lists this offer; the commerce product is draft.
