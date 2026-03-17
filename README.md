# 🚴 Hybrid Nation — Next.js

Stack moderna: **Next.js 15 + Prisma + PostgreSQL (Neon) + NextAuth v5 + Tailwind CSS**

---

## 🚀 Setup Rápido

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env.local
```

Preenche o `.env.local`:
```env
# Neon PostgreSQL
DATABASE_URL="postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/cycling_app?sslmode=require"
DIRECT_URL="postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/cycling_app?sslmode=require"

# NextAuth (gera um secret: openssl rand -base64 32)
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Strava OAuth (https://www.strava.com/settings/api)
STRAVA_CLIENT_ID="..."
STRAVA_CLIENT_SECRET="..."
STRAVA_REDIRECT_URI="http://localhost:3000/api/strava/callback"
```

### 3. Criar base de dados (Neon)
1. Cria conta em [neon.tech](https://neon.tech)
2. Cria projeto `cycling_app`
3. Copia a connection string para `DATABASE_URL` e `DIRECT_URL`

### 4. Migrar o schema
```bash
npm run db:generate   # Gera o Prisma Client
npm run db:push       # Aplica o schema na BD
```

### 5. Iniciar em desenvolvimento
```bash
npm run dev
```

---

## 📁 Estrutura

```
src/
├── app/
│   ├── (auth)/          # Login, Register
│   ├── (app)/           # Dashboard, Calendar, Teams, Activities, Competitions
│   ├── api/             # API Routes
│   └── invite/[token]/  # Accept team invitation
├── components/
│   ├── layout/          # Sidebar, Header
│   ├── dashboard/       # DashboardClient
│   ├── calendar/        # CalendarClient
│   ├── team/            # TeamsClient
│   ├── activity/        # ActivitiesClient
│   └── competition/     # CompetitionsClient
├── lib/
│   ├── auth.ts          # NextAuth config
│   ├── prisma.ts        # Prisma singleton
│   ├── strava.ts        # Strava OAuth + sync
│   └── utils.ts         # Helpers
└── types/               # TypeScript types
```

---

## ✨ Funcionalidades

| Feature | Descrição |
|---|---|
| 🔐 Auth | Registo/login com NextAuth + JWT |
| 🟠 Strava | OAuth + sync automático desde 1 Jan |
| 📊 Dashboard | Stats mensais personalizáveis |
| 🎛️ Widgets | Escolhe quais métricas mostrar |
| 👥 Teams | Criar equipas, convidar por email/link |
| 📅 Calendário | Planear treinos, ver treinos da equipa |
| 🏆 Competições | Competições internas com leaderboard |
| 🔄 Multi-dashboard | Alternar entre o teu dashboard e o da equipa |

---

## 🔗 Configurar Strava

1. Vai a [strava.com/settings/api](https://www.strava.com/settings/api)
2. Cria uma app com **Authorization Callback Domain**: `localhost`
3. Copia o `Client ID` e `Client Secret` para `.env.local`
4. No dashboard, clica **"Ligar Strava"** para sincronizar atividades desde Janeiro

---

## 🗄️ Comandos BD

```bash
npm run db:generate   # Regenerar Prisma Client após mudanças no schema
npm run db:push       # Push schema → BD (dev)
npm run db:migrate    # Criar migration (prod)
npm run db:studio     # Abrir Prisma Studio (UI da BD)
```
