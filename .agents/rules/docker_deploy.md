---
name: docker-deploy-automation
description: Regra para automatizar o deploy de containers Docker e limpeza de cache da Cloudflare via SSH
---

Sempre que você finalizar alterações em um projeto que utilize Docker, você deve, obrigatoriamente:
1. Limpar o cache da Cloudflare.
2. Republicar (reconstruir e reiniciar) o container Docker para garantir que as alterações estejam rodando e atualizadas.
3. Utilizar sempre a conexão SSH `ssh awlsrv` para executar os comandos remotos necessários.
