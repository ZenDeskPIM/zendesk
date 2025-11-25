# Checklist de DoR e DoD – HelpDesk

Este arquivo reúne os checklists oficiais de Definition of Ready (DoR) e Definition of Done (DoD) adotados no projeto HelpDeskUNIP.

Use este documento como referência padrão para avaliação das histórias de usuário em todas as sprints.

---

## Checklist: Definition of Ready (DoR)

> A história só entra na sprint se TODOS os itens abaixo estiverem atendidos.

- [ ] História de usuário escrita no formato oficial (como <usuário>, quero <ação>, para <benefício>)
- [ ] Critérios de aceite definidos e testáveis
- [ ] Campos obrigatórios dessa história mapeados e documentados
- [ ] Regras de negócio definidas (segurança, validações, exceções)
- [ ] Dependências técnicas identificadas (API, banco, serviços externos)
- [ ] Estimativa definida (pontos ou horas)
- [ ] Design / protótipo / fluxo de tela feito (quando necessário)
- [ ] Dados de teste definidos (mock fake, exemplos)
- [ ] Permissões e perfis impactados identificados (Admin / Técnico / Usuário)

---

## Checklist: Definition of Done (DoD)

> A história só é concluída quando TODOS os itens abaixo estiverem cumpridos.

- [ ] Código implementado, revisado e PR aprovada
- [ ] Testes unitários ou testes funcionais executados e passando
- [ ] Lógica validada com dados reais ou mock de banco
- [ ] Logs, auditoria e erros tratados (quando se aplica)
- [ ] Funcionalidade integrada com plataformas envolvidas (API / DB / Sockets)
- [ ] Documentação mínima atualizada (README, comentário no código ou docs da feature)
- [ ] Build funcionando sem warnings críticos
- [ ] Testado pelo Product Owner e aprovado
- [ ] Funcionalidade disponível no ambiente da sprint para uso/teste

---

## Observações

- Este DoR/DoD deve ser aplicado **para todas as sprints**.
- A cada entrega de sprint, o time deve avaliar se o DoR e DoD estão sendo cumpridos.
- Caso o time avance de maturidade, o DoD e DoR podem ser evoluídos para serem mais exigentes.
