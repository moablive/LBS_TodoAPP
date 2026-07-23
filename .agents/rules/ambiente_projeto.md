---
name: ambiente-projeto
description: Regra sobre a infraestrutura e localização dos projetos
---

Tenha sempre em mente a seguinte estrutura de ambiente:
1. O assistente Antigravity roda localmente no Mac ou Windows.
2. Os projetos e seus arquivos ficam SEMPRE no servidor remoto `awlsrv`, localizados no diretório `/mnt`.
3. Para acessar os projetos, rodar comandos ou manipular os containers, utilize o `ssh awlsrv`.
