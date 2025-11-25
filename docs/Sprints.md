# 📅 Plano de Sprints – Projeto HelpDesk

Início das sprints: **16/09/2025**  
Duração de cada sprint: **2 semanas**

---

## 🟦 Sprint 1 – Autenticação e Perfil  
**Período:** 16/09/2025 → 29/09/2025

| Principais Entregáveis | Backlog (User Story) | DoR (Definition of Ready) | DoD (Definition of Done) |
|---|---|---|---|
| Login/Logout | Como usuário, quero realizar login e logout no sistema. | Regras de autenticação definidas e telas mapeadas. | Login funcionando, sessões seguras, testes ok. |
| Cadastro de usuários | Como administrador, quero cadastrar novos usuários com permissões. | Perfis de acesso definidos, campos definidos. | CRUD funcionando, validações, testes ok. |
| Editar perfil / senha | Como usuário, quero editar perfil e senha. | Campos e regras de validação definidas. | Perfil atualizável, senha atualiza, testes ok. |

---

## 🟦 Sprint 2 – Chamados (Core)  
**Período:** 30/09/2025 → 13/10/2025

| Principais Entregáveis | Backlog (User Story) | DoR | DoD |
|---|---|---|---|
| Criar chamados | Como usuário, quero criar um chamado com título, descrição, prioridade e categoria. | Campos definidos, fluxo desenhado. | Chamado criado com persistência e validações. |
| Visualizar chamados atribuídos | Como técnico, quero visualizar meus chamados atribuídos. | Query de filtragem definida. | Lista exibe chamados por técnico logado. |
| Alterar status do chamado | Como técnico, quero alterar status (aberto/andamento/concluído). | Estados e transições definidas. | Atualização funcionando, testes ok. |

---

## 🟦 Sprint 3 – Dashboard, Relatórios e IA  
**Período:** 14/10/2025 → 27/10/2025

| Principais Entregáveis | Backlog (User Story) | DoR | DoD |
|---|---|---|---|
| Dashboard de estatísticas | Como administrador, quero visualizar um Dashboard. | Métricas definidas, consultas definidas. | Dashboard com dados reais atualizando. |
| Filtros e pesquisa | Como usuário, quero filtrar e pesquisar chamados. | Filtros definidos e critérios mapeados. | Filtros funcionando com retorno válido. |
| Relatórios PDF/CSV | Como administrador, quero gerar relatórios PDF/CSV. | Formato definido, campos definidos. | Export funcionando, arquivos gerando corretamente. |
| IA sugerir prioridade | Como administrador, quero que IA sugira prioridade automática. | Modelo definido, critérios preparados. | Sugerir prioridade funcionando com histórico base. |

---

## 🟦 Sprint 4 – Mobile, Notificações e Finalização  
**Período:** 28/10/2025 → 10/11/2025

| Principais Entregáveis | Backlog (User Story) | DoR | DoD |
|---|---|---|---|
| Notificações em tempo real | Como usuário, quero notificações quando meu chamado atualizar. | Eventos de atualização definidos. | Notificação push ou socket funcionando. |
| Chat interno | Como técnico, quero chat interno no chamado. | Modelo de mensagem e fluxo definido. | Chat bidirecional funcionando. |
| Acesso mobile/Desktop | Como usuário, quero acessar pelo mobile/desktop. | Framework definido (Electron/Capacitor). | Versão distribuível e testada. |
| Logs LGPD | Como administrador, quero rastreabilidade de ações. | Operações auditáveis mapeadas. | Log registrado em BD com usuário/data/hora. |
| Documentação técnica | Como dev, quero documentação atualizada. | Estrutura e tópicos definidos. | Documentação atualizada no repositório. |

---
