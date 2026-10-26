# Backup e restauração

Este procedimento deve ser executado pelo operador da infraestrutura antes do uso oficial dos dados. O pacote contém o dump PostgreSQL em formato customizado, o volume de anexos e hashes SHA-256.

## Criar cópia

No host Linux com `pg_dump`, `tar` e `sha256sum`, configure `DATABASE_URL`, `UPLOAD_DIR` e `BACKUP_DIR` e execute:

```sh
sh scripts/backup-postgres.sh
```

Copie o arquivo gerado para armazenamento separado do host de produção. Proteja o acesso ao arquivo, pois ele contém dados financeiros e documentos. Defina retenção e frequência com o responsável pela operação; o repositório não instala um agendador nem envia dados para terceiros.

## Validar e restaurar em ambiente isolado

1. Confira os hashes extraindo o pacote em pasta temporária e executando `sha256sum -c SHA256SUMS`.
2. Crie um banco vazio de homologação e restaure o dump com `pg_restore --no-owner --no-acl --dbname="$STAGING_DATABASE_URL" database.dump`.
3. Extraia `uploads.tar.gz` para um diretório de anexos de homologação separado.
4. Aponte uma instância isolada para o banco e diretório restaurados; verifique `/healthz`, login autorizado, uma despesa com anexo e um lote de estoque.
5. Registre data, origem da cópia, duração, resultado e diferenças encontradas. Nunca teste restauração sobre a base ativa.

O script cria cópias consistentes por ferramenta, mas não agenda tarefas, não define retenção e não comprova recuperabilidade até que a restauração isolada seja concluída.
