# Guia de Deploy Gratuito

Este documento resume os passos para publicar todas as partes do projeto (frontend web, API, app Android e app desktop) usando ferramentas com planos gratuitos para estudantes. As etapas estao alinhadas com os scripts do repositorio e com os fluxos automatizados configurados em GitHub Actions.

> **Importante:** Sempre valide as builds localmente antes de disparar os pipelines. Rode `npm run lint`, `npm run test` e `npm run build` para garantir que o commit esta pronto para producao.

## 1. Variaveis de ambiente

Preencha um `.env.local` para desenvolvimento baseado no arquivo `.env.example`.

Producao usa as mesmas variaveis a seguir:

| Variavel                                             | Onde usar                                     | Descricao                                                                     |
| ---------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------- |
| `VITE_API_URL`                                       | Vercel/Netlify, build Android, build Electron | URL base da API publica (ex.: `https://sua-api.onrender.com/api`).            |
| `ASPNETCORE_ENVIRONMENT`                             | Backend (Render/Fly.io)                       | Defina como `Production` no servico hospedado.                                |
| `ConnectionStrings__DefaultConnection`               | Backend                                       | String de conexao do SQL Server (Express, Azure SQL, LocalDB).                |
| `ANDROID_KEYSTORE_*`                                 | GitHub Secrets                                | Credenciais do keystore de assinatura release Android.                        |
| `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` | GitHub Secrets                                | Autorizam o deploy automatico do frontend.                                    |
| `CSC_LINK`, `CSC_KEY_PASSWORD` (opcional)            | GitHub Secrets                                | Caminho e senha do certificado para assinar o instalador Windows do Electron. |

### Como salvar o keystore Android nos secrets
1. Gere um keystore (`keytool -genkeypair ...`) ou solicite um arquivo ja existente ao responsavel.
2. Converta o arquivo para Base64: `base64 android-release.keystore > android-release.keystore.base64`.
3. Crie os secrets no GitHub:
   - `ANDROID_KEYSTORE_BASE64`: conteudo Base64 do arquivo.
   - `ANDROID_KEYSTORE_PASSWORD`: senha do keystore.
   - `ANDROID_KEY_ALIAS`: alias criado no `keytool`.
   - `ANDROID_KEY_PASSWORD`: senha da chave.

### Certificado opcional do Electron
Para assinar o instalador Windows, converta o `.pfx` para Base64 (`base64 cert.pfx > cert.pfx.base64`) e salve nos secrets:
- `WINDOWS_CERT_BASE64`
- `WINDOWS_CERT_PASSWORD`

Nos builds sem certificado, o workflow gera um instalador sem assinatura e adiciona uma observacao no release.

## 2. API com SQL Server Express ou Azure SQL

