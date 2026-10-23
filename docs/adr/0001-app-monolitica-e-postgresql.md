# ADR 0001 — Aplicação única com PostgreSQL

- **Status:** aceita para a primeira versão.
- **Contexto:** o produto precisa ser fácil de subir no GitHub/Railway, manter e usar com dados financeiros sem serviços excessivos.
- **Problema:** escolher uma arquitetura com persistência de dados e deploy simples.
- **Alternativas:** aplicação estática com localStorage; microsserviços; aplicação única com API e PostgreSQL.
- **Escolha:** Node.js/Express com PostgreSQL e interface web servida pela mesma aplicação.
- **Justificativa:** simplifica deploy, sessão, permissões e consistência transacional; evita tratar armazenamento do navegador como banco oficial.
- **Impactos:** a aplicação tem menos separação entre domínios que uma arquitetura grande; pode ser evoluída sem dividir serviços até haver necessidade real. Railway exige configurar banco e volume para anexos.
- **Revisão:** reavaliar quando integrações/volume ou disponibilidade exigirem processamento desacoplado.
