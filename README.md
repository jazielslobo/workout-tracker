# Jeferson Personal — v1.3.0

Aplicativo web mobile-first em Framework7, HTML, CSS e JavaScript puro, com persistência local em IndexedDB, funcionamento como site estático e suporte a instalação como PWA.

## Visão geral da arquitetura

A arquitetura foi mantida modular para evitar acoplamento entre interface, regras de negócio e persistência local.

- `index.html`: shell principal do aplicativo
- `pages/`: páginas HTML carregadas pelo roteador do Framework7
- `css/`: tokens visuais e estilos globais
- `js/app.js`: bootstrap da aplicação
- `js/routes.js`: definição das rotas principais
- `js/db/`: IndexedDB, repositório e seed inicial
- `js/modules/`: módulos por domínio de uso
- `js/utils/`: constantes, formatadores e utilitários de agenda
- `assets/`: ícones do PWA

## Estrutura de pastas

```text
index.html
manifest.json
service-worker.js
README.md
css/
  app.css
  variables.css
js/
  app.js
  routes.js
  db/
    indexeddb.js
    repository.js
    seedData.js
  modules/
    backup.js
    crud.js
    history.js
    pages.js
    pwa.js
    schedule.js
    ui.js
    whatsapp.js
    workoutTemplates.js
  utils/
    constants.js
    formatters.js
    scheduleSlots.js
pages/
assets/
  icons/
```

## Como abrir e rodar o projeto

### Opção 1 — Python

```bash
python -m http.server 8000
```

Depois abra:

```text
http://localhost:8000
```

### Opção 2 — VS Code

Pode usar Live Server.

## Como publicar no GitHub Pages

O projeto já está preparado para rodar em subpasta com caminhos relativos. Se publicar em um repositório como `workout-tracker`, basta ativar o Pages usando a branch `main` na pasta raiz.

## Como o PWA funciona

- `manifest.json` define nome, ícones, tema, `start_url` e `scope` relativos
- `service-worker.js` faz cache do shell do app para publicação em HTTPS
- em `localhost`, o app **não registra** service worker e ainda tenta limpar registros antigos, evitando cache preso durante testes
- no Android, a instalação costuma aparecer automaticamente no Chrome
- no iPhone, a instalação é feita pelo Safari em **Compartilhar → Adicionar à Tela de Início**

## Como o IndexedDB foi organizado

Banco: `jeferson-personal-db`

Stores principais:

- `students`
- `gyms`
- `exercises`
- `schedules`
- `workoutTemplates`
- `workoutLogs`
- `settings`

A store `settings` guarda preferências e a versão do seed aplicada.

### Camada de acesso a dados

`js/db/repository.js` concentra funções reutilizáveis para:

- adicionar
- salvar/substituir
- editar parcialmente
- remover
- buscar por id
- listar todos
- filtrar registros
- contar registros
- limpar store

## Principais fluxos do usuário

### Início / Dashboard do dia
- usa o dia e o horário atuais do dispositivo
- separa **Próximos treinos** de **Já treinaram hoje**
- considera logs concluídos do dia
- agrupa múltiplos alunos por horário

### Alunos
- criar, editar, excluir, inativar e reativar
- acessar histórico individual
- acessar treinos do aluno

### Academias
- criar, editar e excluir
- busca por nome e endereço

### Exercícios
- criar, editar e excluir
- busca por nome
- filtro por grupo muscular

### Agenda
- agenda recorrente por dia da semana
- cada dia pode ter **horário próprio**
- alerta para conflito de horário
- suporte a múltiplos alunos no mesmo horário

### Treino do dia
- abre todos os alunos daquele horário
- mostra o treino do dia por aluno
- permite editar cargas rapidamente
- permite concluir treino
- grava log no IndexedDB
- gera resumo para WhatsApp

### Histórico
- mostra os logs do aluno do mais recente para o mais antigo
- destaca o último peso usado por exercício

### Configurações
- exportação de backup JSON
- importação de backup JSON
- exportação CSV de alunos
- exportação CSV de academias

## Dados seed

O seed inicial já inclui:

- base robusta de exercícios de musculação
- academias reais em Aracaju
- Smart Fit Jardins como academia principal de Jaziel e Mariângela
- treinos e agendas de exemplo
- compatibilidade com dados antigos de agenda e com o novo formato por slots

## O que foi refinado nesta revisão final

### Visual
- melhor consistência de cards, formulários e botões
- melhor hierarquia de títulos e textos de apoio
- estados vazios e feedbacks visuais mais consistentes
- reforço do visual com inspiração iOS

### Funcional
- revisão dos fluxos principais
- revisão do sincronismo entre UI e IndexedDB
- revisão do dashboard e do fluxo de conclusão de treino
- revisão de histórico e backup/importação

### Robustez
- tratamento de erros no bootstrap e na renderização de páginas
- limpeza de service workers antigos em ambiente local
- revisão final do manifest e do service worker
- revisão dos dados mock e seed

## Pendências e limitações atuais

- o Framework7 continua vindo de CDN
- não há testes automatizados
- a restauração do backup faz sobrescrita total
- ainda não existe sincronização entre dispositivos
- um construtor visual mais avançado de ficha de treino ainda pode evoluir

## Sugestões reais de próximas evoluções

- empacotar Framework7 localmente para eliminar dependência de CDN
- adicionar duplicação de treino de um dia para outro
- permitir reordenação de exercícios por arrastar
- adicionar filtros por período no histórico
- exportar histórico por aluno
- sincronização futura em nuvem
- suporte a anexos ou fotos de evolução