1. **Desenvolvimento local (SQL Server Express ou LocalDB)**
   - Instale [SQL Server Express 2022](https://www.microsoft.com/sql-server/sql-server-downloads) e o [SSMS](https://aka.ms/ssmsfullsetup).
   - Abra o SSMS e conecte em `localhost\\SQLEXPRESS` (ou a instancia escolhida).
   - Crie o banco `TicketSystemDB` ou deixe que o EF Core gere as tabelas automaticamente na primeira execucao (`dotnet run`).
   - Connection string para uso local:
     ```
     Server=localhost\\SQLEXPRESS;Database=TicketSystemDB;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=True;
     ```
   - Salve esta string em `appsettings.Local.json` durante o desenvolvimento.

2. **Producao gratuita (Azure SQL Database)**
   - Crie uma conta [Azure for Students](https://azure.microsoft.com/free/students/) ou use o credito gratuito inicial.
   - No portal Azure, crie um **Azure SQL Database** no tier `Basic` (ou o menor disponivel). Anote server name, usuario e senha.
   - Libere o firewall para o IP do seu host ou para o servico onde a API sera executada.
   - Connection string tipica:
     ```
     Server=tcp:seu-servidor.database.windows.net,1433;Initial Catalog=TicketSystemDB;User ID=usuario;Password=senha-segura;Encrypt=True;TrustServerCertificate=False;MultipleActiveResultSets=True;
     ```
   - Configure nos secrets: `ConnectionStrings__DefaultConnection` com a string completa e `ASPNETCORE_ENVIRONMENT=Production`.

3. **Hospedagem da API**
   - Monte uma imagem Docker local (`docker compose up --build`) para validar.
   - Render: nao da suporte oficial a SQL Server, entao utilize **Azure App Service** (Plano Free) ou hospede a API no mesmo servidor que roda o SQL Server Express.
   - Azure App Service Web App (asp.net v8): publique via `dotnet publish` ou GitHub Actions; configure connection string na aba **Configuration**.
   - Se optar por executar em sua propria VM/maquina Windows, abra a porta 5140 e aponte `VITE_API_URL` para o endereco publico.

4. Atualize `VITE_API_URL` com a URL HTTPS final do backend para que o Vercel/Android/Electron utilizem a API correta.

## 3. Deploy frontend no Vercel

1. Conecte o repositorio ao Vercel (import project).
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Adicione a env `VITE_API_URL` na aba **Environment Variables** (Production e Preview).
5. Salve os IDs de organizacao e projeto no GitHub (`VERCEL_ORG_ID` e `VERCEL_PROJECT_ID`). Em **Account Settings -> Tokens** gere o `VERCEL_TOKEN`.
6. A automacao `deploy-web.yml` envia as builds sempre que o branch `main` recebe commits.

## 4. Build e distribuicao Android

### Build local
```powershell
npm ci
npm run android:build:release
```
O APK assinado ficara em `android/app/build/outputs/apk/release/app-release.apk`.

### Pipeline automatico
O workflow `android-release.yml` pode ser disparado manualmente (`workflow_dispatch`) ou quando uma release e criada. Ele:
1. Instala Node, Java 17 e o SDK Android.
2. Roda `npm ci`, `npm run build:android` e `gradlew assembleRelease`.
3. Decodifica o keystore armazenado no secret e assina automaticamente.
4. Publica o APK e o AAB como artefatos e opcionalmente anexa a release.

## 5. Build e distribuicao Electron

### Build local
```powershell
npm ci
npm run electron:build
```
Os binarios ficam em `dist_electron/` (padrao do electron-builder). Se nao houver certificado, o Windows exibira aviso na instalacao.

### Pipeline automatico
O workflow `electron-release.yml` executa em runners Windows para gerar o instalador `.exe`.
Passos:
1. Baixa dependencias Node.
2. Gera o build web (`npm run build`).
3. Se `WINDOWS_CERT_BASE64` estiver configurado, restaura o certificado e define `CSC_LINK`/`CSC_KEY_PASSWORD` para assinatura.
4. Roda `electron-builder --win nsis` e publica o instalador como artefato e anexo de release.

## 6. Fluxo sugerido de publicacao

1. Abra uma pull request e aguarde o workflow `ci.yml` (lint, testes, build web, build .NET).
2. Merge no `main` dispara:
   - `deploy-web.yml` -> Vercel atualiza o frontend.
3. Quando quiser distribuir apps:
   - Crie uma tag `vX.Y.Z` -> GitHub Actions prepara Android e Electron e anexa binarios a release automatica.
4. Atualize notas de release com instrucoes para instalacao e links do backend.

## 7. Checklist rapido antes de publicar

- [ ] `npm run lint` / `npm run test` / `npm run build` OK.
- [ ] `dotnet test` executado para verificar a API.
- [ ] Migracoes EF Core aplicadas na base de producao.
- [ ] Secrets atualizados (Vercel, Render/Fly, Android, Electron).
- [ ] QA manual realizado no Vercel Preview e no APK/desktop gerado.

## 8. Recursos uteis

- [Render Free Tier FAQ](https://render.com/docs/free)
- [Fly.io Launch](https://fly.io/docs/hands-on/)
- [Vercel GitHub Deployments](https://vercel.com/docs/deployments/git)
- [Capacitor Android Builds](https://capacitorjs.com/docs/android/deploy)
- [electron-builder Docs](https://www.electron.build/)

Com este fluxo, todo o ecossistema (web, backend, mobile e desktop) pode ser liberado com custo zero, mantendo pipelines automatizados para releases frequentes.
