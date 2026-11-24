# Google sign-in

The button is implemented and hidden until `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` is exactly `true`. Do not turn that on before the provider works, or members will see a broken button.

## Required outside this repository

Service: Google Cloud and Supabase Auth.

1. In Google Cloud, create an OAuth client for a web application.
2. Authorized redirect URI: the Supabase callback URL shown in Supabase Auth → Providers → Google. It looks like `https://<project-ref>.supabase.co/auth/v1/callback`.
3. In Supabase Auth → Providers → Google, enable the provider and paste the Google client ID and client secret. Do not send those values in chat.
4. Add `https://elevate-healthsolutions.com/auth/callback` to the Supabase redirect allow list.
5. Set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true` in the Vercel production environment and redeploy.

Existing email accounts should use the same email in Google. Supabase links the provider identity to that user. The app does not create a second profile when the email already exists.

No Google client ID or secret is stored in this repository.
