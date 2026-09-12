# Deployment

Use separate development, test, staging and production credentials. Configure
database, object storage, UIDAI-approved integration, institutional IdP/MFA,
MST provider, contract address and protected registrar signer via a secret
manager. `.env.example` contains placeholders only. Never use frontend public
environment variables for credentials or registrar signing material.
