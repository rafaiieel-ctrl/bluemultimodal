# Blue Multimodal - Portal de Testes

Este repositório contém os arquivos de um aplicativo de planejamento multimodal para fins de teste e demonstração. O aplicativo pode ser facilmente hospedado online gratuitamente usando o GitHub Pages.

## Funcionalidades Principais para Teste

### 1. Armazenamento de Dados no Dispositivo (Offline)

O aplicativo foi projetado para **salvar todos os seus dados diretamente no navegador do seu dispositivo** (celular, tablet ou computador) usando `localStorage`.

- **Persistência Automática:** Qualquer cadastro que você fizer (embarcações, vagões, locais) ou operações que iniciar ficará salvo. Ao fechar e reabrir o site, seus dados estarão lá.
- **Ideal para Testes:** Isso permite que você use o aplicativo no seu celular como se fosse um aplicativo nativo, salvando os dados de calibração e outros cadastros para testes em campo.

### 2. Backup e Restauração Local

Para facilitar o gerenciamento dos seus dados de teste, a tela de **Configurações** agora possui uma funcionalidade de Backup e Restauração:

- **Criar Backup:** Gera um arquivo `.json` com todos os dados atuais do aplicativo (cadastros, programações, etc.) e o salva no seu dispositivo. Use isso para salvar diferentes "cenários" de teste.
- **Restaurar:** Permite que você carregue um arquivo de backup `.json` do seu dispositivo, substituindo todos os dados atuais do aplicativo pelos dados do arquivo.

## Como Publicar e Testar na Internet (GitHub Pages)

Siga estes passos para ter seu próprio link de teste do aplicativo:

### Passo 1: Crie um Repositório no GitHub

1.  Acesse o [GitHub](https://github.com/) e faça login.
2.  Crie um **novo repositório**. Você pode chamá-lo de `portal-multimodal-test`, por exemplo.
3.  Marque-o como **Público** para que o GitHub Pages funcione.
4.  **Não** inicialize com um README, .gitignore ou licença.

### Passo 2: Envie os Arquivos do Projeto

1.  No seu novo repositório, clique em **"uploading an existing file"**.
2.  **Arraste e solte todos os arquivos** do projeto que você recebeu (incluindo `index.html`, `App.tsx`, a pasta `components`, etc.) para a área de upload.
3.  Após o upload, clique em **"Commit changes"**.

### Passo 3: Ative o GitHub Pages

1.  No seu repositório, vá para a aba **"Settings"**.
2.  No menu lateral esquerdo, clique em **"Pages"**.
3.  Na seção "Branch", selecione a branch `main` (ou `master`) e a pasta `/root`.
4.  Clique em **"Save"**.

### Passo 4: Acesse seu Aplicativo

- Após alguns minutos, o GitHub publicará seu site. A URL ficará visível no topo da página de configurações do GitHub Pages.
- O link terá o formato: `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`
- **Pronto!** Agora você pode acessar esse link de qualquer dispositivo, e os dados que você inserir em cada dispositivo ficarão salvos localmente nele.
