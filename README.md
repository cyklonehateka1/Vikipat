# Vikipat

A three-app TypeScript monorepo for a product showcase business in Ghana.

- `apps/storefront`: Customer-facing React product catalogue
- `apps/admin`: React inventory and catalogue dashboard
- `apps/api`: NestJS API for products, categories, and dashboard summaries

## Run locally

```bash
npm install
# Start PostgreSQL locally and configure apps/api/.env first.
npm run dev:store
npm run dev:admin
npm run dev:api
```

The storefront runs on port 5173, admin on 5174, and API on 3000.

## Admin login

Development credentials:

- Email: `hello@vikipat.com`
- Password: `ChangeMe@VP2026!`

The first login requires an immediate password change. The replacement must contain at least 12 characters with uppercase, lowercase, number, and symbol characters.

Copy `apps/api/.env.example` to `apps/api/.env` or provide equivalent environment variables before local development. Production startup requires a unique JWT secret of at least 64 characters, PostgreSQL credentials, and an explicit admin bootstrap password. Never deploy the development credentials.

The API uses PostgreSQL in every environment. Uploaded product images are stored in `apps/api/uploads` locally and in a persistent Docker volume in production.

## Production deployment (Ubuntu VPS)

Production uses Docker Compose with three containers:

- Caddy serves `vikipat.com` and `dash.vikipat.com`, provisions HTTPS, and proxies API traffic.
- Node runs the NestJS API without exposing its port publicly.
- PostgreSQL 17 stores all application data in a persistent volume and is not exposed publicly.

Only ports 22, 80, and 443 are exposed. Caddy automatically provisions HTTPS after a domain is pointed at the VPS. A daily backup of the database and uploads runs at 02:17 UTC and retains 14 days.

### 1. Secure and prepare a new VPS

Create a local SSH key if you do not already have one, then copy it to the temporary root account:

```bash
ssh-keygen -t ed25519
ssh-copy-id root@169.58.217.73
scp deploy/setup-vps.sh root@169.58.217.73:/tmp/setup-vps.sh
ssh root@169.58.217.73 'bash /tmp/setup-vps.sh'
```

The setup installs Docker, Compose, UFW, Fail2ban, unattended security updates, and creates a `deploy` user. Root password login remains enabled per the current server access policy. If it finds the root authorized-key file, it also copies the keys to `deploy`.

```bash
ssh deploy@169.58.217.73
```

Because root password login is enabled, use a strong unique password and rotate any password that has been shared or exposed.

### 2. Verify DNS

Both DNS `A` records must resolve to `169.58.217.73`:

```bash
dig +short vikipat.com A
dig +short dash.vikipat.com A
```

### 3. Deploy with HTTPS

From this repository on your computer:

```bash
./deploy/deploy.sh
```

The first deployment creates `/opt/vikipat/.env.production`, generates PostgreSQL and JWT secrets plus the initial admin password, builds the images, initializes PostgreSQL, and starts the stack. Save the one-time admin password printed by the script. Open:

- Storefront: `https://vikipat.com`
- Admin: `https://dash.vikipat.com`

Every later deployment uses the same command and preserves the database, uploads, TLS data, and production secrets.
Caddy obtains and renews both certificates automatically.

### Operations

```bash
# Status and recent logs
ssh deploy@169.58.217.73 'cd /opt/vikipat && docker compose --env-file .env.production ps && docker compose --env-file .env.production logs --tail=100'

# Run a backup immediately
ssh deploy@169.58.217.73 '/opt/vikipat/deploy/backup.sh'

# List PostgreSQL dumps and upload archives available for restore
ssh deploy@169.58.217.73 'ls -lh /opt/vikipat-backups'
```

Do not commit `.env.production`; it contains the PostgreSQL password, admin bootstrap password, and JWT signing secret.

## Staff access and operations

Sign in as an administrator and open **Staff access** to create an operational account. Choose an operations supervisor, designer, production operator, quality-control, or dispatch role. Supply a temporary password (12–72 characters with uppercase, lowercase, number, and symbol characters) and share it directly with the staff member. They must change it on first sign-in. No invitation email is sent.

Operational staff use the same sign-in page and open directly into Operations. All can read jobs and add internal notes; stage actions depend on role. Supervisors additionally release and assign jobs. Administrative pricing, finance, catalogue, settings, order editing, and staff management stay administrator-only. Changing a staff member's role or active status revokes their sessions. Existing administrator accounts cannot be changed through staff management.

The staff migration runs through the existing PostgreSQL migration setup. No production environment files need to be edited for these roles.

Verification:

```bash
npm run test:operations
npm run test:staff:integration
npm run build
```

The integration command requires PostgreSQL `initdb` and `pg_ctl` on `PATH` and permission to open localhost ports. It starts a temporary PostgreSQL cluster and API, tests actual HTTP routes, and removes its temporary data when finished. It uses an isolated API build directory and does not use existing databases or `.env` files.

## Checkout payment method and return URL

Online `POST /api/orders` requests must include `paymentMethod: "mobile_money"` exactly.
The checkout requires the customer to select Mobile Money explicitly; Card is disabled.
Paystack sessions expose only the `mobile_money` channel. Staff order/payment entry is unchanged.

Paystack returns customers to `/confirmation` on the required API environment variable
`STOREFRONT_URL`. Set it to the customer frontend base URL for each environment,
for example `STOREFRONT_URL=http://localhost:5173` locally. Docker Compose passes
this variable through from the deployment environment. There is no hardcoded
fallback; `API_PUBLIC_URL` and `PAYSTACK_CALLBACK_URL` do not control this redirect.
Already initialized Paystack sessions retain their old callback; create a new
checkout to use the corrected URL.
